from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import os

from app.config import get_settings
from app.database import init_db_pool, close_db_pool
from app.routers import movies, genres, ratings, predictions, personality, collections
from app.auth.users import router as auth_router
from app.middleware.rate_limit import RateLimitMiddleware

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown."""
    # Startup
    logger.info("Starting application...")
    init_db_pool()
    yield
    # Shutdown
    logger.info("Shutting down application...")
    close_db_pool()


app = FastAPI(
    title="MovieLens API",
    description="API for the COMP0022 MovieLens web application",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add rate limiting middleware (only in production or if explicitly enabled)
if os.environ.get("ENABLE_RATE_LIMIT", "").lower() == "true":
    app.add_middleware(
        RateLimitMiddleware,
        requests_per_minute=120,  # 2 requests per second average
        requests_per_second=20,   # Burst limit
    )

# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(movies.router, prefix="/api/movies", tags=["Movies"])
app.include_router(genres.router, prefix="/api/genres", tags=["Genres"])
app.include_router(ratings.router, prefix="/api/ratings", tags=["Ratings"])
app.include_router(predictions.router, prefix="/api/predictions", tags=["Predictions"])
app.include_router(personality.router, prefix="/api/personality", tags=["Personality"])
app.include_router(collections.router, prefix="/api/collections", tags=["Collections"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "MovieLens API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

# CORS configuration:
# - origins: configurable via CORS_ORIGINS env var (comma-separated)
# - methods: GET, POST, PUT, PATCH, DELETE
# - credentials: true (required for JWT cookie flow)
# - max_age: 600 seconds (preflight cache)
