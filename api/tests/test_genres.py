"""
Tests for the genres API endpoints.
"""

import pytest
from unittest.mock import patch


class TestGenresEndpoints:
    """Test suite for /api/genres endpoints."""

    def test_get_genres_success(self, client, mock_db_query, sample_genre):
        """Test successful genre listing."""
        mock_db_query.return_value = [
            sample_genre,
            {"genre_id": 2, "name": "Comedy", "movie_count": 120},
            {"genre_id": 3, "name": "Drama", "movie_count": 200},
        ]

        response = client.get("/api/genres")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 3
        assert data[0]["name"] == "Action"

    def test_get_genres_empty(self, client, mock_db_query):
        """Test genre listing when no genres exist."""
        mock_db_query.return_value = []

        response = client.get("/api/genres")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0

    def test_get_genre_popularity_success(self, client, mock_db_query):
        """Test genre popularity report."""
        mock_db_query.return_value = [
            {
                "genre": "Action",
                "total_ratings": 50000,
                "movie_count": 150,
                "avg_rating": 3.7,
                "rating_stddev": 0.9,
            },
            {
                "genre": "Drama",
                "total_ratings": 80000,
                "movie_count": 200,
                "avg_rating": 3.9,
                "rating_stddev": 0.8,
            },
        ]

        response = client.get("/api/genres/popularity")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2
        assert "genre" in data[0]
        assert "avg_rating" in data[0]
        assert "total_ratings" in data[0]

    def test_get_genre_polarisation_success(self, client, mock_db_query):
        """Test genre polarisation report."""
        mock_db_query.return_value = [
            {
                "genre": "Horror",
                "total_ratings": 30000,
                "low_pct": 25.0,
                "mid_pct": 30.0,
                "high_pct": 45.0,
                "polarisation_score": 0.75,
            },
            {
                "genre": "Comedy",
                "total_ratings": 45000,
                "low_pct": 15.0,
                "mid_pct": 55.0,
                "high_pct": 30.0,
                "polarisation_score": 0.35,
            },
        ]

        response = client.get("/api/genres/polarisation")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert "polarisation_score" in data[0]
        assert "low_pct" in data[0]
        assert "high_pct" in data[0]


class TestGenreDataIntegrity:
    """Test suite for genre data validation."""

    def test_genre_has_required_fields(self, client, mock_db_query, sample_genre):
        """Test that genre responses have all required fields."""
        mock_db_query.return_value = [sample_genre]

        response = client.get("/api/genres")

        assert response.status_code == 200
        genre = response.json()[0]
        assert "genre_id" in genre
        assert "name" in genre
        assert "movie_count" in genre

    def test_popularity_has_statistics_fields(self, client, mock_db_query):
        """Test that popularity response has statistical fields."""
        mock_db_query.return_value = [
            {
                "genre": "Action",
                "total_ratings": 50000,
                "movie_count": 150,
                "avg_rating": 3.7,
                "rating_stddev": 0.9,
            }
        ]

        response = client.get("/api/genres/popularity")

        assert response.status_code == 200
        popularity = response.json()[0]
        assert "avg_rating" in popularity
        assert "rating_stddev" in popularity
        assert "total_ratings" in popularity
        assert "movie_count" in popularity
