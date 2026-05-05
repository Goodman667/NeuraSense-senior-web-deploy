"""
Digital Phenotyping API Router
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime
from app.services.phenotyping import PhenotypingPredictor

router = APIRouter(
    prefix="/phenotyping",
    tags=["phenotyping"],
    responses={404: {"description": "Not found"}},
)

# Initialize predictor singleton
predictor = PhenotypingPredictor()

# --- Request/Response Models ---

class WearableData(BaseModel):
    hrv_mean: float
    sleep_minutes: int
    step_count: int
    active_minutes: int
    resting_hr: Optional[int] = 70
    sleep_quality: Optional[int] = 70
    heart_rate_series: Optional[List[int]] = []

class BioSignalData(BaseModel):
    voice_jitter: Optional[float] = 0.0
    fatigue_index: Optional[float] = 0.0
    keystroke_variability: Optional[float] = 0.0

class EMAData(BaseModel):
    mood_avg: Optional[float] = 5.0
    stress_count: Optional[int] = 0

class PredictionRequest(BaseModel):
    user_id: str
    wearable: WearableData
    biosignals: Optional[BioSignalData] = None
    ema: Optional[EMAData] = None

class PredictionResponse(BaseModel):
    risk_probability: float
    risk_level: str
    predicted_trend: List[float]
    dominant_factors: List[Dict[str, Any]]
    insights: List[str]
    timestamp: datetime

# --- Endpoints ---

@router.post("/predict", response_model=PredictionResponse)
async def predict_risk(request: PredictionRequest):
    """
    Predict 7-day mental health risk based on multi-modal data.
    """
    try:
        # Pydantic to Dict
        passive_data = request.wearable.dict()
        active_data = request.biosignals.dict() if request.biosignals else {}
        ema_data = request.ema.dict() if request.ema else {}
        
        result = predictor.predict_risk(passive_data, active_data, ema_data)
        
        return PredictionResponse(
            risk_probability=result.risk_probability,
            risk_level=result.risk_level,
            predicted_trend=result.predicted_trend,
            dominant_factors=result.dominant_factors,
            insights=result.insights,
            timestamp=datetime.now()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync")
async def sync_wearable(data: WearableData):
    """
    Endpoint to receive raw wearable data synchronization.
    In a real app, this would save to a database.
    """
    return {"status": "synced", "received_items": 1, "timestamp": datetime.now()}

@router.get("/insights/{user_id}")
async def get_insights(user_id: str):
    """
    Get aggregated physiological insights for dashboard.
    Mocked response for now.
    """
    return {
        "radar_data": [
            {"name": "心率变异性", "value": 0.75},
            {"name": "睡眠质量", "value": 0.65},
            {"name": "活动水平", "value": 0.40},
            {"name": "压力弹性", "value": 0.60},
            {"name": "社交活跃", "value": 0.50}
        ],
        "overall_score": 0.58,
        "weekly_trend": "stable"
    }
