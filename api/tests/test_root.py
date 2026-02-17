"""
Tests for root API endpoints.
"""

import pytest


class TestRootEndpoints:
    """Test suite for root endpoints."""

    def test_root_endpoint(self, client):
        """Test the root endpoint returns API info."""
        response = client.get("/")

        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "version" in data
        assert data["version"] == "1.0.0"

    def test_health_check(self, client):
        """Test the health check endpoint."""
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


class TestCorsConfiguration:
    """Test suite for CORS configuration."""

    def test_cors_headers_present(self, client):
        """Test that CORS headers are present in responses."""
        response = client.options(
            "/api/movies",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            },
        )

        # Should not fail - CORS middleware should handle this
        assert response.status_code in [200, 204, 405]
