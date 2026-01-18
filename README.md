# MoviesDB

A full-stack web application for exploring and analysing the MovieLens dataset, built as coursework for COMP0022.

## Quick Start

```bash
chmod +x setup.sh
./setup.sh
```

This will download the MovieLens dataset, build and start Docker containers, and load the data.

## Services

| Service  | URL                    |
|----------|------------------------|
| Frontend | http://localhost:5173  |
| API      | http://localhost:8000  |
| API Docs | http://localhost:8000/docs |

## Project Structure

```
moviesdb-cw-1/
  api/          # FastAPI backend
  frontend/     # React + TypeScript frontend
  database/     # PostgreSQL schema and indexes
  scripts/      # Data loading and enrichment scripts
  k8s/          # Kubernetes manifests
```

## Tech Stack

- **Backend**: Python 3.12, FastAPI, psycopg2
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Database**: PostgreSQL 16
- **Deployment**: Docker Compose, Kubernetes

## Environment Variables

Copy `.env.example` to `.env` and configure:

```
POSTGRES_DB=moviesdb
POSTGRES_USER=moviesdb
POSTGRES_PASSWORD=moviesdb
JWT_SECRET=change-me-in-production
TMDB_API_KEY=           # optional
OMDB_API_KEY=           # optional
```
