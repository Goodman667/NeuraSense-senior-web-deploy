"""
Innovation Data Logger
创新点数据持久化模块

Writes structured assessment and hidden distress records to Supabase.
Designed for async fire-and-forget: write failures are logged but never
block the chat response.

Tables:
    - assessment_turn_evidence  (Innovation Point 1)
    - hidden_distress_events    (Innovation Point 3)
"""

import logging
from typing import Optional
from datetime import datetime, timezone

from app.services.database.supabase_client import (
    get_supabase_client,
    is_supabase_available,
)

logger = logging.getLogger(__name__)


def log_assessment_turn(
    session_id: str,
    turn_id: str,
    user_id: str,
    text_evidence: dict,
    biosignal_snapshot: dict,
    sensor_quality: dict,
    contradictions: dict,
    confidences: dict,
    updated_scores: dict,
    total_score: int,
    severity_level: str,
    mode: str,
    clarification_needed: bool,
    risk_flag: bool,
    condition: str = "C2",
    fallback_reasons: list = None,
) -> bool:
    """
    Persist a single turn's assessment data to assessment_turn_evidence.

    Returns True if write succeeded, False otherwise.
    """
    if not is_supabase_available():
        logger.debug("Supabase unavailable, skipping assessment log")
        return False

    record = {
        "session_id": session_id,
        "turn_id": turn_id,
        "user_id": user_id,
        "text_evidence_json": text_evidence,
        "biosignal_snapshot_json": biosignal_snapshot,
        "sensor_quality_json": sensor_quality,
        "contradiction_json": contradictions,
        "confidence_json": confidences,
        "updated_item_scores_json": updated_scores,
        "total_score": total_score,
        "severity_level": severity_level,
        "mode": mode,
        "clarification_needed": clarification_needed,
        "risk_flag": risk_flag,
        "condition": condition,
        "fallback_reasons_json": fallback_reasons or [],
    }

    try:
        sb = get_supabase_client()
        sb.table("assessment_turn_evidence").insert(record).execute()
        logger.info(
            "Assessment logged: session=%s turn=%s mode=%s score=%d",
            session_id, turn_id, mode, total_score,
        )
        return True
    except Exception as e:
        logger.error("Failed to log assessment turn: %s", e)
        return False


def log_hidden_distress_event(
    session_id: str,
    turn_id: str,
    sem_pos: float,
    obj_dist: float,
    self_report_norm: float,
    gap_self: float,
    trend_worsening: float,
    hdi: float,
    risk_level: str,
    reason_json: dict,
    voice_component: float,
    fatigue_component: float,
    keystroke_component: float,
    trend_component: float,
) -> bool:
    """
    Persist a hidden distress event to hidden_distress_events.

    Returns True if write succeeded, False otherwise.
    """
    if not is_supabase_available():
        logger.debug("Supabase unavailable, skipping HDI log")
        return False

    record = {
        "session_id": session_id,
        "turn_id": turn_id,
        "sem_pos": round(sem_pos, 4),
        "obj_dist": round(obj_dist, 4),
        "self_report_norm": round(self_report_norm, 4),
        "gap_self": round(gap_self, 4),
        "trend_worsening": round(trend_worsening, 4),
        "hdi": round(hdi, 4),
        "risk_level": risk_level,
        "reason_json": reason_json,
        "voice_component": round(voice_component, 4),
        "fatigue_component": round(fatigue_component, 4),
        "keystroke_component": round(keystroke_component, 4),
        "trend_component": round(trend_component, 4),
    }

    try:
        sb = get_supabase_client()
        sb.table("hidden_distress_events").insert(record).execute()
        logger.info(
            "HDI logged: session=%s risk=%s hdi=%.3f",
            session_id, risk_level, hdi,
        )
        return True
    except Exception as e:
        logger.error("Failed to log HDI event: %s", e)
        return False


def query_recent_hdi(
    session_id: str,
    limit: int = 5,
) -> list[dict]:
    """
    Query recent HDI records for trend computation.

    Returns list of dicts with hdi, obj_dist, created_at fields,
    ordered by created_at DESC.
    """
    if not is_supabase_available():
        return []

    try:
        sb = get_supabase_client()
        result = (
            sb.table("hidden_distress_events")
            .select("hdi, obj_dist, created_at")
            .eq("session_id", session_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data or []
    except Exception as e:
        logger.error("Failed to query HDI history: %s", e)
        return []
