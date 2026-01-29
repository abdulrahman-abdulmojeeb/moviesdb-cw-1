from fastapi import APIRouter

from app.database import execute_query

router = APIRouter()


@router.get("")
async def get_genres():
    """Get all genres with movie counts."""
    query = """
        SELECT
            g.genre_id,
            g.name,
            COUNT(mg.movie_id) as movie_count
        FROM genres g
        LEFT JOIN movie_genres mg ON g.genre_id = mg.genre_id
        GROUP BY g.genre_id
        ORDER BY g.name
    """
    return execute_query(query)


@router.get("/popularity")
async def get_genre_popularity():
    """
    Get genre popularity report with average ratings.
    Requirement 2: Genre Popularity Reports
    """
    query = """
        SELECT
            g.name as genre,
            COUNT(DISTINCT r.rating_id) as total_ratings,
            COUNT(DISTINCT mg.movie_id) as movie_count,
            ROUND(AVG(r.rating)::numeric, 2) as avg_rating,
            ROUND(STDDEV(r.rating)::numeric, 2) as rating_stddev
        FROM genres g
        JOIN movie_genres mg ON g.genre_id = mg.genre_id
        JOIN ratings r ON mg.movie_id = r.movie_id
        GROUP BY g.genre_id, g.name
        ORDER BY avg_rating DESC
    """
    return execute_query(query)


@router.get("/polarisation")
async def get_genre_polarisation():
    """
    Identify polarising genres with high variance in ratings.
    Requirement 2: Genre Polarisation Reports
    """
    query = """
        WITH genre_ratings AS (
            SELECT
                g.name as genre,
                r.rating,
                COUNT(*) as count
            FROM genres g
            JOIN movie_genres mg ON g.genre_id = mg.genre_id
            JOIN ratings r ON mg.movie_id = r.movie_id
            GROUP BY g.name, r.rating
        ),
        genre_stats AS (
            SELECT
                genre,
                SUM(count) as total_ratings,
                SUM(CASE WHEN rating <= 2 THEN count ELSE 0 END) as low_ratings,
                SUM(CASE WHEN rating >= 4 THEN count ELSE 0 END) as high_ratings,
                SUM(CASE WHEN rating > 2 AND rating < 4 THEN count ELSE 0 END) as mid_ratings
            FROM genre_ratings
            GROUP BY genre
        )
        SELECT
            genre,
            total_ratings,
            ROUND(100.0 * low_ratings / total_ratings, 1) as low_pct,
            ROUND(100.0 * mid_ratings / total_ratings, 1) as mid_pct,
            ROUND(100.0 * high_ratings / total_ratings, 1) as high_pct,
            ROUND(100.0 * (low_ratings + high_ratings) / total_ratings, 1) as polarisation_score
        FROM genre_stats
        WHERE total_ratings >= 100
        ORDER BY polarisation_score DESC
    """
    return execute_query(query)
