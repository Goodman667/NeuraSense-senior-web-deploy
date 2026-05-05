"""
JITAI API Router - Just-in-Time Adaptive Interventions

Endpoints for vulnerability assessment and intervention delivery.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

from ..services.jitai import (
    get_jitai_engine,
    JITAIInput,
    EMAData,
    BioSignals,
    TimeContext,
)

router = APIRouter(prefix="/jitai", tags=["JITAI"])


# ===== Request/Response Models =====

class EMAInput(BaseModel):
    mood: float  # 1-10
    stress_sources: List[str] = []
    activity: Optional[str] = None


class BioSignalsInput(BaseModel):
    fatigue_index: float  # 0-1
    blink_rate: Optional[float] = None
    voice_stress: Optional[float] = None


class ContextInput(BaseModel):
    hour: int  # 0-23
    day_of_week: Optional[int] = None


class JITAIEngineRequest(BaseModel):
    """Request body for JITAI engine"""
    user_id: str
    ema: Optional[EMAInput] = None
    bio_signals: Optional[BioSignalsInput] = None
    journal_emotion: Optional[str] = None
    scale_trend: Optional[float] = None  # -1 to 1
    context: Optional[ContextInput] = None


class InterventionResponse(BaseModel):
    type: str
    title: str
    description: str
    duration_seconds: int
    action_data: Optional[Dict[str, Any]] = None


class JITAIEngineResponse(BaseModel):
    """Response from JITAI engine"""
    vulnerability_score: float
    risk_level: str  # low, medium, high
    trigger_intervention: bool
    intervention: Optional[InterventionResponse] = None
    intervention_id: Optional[str] = None
    contributing_factors: Optional[List[str]] = None


class FeedbackRequest(BaseModel):
    """Record intervention feedback"""
    intervention_id: str
    accepted: bool
    post_mood: Optional[float] = None  # 1-10


class FeedbackResponse(BaseModel):
    success: bool
    message: str


class HistoryRecord(BaseModel):
    id: str
    timestamp: str
    vulnerability_score: float
    risk_level: str
    intervention_type: str
    factors: List[str]
    accepted: Optional[bool] = None
    post_mood: Optional[float] = None


class HistoryResponse(BaseModel):
    user_id: str
    records: List[HistoryRecord]
    total: int


class StatsResponse(BaseModel):
    total: int
    accepted: int
    rate: float
    avg_mood_improvement: Optional[float] = None


# ===== API Endpoints =====

@router.post("/engine", response_model=JITAIEngineResponse)
async def process_jitai(request: JITAIEngineRequest) -> JITAIEngineResponse:
    """
    Main JITAI engine endpoint.
    
    Computes vulnerability score from multi-modal inputs and 
    returns intervention recommendation if threshold exceeded.
    
    - **user_id**: User identifier
    - **ema**: Latest EMA check-in data (mood, stress sources, activity)
    - **bio_signals**: Aggregated bio-signal metrics (fatigue, blink rate)
    - **journal_emotion**: Latest journal entry emotion
    - **scale_trend**: Assessment scale score trend (-1 worsening to +1 improving)
    - **context**: Time context (hour, day of week)
    """
    engine = get_jitai_engine()
    
    # Convert request to engine input
    ema_data = None
    if request.ema:
        ema_data = EMAData(
            mood=request.ema.mood,
            stress_sources=request.ema.stress_sources,
            activity=request.ema.activity,
        )
    
    bio_data = None
    if request.bio_signals:
        bio_data = BioSignals(
            fatigue_index=request.bio_signals.fatigue_index,
            blink_rate=request.bio_signals.blink_rate,
            voice_stress=request.bio_signals.voice_stress,
        )
    
    context_data = None
    if request.context:
        context_data = TimeContext(
            hour=request.context.hour,
            day_of_week=request.context.day_of_week,
        )
    
    input_data = JITAIInput(
        user_id=request.user_id,
        ema=ema_data,
        bio_signals=bio_data,
        journal_emotion=request.journal_emotion,
        scale_trend=request.scale_trend,
        context=context_data,
    )
    
    # Process through engine
    result = engine.process(input_data)
    
    # Build response
    intervention_resp = None
    if result.intervention:
        intervention_resp = InterventionResponse(
            type=result.intervention.type.value,
            title=result.intervention.title,
            description=result.intervention.description,
            duration_seconds=result.intervention.duration_seconds,
            action_data=result.intervention.action_data,
        )
    
    return JITAIEngineResponse(
        vulnerability_score=result.vulnerability_score,
        risk_level=result.risk_level.value,
        trigger_intervention=result.trigger_intervention,
        intervention=intervention_resp,
        intervention_id=result.intervention_id,
        contributing_factors=result.contributing_factors,
    )


@router.post("/feedback", response_model=FeedbackResponse)
async def record_feedback(request: FeedbackRequest) -> FeedbackResponse:
    """
    Record user feedback on intervention.
    
    - **intervention_id**: ID of the intervention
    - **accepted**: Whether user accepted the intervention
    - **post_mood**: User's mood after intervention (1-10)
    """
    engine = get_jitai_engine()
    
    success = engine.record_feedback(
        intervention_id=request.intervention_id,
        accepted=request.accepted,
        post_mood=request.post_mood,
    )
    
    if success:
        return FeedbackResponse(success=True, message="反馈已记录，感谢你的参与！")
    else:
        return FeedbackResponse(success=False, message="未找到该干预记录")


@router.get("/history/{user_id}", response_model=HistoryResponse)
async def get_history(user_id: str, limit: int = 20) -> HistoryResponse:
    """
    Get intervention history for a user.
    
    - **user_id**: User identifier
    - **limit**: Maximum number of records to return (default 20)
    """
    engine = get_jitai_engine()
    
    records = engine.get_user_history(user_id, limit)
    
    history_records = [
        HistoryRecord(
            id=r.get("id", ""),
            timestamp=r.get("timestamp", ""),
            vulnerability_score=r.get("vulnerability_score", 0),
            risk_level=r.get("risk_level", "low"),
            intervention_type=r.get("intervention_type", ""),
            factors=r.get("factors", []),
            accepted=r.get("accepted"),
            post_mood=r.get("post_mood"),
        )
        for r in records
    ]
    
    return HistoryResponse(
        user_id=user_id,
        records=history_records,
        total=len(history_records),
    )


@router.get("/stats", response_model=StatsResponse)
async def get_stats(user_id: Optional[str] = None) -> StatsResponse:
    """
    Get intervention statistics for model evaluation.
    
    - **user_id**: Optional user filter
    """
    engine = get_jitai_engine()
    
    stats = engine.get_acceptance_rate(user_id)
    
    return StatsResponse(
        total=stats["total"],
        accepted=stats["accepted"],
        rate=stats["rate"],
        avg_mood_improvement=stats.get("avg_mood_improvement"),
    )


@router.get("/health")
async def health_check():
    """Health check endpoint for JITAI service"""
    return {
        "status": "healthy",
        "service": "jitai",
        "timestamp": datetime.now().isoformat(),
    }
