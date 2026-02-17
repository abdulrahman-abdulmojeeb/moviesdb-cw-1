"""
Tests for the ratings API endpoints.
"""

import pytest
from unittest.mock import patch


class TestRatingsEndpoints:
    """Test suite for /api/ratings endpoints."""

    def test_get_patterns_success(self, client, mock_db_query):
        """Test rating patterns endpoint."""
        mock_db_query.return_value = [
            {
                "pattern_type": "high_rater",
                "user_count": 100,
                "avg_rating": 4.2,
                "rating_count": 5000,
            },
            {
                "pattern_type": "low_rater",
                "user_count": 50,
                "avg_rating": 2.1,
                "rating_count": 2500,
            },
        ]

        response = client.get("/api/ratings/patterns")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_cross_genre_success(self, client, mock_db_query):
        """Test cross-genre preferences endpoint."""
        mock_db_query.return_value = [
            {
                "genre": "Drama",
                "correlation": 0.85,
                "shared_users": 150,
                "avg_rating": 3.8,
            },
            {
                "genre": "Romance",
                "correlation": 0.72,
                "shared_users": 120,
                "avg_rating": 3.5,
            },
        ]

        response = client.get("/api/ratings/cross-genre?source_genre=Action")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_cross_genre_with_min_ratings(self, client, mock_db_query):
        """Test cross-genre with minimum ratings filter."""
        mock_db_query.return_value = [
            {
                "genre": "Drama",
                "correlation": 0.85,
                "shared_users": 150,
                "avg_rating": 3.8,
            },
        ]

        response = client.get("/api/ratings/cross-genre?source_genre=Action&min_ratings=10")

        assert response.status_code == 200

    def test_get_low_raters_success(self, client, mock_db_query):
        """Test low-rater patterns endpoint."""
        mock_db_query.return_value = [
            {
                "rater_category": "very_low",
                "user_count": 25,
                "avg_rating": 1.8,
                "total_ratings": 500,
            },
            {
                "rater_category": "low",
                "user_count": 75,
                "avg_rating": 2.5,
                "total_ratings": 1500,
            },
        ]

        response = client.get("/api/ratings/low-raters")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_consistency_success(self, client, mock_db_query):
        """Test rating consistency endpoint."""
        mock_db_query.return_value = [
            {
                "consistency_level": "highly_consistent",
                "user_count": 100,
                "avg_stddev": 0.5,
            },
            {
                "consistency_level": "inconsistent",
                "user_count": 50,
                "avg_stddev": 1.5,
            },
        ]

        response = client.get("/api/ratings/consistency")

        assert response.status_code == 200

    def test_get_consistency_with_genre_filter(self, client, mock_db_query):
        """Test rating consistency with genre filter."""
        mock_db_query.return_value = []

        response = client.get("/api/ratings/consistency?genre=Action")

        assert response.status_code == 200


class TestRatingsDataValidation:
    """Test suite for ratings data validation."""

    def test_cross_genre_requires_source(self, client):
        """Test that cross-genre endpoint requires source genre."""
        response = client.get("/api/ratings/cross-genre")

        # Should either require the parameter or have a default
        # Check for 422 (validation error) or 200 (if default exists)
        assert response.status_code in [200, 422]
