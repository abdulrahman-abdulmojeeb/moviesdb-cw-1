from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.database import execute_query, execute_query_one, execute_returning, execute_command
from app.auth.users import get_current_user, UserRead

router = APIRouter()


class CollectionCreate(BaseModel):
    title: str
    note: Optional[str] = None


class CollectionUpdate(BaseModel):
    title: Optional[str] = None
    note: Optional[str] = None


class CollectionItemAdd(BaseModel):
    movie_id: int


@router.get("")
async def get_user_collections(current_user: UserRead = Depends(get_current_user)):
    """
    Get all collections for the current user.
    Requirement 6: Curated Collection Planner
    """
    query = """
        SELECT
            c.collection_id,
            c.title,
            c.note,
            c.created_at,
            COUNT(ci.item_id) as movie_count
        FROM collections c
        LEFT JOIN collection_items ci ON c.collection_id = ci.collection_id
        WHERE c.user_id = %s
        GROUP BY c.collection_id
        ORDER BY c.created_at DESC
    """
    return execute_query(query, (current_user.id,))


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_collection(
    collection: CollectionCreate,
    current_user: UserRead = Depends(get_current_user),
):
    """Create a new collection."""
    query = """
        INSERT INTO collections (user_id, title, note, created_at)
        VALUES (%s, %s, %s, %s)
        RETURNING collection_id, user_id, title, note, created_at
    """
    result = execute_returning(
        query,
        (current_user.id, collection.title, collection.note, datetime.utcnow())
    )
    return result


@router.get("/{collection_id}")
async def get_collection(
    collection_id: int,
    current_user: UserRead = Depends(get_current_user),
):
    """
    Get a specific collection with movies grouped by genre.
    Requirement 6: Films within a list are grouped by Genre
    """
    # Verify ownership
    collection = execute_query_one(
        "SELECT * FROM collections WHERE collection_id = %s AND user_id = %s",
        (collection_id, current_user.id)
    )
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    # Get movies grouped by genre
    query = """
        SELECT
            g.name as genre,
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'movie_id', m.movie_id,
                    'title', m.title,
                    'release_year', m.release_year,
                    'avg_rating', COALESCE(
                        (SELECT ROUND(AVG(rating)::numeric, 2) FROM ratings WHERE movie_id = m.movie_id),
                        0
                    ),
                    'added_at', ci.added_at
                )
                ORDER BY m.title
            ) as movies
        FROM collection_items ci
        JOIN movies m ON ci.movie_id = m.movie_id
        JOIN movie_genres mg ON m.movie_id = mg.movie_id
        JOIN genres g ON mg.genre_id = g.genre_id
        WHERE ci.collection_id = %s
        GROUP BY g.name
        ORDER BY g.name
    """
    movies_by_genre = execute_query(query, (collection_id,))

    return {
        **collection,
        "movies_by_genre": movies_by_genre,
    }


@router.put("/{collection_id}")
async def update_collection(
    collection_id: int,
    updates: CollectionUpdate,
    current_user: UserRead = Depends(get_current_user),
):
    """Update a collection's title or note."""
    # Verify ownership
    collection = execute_query_one(
        "SELECT * FROM collections WHERE collection_id = %s AND user_id = %s",
        (collection_id, current_user.id)
    )
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    # Build update query
    update_fields = []
    params = []

    if updates.title is not None:
        update_fields.append("title = %s")
        params.append(updates.title)

    if updates.note is not None:
        update_fields.append("note = %s")
        params.append(updates.note)

    if not update_fields:
        return collection

    params.extend([collection_id, current_user.id])
    query = f"""
        UPDATE collections
        SET {", ".join(update_fields)}
        WHERE collection_id = %s AND user_id = %s
        RETURNING *
    """
    return execute_returning(query, tuple(params))


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_collection(
    collection_id: int,
    current_user: UserRead = Depends(get_current_user),
):
    """Delete a collection."""
    # Delete items first (cascade would handle this but being explicit)
    execute_command(
        "DELETE FROM collection_items WHERE collection_id = %s",
        (collection_id,)
    )

    rows = execute_command(
        "DELETE FROM collections WHERE collection_id = %s AND user_id = %s",
        (collection_id, current_user.id)
    )

    if rows == 0:
        raise HTTPException(status_code=404, detail="Collection not found")


@router.post("/{collection_id}/movies", status_code=status.HTTP_201_CREATED)
async def add_movie_to_collection(
    collection_id: int,
    item: CollectionItemAdd,
    current_user: UserRead = Depends(get_current_user),
):
    """
    Add a movie to a collection.
    Requirement 6: As information is being viewed in the dashboard a film can be added to a planner list
    """
    # Verify collection ownership
    collection = execute_query_one(
        "SELECT * FROM collections WHERE collection_id = %s AND user_id = %s",
        (collection_id, current_user.id)
    )
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    # Verify movie exists
    movie = execute_query_one(
        "SELECT movie_id FROM movies WHERE movie_id = %s",
        (item.movie_id,)
    )
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    # Check if already in collection
    existing = execute_query_one(
        "SELECT * FROM collection_items WHERE collection_id = %s AND movie_id = %s",
        (collection_id, item.movie_id)
    )
    if existing:
        raise HTTPException(status_code=400, detail="Movie already in collection")

    query = """
        INSERT INTO collection_items (collection_id, movie_id, added_at)
        VALUES (%s, %s, %s)
        RETURNING *
    """
    return execute_returning(query, (collection_id, item.movie_id, datetime.utcnow()))


@router.delete("/{collection_id}/movies/{movie_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_movie_from_collection(
    collection_id: int,
    movie_id: int,
    current_user: UserRead = Depends(get_current_user),
):
    """Remove a movie from a collection."""
    # Verify collection ownership
    collection = execute_query_one(
        "SELECT * FROM collections WHERE collection_id = %s AND user_id = %s",
        (collection_id, current_user.id)
    )
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    rows = execute_command(
        "DELETE FROM collection_items WHERE collection_id = %s AND movie_id = %s",
        (collection_id, movie_id)
    )

    if rows == 0:
        raise HTTPException(status_code=404, detail="Movie not in collection")
