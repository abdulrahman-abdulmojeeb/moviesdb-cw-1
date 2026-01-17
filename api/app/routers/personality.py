from fastapi import APIRouter

router = APIRouter()


@router.get("/overview")
async def personality_overview():
    """Personality overview - placeholder."""
    return {"traits": []}
