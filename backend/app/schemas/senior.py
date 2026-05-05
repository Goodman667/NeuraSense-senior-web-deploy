from datetime import datetime, date
from typing import Any, Literal, Optional
from pydantic import BaseModel, Field

RiskLevel = Literal["normal", "watch", "elevated", "urgent", "medical_emergency"]
InputMode = Literal["voice", "text", "choice", "mixed"]

class SeniorPreference(BaseModel):
    user_id: str
    auto_enter_senior: bool = False
    font_scale: Literal["large", "larger", "largest"] = "large"
    senior_voice_enabled: bool = True
    senior_voice_speed: float = 0.9
    senior_voice_name: str = "xiaoyi"
    text_fallback_enabled: bool = True
    caregiver_notify_enabled: bool = False
    preferred_region: str = "CN"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class SeniorPreferenceUpdate(BaseModel):
    user_id: Optional[str] = None
    auto_enter_senior: Optional[bool] = None
    font_scale: Optional[Literal["large", "larger", "largest"]] = None
    senior_voice_enabled: Optional[bool] = None
    senior_voice_speed: Optional[float] = None
    senior_voice_name: Optional[str] = None
    text_fallback_enabled: Optional[bool] = None
    caregiver_notify_enabled: Optional[bool] = None
    preferred_region: Optional[str] = None

class SeniorSupportContact(BaseModel):
    id: Optional[str] = None
    user_id: str
    contact_name: str
    contact_phone: str
    relationship: Optional[str] = None
    is_primary: bool = False
    notify_on_elevated_risk: bool = False
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class SeniorContactUpsert(BaseModel):
    user_id: Optional[str] = None
    id: Optional[str] = None
    contact_name: str
    contact_phone: str
    relationship: Optional[str] = None
    is_primary: bool = False
    notify_on_elevated_risk: bool = False

class SeniorQuestionAnswer(BaseModel):
    question_id: str
    question_text: str
    answer_text: str
    input_mode: InputMode = "mixed"
    confidence: Optional[float] = None

class SeniorInterviewCreate(BaseModel):
    user_id: Optional[str] = None
    input_mode: InputMode = "mixed"
    questions_answers: list[SeniorQuestionAnswer]
    raw_transcript: Optional[str] = None
    checkin_snapshot: Optional[dict[str, Any]] = None
    started_at: Optional[str] = None

class SeniorSummaryDimension(BaseModel):
    label: str
    status: str
    text: str

class SeniorRecommendation(BaseModel):
    type: Literal["relax", "chat", "help", "rest"] = "relax"
    title: str
    reason: str
    tool_id: Optional[str] = None

class SeniorNextAction(BaseModel):
    label: str
    route: str

class SeniorInsightCard(BaseModel):
    id: str
    eyebrow: str
    title: str
    body: str
    action: Optional[str] = None
    tone: RiskLevel = "normal"
    icon: Optional[str] = None
    bullets: list[str] = []
    speak_text: Optional[str] = None

class SeniorSafetyState(BaseModel):
    level: RiskLevel = "normal"
    title: str = "今天先照顾好自己"
    message: str = "如果等下更不舒服，请联系身边可信任的人。"
    steps: list[str] = []
    should_contact_family: bool = False
    emergency_note: Optional[str] = None

class SeniorRecommendedExercise(BaseModel):
    id: str
    title: str
    reason: str
    duration_label: str = "3 分钟"
    steps: list[str] = []
    play_prompt: Optional[str] = None
    stop_rule: Optional[str] = None

class SeniorMemorySnapshot(BaseModel):
    frequent_concerns: list[str] = []
    preferred_support: list[str] = []
    family_terms: list[str] = []
    recent_patterns: list[dict[str, Any]] = []
    updated_at: Optional[str] = None

class SeniorSummaryResponse(BaseModel):
    interview_id: Optional[str] = None
    summary_title: str
    plain_summary: str
    dimensions: dict[str, SeniorSummaryDimension]
    risk_level: RiskLevel = "normal"
    risk_explanation: str = "未发现明确危机信号。"
    recommendation: SeniorRecommendation
    next_action: SeniorNextAction
    insight_cards: list[SeniorInsightCard] = []
    family_message: str = ""
    safety: Optional[SeniorSafetyState] = None
    recommended_exercise: Optional[SeniorRecommendedExercise] = None
    memory_snapshot: Optional[SeniorMemorySnapshot] = None
    tts_text: str
    summary_generation_status: Literal["ai", "fallback"] = "fallback"
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class SeniorSummaryRequest(BaseModel):
    user_id: Optional[str] = None
    interview_id: Optional[str] = None
    answers: list[SeniorQuestionAnswer]
    checkin: Optional[dict[str, Any]] = None
    recent_context: Optional[dict[str, Any]] = None

class SeniorInterviewRecord(BaseModel):
    id: str
    user_id: str
    status: str = "completed"
    input_mode: InputMode = "mixed"
    questions_answers: list[dict[str, Any]]
    raw_transcript: Optional[str] = None
    checkin_snapshot: Optional[dict[str, Any]] = None
    ai_summary: Optional[dict[str, Any]] = None
    risk_level: RiskLevel = "normal"
    risk_reasons: list[str] = []
    recommendation: Optional[dict[str, Any]] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: str

class SeniorHelpEventCreate(BaseModel):
    user_id: Optional[str] = None
    event_type: str
    risk_level: Optional[RiskLevel] = None
    source_interview_id: Optional[str] = None
    action_taken: Optional[str] = None
    caregiver_contact_id: Optional[str] = None
    caregiver_notified: bool = False
    metadata: Optional[dict[str, Any]] = None

class SeniorChatRequest(BaseModel):
    user_id: Optional[str] = None
    message: str
    conversation_history: list[dict[str, str]] = []

class SeniorChatResponse(BaseModel):
    reply_text: str
    risk_level: RiskLevel = "normal"
    tts_text: str
    next_suggestion: Optional[str] = None

class SupportResource(BaseModel):
    id: str
    region: str = "CN"
    resource_type: str
    name: str
    phone: Optional[str] = None
    url: Optional[str] = None
    available_time: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True
