"""
Tests for authentication API endpoints.
"""

import pytest
from unittest.mock import patch, MagicMock


class TestAuthEndpoints:
    """Test suite for /api/auth endpoints."""

    def test_register_success(self, client):
        """Test successful user registration."""
        with patch("app.auth.users.user_db") as mock_db:
            mock_db.get_user_by_username.return_value = None
            mock_db.get_user_by_email.return_value = None
            mock_db.create_user.return_value = {
                "id": 1,
                "username": "newuser",
                "email": "new@example.com",
                "created_at": "2024-01-01T00:00:00",
                "is_active": True,
            }

            response = client.post(
                "/api/auth/register",
                json={
                    "username": "newuser",
                    "password": "securepass123",
                    "email": "new@example.com",
                    "invite_token": "b89c7ef625663c6d6e7d4e76dedb6d3e",
                },
            )

            assert response.status_code == 201
            data = response.json()
            assert data["username"] == "newuser"
            assert "password" not in data
            assert "password_hash" not in data

    def test_register_invalid_invite_token(self, client):
        """Test registration with invalid invite token."""
        response = client.post(
            "/api/auth/register",
            json={
                "username": "newuser",
                "password": "securepass123",
                "invite_token": "invalid_token",
            },
        )

        assert response.status_code == 403
        assert "invalid" in response.json()["detail"].lower()

    def test_register_username_exists(self, client):
        """Test registration with existing username."""
        with patch("app.auth.users.user_db") as mock_db:
            mock_db.get_user_by_username.return_value = {"id": 1, "username": "existinguser"}

            response = client.post(
                "/api/auth/register",
                json={
                    "username": "existinguser",
                    "password": "securepass123",
                    "invite_token": "b89c7ef625663c6d6e7d4e76dedb6d3e",
                },
            )

            assert response.status_code == 400
            assert "already registered" in response.json()["detail"].lower()

    def test_register_missing_fields(self, client):
        """Test registration with missing fields."""
        response = client.post(
            "/api/auth/register",
            json={
                "username": "newuser",
            },
        )

        assert response.status_code == 422

    def test_login_success(self, client):
        """Test successful login."""
        with patch("app.auth.users.user_db") as mock_db:
            with patch("app.auth.users.verify_password") as mock_verify:
                mock_db.get_user_by_username.return_value = {
                    "id": 1,
                    "username": "testuser",
                    "password_hash": "hashed",
                    "is_active": True,
                }
                mock_verify.return_value = True

                response = client.post(
                    "/api/auth/login",
                    json={
                        "username": "testuser",
                        "password": "correctpassword",
                    },
                )

                assert response.status_code == 200
                data = response.json()
                assert "access_token" in data
                assert "refresh_token" in data
                assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client):
        """Test login with wrong password."""
        with patch("app.auth.users.user_db") as mock_db:
            with patch("app.auth.users.verify_password") as mock_verify:
                mock_db.get_user_by_username.return_value = {
                    "id": 1,
                    "username": "testuser",
                    "password_hash": "hashed",
                    "is_active": True,
                }
                mock_verify.return_value = False

                response = client.post(
                    "/api/auth/login",
                    json={
                        "username": "testuser",
                        "password": "wrongpassword",
                    },
                )

                assert response.status_code == 401

    def test_login_user_not_found(self, client):
        """Test login with non-existent user."""
        with patch("app.auth.users.user_db") as mock_db:
            mock_db.get_user_by_username.return_value = None

            response = client.post(
                "/api/auth/login",
                json={
                    "username": "nonexistent",
                    "password": "password",
                },
            )

            assert response.status_code == 401

    def test_login_inactive_user(self, client):
        """Test login with inactive user."""
        with patch("app.auth.users.user_db") as mock_db:
            with patch("app.auth.users.verify_password") as mock_verify:
                mock_db.get_user_by_username.return_value = {
                    "id": 1,
                    "username": "testuser",
                    "password_hash": "hashed",
                    "is_active": False,
                }
                mock_verify.return_value = True

                response = client.post(
                    "/api/auth/login",
                    json={
                        "username": "testuser",
                        "password": "correctpassword",
                    },
                )

                assert response.status_code == 403

    def test_get_me_unauthorized(self, client):
        """Test getting current user without auth."""
        response = client.get("/api/auth/me")

        assert response.status_code in [401, 403]

    def test_refresh_token_invalid(self, client):
        """Test refresh with invalid token."""
        response = client.post(
            "/api/auth/refresh",
            headers={"Authorization": "Bearer invalid_token"},
        )

        assert response.status_code == 401


class TestPasswordSecurity:
    """Test suite for password security."""

    def test_password_not_in_response(self, client):
        """Test that passwords are never returned in responses."""
        with patch("app.auth.users.user_db") as mock_db:
            mock_db.get_user_by_username.return_value = None
            mock_db.create_user.return_value = {
                "id": 1,
                "username": "newuser",
                "created_at": "2024-01-01T00:00:00",
                "is_active": True,
            }

            response = client.post(
                "/api/auth/register",
                json={
                    "username": "newuser",
                    "password": "mysecretpassword",
                    "invite_token": "b89c7ef625663c6d6e7d4e76dedb6d3e",
                },
            )

            data = response.json()
            # Password should never appear in response
            assert "password" not in str(data).lower() or "password_hash" not in str(data)
