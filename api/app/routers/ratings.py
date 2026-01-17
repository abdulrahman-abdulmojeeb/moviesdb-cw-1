from fastapi import APIRouter

router = APIRouter()


@router.get("/patterns")
async def rating_patterns():
    """Rating patterns - placeholder."""
    return {"patterns": []}
