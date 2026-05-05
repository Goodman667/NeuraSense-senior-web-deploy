"""
Validation API Router

Endpoints for dual-modality mental health validation.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from ..services.validation import (
    SubjectiveData,
    ObjectiveData,
    validate_dual_modality,
)

router = APIRouter(prefix="/validation", tags=["Validation"])


class SubjectiveInput(BaseModel):
    """Subjective questionnaire scores input"""
    phq9_score: int = Field(0, ge=0, le=27, description="PHQ-9 depression score")
    gad7_score: int = Field(0, ge=0, le=21, description="GAD-7 anxiety score")
    sds_score: int = Field(0, ge=0, le=100, description="SDS depression score")
    sas_score: int = Field(0, ge=0, le=100, description="SAS anxiety score")
    pss_score: int = Field(0, ge=0, le=40, description="PSS stress score")


class ObjectiveInput(BaseModel):
    """Objective bio-signal data input"""
    voice_stress_level: float = Field(50.0, ge=0, le=100)
    voice_emotion_score: float = Field(50.0, ge=0, le=100)
    fatigue_index: float = Field(0.0, ge=0, le=100)
    attention_score: float = Field(50.0, ge=0, le=100)
    typing_anxiety_index: float = Field(30.0, ge=0, le=100)
    typing_focus_score: float = Field(70.0, ge=0, le=100)
    stroop_cognitive_score: float = Field(70.0, ge=0, le=100)
    stroop_attention_score: float = Field(70.0, ge=0, le=100)


class ValidationRequest(BaseModel):
    """Full validation request with both data types"""
    subjective: SubjectiveInput
    objective: ObjectiveInput


class ValidationResponse(BaseModel):
    """Validation result response"""
    success: bool
    subjective_distress_index: float
    objective_stress_index: float
    discrepancy_score: float
    risk_tag: str
    hidden_risk_flag: bool
    confidence: float
    interpretation: str
    recommendations: list[str]


@router.post("/compare", response_model=ValidationResponse)
async def compare_modalities(request: ValidationRequest) -> ValidationResponse:
    """
    Compare subjective (questionnaire) and objective (bio-signal) data.
    
    Detects discrepancies that may indicate:
    - Hidden anxiety (low self-report but high bio-signals)
    - Over-reporting (high self-report but low bio-signals)
    - Need for professional assessment
    
    Returns:
        ValidationResponse with discrepancy analysis and recommendations
    """
    try:
        # Convert input to domain objects
        subjective = SubjectiveData(
            phq9_score=request.subjective.phq9_score,
            gad7_score=request.subjective.gad7_score,
            sds_score=request.subjective.sds_score,
            sas_score=request.subjective.sas_score,
            pss_score=request.subjective.pss_score,
        )
        
        objective = ObjectiveData(
            voice_stress_level=request.objective.voice_stress_level,
            voice_emotion_score=request.objective.voice_emotion_score,
            fatigue_index=request.objective.fatigue_index,
            attention_score=request.objective.attention_score,
            typing_anxiety_index=request.objective.typing_anxiety_index,
            typing_focus_score=request.objective.typing_focus_score,
            stroop_cognitive_score=request.objective.stroop_cognitive_score,
            stroop_attention_score=request.objective.stroop_attention_score,
        )
        
        # Perform validation
        result = validate_dual_modality(subjective, objective)
        
        return ValidationResponse(
            success=True,
            subjective_distress_index=result.subjective_distress_index,
            objective_stress_index=result.objective_stress_index,
            discrepancy_score=result.discrepancy_score,
            risk_tag=result.risk_tag.value,
            hidden_risk_flag=result.hidden_risk_flag,
            confidence=result.confidence,
            interpretation=result.interpretation,
            recommendations=result.recommendations,
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")


@router.get("/demo")
async def demo_validation() -> ValidationResponse:
    """
    Demo endpoint showing hidden anxiety detection.
    
    Simulates a case where:
    - User reports low distress (PHQ-9 = 5)
    - But bio-signals show high stress (typing anxiety = 75)
    """
    subjective = SubjectiveData(phq9_score=5, gad7_score=4)
    objective = ObjectiveData(
        voice_stress_level=70.0,
        typing_anxiety_index=75.0,
        attention_score=40.0,
    )
    
    result = validate_dual_modality(subjective, objective)
    
    return ValidationResponse(
        success=True,
        subjective_distress_index=result.subjective_distress_index,
        objective_stress_index=result.objective_stress_index,
        discrepancy_score=result.discrepancy_score,
        risk_tag=result.risk_tag.value,
        hidden_risk_flag=result.hidden_risk_flag,
        confidence=result.confidence,
        interpretation=result.interpretation,
        recommendations=result.recommendations,
    )
