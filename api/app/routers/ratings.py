from fastapi import APIRouter, Query, Depends, HTTPException
from app.database import execute_query, execute_query_one, execute_returning
from typing import Optional
from app.auth.users import get_current_user, UserRead
from pydantic import BaseModel, Field

from app.database import execute_query

router = APIRouter()

class AppUserRatingCreate(BaseModel):
    movie_id: int
    rating: float = Field(..., ge=0.5, le=5.0)

class AppUserRatingUpdate(BaseModel):
    rating: float = Field(..., ge=0.5, le=5.0)

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


@router.post("/my-ratings")
async def add_rating(
    data: AppUserRatingCreate,
    current_user: UserRead = Depends(get_current_user),
):
    """Add or update a rating for a movie by the logged-in app user."""
    import time
    existing = execute_query_one(
        "SELECT * FROM app_user_ratings WHERE user_id = %s AND movie_id = %s",
        (current_user.id, data.movie_id)
    )
    if existing:
        return execute_returning(
            """
            UPDATE app_user_ratings SET rating = %s, timestamp = %s
            WHERE user_id = %s AND movie_id = %s
            RETURNING *
            """,
            (data.rating, int(time.time()), current_user.id, data.movie_id)
        )
    return execute_returning(
        """
        INSERT INTO app_user_ratings (user_id, movie_id, rating, timestamp)
        VALUES (%s, %s, %s, %s)
        RETURNING *
        """,
        (current_user.id, data.movie_id, data.rating, int(time.time()))
    )

@router.get("/my-ratings")
async def get_my_ratings(
    current_user: UserRead = Depends(get_current_user),
):
    """Get all ratings submitted by the logged-in app user."""
    return execute_query(
        """
        SELECT aur.movie_id, aur.rating, aur.timestamp, m.title, m.release_year
        FROM app_user_ratings aur
        JOIN movies m ON aur.movie_id = m.movie_id
        WHERE aur.user_id = %s
        ORDER BY aur.timestamp DESC
        """,
        (current_user.id,)
    )

@router.get("/my-ratings/{movie_id}")
async def get_my_rating_for_movie(
    movie_id: int,
    current_user: UserRead = Depends(get_current_user),
):
    """Get the logged-in user's rating for a specific movie, if it exists."""
    rating = execute_query_one(
        "SELECT * FROM app_user_ratings WHERE user_id = %s AND movie_id = %s",
        (current_user.id, movie_id)
    )
    if not rating:
        raise HTTPException(status_code=404, detail="Rating not found")
    return rating

@router.delete("/my-ratings/{movie_id}")
async def delete_my_rating(
    movie_id: int,
    current_user: UserRead = Depends(get_current_user),
):
    """Delete the logged-in user's rating for a specific movie."""
    deleted = execute_returning(
        """
        DELETE FROM app_user_ratings WHERE user_id = %s AND movie_id = %s
        RETURNING *
        """,
        (current_user.id, movie_id)
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="Rating not found")
    return {"detail": "Rating deleted"}


@router.get("/recommendations")
async def get_recommendations(
    current_user: UserRead = Depends(get_current_user),
):
    user_rating_count = execute_query_one(
        "SELECT COUNT(*) as count FROM app_user_ratings WHERE user_id = %s",
        (current_user.id,)
    )
    count = user_rating_count["count"] if user_rating_count else 0

    recommendations = []
    method = "none"

    if count >= 5:
        # use pearson correlation coefficient to find similar users from both app users and movielens dataset and
        # get recommendations based on whatever they have reviewed highest 
        recommendations = execute_query("""
            WITH app_user_input AS (
                SELECT movie_id, (rating * 2) as rating
                FROM app_user_ratings
                WHERE user_id = %s
            ),
            all_ratings AS (
                SELECT user_id::text as user_key, movie_id, (rating * 2) as rating
                FROM ratings
                UNION ALL
                SELECT ('app_' || user_id::text) as user_key, movie_id, (rating * 2) as rating
                FROM app_user_ratings
                WHERE user_id != %s
            ),
            similar_users AS (
                SELECT
                    ar.user_key,
                    CORR(ar.rating, aui.rating) as correlation,
                    COUNT(*) as common_movies
                FROM all_ratings ar
                JOIN app_user_input aui ON ar.movie_id = aui.movie_id
                GROUP BY ar.user_key
                HAVING COUNT(*) >= 3 AND CORR(ar.rating, aui.rating) > 0
                ORDER BY correlation DESC
                LIMIT 100
            ),
            candidate_movies AS (
                SELECT
                    ar.movie_id,
                    SUM(ar.rating * su.correlation) / SUM(su.correlation) as predicted_rating,
                    COUNT(DISTINCT su.user_key) as vote_count
                FROM all_ratings ar
                JOIN similar_users su ON ar.user_key = su.user_key
                WHERE ar.movie_id NOT IN (SELECT movie_id FROM app_user_input)
                AND ar.rating >= 7
                GROUP BY ar.movie_id
                HAVING COUNT(DISTINCT su.user_key) >= 2
            )
            SELECT
                m.movie_id,
                m.title,
                m.release_year,
                ROUND(cm.predicted_rating::numeric, 2) as predicted_rating,
                cm.vote_count,
                md.poster_path,
                ARRAY_AGG(DISTINCT g.name ORDER BY g.name) as genres,
                'collaborative' as method
            FROM candidate_movies cm
            JOIN movies m ON cm.movie_id = m.movie_id
            LEFT JOIN movie_details md ON m.movie_id = md.movie_id
            LEFT JOIN movie_genres mg ON m.movie_id = mg.movie_id
            LEFT JOIN genres g ON mg.genre_id = g.genre_id
            GROUP BY m.movie_id, m.title, m.release_year, cm.predicted_rating, cm.vote_count, md.poster_path
            ORDER BY cm.predicted_rating DESC, cm.vote_count DESC
            LIMIT 20
        """, (current_user.id, current_user.id))

        if recommendations:
            method = "collaborative"

    #fall back to content based (similar genres) if collaborative returned nothing OR user has < 5 ratings
    if not recommendations:
        recommendations = execute_query("""
            WITH liked_genres AS (
                SELECT mg.genre_id, AVG(aur.rating) as genre_affinity
                FROM app_user_ratings aur
                JOIN movie_genres mg ON aur.movie_id = mg.movie_id
                WHERE aur.user_id = %s
                GROUP BY mg.genre_id
            ),
            rated_movies AS (
                SELECT movie_id FROM app_user_ratings WHERE user_id = %s
            )
            SELECT
                m.movie_id,
                m.title,
                m.release_year,
                ROUND(SUM(lg.genre_affinity)::numeric, 2) as predicted_rating,
                COUNT(*) as vote_count,
                md.poster_path,
                ARRAY_AGG(DISTINCT g.name ORDER BY g.name) as genres,
                'content_based' as method
            FROM movies m
            JOIN movie_genres mg ON m.movie_id = mg.movie_id
            JOIN liked_genres lg ON mg.genre_id = lg.genre_id
            LEFT JOIN movie_details md ON m.movie_id = md.movie_id
            LEFT JOIN genres g ON mg.genre_id = g.genre_id
            WHERE m.movie_id NOT IN (SELECT movie_id FROM rated_movies)
            GROUP BY m.movie_id, m.title, m.release_year, md.poster_path
            ORDER BY predicted_rating DESC
            LIMIT 20
        """, (current_user.id, current_user.id))

        method = "content_based" if recommendations else "none"

    return {
        "method": method,
        "ratings_count": count,
        "recommendations": recommendations
    }