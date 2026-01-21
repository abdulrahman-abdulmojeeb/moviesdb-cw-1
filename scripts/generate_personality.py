#!/usr/bin/env python3
"""
Generate synthetic personality data for existing users.

The personality-isf2018 dataset uses hashed user IDs that don't match
the ml-latest-small integer user IDs. This script generates realistic
synthetic personality scores for demonstration purposes.
"""

import os
import random
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime


def get_db_connection():
    """Get database connection from environment."""
    return psycopg2.connect(
        os.environ.get(
            "DATABASE_URL",
            "postgresql://postgres:postgres@localhost:5432/movielens"
        )
    )


def generate_personality_score():
    """Generate a realistic personality score (1-5 scale)."""
    # Use a normal distribution centered around 3.0 with some variance
    score = random.gauss(3.0, 0.8)
    return max(1.0, min(5.0, round(score, 2)))


def main():
    print("Synthetic Personality Data Generator")
    print(f"Started at: {datetime.now()}")
    print("-" * 50)

    conn = get_db_connection()
    cursor = conn.cursor()

    # Get all user IDs
    cursor.execute("SELECT user_id FROM users ORDER BY user_id")
    users = cursor.fetchall()
    print(f"Found {len(users)} users")

    # Generate personality data for each user
    personality_data = []
    for (user_id,) in users:
        personality_data.append((
            user_id,
            generate_personality_score(),  # openness
            generate_personality_score(),  # agreeableness
            generate_personality_score(),  # emotional_stability
            generate_personality_score(),  # conscientiousness
            generate_personality_score(),  # extraversion
        ))

    print(f"Inserting {len(personality_data)} personality records...")

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

    # Verify
    cursor.execute("SELECT COUNT(*) FROM personality_users")
    count = cursor.fetchone()[0]
    print(f"Personality records in database: {count}")

    cursor.close()
    conn.close()

    print("-" * 50)
    print(f"Finished at: {datetime.now()}")


if __name__ == "__main__":
    main()
