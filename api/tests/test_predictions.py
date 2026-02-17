"""
Tests for the predictions API endpoints.
"""

import pytest
from unittest.mock import patch


class TestPredictionsEndpoints:
    """Test suite for /api/predictions endpoints."""

    def test_predict_rating_success(self, client, mock_db_query):
        """Test successful rating prediction."""
        mock_db_query.return_value = [
            {"movie_id": 1, "avg_rating": 3.8, "rating_count": 100, "genres": ["Action", "Drama"]},
            {"movie_id": 2, "avg_rating": 4.1, "rating_count": 150, "genres": ["Action"]},
        ]

        response = client.post(
            "/api/predictions/predict",
            json={
                "title": "New Action Movie",
                "genres": ["Action", "Drama"],
                "year": 2024,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "prediction" in data
        assert "mean_rating" in data["prediction"]
        assert "confidence_interval" in data["prediction"]

    def test_predict_rating_without_year(self, client, mock_db_query):
        """Test rating prediction without year."""
        mock_db_query.return_value = [
            {"movie_id": 1, "avg_rating": 3.5, "rating_count": 80, "genres": ["Comedy"]},
        ]

        response = client.post(
            "/api/predictions/predict",
            json={
                "title": "Funny Movie",
                "genres": ["Comedy"],
            },
        )

        assert response.status_code == 200

    def test_predict_rating_missing_title(self, client):
        """Test prediction with missing title."""
        response = client.post(
            "/api/predictions/predict",
            json={
                "genres": ["Action"],
            },
        )

        assert response.status_code == 422

    def test_predict_rating_missing_genres(self, client):
        """Test prediction with missing genres."""
        response = client.post(
            "/api/predictions/predict",
            json={
                "title": "Test Movie",
            },
        )

        assert response.status_code == 422

    def test_predict_rating_empty_genres(self, client, mock_db_query):
        """Test prediction with empty genres list."""
        mock_db_query.return_value = []

        response = client.post(
            "/api/predictions/predict",
            json={
                "title": "Test Movie",
                "genres": [],
            },
        )

        # Should either succeed with no data or return an error
        assert response.status_code in [200, 400, 422]

    def test_get_similar_movies_success(self, client, mock_db_query):
        """Test getting similar movies."""
        mock_db_query.return_value = [
            {"movie_id": 2, "title": "Similar Movie 1", "similarity": 0.85},
            {"movie_id": 3, "title": "Similar Movie 2", "similarity": 0.72},
        ]

        response = client.get("/api/predictions/similar/1")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_similar_movies_with_limit(self, client, mock_db_query):
        """Test getting similar movies with limit."""
        mock_db_query.return_value = [
            {"movie_id": 2, "title": "Similar Movie 1", "similarity": 0.85},
        ]

        response = client.get("/api/predictions/similar/1?limit=5")

        assert response.status_code == 200

    def test_get_preview_panel_success(self, client, mock_db_query):
        """Test preview panel endpoint."""
        mock_db_query.return_value = [
            {"user_id": 1, "predicted_rating": 4.0},
            {"user_id": 2, "predicted_rating": 3.5},
        ]

        response = client.get("/api/predictions/preview-panel?movie_id=1")

        assert response.status_code == 200


class TestPredictionAlgorithm:
    """Test suite for prediction algorithm behavior."""

    def test_prediction_includes_uncertainty(self, client, mock_db_query):
        """Test that predictions include uncertainty metrics."""
        mock_db_query.return_value = [
            {"movie_id": 1, "avg_rating": 3.8, "rating_count": 100, "genres": ["Action"]},
        ]

        response = client.post(
            "/api/predictions/predict",
            json={
                "title": "Action Movie",
                "genres": ["Action"],
            },
        )

        assert response.status_code == 200
        data = response.json()
        if "prediction" in data:
            prediction = data["prediction"]
            # Should include uncertainty measure
            assert "uncertainty" in prediction or "confidence_interval" in prediction

    def test_prediction_includes_distribution(self, client, mock_db_query):
        """Test that predictions include rating distribution."""
        mock_db_query.return_value = [
            {"movie_id": 1, "avg_rating": 3.8, "rating_count": 100, "genres": ["Action"]},
        ]

        response = client.post(
            "/api/predictions/predict",
            json={
                "title": "Action Movie",
                "genres": ["Action"],
            },
        )

        assert response.status_code == 200
        data = response.json()
        # Should include distribution
        assert "distribution" in data
