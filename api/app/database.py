import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from typing import Generator
import logging

from app.config import get_settings

logger = logging.getLogger(__name__)

# Connection pool
connection_pool: pool.ThreadedConnectionPool | None = None


def init_db_pool(min_connections: int = 1, max_connections: int = 10) -> None:
    """Initialize the database connection pool."""
    global connection_pool
    settings = get_settings()

    try:
        connection_pool = pool.ThreadedConnectionPool(
            min_connections,
            max_connections,
            settings.database_url,
        )
        logger.info("Database connection pool initialized")
    except psycopg2.Error as e:
        logger.error(f"Failed to initialize database pool: {e}")
        raise


def close_db_pool() -> None:
    """Close all connections in the pool."""
    global connection_pool
    if connection_pool:
        connection_pool.closeall()
        logger.info("Database connection pool closed")


@contextmanager
def get_db_connection() -> Generator:
    """Get a database connection from the pool."""
    global connection_pool
    if connection_pool is None:
        raise RuntimeError("Database pool not initialized")

    connection = None
    try:
        connection = connection_pool.getconn()
        yield connection
        connection.commit()
    except psycopg2.Error as e:
        if connection:
            connection.rollback()
        logger.error(f"Database error: {e}")
        raise
    finally:
        if connection:
            connection_pool.putconn(connection)


@contextmanager
def get_db_cursor(cursor_factory=RealDictCursor) -> Generator:
    """Get a database cursor with automatic connection handling."""
    with get_db_connection() as conn:
        cursor = conn.cursor(cursor_factory=cursor_factory)
        try:
            yield cursor
        finally:
            cursor.close()


def execute_query(query: str, params: tuple | None = None) -> list[dict]:
    """Execute a SELECT query and return results as list of dicts."""
    with get_db_cursor() as cursor:
        cursor.execute(query, params)
        return cursor.fetchall()


def execute_query_one(query: str, params: tuple | None = None) -> dict | None:
    """Execute a SELECT query and return a single result."""
    with get_db_cursor() as cursor:
        cursor.execute(query, params)
        return cursor.fetchone()


def execute_command(query: str, params: tuple | None = None) -> int:
    """Execute an INSERT/UPDATE/DELETE query and return affected rows."""
    with get_db_cursor() as cursor:
        cursor.execute(query, params)
        return cursor.rowcount


def execute_returning(query: str, params: tuple | None = None) -> dict | None:
    """Execute an INSERT/UPDATE with RETURNING clause."""
    with get_db_cursor() as cursor:
        cursor.execute(query, params)
        return cursor.fetchone()
