"""
Prediction API Router

Endpoints for time-series mental health trend prediction.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from ..services.prediction import predict_weekly_trend, PredictionResult

router = APIRouter(prefix="/prediction", tags=["Prediction"])


class ForecastRequest(BaseModel):
    """Request model for trend forecast"""
    phq9_history: list[float] = Field(
        ..., 
        description="Historical PHQ-9 scores (minimum 3 points)",
        min_length=1
    )
    voice_stress: Optional[list[float]] = Field(
        None,
        description="Optional voice stress levels (0-100)"
    )
    keystroke_anxiety: Optional[list[float]] = Field(
        None,
        description="Optional keystroke anxiety indices (0-100)"
    )


class ForecastResponse(BaseModel):
    """Response model for trend forecast"""
    success: bool
    predicted_scores: list[float]
    dates: list[str]
    confidence_lower: list[float]
    confidence_upper: list[float]
    trend_direction: str
    risk_level: str
    model_confidence: float
    interpretation: str


@router.post("/forecast", response_model=ForecastResponse)
async def forecast_trend(request: ForecastRequest) -> ForecastResponse:
    """
    Predict mental health trend for the next 7 days.
    
    Uses ensemble ML model (RandomForest + LinearRegression) to forecast
    future PHQ-9 scores based on historical data and optional biomarkers.
    
    Args:
        request: ForecastRequest containing historical PHQ-9 scores and optional biomarkers
        
    Returns:
        ForecastResponse with 7-day prediction and confidence intervals
    """
    try:
        result = await predict_weekly_trend(
            phq9_history=request.phq9_history,
            voice_stress=request.voice_stress,
            keystroke_anxiety=request.keystroke_anxiety,
        )
        
        # Generate human-readable interpretation
        interpretation = _generate_interpretation(result)
        
        return ForecastResponse(
            success=True,
            predicted_scores=result.predicted_scores,
            dates=result.dates,
            confidence_lower=result.confidence_lower,
            confidence_upper=result.confidence_upper,
            trend_direction=result.trend_direction,
            risk_level=result.risk_level,
            model_confidence=result.model_confidence,
            interpretation=interpretation,
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


def _generate_interpretation(result: PredictionResult) -> str:
    """Generate human-readable interpretation of prediction results"""
    
    trend_messages = {
        'improving': '根据分析，您的心理健康状况呈现改善趋势。',
        'stable': '您的心理健康指标在预测期内保持稳定。',
        'worsening': '模型检测到心理健康指标可能有所下降，建议关注自身状态。',
    }
    
    risk_messages = {
        'low': '当前风险等级较低，请继续保持积极的生活习惯。',
        'moderate': '检测到中等风险，建议尝试一些减压技巧。',
        'high': '风险指标较高，建议寻求专业心理咨询支持。',
    }
    
    base_msg = trend_messages.get(result.trend_direction, '')
    risk_msg = risk_messages.get(result.risk_level, '')
    
    confidence_note = ''
    if result.model_confidence < 0.5:
        confidence_note = ' 注意：历史数据较少可能影响预测准确性。'
    
    return f"{base_msg} {risk_msg}{confidence_note}"


@router.get("/demo")
async def demo_forecast() -> ForecastResponse:
    """
    Demo endpoint with sample data for testing.
    Returns a forecast based on synthetic PHQ-9 history.
    """
    # Synthetic demo data showing mild depression trend
    sample_phq9 = [7, 9, 8, 10, 11, 9, 10, 8, 9]
    sample_voice = [45, 50, 48, 55, 58, 52, 55, 50, 52]
    sample_keystroke = [25, 30, 28, 35, 38, 32, 35, 30, 32]
    
    result = await predict_weekly_trend(
        phq9_history=sample_phq9,
        voice_stress=sample_voice,
        keystroke_anxiety=sample_keystroke,
    )
    
    return ForecastResponse(
        success=True,
        predicted_scores=result.predicted_scores,
        dates=result.dates,
        confidence_lower=result.confidence_lower,
        confidence_upper=result.confidence_upper,
        trend_direction=result.trend_direction,
        risk_level=result.risk_level,
        model_confidence=result.model_confidence,
        interpretation=_generate_interpretation(result),
    )
