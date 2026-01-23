#!/usr/bin/env python3
"""
OMDb Data Fetcher
Fetches external ratings (IMDb, Rotten Tomatoes, Metacritic) from OMDb API and stores in database.

Usage:
    python fetch_omdb.py [--limit N]

Environment variables:
    DATABASE_URL - PostgreSQL connection string
    OMDB_API_KEY - OMDb API key (get free key at omdbapi.com)
"""

import argparse
import os
import time
import psycopg2
from datetime import datetime
from typing import Optional, Dict, List, Tuple
import httpx

# OMDb API configuration
OMDB_API_KEY = os.environ.get("OMDB_API_KEY", "")
OMDB_BASE_URL = "http://www.omdbapi.com/"

# Rate limiting: Free tier is 1,000 requests/day
# Can be disabled with --fast flag for multiple keys
REQUEST_DELAY = 1.0
FAST_DELAY = 0.2  # 200ms delay when running fast (avoid rate limits)


def get_db_connection():
    """Get database connection from environment."""
    return psycopg2.connect(
        os.environ.get(
            "DATABASE_URL",
            "postgresql://postgres:postgres@localhost:5432/movielens"
        )
    )


def fetch_movie_from_omdb(client: httpx.Client, imdb_id: str) -> Optional[Dict]:
    """Fetch movie details from OMDb API using IMDb ID."""
    try:
        params = {
            "i": imdb_id,
            "apikey": OMDB_API_KEY,
        }
        response = client.get(OMDB_BASE_URL, params=params)

        if response.status_code == 200:
            data = response.json()
            if data.get("Response") == "True":
                return data
            else:
                return None
        else:
            print(f"  Warning: OMDb API returned {response.status_code} for {imdb_id}")
            return None
    except Exception as e:
        print(f"  Error fetching OMDb data for {imdb_id}: {e}")
        return None


def parse_imdb_rating(omdb_data: Dict) -> Tuple[Optional[float], Optional[int]]:
    """Parse IMDb rating and votes from OMDb response."""
    rating = None
    votes = None

    imdb_rating = omdb_data.get("imdbRating")
    if imdb_rating and imdb_rating != "N/A":
        try:
            rating = float(imdb_rating)
        except ValueError:
            pass

    imdb_votes = omdb_data.get("imdbVotes")
    if imdb_votes and imdb_votes != "N/A":
        try:
            votes = int(imdb_votes.replace(",", ""))
        except ValueError:
            pass

    return rating, votes


def parse_rotten_tomatoes_score(omdb_data: Dict) -> Optional[int]:
    """Extract Rotten Tomatoes score from OMDb Ratings array."""
    ratings = omdb_data.get("Ratings", [])
    for rating in ratings:
        if rating.get("Source") == "Rotten Tomatoes":
            value = rating.get("Value", "")
            # Value is like "93%"
            if value.endswith("%"):
                try:
                    return int(value[:-1])
                except ValueError:
                    pass
    return None


def parse_metacritic_score(omdb_data: Dict) -> Optional[int]:
    """Extract Metacritic score from OMDb response."""
    # Try from Ratings array first
    ratings = omdb_data.get("Ratings", [])
    for rating in ratings:
        if rating.get("Source") == "Metacritic":
            value = rating.get("Value", "")
            # Value is like "82/100"
            if "/" in value:
                try:
                    return int(value.split("/")[0])
                except ValueError:
                    pass

    # Fallback to Metascore field
    metascore = omdb_data.get("Metascore")
    if metascore and metascore != "N/A":
        try:
            return int(metascore)
        except ValueError:
            pass

    return None


def save_external_ratings(conn, movie_id: int, omdb_data: Dict) -> bool:
    """Save external ratings to database."""
    try:
        cursor = conn.cursor()

        imdb_rating, imdb_votes = parse_imdb_rating(omdb_data)
        rt_score = parse_rotten_tomatoes_score(omdb_data)
        meta_score = parse_metacritic_score(omdb_data)

        box_office = omdb_data.get("BoxOffice")
        if box_office == "N/A":
            box_office = None

        awards = omdb_data.get("Awards")
        if awards == "N/A":
            awards = None

        rated = omdb_data.get("Rated")
        if rated == "N/A":
            rated = None

        cursor.execute(
            """
            INSERT INTO external_ratings (
                movie_id, imdb_rating, imdb_votes, rotten_tomatoes_score,
                metacritic_score, box_office, awards, rated, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
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
            (
                movie_id,
                imdb_rating,
                imdb_votes,
                rt_score,
                meta_score,
                box_office,
                awards,
                rated,
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


def get_movies_to_fetch(conn, limit: Optional[int] = None, offset: int = 0) -> List[Tuple[int, str]]:
    """Get movies that have IMDb ID but no external ratings yet."""
    cursor = conn.cursor()

    query = """
        SELECT m.movie_id, m.imdb_id
        FROM movies m
        LEFT JOIN external_ratings er ON m.movie_id = er.movie_id
        WHERE m.imdb_id IS NOT NULL
        AND er.movie_id IS NULL
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
    """Get count of movies with/without external ratings."""
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM movies WHERE imdb_id IS NOT NULL")
    total_with_imdb = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM external_ratings")
    with_ratings = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM external_ratings WHERE imdb_rating IS NOT NULL")
    with_imdb_rating = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM external_ratings WHERE rotten_tomatoes_score IS NOT NULL")
    with_rt_score = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM external_ratings WHERE metacritic_score IS NOT NULL")
    with_meta_score = cursor.fetchone()[0]

    cursor.close()

    return {
        "total_with_imdb_id": total_with_imdb,
        "with_external_ratings": with_ratings,
        "with_imdb_rating": with_imdb_rating,
        "with_rt_score": with_rt_score,
        "with_meta_score": with_meta_score,
        "missing": total_with_imdb - with_ratings
    }


def main():
    parser = argparse.ArgumentParser(description="Fetch OMDb external ratings data")
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
        help="Disable rate limiting (use with multiple API keys)"
    )
    args = parser.parse_args()

    delay = FAST_DELAY if args.fast else REQUEST_DELAY

    if not OMDB_API_KEY:
        print("Error: OMDB_API_KEY environment variable not set")
        print("Please get a free API key from https://www.omdbapi.com/apikey.aspx")
        print("Then set it in your .env file or environment")
        return

    print("OMDb Data Fetcher")
    print(f"Started at: {datetime.now()}")
    print("-" * 50)

    conn = get_db_connection()

    # Show current status
    counts = get_movies_count(conn)
    print(f"Current status:")
    print(f"  Movies with IMDb ID: {counts['total_with_imdb_id']}")
    print(f"  Movies with external ratings: {counts['with_external_ratings']}")
    print(f"    - With IMDb rating: {counts['with_imdb_rating']}")
    print(f"    - With RT score: {counts['with_rt_score']}")
    print(f"    - With Metacritic score: {counts['with_meta_score']}")
    print(f"  Movies needing fetch: {counts['missing']}")
    print("-" * 50)

    # Get movies to fetch
    movies = get_movies_to_fetch(conn, args.limit, args.offset)
    total = len(movies)

    if total == 0:
        print("No movies need fetching!")
        conn.close()
        return

    print(f"Fetching external ratings for {total} movies...")
    if args.fast:
        print("Running in FAST mode (minimal delay)")
    else:
        print("Note: Free tier allows 1,000 requests/day")

    success = 0
    failed = 0
    with_rt = 0
    with_meta = 0

    with httpx.Client(timeout=10.0) as client:
        for i, (movie_id, imdb_id) in enumerate(movies, 1):
            # Ensure IMDb ID has proper format (tt prefix)
            if not imdb_id.startswith("tt"):
                imdb_id = f"tt{imdb_id}"

            # Fetch from OMDb
            omdb_data = fetch_movie_from_omdb(client, imdb_id)

            if omdb_data:
                if save_external_ratings(conn, movie_id, omdb_data):
                    success += 1
                    if parse_rotten_tomatoes_score(omdb_data):
                        with_rt += 1
                    if parse_metacritic_score(omdb_data):
                        with_meta += 1
                else:
                    failed += 1
            else:
                failed += 1

            # Progress update every 100 movies
            if i % 100 == 0 or i == total:
                print(f"  Progress: {i}/{total} ({success} success, {failed} failed, {with_rt} with RT, {with_meta} with Metacritic)")

            # Rate limiting
            time.sleep(delay)

    print("-" * 50)
    print(f"Fetch complete!")
    print(f"  Successful: {success}")
    print(f"  Failed: {failed}")
    print(f"  With Rotten Tomatoes: {with_rt}")
    print(f"  With Metacritic: {with_meta}")

    # Final status
    counts = get_movies_count(conn)
    print(f"\nFinal status:")
    print(f"  Movies with external ratings: {counts['with_external_ratings']}")
    print(f"    - With IMDb rating: {counts['with_imdb_rating']}")
    print(f"    - With RT score: {counts['with_rt_score']}")
    print(f"    - With Metacritic score: {counts['with_meta_score']}")
    print(f"Finished at: {datetime.now()}")

    conn.close()


if __name__ == "__main__":
    main()
