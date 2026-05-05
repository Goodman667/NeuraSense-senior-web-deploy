from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.schemas.senior import (
    SeniorPreference,
    SeniorPreferenceUpdate,
    SeniorContactUpsert,
    SeniorInterviewCreate,
    SeniorSummaryRequest,
    SeniorSummaryResponse,
    SeniorHelpEventCreate,
    SeniorChatRequest,
    SeniorChatResponse,
)
from app.services.auth import auth_service
from app.services.senior import storage
from app.services.senior.summary_service import generate_senior_summary, build_fallback_summary, detect_risk_level
from app.services.senior.support_service import get_default_support_resources
from app.services.llm import CounselorService
from app.services.tts.tts_service import sanitize_tts_text

router = APIRouter(prefix="/senior", tags=["senior"])

def _resolve_user_id(token: Optional[str] = None, user_id: Optional[str] = None) -> str:
    if token:
        user = auth_service.validate_token(token)
        if not user:
            raise HTTPException(status_code=401, detail="请先登录")
        return str(user["id"])
    if user_id:
        return user_id
    raise HTTPException(status_code=401, detail="缺少用户身份，请登录或提供 user_id")

def _default_preference(user_id: str) -> dict:
    now = storage.utc_now()
    return SeniorPreference(user_id=user_id, created_at=now, updated_at=now).model_dump()

@router.get("/profile")
async def get_senior_profile(token: Optional[str] = None, user_id: Optional[str] = None):
    resolved = _resolve_user_id(token, user_id)
    profile = storage.get_one("senior_user_preferences", user_id=resolved) or _default_preference(resolved)
    contacts = storage.list_by_user("senior_support_contacts", resolved, limit=20)
    return {"success": True, "profile": profile, "contacts": contacts}

@router.put("/profile")
async def update_senior_profile(payload: SeniorPreferenceUpdate, token: Optional[str] = None):
    resolved = _resolve_user_id(token, payload.user_id)
    current = storage.get_one("senior_user_preferences", user_id=resolved) or _default_preference(resolved)
    updates = payload.model_dump(exclude_unset=True, exclude_none=True)
    updates.pop("user_id", None)
    profile = storage.upsert_by("senior_user_preferences", "user_id", {**current, **updates, "user_id": resolved})
    return {"success": True, "profile": profile}

@router.get("/contacts")
async def list_contacts(token: Optional[str] = None, user_id: Optional[str] = None):
    resolved = _resolve_user_id(token, user_id)
    return {"success": True, "contacts": storage.list_by_user("senior_support_contacts", resolved, limit=20)}

@router.post("/contacts")
async def upsert_contact(payload: SeniorContactUpsert, token: Optional[str] = None):
    resolved = _resolve_user_id(token, payload.user_id)
    data = payload.model_dump(exclude_none=True)
    data.pop("user_id", None)
    data["user_id"] = resolved
    contact = storage.upsert_by("senior_support_contacts", "id", data) if data.get("id") else storage.insert("senior_support_contacts", data)
    return {"success": True, "contact": contact}

@router.post("/interviews")
async def create_interview(payload: SeniorInterviewCreate, token: Optional[str] = None):
    resolved = _resolve_user_id(token, payload.user_id)
    answers = [item.model_dump() for item in payload.questions_answers]
    raw = payload.raw_transcript or "；".join(item.get("answer_text", "") for item in answers)
    risk_level, reasons = detect_risk_level(raw)
    record = storage.insert("senior_voice_interviews", {
        "user_id": resolved,
        "status": "completed",
        "input_mode": payload.input_mode,
        "questions_answers": answers,
        "raw_transcript": raw,
        "checkin_snapshot": payload.checkin_snapshot or {},
        "ai_summary": None,
        "risk_level": risk_level,
        "risk_reasons": reasons,
        "recommendation": None,
        "started_at": payload.started_at or storage.utc_now(),
        "completed_at": storage.utc_now(),
    })
    return {"success": True, "interview": record}

@router.get("/interviews/{interview_id}")
async def get_interview(interview_id: str, token: Optional[str] = None, user_id: Optional[str] = None):
    resolved = _resolve_user_id(token, user_id)
    record = storage.get_one("senior_voice_interviews", id=interview_id)
    if not record or record.get("user_id") != resolved:
        raise HTTPException(status_code=404, detail="没有找到该访谈记录")
    return {"success": True, "interview": record}

@router.get("/interviews")
async def list_interviews(token: Optional[str] = None, user_id: Optional[str] = None, limit: int = Query(default=10, ge=1, le=50)):
    resolved = _resolve_user_id(token, user_id)
    return {"success": True, "interviews": storage.list_by_user("senior_voice_interviews", resolved, limit=limit)}

@router.post("/summary", response_model=SeniorSummaryResponse)
async def create_summary(payload: SeniorSummaryRequest, token: Optional[str] = None):
    resolved = _resolve_user_id(token, payload.user_id)
    interview_id = payload.interview_id
    if not interview_id:
        interview = storage.insert("senior_voice_interviews", {
            "user_id": resolved,
            "status": "completed",
            "input_mode": "mixed",
            "questions_answers": [item.model_dump() for item in payload.answers],
            "raw_transcript": "；".join(item.answer_text for item in payload.answers),
            "checkin_snapshot": payload.checkin or {},
            "ai_summary": None,
            "risk_level": "normal",
            "risk_reasons": [],
            "started_at": storage.utc_now(),
            "completed_at": storage.utc_now(),
        })
        interview_id = interview["id"]
    summary = await generate_senior_summary(
        user_id=resolved,
        answers=payload.answers,
        interview_id=interview_id,
        checkin=payload.checkin,
        recent_context=payload.recent_context,
    )
    storage.upsert_daily_summary(resolved, storage.today_iso(), {
        "source_interview_id": interview_id,
        "source_checkin_id": None,
        "summary_json": summary.model_dump(),
        "risk_level": summary.risk_level,
        "next_action": summary.next_action.label,
    })
    existing = storage.get_one("senior_voice_interviews", id=interview_id)
    if existing:
        existing["ai_summary"] = summary.model_dump()
        existing["risk_level"] = summary.risk_level
        existing["recommendation"] = summary.recommendation.model_dump()
        storage.upsert_by("senior_voice_interviews", "id", existing)
    return summary

@router.get("/daily-summary")
async def get_daily_summary(date: Optional[str] = None, token: Optional[str] = None, user_id: Optional[str] = None):
    resolved = _resolve_user_id(token, user_id)
    target = date or storage.today_iso()
    record = storage.get_one("senior_daily_summaries", user_id=resolved, summary_date=target)
    return {"success": True, "summary": record.get("summary_json") if record else None, "record": record}

@router.post("/chat", response_model=SeniorChatResponse)
async def senior_chat(payload: SeniorChatRequest, token: Optional[str] = None):
    resolved = _resolve_user_id(token, payload.user_id)
    risk_level, _ = detect_risk_level(payload.message)
    try:
        counselor = CounselorService()
        response = await counselor.generate_response(
            user_message=payload.message,
            user_id=resolved,
            conversation_history=payload.conversation_history[-8:],
            emotion_context={
                "neurasense_mode": "senior",
                "risk_level": risk_level,
                "conversation_history": payload.conversation_history[-4:],
            },
        )
        text = response.message.strip()
    except Exception:
        fallback = build_fallback_summary([], interview_id=None)
        text = fallback.plain_summary if risk_level in {"elevated", "urgent"} else "我在这里陪您。刚才这句话听起来不轻松，我们先慢一点。您可以先喝口水，坐稳，再告诉我最让您挂念的一件事。"
    return SeniorChatResponse(
        reply_text=text,
        risk_level=risk_level,  # type: ignore[arg-type]
        tts_text=sanitize_tts_text(text),
        next_suggestion="如果愿意，我们先从最让您挂念的一件事说起。",
    )

@router.post("/help-events")
async def create_help_event(payload: SeniorHelpEventCreate, token: Optional[str] = None):
    resolved = _resolve_user_id(token, payload.user_id)
    data = payload.model_dump(exclude_none=True)
    data.pop("user_id", None)
    data["user_id"] = resolved
    event = storage.insert("senior_help_events", data)
    return {"success": True, "event": event}

@router.get("/support-resources")
async def get_support_resources(region: str = "CN"):
    resources = [item.model_dump() for item in get_default_support_resources(region)]
    return {"success": True, "resources": resources}
