#!/bin/bash
set -e

echo "=== MoviesDB Setup ==="

# Copy .env if missing
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
fi

# Download MovieLens dataset
DATA_DIR="./data"
ML_DIR="$DATA_DIR/ml-latest-small"

if [ ! -d "$ML_DIR" ]; then
    echo "Downloading MovieLens small dataset..."
    mkdir -p "$DATA_DIR"
    curl -L -o "$DATA_DIR/ml-latest-small.zip" \
        "https://files.grouplens.org/datasets/movielens/ml-latest-small.zip"
    unzip -o "$DATA_DIR/ml-latest-small.zip" -d "$DATA_DIR"
    rm "$DATA_DIR/ml-latest-small.zip"
    echo "Dataset downloaded to $ML_DIR"
else
    echo "MovieLens dataset already exists at $ML_DIR"
fi

# Start containers
echo "Starting containers..."
docker compose up -d --build

# Wait for API to be healthy
echo "Waiting for API to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
until curl -sf http://localhost:8000/health > /dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "API failed to start after $MAX_RETRIES attempts"
        exit 1
    fi
    echo "  Waiting... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done
echo "API is healthy!"

# Load data
echo "Loading MovieLens data..."
docker exec moviesdb-api python scripts/load_movielens.py --data-dir /app/data

echo "Generating personality data..."
docker exec moviesdb-api python scripts/generate_personality.py

# Optional: enrich with TMDB/OMDB
if grep -q "TMDB_API_KEY=." .env 2>/dev/null; then
    echo "Enriching with TMDB data..."
    docker exec moviesdb-api python scripts/fetch_tmdb.py --limit 100
fi

if grep -q "OMDB_API_KEY=." .env 2>/dev/null; then
    echo "Enriching with OMDB data..."
    docker exec moviesdb-api python scripts/fetch_omdb.py --limit 100
fi

echo ""
echo "=== Setup Complete ==="
echo "Frontend: http://localhost:5173"
echo "API:      http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
