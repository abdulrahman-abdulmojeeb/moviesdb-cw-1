from fastapi import APIRouter, Query, HTTPException
from typing import Optional

from app.database import execute_query, execute_query_one

router = APIRouter()

# TMDB image base URL
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"


def build_poster_url(poster_path: str | None) -> str | None:
    """Build full TMDB poster URL from path."""
    if poster_path:
        return f"{TMDB_IMAGE_BASE}{poster_path}"
    return None


@router.get("")
async def get_movies(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    title: Optional[str] = None,
    genre: Optional[str] = None,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    sort_by: str = Query("title", regex="^(title|year|rating)$"),
    sort_order: str = Query("asc", regex="^(asc|desc)$"),
):
    """
    Get paginated list of movies with optional filters.
    Requirement 1: Movie Catalogue Dashboard
    """
    offset = (page - 1) * limit

    # Build query dynamically based on filters
    conditions = []
    params = []

    if title:
        conditions.append("m.title ILIKE %s")
        params.append(f"%{title}%")

    if genre:
        conditions.append("""
            m.movie_id IN (
                SELECT mg.movie_id FROM movie_genres mg
                JOIN genres g ON mg.genre_id = g.genre_id
                WHERE g.name ILIKE %s
            )
        """)
        params.append(f"%{genre}%")

    if year_from:
        conditions.append("m.release_year >= %s")
        params.append(year_from)

    if year_to:
        conditions.append("m.release_year <= %s")
        params.append(year_to)

    if min_rating:
        conditions.append("""
            m.movie_id IN (
                SELECT movie_id FROM ratings
                GROUP BY movie_id
                HAVING AVG(rating) >= %s
            )
        """)
        params.append(min_rating)

    where_clause = " AND ".join(conditions) if conditions else "1=1"

    # Map sort fields
    sort_field_map = {
        "title": "m.title",
        "year": "m.release_year",
        "rating": "avg_rating",
    }
    order_by = f"{sort_field_map[sort_by]} {sort_order.upper()}"

    query = f"""
        SELECT
            m.movie_id,
            m.title,
            m.release_year,
            m.imdb_id,
            m.tmdb_id,
            md.poster_path,
            md.overview,
            md.vote_average,
            md.vote_count,
            er.imdb_rating,
            er.imdb_votes,
            COALESCE(AVG(r.rating), 0) as avg_rating,
            COUNT(r.rating_id) as rating_count,
            ARRAY_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL) as genres
        FROM movies m
        LEFT JOIN movie_details md ON m.movie_id = md.movie_id
        LEFT JOIN external_ratings er ON m.movie_id = er.movie_id
        LEFT JOIN ratings r ON m.movie_id = r.movie_id
        LEFT JOIN movie_genres mg ON m.movie_id = mg.movie_id
        LEFT JOIN genres g ON mg.genre_id = g.genre_id
        WHERE {where_clause}
        GROUP BY m.movie_id, md.poster_path, md.overview, md.vote_average, md.vote_count, er.imdb_rating, er.imdb_votes
        ORDER BY {order_by}
        LIMIT %s OFFSET %s
    """
    params.extend([limit, offset])

    movies = execute_query(query, tuple(params))

    # Add poster_url to each movie
    for movie in movies:
        movie["poster_url"] = build_poster_url(movie.get("poster_path"))

    # Get total count
    count_query = f"""
        SELECT COUNT(DISTINCT m.movie_id)
        FROM movies m
        LEFT JOIN movie_genres mg ON m.movie_id = mg.movie_id
        LEFT JOIN genres g ON mg.genre_id = g.genre_id
        WHERE {where_clause}
    """
    total_result = execute_query_one(count_query, tuple(params[:-2]) if params[:-2] else None)
    total = total_result["count"] if total_result else 0

    return {
        "movies": movies,
        "page": page,
        "limit": limit,
        "total": total,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/{movie_id}")
async def get_movie(movie_id: int):
    """Get detailed information about a specific movie."""
    query = """
        SELECT
            m.movie_id,
            m.title,
            m.release_year,
            m.imdb_id,
            m.tmdb_id,
            md.poster_path,
            md.backdrop_path,
            md.overview,
            md.runtime,
            md.budget,
            md.revenue,
            md.popularity,
            md.vote_average,
            md.vote_count,
            md.director,
            md.lead_actors,
            er.imdb_rating,
            er.imdb_votes,
            er.rotten_tomatoes_score,
            er.metacritic_score,
            er.box_office,
            er.awards,
            er.rated,
            COALESCE(AVG(r.rating), 0) as avg_rating,
            COUNT(r.rating_id) as rating_count,
            ARRAY_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL) as genres,
            ARRAY_AGG(DISTINCT t.tag_text) FILTER (WHERE t.tag_text IS NOT NULL) as tags
        FROM movies m
        LEFT JOIN movie_details md ON m.movie_id = md.movie_id
        LEFT JOIN external_ratings er ON m.movie_id = er.movie_id
        LEFT JOIN ratings r ON m.movie_id = r.movie_id
        LEFT JOIN movie_genres mg ON m.movie_id = mg.movie_id
        LEFT JOIN genres g ON mg.genre_id = g.genre_id
        LEFT JOIN tags t ON m.movie_id = t.movie_id
        WHERE m.movie_id = %s
        GROUP BY m.movie_id, md.poster_path, md.backdrop_path, md.overview,
                 md.runtime, md.budget, md.revenue, md.popularity,
                 md.vote_average, md.vote_count, md.director, md.lead_actors,
                 er.imdb_rating, er.imdb_votes, er.rotten_tomatoes_score,
                 er.metacritic_score, er.box_office, er.awards, er.rated
    """
    movie = execute_query_one(query, (movie_id,))

    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    # Add poster URLs
    movie["poster_url"] = build_poster_url(movie.get("poster_path"))
    movie["backdrop_url"] = build_poster_url(movie.get("backdrop_path"))

    return movie


@router.get("/{movie_id}/ratings")
async def get_movie_ratings(movie_id: int):
    """Get rating distribution for a specific movie."""
    query = """
        WITH rating_counts AS (
            SELECT
                rating,
                COUNT(*) as count
            FROM ratings
            WHERE movie_id = %s
            GROUP BY rating
        )
        SELECT
            rating,
            count,
            ROUND(100.0 * count / SUM(count) OVER(), 1) as percentage
        FROM rating_counts
        ORDER BY rating
    """
    distribution = execute_query(query, (movie_id,))

    stats_query = """
        SELECT
            ROUND(AVG(rating)::numeric, 2) as mean,
            ROUND(STDDEV(rating)::numeric, 2) as stddev,
            MIN(rating) as min,
            MAX(rating) as max,
            COUNT(*) as total
        FROM ratings
        WHERE movie_id = %s
    """
    stats = execute_query_one(stats_query, (movie_id,))

    return {
        "movie_id": movie_id,
        "distribution": distribution,
        "stats": stats,
    }
