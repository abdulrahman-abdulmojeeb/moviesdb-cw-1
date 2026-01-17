from fastapi import APIRouter

router = APIRouter()


@router.post("/predict")
async def predict_rating():
    """Predict rating - placeholder."""
    return {"predicted_rating": 0, "confidence": 0}
