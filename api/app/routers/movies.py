from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_movies():
    """List movies - placeholder."""
    return {"movies": [], "total": 0}
