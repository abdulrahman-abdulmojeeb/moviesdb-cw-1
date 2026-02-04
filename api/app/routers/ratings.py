from fastapi import APIRouter, Query
from typing import Optional

from app.database import execute_query

router = APIRouter()


@router.get("/patterns")
async def get_rating_patterns():
    """
    Analyze viewer rating patterns across genres.
    Requirement 3: Analysis of Viewer Rating Patterns
    """
    query = """
        WITH user_genre_ratings AS (
            SELECT
                r.user_id,
                g.name as genre,
                AVG(r.rating) as avg_rating,
                COUNT(*) as rating_count
            FROM ratings r
            JOIN movie_genres mg ON r.movie_id = mg.movie_id
            JOIN genres g ON mg.genre_id = g.genre_id
            GROUP BY r.user_id, g.name
            HAVING COUNT(*) >= 5
        )
        SELECT
            genre,
            COUNT(DISTINCT user_id) as user_count,
            ROUND(AVG(avg_rating)::numeric, 2) as mean_user_avg,
            ROUND(STDDEV(avg_rating)::numeric, 2) as stddev_user_avg
        FROM user_genre_ratings
        GROUP BY genre
        ORDER BY mean_user_avg DESC
    """
    return execute_query(query)


@router.get("/cross-genre")
async def get_cross_genre_preferences(
    source_genre: str = Query(..., description="Genre to analyze preferences from"),
    min_ratings: int = Query(10, ge=1, description="Minimum ratings in source genre"),
):
    """
    Find which other genres users who rate a specific genre highly also enjoy.
    Requirement 3: Cross-genre preference analysis
    """
    query = """
        WITH genre_lovers AS (
            SELECT DISTINCT r.user_id
            FROM ratings r
            JOIN movie_genres mg ON r.movie_id = mg.movie_id
            JOIN genres g ON mg.genre_id = g.genre_id
            WHERE g.name ILIKE %s
            GROUP BY r.user_id
            HAVING COUNT(*) >= %s AND AVG(r.rating) >= 4.0
        ),
        other_genre_ratings AS (
            SELECT
                g.name as genre,
                AVG(r.rating) as avg_rating,
                COUNT(*) as rating_count
            FROM ratings r
            JOIN movie_genres mg ON r.movie_id = mg.movie_id
            JOIN genres g ON mg.genre_id = g.genre_id
            WHERE r.user_id IN (SELECT user_id FROM genre_lovers)
              AND g.name NOT ILIKE %s
            GROUP BY g.name
        )
        SELECT
            genre,
            ROUND(avg_rating::numeric, 2) as avg_rating,
            rating_count
        FROM other_genre_ratings
        WHERE rating_count >= 50
        ORDER BY avg_rating DESC
    """
    return execute_query(query, (source_genre, min_ratings, source_genre))


@router.get("/low-raters")
async def get_low_rater_patterns():
    """
    Analyze if users who give low ratings to one film give low ratings to others.
    Requirement 3: Low rater pattern analysis
    """
    query = """
        WITH user_rating_stats AS (
            SELECT
                user_id,
                AVG(rating) as overall_avg,
                STDDEV(rating) as rating_stddev,
                COUNT(*) as total_ratings,
                SUM(CASE WHEN rating <= 2 THEN 1 ELSE 0 END) as low_rating_count
            FROM ratings
            GROUP BY user_id
            HAVING COUNT(*) >= 20
        ),
        user_categories AS (
            SELECT
                user_id,
                overall_avg,
                rating_stddev,
                total_ratings,
                CASE
                    WHEN overall_avg <= 2.5 THEN 'harsh_critic'
                    WHEN overall_avg >= 4.0 THEN 'generous_rater'
                    ELSE 'balanced_rater'
                END as rater_type
            FROM user_rating_stats
        )
        SELECT
            rater_type,
            COUNT(*) as user_count,
            ROUND(AVG(overall_avg)::numeric, 2) as avg_rating,
            ROUND(AVG(rating_stddev)::numeric, 2) as avg_stddev,
            ROUND(AVG(total_ratings)::numeric, 0) as avg_total_ratings
        FROM user_categories
        GROUP BY rater_type
        ORDER BY avg_rating
    """
    return execute_query(query)


@router.get("/consistency")
async def get_rating_consistency(
    genre: Optional[str] = None,
):
    """
    Analyze rating consistency within genres - do users rate consistently?
    """
    genre_filter = ""
    params = ()

    if genre:
        genre_filter = """
            JOIN movie_genres mg ON r.movie_id = mg.movie_id
            JOIN genres g ON mg.genre_id = g.genre_id
            WHERE g.name ILIKE %s
        """
        params = (genre,)

    query = f"""
        WITH user_genre_consistency AS (
            SELECT
                r.user_id,
                STDDEV(r.rating) as rating_consistency,
                COUNT(*) as rating_count,
                AVG(r.rating) as avg_rating
            FROM ratings r
            {genre_filter}
            GROUP BY r.user_id
            HAVING COUNT(*) >= 10
        )
        SELECT
            CASE
                WHEN rating_consistency < 0.5 THEN 'very_consistent'
                WHEN rating_consistency < 1.0 THEN 'consistent'
                WHEN rating_consistency < 1.5 THEN 'varied'
                ELSE 'highly_varied'
            END as consistency_level,
            COUNT(*) as user_count,
            ROUND(AVG(avg_rating)::numeric, 2) as mean_avg_rating
        FROM user_genre_consistency
        GROUP BY consistency_level
        ORDER BY consistency_level
    """
    return execute_query(query, params if params else None)
