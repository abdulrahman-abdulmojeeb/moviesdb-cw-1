"""
Pytest fixtures and configuration for backend tests.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from app.main import app
from app.database import init_db_pool, close_db_pool


@pytest.fixture(scope="module")
def client():
    """Create a test client for the FastAPI app."""
    # Skip lifespan events in tests
    with patch("app.main.init_db_pool"), patch("app.main.close_db_pool"):
        with TestClient(app) as test_client:
            yield test_client


@pytest.fixture
def mock_db_query():
    """Mock database query execution."""
    with patch("app.database.execute_query") as mock:
        yield mock


@pytest.fixture
def mock_db_query_one():
    """Mock database query_one execution."""
    with patch("app.database.execute_query_one") as mock:
        yield mock


@pytest.fixture
def mock_db_execute():
    """Mock database execute command."""
    with patch("app.database.execute_command") as mock:
        yield mock


@pytest.fixture
def mock_db_returning():
    """Mock database execute_returning."""
    with patch("app.database.execute_returning") as mock:
        yield mock


@pytest.fixture
def sample_movie():
    """Sample movie data for testing."""
    return {
        "movie_id": 1,
        "title": "Test Movie",
        "release_year": 2020,
        "imdb_id": "tt1234567",
        "tmdb_id": 12345,
        "poster_path": "/test.jpg",
        "overview": "A test movie description",
        "vote_average": 7.5,
        "vote_count": 100,
        "avg_rating": 3.8,
        "rating_count": 50,
        "genres": ["Action", "Drama"],
        "tags": ["exciting", "emotional"],
        "imdb_rating": 7.8,
        "imdb_votes": 10000,
    }


@pytest.fixture
def sample_genre():
    """Sample genre data for testing."""
    return {
        "genre_id": 1,
        "name": "Action",
        "movie_count": 150,
    }


@pytest.fixture
def sample_user():
    """Sample user data for testing."""
    return {
        "id": 1,
        "username": "testuser",
        "email": "test@example.com",
        "password_hash": "$2b$12$test_hash",
        "created_at": "2024-01-01T00:00:00",
        "is_active": True,
    }


@pytest.fixture
def sample_collection():
    """Sample collection data for testing."""
    return {
        "collection_id": 1,
        "user_id": 1,
        "title": "My Favorites",
        "note": "My favorite movies",
        "created_at": "2024-01-01T00:00:00",
        "movie_count": 5,
    }


@pytest.fixture
def auth_headers():
    """Create mock authorization headers."""
    # This creates a real-looking JWT but tests should mock the verification
    return {"Authorization": "Bearer test_token_12345"}
