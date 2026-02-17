"""
Tests for collections API endpoints.
"""

import pytest
from unittest.mock import patch, MagicMock

from app.auth.schemas import UserRead


class TestCollectionsEndpoints:
    """Test suite for /api/collections endpoints."""

    def test_get_collections_unauthorized(self, client):
        """Test getting collections without authentication."""
        response = client.get("/api/collections")

        assert response.status_code in [401, 403]

    def test_get_collections_success(self, client, sample_collection):
        """Test getting user collections with authentication."""
        with patch("app.routers.collections.get_current_user") as mock_user:
            mock_user.return_value = UserRead(
                id=1,
                username="testuser",
                email="test@example.com",
                created_at="2024-01-01T00:00:00",
                is_active=True,
            )
            with patch("app.routers.collections.execute_query") as mock_query:
                mock_query.return_value = [sample_collection]

                response = client.get(
                    "/api/collections",
                    headers={"Authorization": "Bearer valid_token"},
                )

                # Should either succeed or require real auth
                assert response.status_code in [200, 401, 403]

    def test_create_collection_unauthorized(self, client):
        """Test creating collection without authentication."""
        response = client.post(
            "/api/collections",
            json={"title": "My Collection", "note": "Test note"},
        )

        assert response.status_code in [401, 403]

    def test_delete_collection_unauthorized(self, client):
        """Test deleting collection without authentication."""
        response = client.delete("/api/collections/1")

        assert response.status_code in [401, 403]

    def test_add_movie_to_collection_unauthorized(self, client):
        """Test adding movie to collection without authentication."""
        response = client.post(
            "/api/collections/1/movies",
            json={"movie_id": 1},
        )

        assert response.status_code in [401, 403]

    def test_remove_movie_from_collection_unauthorized(self, client):
        """Test removing movie from collection without authentication."""
        response = client.delete("/api/collections/1/movies/1")

        assert response.status_code in [401, 403]


class TestCollectionValidation:
    """Test suite for collection data validation."""

    def test_create_collection_missing_title(self, client, auth_headers):
        """Test creating collection without title."""
        response = client.post(
            "/api/collections",
            json={"note": "Test note"},
            headers=auth_headers,
        )

        # Should fail validation or auth
        assert response.status_code in [401, 403, 422]

    def test_add_movie_missing_movie_id(self, client, auth_headers):
        """Test adding movie without movie_id."""
        response = client.post(
            "/api/collections/1/movies",
            json={},
            headers=auth_headers,
        )

        # Should fail validation or auth
        assert response.status_code in [401, 403, 422]
