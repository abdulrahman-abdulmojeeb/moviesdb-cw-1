#!/usr/bin/env python3
"""
MovieLens Data Loader
Imports MovieLens CSV data into the PostgreSQL database.

Usage:
    python load_movielens.py --data-dir /path/to/movielens/data

The data directory should contain:
    - movies.csv
    - ratings.csv
    - tags.csv
    - links.csv (optional)

For personality data, it should also contain:
    - personality-data.csv (from personality-isf2018 dataset)
"""

import argparse
import csv
import os
import re
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime
from typing import Optional, Tuple


def get_db_connection():
    """Get database connection from environment."""
    return psycopg2.connect(
        os.environ.get(
            "DATABASE_URL",
            "postgresql://postgres:postgres@localhost:5432/movielens"
        )
    )


def parse_year_from_title(title: str) -> Tuple[str, Optional[int]]:
    """Extract year from movie title like 'Movie Name (1999)'."""
    match = re.search(r'\((\d{4})\)\s*$', title)
    if match:
        year = int(match.group(1))
        clean_title = title[:match.start()].strip()
        return clean_title, year
    return title, None


def load_movies(conn, data_dir: str) -> None:
    """Load movies and genres from movies.csv."""
    print("Loading movies...")
    movies_path = os.path.join(data_dir, "movies.csv")

    if not os.path.exists(movies_path):
        print(f"  Warning: {movies_path} not found, skipping")
        return

    cursor = conn.cursor()

    # Track all genres
    all_genres = set()
    movies_data = []
    movie_genres_data = []

    with open(movies_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            movie_id = int(row['movieId'])
            title = row['title']
            genres = row['genres'].split('|') if row['genres'] != '(no genres listed)' else []

            # Parse year from title
            clean_title, year = parse_year_from_title(title)

            movies_data.append((movie_id, title, year, None, None))

            for genre in genres:
                all_genres.add(genre)
                movie_genres_data.append((movie_id, genre))

    # Insert genres
    print(f"  Inserting {len(all_genres)} genres...")
    for genre in all_genres:
        cursor.execute(
            "INSERT INTO genres (name) VALUES (%s) ON CONFLICT (name) DO NOTHING",
            (genre,)
        )
    conn.commit()

    # Get genre IDs
    cursor.execute("SELECT genre_id, name FROM genres")
    genre_map = {name: gid for gid, name in cursor.fetchall()}

    # Insert movies
    print(f"  Inserting {len(movies_data)} movies...")
    execute_values(
        cursor,
        """
        INSERT INTO movies (movie_id, title, release_year, imdb_id, tmdb_id)
        VALUES %s
        ON CONFLICT (movie_id) DO UPDATE SET
            title = EXCLUDED.title,
            release_year = EXCLUDED.release_year
        """,
        movies_data
    )
    conn.commit()

    # Insert movie-genre relationships
    print(f"  Inserting {len(movie_genres_data)} movie-genre relationships...")
    movie_genres_with_ids = [
        (movie_id, genre_map[genre])
        for movie_id, genre in movie_genres_data
        if genre in genre_map
    ]
    execute_values(
        cursor,
        """
        INSERT INTO movie_genres (movie_id, genre_id)
        VALUES %s
        ON CONFLICT DO NOTHING
        """,
        movie_genres_with_ids
    )
    conn.commit()

    cursor.close()
    print("  Movies loaded successfully!")


def load_ratings(conn, data_dir: str) -> None:
    """Load ratings from ratings.csv."""
    print("Loading ratings...")
    ratings_path = os.path.join(data_dir, "ratings.csv")

    if not os.path.exists(ratings_path):
        print(f"  Warning: {ratings_path} not found, skipping")
        return

    cursor = conn.cursor()

    # First, collect all unique users
    users = set()
    ratings_data = []

    with open(ratings_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            user_id = int(row['userId'])
            users.add(user_id)
            ratings_data.append((
                user_id,
                int(row['movieId']),
                float(row['rating']),
                int(row['timestamp'])
            ))

    # Insert users
    print(f"  Inserting {len(users)} users...")
    execute_values(
        cursor,
        "INSERT INTO users (user_id) VALUES %s ON CONFLICT DO NOTHING",
        [(u,) for u in users]
    )
    conn.commit()

    # Insert ratings in batches
    print(f"  Inserting {len(ratings_data)} ratings...")
    batch_size = 10000
    for i in range(0, len(ratings_data), batch_size):
        batch = ratings_data[i:i + batch_size]
        execute_values(
            cursor,
            """
            INSERT INTO ratings (user_id, movie_id, rating, timestamp)
            VALUES %s
            ON CONFLICT (user_id, movie_id) DO UPDATE SET
                rating = EXCLUDED.rating,
                timestamp = EXCLUDED.timestamp
            """,
            batch
        )
        conn.commit()
        print(f"    Processed {min(i + batch_size, len(ratings_data))}/{len(ratings_data)}")

    cursor.close()
    print("  Ratings loaded successfully!")


def load_tags(conn, data_dir: str) -> None:
    """Load tags from tags.csv."""
    print("Loading tags...")
    tags_path = os.path.join(data_dir, "tags.csv")

    if not os.path.exists(tags_path):
        print(f"  Warning: {tags_path} not found, skipping")
        return

    cursor = conn.cursor()
    tags_data = []

    with open(tags_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            tags_data.append((
                int(row['userId']),
                int(row['movieId']),
                row['tag'],
                int(row['timestamp'])
            ))

    print(f"  Inserting {len(tags_data)} tags...")
    execute_values(
        cursor,
        """
        INSERT INTO tags (user_id, movie_id, tag_text, timestamp)
        VALUES %s
        """,
        tags_data
    )
    conn.commit()

    cursor.close()
    print("  Tags loaded successfully!")


def load_links(conn, data_dir: str) -> None:
    """Load links from links.csv."""
    print("Loading links...")
    links_path = os.path.join(data_dir, "links.csv")

    if not os.path.exists(links_path):
        print(f"  Warning: {links_path} not found, skipping")
        return

    cursor = conn.cursor()
    links_data = []

    with open(links_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            movie_id = int(row['movieId'])
            imdb_id = row.get('imdbId', '')
            tmdb_id = row.get('tmdbId', '')

            links_data.append((
                movie_id,
                f"tt{imdb_id}" if imdb_id else None,
                int(tmdb_id) if tmdb_id else None
            ))

    print(f"  Updating {len(links_data)} movie links...")

    # Update movies table with IMDB and TMDB IDs
    for movie_id, imdb_id, tmdb_id in links_data:
        cursor.execute(
            """
            UPDATE movies SET imdb_id = %s, tmdb_id = %s
            WHERE movie_id = %s
            """,
            (imdb_id, tmdb_id, movie_id)
        )

    conn.commit()
    cursor.close()
    print("  Links loaded successfully!")


def load_personality(conn, data_dir: str) -> None:
    """Load personality data from personality-data.csv."""
    print("Loading personality data...")

    # Try different possible file names
    possible_paths = [
        os.path.join(data_dir, "personality-data.csv"),
        os.path.join(data_dir, "personality", "personality-data.csv"),
        os.path.join(data_dir, "personality.csv"),
    ]

    personality_path = None
    for path in possible_paths:
        if os.path.exists(path):
            personality_path = path
            break

    if not personality_path:
        print("  Warning: personality data not found, skipping")
        return

    cursor = conn.cursor()
    personality_data = []

    with open(personality_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            user_id = int(row['userid'])

            # Check if user exists in users table
            cursor.execute("SELECT 1 FROM users WHERE user_id = %s", (user_id,))
            if cursor.fetchone():
                personality_data.append((
                    user_id,
                    float(row.get('openness', 0)),
                    float(row.get('agreeableness', 0)),
                    float(row.get('emotional_stability', 0)),
                    float(row.get('conscientiousness', 0)),
                    float(row.get('extraversion', 0))
                ))

    print(f"  Inserting {len(personality_data)} personality records...")
    execute_values(
        cursor,
        """
        INSERT INTO personality_users
        (user_id, openness, agreeableness, emotional_stability, conscientiousness, extraversion)
        VALUES %s
        ON CONFLICT (user_id) DO UPDATE SET
            openness = EXCLUDED.openness,
            agreeableness = EXCLUDED.agreeableness,
            emotional_stability = EXCLUDED.emotional_stability,
            conscientiousness = EXCLUDED.conscientiousness,
            extraversion = EXCLUDED.extraversion
        """,
        personality_data
    )
    conn.commit()

    cursor.close()
    print("  Personality data loaded successfully!")


def main():
    parser = argparse.ArgumentParser(description="Load MovieLens data into PostgreSQL")
    parser.add_argument(
        "--data-dir",
        default="/app/data",
        help="Directory containing MovieLens CSV files"
    )
    args = parser.parse_args()


# Auto-detect the ml-latest-small subfolder
    effective_data_dir = args.data_dir
    potential_subdir = os.path.join(args.data_dir, "ml-latest-small")
    
    if os.path.exists(potential_subdir) and os.path.isdir(potential_subdir):
        effective_data_dir = potential_subdir
        print(f"Detected MovieLens subfolder: {effective_data_dir}")
        

    print(f"MovieLens Data Loader")
    print(f"Data directory: {args.data_dir}")
    print(f"Started at: {datetime.now()}")
    print("-" * 50)

    conn = get_db_connection()

    try:
        load_movies(conn, args.data_dir)
        load_ratings(conn, args.data_dir)
        load_tags(conn, args.data_dir)
        load_links(conn, args.data_dir)
        load_personality(conn, args.data_dir)

        print("-" * 50)
        print("Data loading complete!")
        print(f"Finished at: {datetime.now()}")

        # Print summary
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM movies")
        print(f"  Total movies: {cursor.fetchone()[0]}")
        cursor.execute("SELECT COUNT(*) FROM users")
        print(f"  Total users: {cursor.fetchone()[0]}")
        cursor.execute("SELECT COUNT(*) FROM ratings")
        print(f"  Total ratings: {cursor.fetchone()[0]}")
        cursor.execute("SELECT COUNT(*) FROM tags")
        print(f"  Total tags: {cursor.fetchone()[0]}")
        cursor.execute("SELECT COUNT(*) FROM personality_users")
        print(f"  Users with personality data: {cursor.fetchone()[0]}")
        cursor.close()

    finally:
        conn.close()


if __name__ == "__main__":
    main()
