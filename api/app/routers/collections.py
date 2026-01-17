from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_collections():
    """List collections - placeholder."""
    return {"collections": []}
