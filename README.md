# MoviesDB

A full-stack web application for exploring and analysing the MovieLens dataset, built as coursework for COMP0022 (Databases and Web Application).

## Features

- **Movie Catalogue** — Browse 9,700+ films with search, genre filtering, year range, and rating thresholds
- **Genre Reports** — Popularity rankings and polarisation analysis across all genres
- **Rating Patterns** — Viewer behaviour analysis, cross-genre preferences, and critic classification
- **Predictive Ratings** — Genre-similarity based rating predictions with confidence intervals
- **Personality Analysis** — Big Five trait correlations with viewing preferences and viewer segments
- **Collections** — Create and manage personal movie lists (requires authentication)
- **Multi-Source Ratings** — Aggregated scores from MovieLens, IMDb, TMDB, Rotten Tomatoes, and Metacritic

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   API Server  │────▶│  PostgreSQL   │
│  React + TS  │     │   FastAPI     │     │   16-alpine   │
│  port 5173   │     │   port 8000   │     │   port 5432   │
└─────────────┘     └──────────────┘     └──────────────┘
```

## Quick Start

```bash
chmod +x setup.sh
./setup.sh
```

This will:
1. Download the MovieLens small dataset
2. Build and start Docker containers
3. Initialise the database schema and indexes
4. Load movie, rating, and tag data
5. Generate synthetic personality profiles
6. Optionally enrich with TMDB/OMDB data (if API keys provided)

## Services

| Service  | URL                          |
|----------|------------------------------|
| Frontend | http://localhost:5173         |
| API      | http://localhost:8000         |
| API Docs | http://localhost:8000/docs    |
| Database | localhost:5432               |

## Project Structure

```
moviesdb-cw-1/
  api/              # FastAPI backend
    app/
      auth/         # JWT authentication
      routers/      # API endpoint modules
      middleware/    # Rate limiting
    tests/          # pytest test suite
  frontend/         # React + TypeScript + Vite
    src/
      components/   # UI components (shadcn/ui)
      pages/        # 9 application pages
      hooks/        # Auth and theme hooks
      services/     # API client with interceptors
  database/
    init/           # SQL schema, indexes, external ratings
  scripts/          # Data loading and enrichment
  k8s/              # Kubernetes deployment manifests
```

## API Endpoints

| Group        | Endpoints                                           |
|-------------|-----------------------------------------------------|
| Auth        | POST login, register, refresh; GET profile           |
| Movies      | GET list (paginated), detail, rating distribution    |
| Genres      | GET list, popularity, polarisation                   |
| Ratings     | GET patterns, cross-genre, consistency               |
| Predictions | POST predict; GET similar, distribution, preview     |
| Personality | GET overview, correlations, profiles, segments       |
| Collections | CRUD operations (authenticated)                      |

## Kubernetes Deployment

Deploy to a Kubernetes cluster:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml        # edit secrets first
kubectl apply -f k8s/postgres-statefulset.yaml
kubectl apply -f k8s/api-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable           | Default                  | Description                     |
|-------------------|--------------------------|---------------------------------|
| POSTGRES_DB       | moviesdb                 | Database name                   |
| POSTGRES_USER     | moviesdb                 | Database user                   |
| POSTGRES_PASSWORD | moviesdb                 | Database password               |
| JWT_SECRET        | change-me-in-production  | JWT signing secret              |
| TMDB_API_KEY      |                          | TMDB API key (optional)         |
| OMDB_API_KEY      |                          | OMDB API key (optional)         |
| ALLOWED_ORIGINS   | http://localhost:5173    | CORS allowed origins            |
| VITE_API_URL      | http://localhost:8000    | Backend URL for frontend proxy  |

## Tech Stack

- **Backend**: Python 3.12, FastAPI, psycopg2, JWT + bcrypt auth
- **Frontend**: React 18, TypeScript, Vite 6, Tailwind CSS, shadcn/ui, Recharts, TanStack Query
- **Database**: PostgreSQL 16 with 30+ optimised indexes
- **Deployment**: Docker Compose (development), Kubernetes (production)
- **Testing**: pytest with mocked database layer
