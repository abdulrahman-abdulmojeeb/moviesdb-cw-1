from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_genres():
    """List genres - placeholder."""
    return {"genres": []}
