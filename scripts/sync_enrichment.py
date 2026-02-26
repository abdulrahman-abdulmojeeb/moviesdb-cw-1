#!/usr/bin/env python3
"""
Sync Enrichment Data from Production Server
Pulls movie details (posters, overviews, runtime, director, etc.) and external ratings
(IMDb, Rotten Tomatoes, Metacritic) from the production API instead of requiring
TMDB/OMDB API keys.

Usage:
    python sync_enrichment.py [--server URL] [--batch-size N]

Environment variables:
    DATABASE_URL - PostgreSQL connection string
"""

import argparse
import os
import sys
import time
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime
from typing import Dict, List, Optional

try:
    import httpx
except ImportError:
    print("Error: httpx is required. Install with: pip install httpx")
    sys.exit(1)

DEFAULT_SERVER = "https://comp22-cw.marlin.im"


def get_db_connection():
    return psycopg2.connect(
        os.environ.get(
            "DATABASE_URL",
            "postgresql://postgres:postgres@localhost:5432/movielens"
        )
    )


def fetch_all_movies(client: httpx.Client, server: str) -> List[Dict]:
    """Fetch all movies from the paginated API endpoint."""
    all_movies = []
    page = 1

    # First request to get total pages
    resp = client.get(f"{server}/api/movies", params={"page": 1, "limit": 100})
    resp.raise_for_status()
    data = resp.json()
    total_pages = data["pages"]
    total = data["total"]
    all_movies.extend(data["movies"])
    print(f"  Page 1/{total_pages} ({len(all_movies)}/{total} movies)")

    for page in range(2, total_pages + 1):
        resp = client.get(f"{server}/api/movies", params={"page": page, "limit": 100})
        resp.raise_for_status()
        data = resp.json()
        all_movies.extend(data["movies"])

        if page % 10 == 0 or page == total_pages:
            print(f"  Page {page}/{total_pages} ({len(all_movies)}/{total} movies)")

    return all_movies


def fetch_movie_detail(client: httpx.Client, server: str, movie_id: int) -> Optional[Dict]:
    """Fetch full movie details from the detail endpoint."""
    try:
        resp = client.get(f"{server}/api/movies/{movie_id}")
        if resp.status_code == 200:
            return resp.json()
        return None
    except Exception:
        return None


def save_movie_details(conn, details_batch: List[tuple]) -> int:
    """Batch insert/update movie_details rows."""
    if not details_batch:
        return 0

    cursor = conn.cursor()
    try:
        execute_values(
            cursor,
            """
            INSERT INTO movie_details (
                movie_id, poster_path, backdrop_path, overview, runtime,
                budget, revenue, popularity, vote_average, vote_count,
                director, lead_actors, updated_at
            ) VALUES %s
            ON CONFLICT (movie_id) DO UPDATE SET
                poster_path = EXCLUDED.poster_path,
                backdrop_path = EXCLUDED.backdrop_path,
                overview = EXCLUDED.overview,
                runtime = EXCLUDED.runtime,
                budget = EXCLUDED.budget,
                revenue = EXCLUDED.revenue,
                popularity = EXCLUDED.popularity,
                vote_average = EXCLUDED.vote_average,
                vote_count = EXCLUDED.vote_count,
                director = EXCLUDED.director,
                lead_actors = EXCLUDED.lead_actors,
                updated_at = EXCLUDED.updated_at
            """,
            details_batch
        )
        conn.commit()
        saved = len(details_batch)
    except Exception as e:
        print(f"  Warning: failed to save movie_details batch: {e}")
        conn.rollback()
        saved = 0
    cursor.close()
    return saved


def save_external_ratings(conn, ratings_batch: List[tuple]) -> int:
    """Batch insert/update external_ratings rows."""
    if not ratings_batch:
        return 0

    cursor = conn.cursor()
    try:
        execute_values(
            cursor,
            """
            INSERT INTO external_ratings (
                movie_id, imdb_rating, imdb_votes, rotten_tomatoes_score,
                metacritic_score, box_office, awards, rated, updated_at
            ) VALUES %s
            ON CONFLICT (movie_id) DO UPDATE SET
                imdb_rating = EXCLUDED.imdb_rating,
                imdb_votes = EXCLUDED.imdb_votes,
                rotten_tomatoes_score = EXCLUDED.rotten_tomatoes_score,
                metacritic_score = EXCLUDED.metacritic_score,
                box_office = EXCLUDED.box_office,
                awards = EXCLUDED.awards,
                rated = EXCLUDED.rated,
                updated_at = EXCLUDED.updated_at
            """,
            ratings_batch
        )
        conn.commit()
        saved = len(ratings_batch)
    except Exception as e:
        print(f"  Warning: failed to save external_ratings batch: {e}")
        conn.rollback()
        saved = 0
    cursor.close()
    return saved


def main():
    parser = argparse.ArgumentParser(
        description="Sync movie enrichment data from production server"
    )
    parser.add_argument(
        "--server",
        default=DEFAULT_SERVER,
        help=f"Production server URL (default: {DEFAULT_SERVER})"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=50,
        help="Number of detail requests between progress updates (default: 50)"
    )
    parser.add_argument(
        "--skip-details",
        action="store_true",
        help="Skip individual movie detail fetches (only use paginated list data)"
    )
    args = parser.parse_args()

    server = args.server.rstrip("/")

    print("Enrichment Data Sync")
    print(f"Server: {server}")
    print(f"Started at: {datetime.now()}")
    print("-" * 50)

    conn = get_db_connection()
    now = datetime.now()

    # Phase 1: Fetch all movies from paginated endpoint
    print("\nPhase 1: Fetching movie list from server...")
    with httpx.Client(timeout=30.0) as client:
        movies = fetch_all_movies(client, server)

    print(f"  Fetched {len(movies)} movies from server")

    # Save basic enrichment data from list endpoint
    details_batch = []
    ratings_batch = []

    for movie in movies:
        mid = movie["movie_id"]
        poster_path = movie.get("poster_path")
        overview = movie.get("overview")
        vote_average = movie.get("vote_average")
        vote_count = movie.get("vote_count")
        imdb_rating = movie.get("imdb_rating")
        imdb_votes = movie.get("imdb_votes")

        # Only save if there's actual enrichment data
        if any([poster_path, overview, vote_average]):
            details_batch.append((
                mid, poster_path, None, overview, None,
                None, None, None, vote_average, vote_count,
                None, None, now
            ))

        if any([imdb_rating, imdb_votes]):
            ratings_batch.append((
                mid, imdb_rating, imdb_votes, None,
                None, None, None, None, now
            ))

    details_saved = save_movie_details(conn, details_batch)
    ratings_saved = save_external_ratings(conn, ratings_batch)
    print(f"  Saved {details_saved} movie details, {ratings_saved} external ratings (basic)")

    if args.skip_details:
        print("\nSkipping individual detail fetches (--skip-details)")
    else:
        # Phase 2: Fetch full details for each movie
        print(f"\nPhase 2: Fetching full details for {len(movies)} movies...")
        full_details = []
        full_ratings = []
        fetched = 0
        failed = 0

        with httpx.Client(timeout=15.0) as client:
            for i, movie in enumerate(movies, 1):
                mid = movie["movie_id"]
                detail = fetch_movie_detail(client, server, mid)

                if detail:
                    fetched += 1
                    full_details.append((
                        mid,
                        detail.get("poster_path"),
                        detail.get("backdrop_path"),
                        detail.get("overview") or None,
                        detail.get("runtime"),
                        detail.get("budget") or None,
                        detail.get("revenue") or None,
                        detail.get("popularity"),
                        detail.get("vote_average"),
                        detail.get("vote_count"),
                        detail.get("director"),
                        detail.get("lead_actors"),
                        now
                    ))

                    # External ratings from detail endpoint
                    if any([
                        detail.get("imdb_rating"),
                        detail.get("rotten_tomatoes_score"),
                        detail.get("metacritic_score"),
                    ]):
                        full_ratings.append((
                            mid,
                            detail.get("imdb_rating"),
                            detail.get("imdb_votes"),
                            detail.get("rotten_tomatoes_score"),
                            detail.get("metacritic_score"),
                            detail.get("box_office"),
                            detail.get("awards"),
                            detail.get("rated"),
                            now
                        ))
                else:
                    failed += 1

                # Save in batches and show progress
                if i % args.batch_size == 0 or i == len(movies):
                    d = save_movie_details(conn, full_details)
                    r = save_external_ratings(conn, full_ratings)
                    full_details.clear()
                    full_ratings.clear()
                    print(f"  Progress: {i}/{len(movies)} ({fetched} fetched, {failed} failed)")

        print(f"  Full details: {fetched} fetched, {failed} failed")

    # Final summary
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM movie_details")
    total_details = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM movie_details WHERE poster_path IS NOT NULL")
    with_poster = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM movie_details WHERE director IS NOT NULL")
    with_director = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM external_ratings")
    total_ext = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM external_ratings WHERE rotten_tomatoes_score IS NOT NULL")
    with_rt = cursor.fetchone()[0]
    cursor.close()

    print("-" * 50)
    print("Final status:")
    print(f"  Movie details: {total_details} ({with_poster} with poster, {with_director} with director)")
    print(f"  External ratings: {total_ext} ({with_rt} with Rotten Tomatoes)")
    print(f"Finished at: {datetime.now()}")

    conn.close()


if __name__ == "__main__":
    main()
