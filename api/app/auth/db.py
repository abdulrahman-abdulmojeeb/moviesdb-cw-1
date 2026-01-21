from datetime import datetime
from typing import Optional

from app.database import execute_query_one, execute_returning
from app.auth.schemas import UserRead


def get_user_by_id(user_id: int) -> Optional[dict]:
    """Get user by ID."""
    query = """
        SELECT user_id as id, username, email, password_hash, created_at, is_active
        FROM app_users
        WHERE user_id = %s
    """
    return execute_query_one(query, (user_id,))


def get_user_by_username(username: str) -> Optional[dict]:
    """Get user by username."""
    query = """
        SELECT user_id as id, username, email, password_hash, created_at, is_active
        FROM app_users
        WHERE username = %s
    """
    return execute_query_one(query, (username,))


def get_user_by_email(email: str) -> Optional[dict]:
    """Get user by email."""
    query = """
        SELECT user_id as id, username, email, password_hash, created_at, is_active
        FROM app_users
        WHERE email = %s
    """
    return execute_query_one(query, (email,))


def create_user(username: str, email: Optional[str], password_hash: str) -> dict:
    """Create a new user."""
    query = """
        INSERT INTO app_users (username, email, password_hash, created_at, is_active)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING user_id as id, username, email, created_at, is_active
    """
    return execute_returning(query, (username, email, password_hash, datetime.utcnow(), True))


def update_user(user_id: int, updates: dict) -> Optional[dict]:
    """Update user fields."""
    if not updates:
        return get_user_by_id(user_id)

    set_clauses = []
    params = []

    for field, value in updates.items():
        set_clauses.append(f"{field} = %s")
        params.append(value)

    params.append(user_id)

    query = f"""
        UPDATE app_users
        SET {", ".join(set_clauses)}
        WHERE user_id = %s
        RETURNING user_id as id, username, email, created_at, is_active
    """
    return execute_returning(query, tuple(params))


def deactivate_user(user_id: int) -> bool:
    """Deactivate a user account."""
    query = """
        UPDATE app_users
        SET is_active = FALSE
        WHERE user_id = %s
        RETURNING user_id
    """
    result = execute_returning(query, (user_id,))
    return result is not None
