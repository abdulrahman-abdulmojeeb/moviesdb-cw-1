from fastapi import APIRouter, Query
from typing import Optional

from app.database import execute_query

router = APIRouter()


@router.get("/traits")
async def get_personality_traits():
    """
    Get overview of personality traits in the dataset.
    Requirement 5: Personality Traits and Viewing Preferences
    """
    query = """
        SELECT
            'openness' as trait,
            ROUND(AVG(openness)::numeric, 2) as mean,
            ROUND(STDDEV(openness)::numeric, 2) as stddev,
            MIN(openness) as min,
            MAX(openness) as max
        FROM personality_users
        UNION ALL
        SELECT
            'agreeableness',
            ROUND(AVG(agreeableness)::numeric, 2),
            ROUND(STDDEV(agreeableness)::numeric, 2),
            MIN(agreeableness),
            MAX(agreeableness)
        FROM personality_users
        UNION ALL
        SELECT
            'emotional_stability',
            ROUND(AVG(emotional_stability)::numeric, 2),
            ROUND(STDDEV(emotional_stability)::numeric, 2),
            MIN(emotional_stability),
            MAX(emotional_stability)
        FROM personality_users
        UNION ALL
        SELECT
            'conscientiousness',
            ROUND(AVG(conscientiousness)::numeric, 2),
            ROUND(STDDEV(conscientiousness)::numeric, 2),
            MIN(conscientiousness),
            MAX(conscientiousness)
        FROM personality_users
        UNION ALL
        SELECT
            'extraversion',
            ROUND(AVG(extraversion)::numeric, 2),
            ROUND(STDDEV(extraversion)::numeric, 2),
            MIN(extraversion),
            MAX(extraversion)
        FROM personality_users
    """
    return execute_query(query)


@router.get("/genre-correlation")
async def get_personality_genre_correlation(
    trait: str = Query(
        ...,
        regex="^(openness|agreeableness|emotional_stability|conscientiousness|extraversion)$"
    ),
    threshold: str = Query("high", regex="^(high|low)$"),
):
    """
    Find correlation between personality traits and genre preferences.
    Requirement 5: Personality-Genre correlation analysis
    """
    comparison = ">= 4.0" if threshold == "high" else "<= 2.0"

    query = f"""
        WITH trait_users AS (
            SELECT user_id
            FROM personality_users
            WHERE {trait} {comparison}
        ),
        trait_genre_ratings AS (
            SELECT
                g.name as genre,
                AVG(r.rating) as avg_rating,
                COUNT(*) as rating_count
            FROM trait_users tu
            JOIN ratings r ON tu.user_id = r.user_id
            JOIN movie_genres mg ON r.movie_id = mg.movie_id
            JOIN genres g ON mg.genre_id = g.genre_id
            GROUP BY g.name
            HAVING COUNT(*) >= 50
        )
        SELECT
            genre,
            ROUND(avg_rating::numeric, 2) as avg_rating,
            rating_count
        FROM trait_genre_ratings
        ORDER BY avg_rating DESC
    """
    return {
        "trait": trait,
        "threshold": threshold,
        "correlations": execute_query(query),
    }


@router.get("/genre-traits")
async def get_genre_personality_profile(
    genre: str = Query(..., description="Genre to analyze"),
):
    """
    Get personality profile of users who highly rate a specific genre.
    Requirement 5: Genre-specific personality analysis
    """
    query = """
        WITH genre_lovers AS (
            SELECT DISTINCT r.user_id
            FROM ratings r
            JOIN movie_genres mg ON r.movie_id = mg.movie_id
            JOIN genres g ON mg.genre_id = g.genre_id
            WHERE g.name ILIKE %s
            GROUP BY r.user_id
            HAVING AVG(r.rating) >= 4.0 AND COUNT(*) >= 5
        )
        SELECT
            ROUND(AVG(p.openness)::numeric, 2) as avg_openness,
            ROUND(AVG(p.agreeableness)::numeric, 2) as avg_agreeableness,
            ROUND(AVG(p.emotional_stability)::numeric, 2) as avg_emotional_stability,
            ROUND(AVG(p.conscientiousness)::numeric, 2) as avg_conscientiousness,
            ROUND(AVG(p.extraversion)::numeric, 2) as avg_extraversion,
            COUNT(*) as user_count
        FROM genre_lovers gl
        JOIN personality_users p ON gl.user_id = p.user_id
    """
    result = execute_query(query, (genre,))

    # Compare to overall averages
    overall_query = """
        SELECT
            ROUND(AVG(openness)::numeric, 2) as avg_openness,
            ROUND(AVG(agreeableness)::numeric, 2) as avg_agreeableness,
            ROUND(AVG(emotional_stability)::numeric, 2) as avg_emotional_stability,
            ROUND(AVG(conscientiousness)::numeric, 2) as avg_conscientiousness,
            ROUND(AVG(extraversion)::numeric, 2) as avg_extraversion
        FROM personality_users
    """
    overall = execute_query(overall_query)

    return {
        "genre": genre,
        "genre_lovers_profile": result[0] if result else None,
        "overall_average": overall[0] if overall else None,
    }


@router.get("/segments")
async def get_personality_segments():
    """
    Identify distinct viewer segments based on personality clusters.
    Useful for targeted marketing.
    """
    query = """
        WITH user_segments AS (
            SELECT
                user_id,
                CASE
                    WHEN extraversion >= 4.0 AND openness >= 4.0 THEN 'adventurous_social'
                    WHEN extraversion >= 4.0 AND openness < 3.0 THEN 'social_traditional'
                    WHEN extraversion < 3.0 AND openness >= 4.0 THEN 'curious_introvert'
                    WHEN extraversion < 3.0 AND openness < 3.0 THEN 'traditional_introvert'
                    ELSE 'balanced'
                END as segment
            FROM personality_users
        ),
        segment_preferences AS (
            SELECT
                us.segment,
                g.name as genre,
                AVG(r.rating) as avg_rating,
                COUNT(*) as rating_count
            FROM user_segments us
            JOIN ratings r ON us.user_id = r.user_id
            JOIN movie_genres mg ON r.movie_id = mg.movie_id
            JOIN genres g ON mg.genre_id = g.genre_id
            GROUP BY us.segment, g.name
            HAVING COUNT(*) >= 20
        )
        SELECT
            segment,
            genre,
            ROUND(avg_rating::numeric, 2) as avg_rating,
            rating_count
        FROM segment_preferences
        ORDER BY segment, avg_rating DESC
    """
    results = execute_query(query)

    # Group by segment
    segments = {}
    for row in results:
        segment = row["segment"]
        if segment not in segments:
            segments[segment] = []
        segments[segment].append({
            "genre": row["genre"],
            "avg_rating": row["avg_rating"],
            "rating_count": row["rating_count"],
        })

    return segments
