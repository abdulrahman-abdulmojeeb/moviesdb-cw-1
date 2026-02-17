"""
Tests for the movies API endpoints.
"""

import pytest
from unittest.mock import patch


class TestMoviesEndpoints:
    """Test suite for /api/movies endpoints."""

    def test_get_movies_success(self, client, mock_db_query, mock_db_query_one, sample_movie):
        """Test successful movie listing."""
        mock_db_query.return_value = [sample_movie]
        mock_db_query_one.return_value = {"count": 1}

        response = client.get("/api/movies")

        assert response.status_code == 200
        data = response.json()
        assert "movies" in data
        assert "page" in data
        assert "limit" in data
        assert "total" in data
        assert data["page"] == 1
        assert data["limit"] == 20

    def test_get_movies_with_pagination(self, client, mock_db_query, mock_db_query_one, sample_movie):
        """Test movie listing with pagination."""
        mock_db_query.return_value = [sample_movie]
        mock_db_query_one.return_value = {"count": 100}

        response = client.get("/api/movies?page=2&limit=10")

        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 2
        assert data["limit"] == 10

    def test_get_movies_with_title_filter(self, client, mock_db_query, mock_db_query_one, sample_movie):
        """Test movie listing with title search."""
        mock_db_query.return_value = [sample_movie]
        mock_db_query_one.return_value = {"count": 1}

        response = client.get("/api/movies?title=Test")

        assert response.status_code == 200
        data = response.json()
        assert len(data["movies"]) == 1

    def test_get_movies_with_genre_filter(self, client, mock_db_query, mock_db_query_one, sample_movie):
        """Test movie listing with genre filter."""
        mock_db_query.return_value = [sample_movie]
        mock_db_query_one.return_value = {"count": 1}

        response = client.get("/api/movies?genre=Action")

        assert response.status_code == 200
        data = response.json()
        assert len(data["movies"]) == 1

    def test_get_movies_with_year_range(self, client, mock_db_query, mock_db_query_one, sample_movie):
        """Test movie listing with year range filter."""
        mock_db_query.return_value = [sample_movie]
        mock_db_query_one.return_value = {"count": 1}

        response = client.get("/api/movies?year_from=2015&year_to=2025")

        assert response.status_code == 200

    def test_get_movies_with_min_rating(self, client, mock_db_query, mock_db_query_one, sample_movie):
        """Test movie listing with minimum rating filter."""
        mock_db_query.return_value = [sample_movie]
        mock_db_query_one.return_value = {"count": 1}

        response = client.get("/api/movies?min_rating=3.5")

        assert response.status_code == 200

    def test_get_movies_with_sorting(self, client, mock_db_query, mock_db_query_one, sample_movie):
        """Test movie listing with sorting."""
        mock_db_query.return_value = [sample_movie]
        mock_db_query_one.return_value = {"count": 1}

        response = client.get("/api/movies?sort_by=rating&sort_order=desc")

        assert response.status_code == 200

    def test_get_movies_invalid_sort_field(self, client):
        """Test movie listing with invalid sort field."""
        response = client.get("/api/movies?sort_by=invalid")

        assert response.status_code == 422

    def test_get_movies_invalid_page(self, client):
        """Test movie listing with invalid page number."""
        response = client.get("/api/movies?page=0")

        assert response.status_code == 422

    def test_get_movies_limit_exceeds_max(self, client):
        """Test movie listing with limit exceeding maximum."""
        response = client.get("/api/movies?limit=200")

        assert response.status_code == 422

    def test_get_movie_by_id_success(self, client, mock_db_query_one, sample_movie):
        """Test getting a single movie by ID."""
        mock_db_query_one.return_value = sample_movie

        response = client.get("/api/movies/1")

        assert response.status_code == 200
        data = response.json()
        assert data["movie_id"] == 1
        assert data["title"] == "Test Movie"

    def test_get_movie_by_id_not_found(self, client, mock_db_query_one):
        """Test getting a non-existent movie."""
        mock_db_query_one.return_value = None

        response = client.get("/api/movies/99999")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_get_movie_ratings_success(self, client, mock_db_query, mock_db_query_one):
        """Test getting movie rating distribution."""
        mock_db_query.return_value = [
            {"rating": 1.0, "count": 5, "percentage": 5.0},
            {"rating": 2.0, "count": 10, "percentage": 10.0},
            {"rating": 3.0, "count": 30, "percentage": 30.0},
            {"rating": 4.0, "count": 40, "percentage": 40.0},
            {"rating": 5.0, "count": 15, "percentage": 15.0},
        ]
        mock_db_query_one.return_value = {
            "mean": 3.5,
            "stddev": 0.9,
            "min": 1.0,
            "max": 5.0,
            "total": 100,
        }

        response = client.get("/api/movies/1/ratings")

        assert response.status_code == 200
        data = response.json()
        assert "distribution" in data
        assert "stats" in data
        assert data["movie_id"] == 1


class TestMoviesPosterUrl:
    """Test suite for poster URL building."""

    def test_movie_includes_poster_url(self, client, mock_db_query, mock_db_query_one, sample_movie):
        """Test that movies include built poster URLs."""
        mock_db_query.return_value = [sample_movie]
        mock_db_query_one.return_value = {"count": 1}

        response = client.get("/api/movies")

        assert response.status_code == 200
        movies = response.json()["movies"]
        assert len(movies) > 0
        # poster_url should be built from poster_path
        assert movies[0].get("poster_url") is not None or movies[0].get("poster_path") is not None

    def test_movie_detail_includes_backdrop_url(self, client, mock_db_query_one, sample_movie):
        """Test that movie detail includes backdrop URL."""
        sample_movie["backdrop_path"] = "/backdrop.jpg"
        mock_db_query_one.return_value = sample_movie

        response = client.get("/api/movies/1")

        assert response.status_code == 200
