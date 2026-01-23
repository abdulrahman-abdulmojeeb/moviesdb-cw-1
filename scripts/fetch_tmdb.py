#!/usr/bin/env python3
"""
TMDB Data Fetcher
Fetches movie details (poster, overview, budget, revenue, etc.) from TMDB API and stores in database.

Usage:
    python fetch_tmdb.py [--limit N]

Environment variables:
    DATABASE_URL - PostgreSQL connection string
    TMDB_API_KEY - TMDB API key (get free key at themoviedb.org)
"""

import argparse
import os
import time
import psycopg2
from datetime import datetime
from typing import Optional, Dict, List, Tuple
import httpx

# TMDB API configuration
TMDB_API_KEY = os.environ.get("TMDB_API_KEY", "")
TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p"

# Rate limiting: TMDB allows ~40 requests per 10 seconds
REQUEST_DELAY = 0.25  # 250ms between requests
FAST_DELAY = 0.1  # 100ms when running fast


def get_db_connection():
    """Get database connection from environment."""
    return psycopg2.connect(
        os.environ.get(
            "DATABASE_URL",
            "postgresql://postgres:postgres@localhost:5432/movielens"
        )
    )


def fetch_movie_from_tmdb(client: httpx.Client, tmdb_id: int) -> Optional[Dict]:
    """Fetch movie details from TMDB API using TMDB ID."""
    try:
        url = f"{TMDB_BASE_URL}/movie/{tmdb_id}"
        params = {
            "api_key": TMDB_API_KEY,
            "append_to_response": "credits"
        }
        response = client.get(url, params=params)

        if response.status_code == 200:
            return response.json()
        elif response.status_code == 404:
            return None
        else:
            print(f"  Warning: TMDB API returned {response.status_code} for {tmdb_id}")
            return None
    except Exception as e:
        print(f"  Error fetching TMDB data for {tmdb_id}: {e}")
        return None


def parse_director(tmdb_data: Dict) -> Optional[str]:
    """Extract director name from TMDB credits."""
    credits = tmdb_data.get("credits", {})
    crew = credits.get("crew", [])

    for person in crew:
        if person.get("job") == "Director":
            return person.get("name")
    return None


def parse_lead_actors(tmdb_data: Dict, limit: int = 5) -> Optional[str]:
    """Extract top billed actors from TMDB credits."""
    credits = tmdb_data.get("credits", {})
    cast = credits.get("cast", [])

    # Get top N actors by order (billing order)
    actors = []
    for person in sorted(cast, key=lambda x: x.get("order", 999))[:limit]:
        name = person.get("name")
        if name:
            actors.append(name)

    return ", ".join(actors) if actors else None


def save_movie_details(conn, movie_id: int, tmdb_data: Dict) -> bool:
    """Save movie details to database."""
    try:
        cursor = conn.cursor()

        poster_path = tmdb_data.get("poster_path")
        backdrop_path = tmdb_data.get("backdrop_path")
        overview = tmdb_data.get("overview")
        runtime = tmdb_data.get("runtime")
        budget = tmdb_data.get("budget")
        revenue = tmdb_data.get("revenue")
        popularity = tmdb_data.get("popularity")
        vote_average = tmdb_data.get("vote_average")
        vote_count = tmdb_data.get("vote_count")

        director = parse_director(tmdb_data)
        lead_actors = parse_lead_actors(tmdb_data)

        # Clean up empty/zero values
        if budget == 0:
            budget = None
        if revenue == 0:
            revenue = None
        if overview == "":
            overview = None

        cursor.execute(
            """
            INSERT INTO movie_details (
                movie_id, poster_path, backdrop_path, overview, runtime,
                budget, revenue, popularity, vote_average, vote_count,
                director, lead_actors, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
            (
                movie_id,
                poster_path,
                backdrop_path,
                overview,
                runtime,
                budget,
                revenue,
                popularity,
                vote_average,
                vote_count,
                director,
                lead_actors,
                datetime.now()
            )
        )
        conn.commit()
        cursor.close()
        return True
    except Exception as e:
        print(f"  Error saving movie {movie_id}: {e}")
        conn.rollback()
        return False


def get_movies_to_fetch(conn, limit: Optional[int] = None, offset: int = 0) -> List[Tuple[int, int]]:
    """Get movies that have TMDB ID but no movie details yet."""
    cursor = conn.cursor()

    query = """
        SELECT m.movie_id, m.tmdb_id
        FROM movies m
        LEFT JOIN movie_details md ON m.movie_id = md.movie_id
        WHERE m.tmdb_id IS NOT NULL
        AND md.movie_id IS NULL
        ORDER BY m.movie_id
    """

    if offset > 0:
        query += f" OFFSET {offset}"

    if limit:
        query += f" LIMIT {limit}"

    cursor.execute(query)
    movies = cursor.fetchall()
    cursor.close()

    return movies


def get_movies_count(conn) -> Dict:
    """Get count of movies with/without TMDB details."""
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM movies WHERE tmdb_id IS NOT NULL")
    total_with_tmdb = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM movie_details")
    with_details = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM movie_details WHERE poster_path IS NOT NULL")
    with_poster = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM movie_details WHERE overview IS NOT NULL")
    with_overview = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM movie_details WHERE director IS NOT NULL")
    with_director = cursor.fetchone()[0]

    cursor.close()

    return {
        "total_with_tmdb_id": total_with_tmdb,
        "with_details": with_details,
        "with_poster": with_poster,
        "with_overview": with_overview,
        "with_director": with_director,
        "missing": total_with_tmdb - with_details
    }


def main():
    parser = argparse.ArgumentParser(description="Fetch TMDB movie details")
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit number of movies to fetch (default: all)"
    )
    parser.add_argument(
        "--offset",
        type=int,
        default=0,
        help="Skip first N movies (for parallel runs)"
    )
    parser.add_argument(
        "--fast",
        action="store_true",
        help="Use minimal delay between requests"
    )
    args = parser.parse_args()

    delay = FAST_DELAY if args.fast else REQUEST_DELAY

    if not TMDB_API_KEY:
        print("Error: TMDB_API_KEY environment variable not set")
        print("Please get a free API key from https://www.themoviedb.org/settings/api")
        print("Then set it in your .env file or environment")
        return

    print("TMDB Data Fetcher")
    print(f"Started at: {datetime.now()}")
    print("-" * 50)

    conn = get_db_connection()

    # Show current status
    counts = get_movies_count(conn)
    print(f"Current status:")
    print(f"  Movies with TMDB ID: {counts['total_with_tmdb_id']}")
    print(f"  Movies with details: {counts['with_details']}")
    print(f"    - With poster: {counts['with_poster']}")
    print(f"    - With overview: {counts['with_overview']}")
    print(f"    - With director: {counts['with_director']}")
    print(f"  Movies needing fetch: {counts['missing']}")
    print("-" * 50)

    # Get movies to fetch
    movies = get_movies_to_fetch(conn, args.limit, args.offset)
    total = len(movies)

    if total == 0:
        print("No movies need fetching!")
        conn.close()
        return

    print(f"Fetching TMDB details for {total} movies...")
    if args.fast:
        print("Running in FAST mode (minimal delay)")

    success = 0
    failed = 0
    with_poster = 0
    with_overview = 0

    with httpx.Client(timeout=10.0) as client:
        for i, (movie_id, tmdb_id) in enumerate(movies, 1):
            # Fetch from TMDB
            tmdb_data = fetch_movie_from_tmdb(client, tmdb_id)

            if tmdb_data:
                if save_movie_details(conn, movie_id, tmdb_data):
                    success += 1
                    if tmdb_data.get("poster_path"):
                        with_poster += 1
                    if tmdb_data.get("overview"):
                        with_overview += 1
                else:
                    failed += 1
            else:
                failed += 1

            # Progress update every 100 movies
            if i % 100 == 0 or i == total:
                print(f"  Progress: {i}/{total} ({success} success, {failed} failed, {with_poster} with poster)")

            # Rate limiting
            time.sleep(delay)

    print("-" * 50)
    print(f"Fetch complete!")
    print(f"  Successful: {success}")
    print(f"  Failed: {failed}")
    print(f"  With poster: {with_poster}")
    print(f"  With overview: {with_overview}")

    # Final status
    counts = get_movies_count(conn)
    print(f"\nFinal status:")
    print(f"  Movies with details: {counts['with_details']}")
    print(f"    - With poster: {counts['with_poster']}")
    print(f"    - With overview: {counts['with_overview']}")
    print(f"    - With director: {counts['with_director']}")
    print(f"Finished at: {datetime.now()}")

    conn.close()


if __name__ == "__main__":
    main()
