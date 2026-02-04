from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from app.database import execute_query, execute_query_one

router = APIRouter()


class MoviePredictionRequest(BaseModel):
    title: str
    genres: list[str]
    year: Optional[int] = None


@router.post("/predict")
async def predict_rating(request: MoviePredictionRequest):
    """
    Predict likely viewer ratings for a new/upcoming title.
    Requirement 4: Predictive Ratings
    Uses content-based similarity to find similar movies and predict ratings.
    """
    if not request.genres:
        raise HTTPException(status_code=400, detail="At least one genre is required")

    # Find similar movies based on genres
    genre_placeholders = ", ".join(["%s"] * len(request.genres))

    query = f"""
        WITH target_genres AS (
            SELECT genre_id FROM genres WHERE name = ANY(%s)
        ),
        similar_movies AS (
            SELECT
                m.movie_id,
                m.title,
                m.release_year,
                COUNT(DISTINCT mg.genre_id) as matching_genres,
                (SELECT COUNT(*) FROM target_genres) as total_target_genres
            FROM movies m
            JOIN movie_genres mg ON m.movie_id = mg.movie_id
            WHERE mg.genre_id IN (SELECT genre_id FROM target_genres)
            GROUP BY m.movie_id
            HAVING COUNT(DISTINCT mg.genre_id) >= GREATEST(1, (SELECT COUNT(*) FROM target_genres) / 2)
            ORDER BY matching_genres DESC
            LIMIT 50
        ),
        similar_ratings AS (
            SELECT
                r.rating,
                sm.matching_genres::float / sm.total_target_genres as genre_similarity
            FROM similar_movies sm
            JOIN ratings r ON sm.movie_id = r.movie_id
        )
        SELECT
            ROUND(AVG(rating)::numeric, 2) as predicted_rating,
            ROUND(STDDEV(rating)::numeric, 2) as uncertainty,
            COUNT(*) as based_on_ratings,
            ROUND((AVG(rating * genre_similarity) / NULLIF(AVG(genre_similarity), 0))::numeric, 2) as weighted_prediction
        FROM similar_ratings
    """

    result = execute_query_one(query, (request.genres,))

    if not result or result["based_on_ratings"] == 0:
        raise HTTPException(
            status_code=404,
            detail="Not enough similar movies found to make prediction"
        )

    # Get rating distribution prediction
    distribution_query = f"""
        WITH target_genres AS (
            SELECT genre_id FROM genres WHERE name = ANY(%s)
        ),
        similar_movies AS (
            SELECT m.movie_id
            FROM movies m
            JOIN movie_genres mg ON m.movie_id = mg.movie_id
            WHERE mg.genre_id IN (SELECT genre_id FROM target_genres)
            GROUP BY m.movie_id
            HAVING COUNT(DISTINCT mg.genre_id) >= GREATEST(1, (SELECT COUNT(*) FROM target_genres) / 2)
            LIMIT 50
        )
        SELECT
            rating,
            COUNT(*) as count,
            ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 1) as percentage
        FROM ratings
        WHERE movie_id IN (SELECT movie_id FROM similar_movies)
        GROUP BY rating
        ORDER BY rating
    """

    distribution = execute_query(distribution_query, (request.genres,))

    return {
        "title": request.title,
        "genres": request.genres,
        "prediction": {
            "mean_rating": result["predicted_rating"],
            "weighted_rating": result["weighted_prediction"],
            "uncertainty": result["uncertainty"],
            "confidence_interval": {
                "low": max(0.5, float(result["predicted_rating"]) - float(result["uncertainty"] or 0)),
                "high": min(5.0, float(result["predicted_rating"]) + float(result["uncertainty"] or 0)),
            },
            "based_on_ratings": result["based_on_ratings"],
        },
        "distribution": distribution,
    }


TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"


@router.get("/similar/{movie_id}")
async def get_similar_movies(
    movie_id: int,
    limit: int = Query(10, ge=1, le=50),
):
    """
    Find similar movies based on genre overlap and rating patterns.
    """
    # First get the target movie's genres
    movie = execute_query_one(
        "SELECT movie_id, title FROM movies WHERE movie_id = %s",
        (movie_id,)
    )

    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    query = """
        WITH target_genres AS (
            SELECT genre_id FROM movie_genres WHERE movie_id = %s
        ),
        genre_similarity AS (
            SELECT
                m.movie_id,
                m.title,
                m.release_year,
                md.poster_path,
                COUNT(DISTINCT mg.genre_id) as matching_genres,
                (SELECT COUNT(*) FROM target_genres) as total_genres
            FROM movies m
            JOIN movie_genres mg ON m.movie_id = mg.movie_id
            LEFT JOIN movie_details md ON m.movie_id = md.movie_id
            WHERE mg.genre_id IN (SELECT genre_id FROM target_genres)
              AND m.movie_id != %s
            GROUP BY m.movie_id, md.poster_path
        )
        SELECT
            gs.movie_id,
            gs.title,
            gs.release_year,
            gs.poster_path,
            gs.matching_genres,
            ROUND(100.0 * gs.matching_genres / gs.total_genres, 1) as genre_similarity_pct,
            ROUND(AVG(r.rating)::numeric, 2) as avg_rating,
            COUNT(r.rating_id) as rating_count
        FROM genre_similarity gs
        LEFT JOIN ratings r ON gs.movie_id = r.movie_id
        GROUP BY gs.movie_id, gs.title, gs.release_year, gs.poster_path, gs.matching_genres, gs.total_genres
        ORDER BY genre_similarity_pct DESC, avg_rating DESC
        LIMIT %s
    """

    similar = execute_query(query, (movie_id, movie_id, limit))

    # Add poster URLs
    for item in similar:
        poster_path = item.get("poster_path")
        item["poster_url"] = f"{TMDB_IMAGE_BASE}{poster_path}" if poster_path else None

    return {
        "source_movie": movie,
        "similar_movies": similar,
    }


@router.get("/preview-panel")
async def get_preview_panel_prediction(
    movie_id: int,
    panel_size: int = Query(100, ge=10, le=500),
):
    """
    Generate predicted rating using a 'preview panel' of representative users.
    Requirement 4: Preview panel prediction
    """
    # Select diverse users who rate frequently and have varied tastes
    query = """
        WITH active_users AS (
            SELECT
                user_id,
                AVG(rating) as avg_rating,
                STDDEV(rating) as rating_variance,
                COUNT(*) as rating_count
            FROM ratings
            GROUP BY user_id
            HAVING COUNT(*) >= 50 AND STDDEV(rating) > 0.5
            ORDER BY RANDOM()
            LIMIT %s
        ),
        target_movie_genres AS (
            SELECT genre_id FROM movie_genres WHERE movie_id = %s
        ),
        panel_genre_preferences AS (
            SELECT
                au.user_id,
                AVG(r.rating) as genre_avg_rating
            FROM active_users au
            JOIN ratings r ON au.user_id = r.user_id
            JOIN movie_genres mg ON r.movie_id = mg.movie_id
            WHERE mg.genre_id IN (SELECT genre_id FROM target_movie_genres)
            GROUP BY au.user_id
        )
        SELECT
            ROUND(AVG(genre_avg_rating)::numeric, 2) as predicted_rating,
            ROUND(STDDEV(genre_avg_rating)::numeric, 2) as uncertainty,
            COUNT(*) as panel_members_with_data
        FROM panel_genre_preferences
    """

    result = execute_query_one(query, (panel_size, movie_id))

    if not result or result["panel_members_with_data"] == 0:
        raise HTTPException(
            status_code=404,
            detail="Could not generate prediction - insufficient data"
        )

    return {
        "movie_id": movie_id,
        "panel_size": panel_size,
        "prediction": {
            "rating": result["predicted_rating"],
            "uncertainty": result["uncertainty"],
            "panel_coverage": result["panel_members_with_data"],
        },
    }
