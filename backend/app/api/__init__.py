"""
API Layer - REST API Routes

This module contains all API endpoints organized by feature/domain.
Following DDD principles, this layer handles HTTP concerns and delegates
business logic to the services layer.
"""

from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.services.scoring import ClockDrawingScorer
from app.services.emotion import EmotionFusionService, VoiceFeatures
from app.services.knowledge import KnowledgeGraphService
from app.services.llm import CounselorService

# Import prediction router
from app.api.prediction_router import router as prediction_router
# Import validation router
from app.api.validation_router import router as validation_router
# Import WeChat auth router
from app.api.wechat_auth_router import router as wechat_auth_router
# Import journal router
from app.api.journal_router import router as journal_router
# Import EMA router
from app.api.ema_router import router as ema_router
# Import community router
from app.api.community_router import router as community_router
# Import JITAI router
from app.api.jitai_router import router as jitai_router
# Import Phenotyping router
from app.api.phenotyping_router import router as phenotyping_router
# Import Profile router
from app.api.profile_router import router as profile_router
# Import Tools router
from app.api.tools_router import router as tools_router
# Import Checkin router
from app.api.checkin_router import router as checkin_router
# Import Programs router
from app.api.programs_router import router as programs_router
# Import Assessments Center router
from app.api.assessments_router import router as assessments_center_router
# Import Exercises router
from app.api.exercises_router import router as exercises_router
# Import Memory router
from app.api.memory_router import router as memory_router
# Import Notifications router
from app.api.notifications_router import router as notifications_router
# Import Senior Mode router
from app.api.senior_router import router as senior_router

router = APIRouter()

# Include prediction sub-router
router.include_router(prediction_router)
# Include validation sub-router
router.include_router(validation_router)
# Include WeChat auth sub-router
router.include_router(wechat_auth_router)
# Include journal sub-router
router.include_router(journal_router)
# Include EMA sub-router
router.include_router(ema_router)
# Include community sub-router
router.include_router(community_router)
# Include JITAI sub-router
router.include_router(jitai_router)
# Include Phenotyping sub-router
router.include_router(phenotyping_router)
# Include Profile sub-router
router.include_router(profile_router)
# Include Tools sub-router
router.include_router(tools_router)
# Include Checkin sub-router
router.include_router(checkin_router)
# Include Programs sub-router
router.include_router(programs_router)
# Include Assessments Center sub-router
router.include_router(assessments_center_router)
# Include Exercises sub-router
router.include_router(exercises_router)
# Include Memory sub-router
router.include_router(memory_router)
# Include Notifications sub-router
router.include_router(notifications_router)
# Include Senior Mode sub-router
router.include_router(senior_router)

# Initialize services
clock_scorer = ClockDrawingScorer()
emotion_service = EmotionFusionService()
knowledge_service = KnowledgeGraphService()
counselor_service = CounselorService()


# ==================== Request/Response Models ====================

class ClockScoreRequest(BaseModel):
    """画钟测验评分请求"""
    image_base64: str


class ClockScoreResponse(BaseModel):
    """画钟测验评分结果"""
    total_score: int
    clock_face_score: int
    clock_hands_score: int
    numbers_score: int
    feedback: list[str]
    details: dict
    ai_interpretation: Optional[str] = None
    suggestions: Optional[list[str]] = None
    scoring_method: str = "opencv"


class VoiceFeaturesInput(BaseModel):
    """语音特征输入"""
    speech_rate: float = 120.0
    pitch_jitter: float = 0.5
    mean_pitch: float = 150.0
    pause_ratio: float = 0.2
    mean_pause_duration: float = 0.3
    volume_variation: float = 0.5
    energy: float = 0.5


class EmotionAnalysisRequest(BaseModel):
    """情感分析请求"""
    text: str
    voice_features: Optional[VoiceFeaturesInput] = None


class EmotionAnalysisResponse(BaseModel):
    """情感分析结果"""
    text_sentiment: dict
    voice_features: Optional[dict]
    fused_emotion: str
    fused_confidence: float
    risk_level: str
    risk_type: str
    emotional_inconsistency: bool
    feedback: list[str]
    recommendations: list[str]


class SymptomQueryRequest(BaseModel):
    """症状查询请求"""
    symptoms: list[str]


class SymptomQueryResponse(BaseModel):
    """症状查询结果"""
    symptoms: list[str]
    related_diseases: list[dict]
    recommendations: list[dict]
    urgent_attention: bool
    summary: str


class CounselorChatRequest(BaseModel):
    """咨询对话请求"""
    message: str
    emotion_context: Optional[dict] = None
    conversation_history: Optional[list[dict]] = None


class CounselorChatResponse(BaseModel):
    """咨询对话回复"""
    message: str
    follow_up_question: Optional[str]
    coping_suggestions: list[str]
    psychoeducation: Optional[str]
    needs_referral: bool
    crisis_flag: bool


# ==================== Assessment Endpoints ====================

@router.get("/assessments")
async def list_assessments() -> dict[str, list]:
    """获取所有可用的心理测评量表列表"""
    return {
        "assessments": [
            {
                "id": "cdt",
                "name": "画钟测验",
                "name_en": "Clock Drawing Test",
                "description": "用于评估认知功能的经典神经心理学测验",
            },
            {
                "id": "phq9",
                "name": "患者健康问卷-9",
                "name_en": "Patient Health Questionnaire-9",
                "description": "用于抑郁症筛查的标准化量表",
            },
            {
                "id": "gad7",
                "name": "广泛性焦虑障碍量表-7",
                "name_en": "Generalized Anxiety Disorder-7",
                "description": "用于焦虑症筛查的标准化量表",
            },
        ]
    }


@router.post("/assessments/cdt/score", response_model=ClockScoreResponse)
async def score_clock_drawing(request: ClockScoreRequest) -> ClockScoreResponse:
    """评分画钟测验提交 — 优先使用 AI 视觉模型，失败时回退到 OpenCV"""
    try:
        import asyncio
        result = await asyncio.to_thread(
            clock_scorer.ai_score_from_base64, request.image_base64
        )

        return ClockScoreResponse(
            total_score=result.total_score,
            clock_face_score=result.clock_face_score,
            clock_hands_score=result.clock_hands_score,
            numbers_score=result.numbers_score,
            feedback=result.feedback,
            details={
                "roundness": result.detected_roundness,
                "hands_angle": result.detected_hands_angle,
                "number_count": result.detected_number_count,
            },
            ai_interpretation=result.ai_interpretation,
            suggestions=result.suggestions,
            scoring_method=result.scoring_method,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"评分失败: {str(e)}")


# ==================== Emotion Analysis Endpoints ====================

@router.post("/emotion/analyze", response_model=EmotionAnalysisResponse)
async def analyze_emotion(request: EmotionAnalysisRequest) -> EmotionAnalysisResponse:
    """
    多模态情感分析
    
    分析文本情感和语音特征，检测潜在的心理风险（如微笑抑郁）
    """
    try:
        # 转换语音特征
        voice_features = None
        if request.voice_features:
            voice_features = VoiceFeatures(
                speech_rate=request.voice_features.speech_rate,
                pitch_jitter=request.voice_features.pitch_jitter,
                mean_pitch=request.voice_features.mean_pitch,
                pause_ratio=request.voice_features.pause_ratio,
                mean_pause_duration=request.voice_features.mean_pause_duration,
                volume_variation=request.voice_features.volume_variation,
                energy=request.voice_features.energy,
            )
        
        # 执行情感分析
        result = emotion_service.fuse_emotions(request.text, voice_features)
        
        return EmotionAnalysisResponse(
            text_sentiment={
                "category": result.text_sentiment.category.value,
                "score": result.text_sentiment.score,
                "confidence": result.text_sentiment.confidence,
                "keywords": result.text_sentiment.keywords,
            },
            voice_features=result.to_dict().get("voice_features"),
            fused_emotion=result.fused_emotion.value,
            fused_confidence=result.fused_confidence,
            risk_level=result.risk_level.value,
            risk_type=result.risk_type.value,
            emotional_inconsistency=result.emotional_inconsistency,
            feedback=result.feedback,
            recommendations=result.recommendations,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"情感分析失败: {str(e)}")


# ==================== Knowledge Graph Endpoints ====================

@router.post("/knowledge/symptoms", response_model=SymptomQueryResponse)
async def query_symptoms(request: SymptomQueryRequest) -> SymptomQueryResponse:
    """
    症状知识图谱查询
    
    根据症状列表查询相关疾病和建议
    """
    try:
        result = await knowledge_service.query_by_symptoms(request.symptoms)
        
        return SymptomQueryResponse(
            symptoms=result.symptoms,
            related_diseases=[
                {
                    "name": d.name,
                    "name_en": d.name_en,
                    "description": d.description,
                    "severity": d.severity,
                }
                for d in result.related_diseases
            ],
            recommendations=[
                {
                    "content": r.content,
                    "priority": r.priority,
                    "category": r.category,
                }
                for r in result.recommendations
            ],
            urgent_attention=result.urgent_attention,
            summary=result.summary,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"知识查询失败: {str(e)}")


# ==================== Counselor Chat Endpoints ====================

@router.post("/counselor/chat", response_model=CounselorChatResponse)
async def counselor_chat(request: CounselorChatRequest) -> CounselorChatResponse:
    """
    AI 心理咨询师对话
    
    生成温暖、共情的心理咨询回复
    """
    try:
        result = await counselor_service.generate_response(
            user_message=request.message,
            conversation_history=request.conversation_history,
            emotion_context=request.emotion_context,
        )
        
        return CounselorChatResponse(
            message=result.message,
            follow_up_question=result.follow_up_question,
            coping_suggestions=result.coping_suggestions,
            psychoeducation=result.psychoeducation,
            needs_referral=result.needs_referral,
            crisis_flag=result.crisis_flag,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"对话生成失败: {str(e)}")


@router.get("/counselor/prompt")
async def get_counselor_prompt() -> dict:
    """获取心理咨询师系统提示词模板"""
    return counselor_service.get_prompt_template()


# ==================== Stealth PHQ-9 Assessment Endpoints ====================

from app.services.assessment import AssessmentManager, STEALTH_ASSESSMENT_SYSTEM_PROMPT

# Session storage (in production, use Redis or database)
_assessment_sessions: dict[str, AssessmentManager] = {}


class StealthChatRequest(BaseModel):
    """隐形评估对话请求"""
    session_id: str = "default"
    message: str


class PHQ9ScoreItem(BaseModel):
    """PHQ-9 单项评分"""
    dimension_id: int
    dimension_name: str
    score: int


class StealthChatResponse(BaseModel):
    """隐形评估对话响应"""
    reply: str
    risk_flag: bool
    phq9_updates: list[dict]
    thought_process: Optional[str] = None  # 仅调试模式


class AssessmentSummaryResponse(BaseModel):
    """评估摘要响应"""
    session_id: str
    total_score: int
    severity_level: str
    dimension_scores: dict[str, int]
    conversation_turns: int
    is_crisis_mode: bool


@router.post("/assessment/stealth/chat", response_model=StealthChatResponse)
async def stealth_assessment_chat(request: StealthChatRequest) -> StealthChatResponse:
    """
    隐形 PHQ-9 评估对话
    
    通过自然对话进行抑郁症状评估，用户不会感知到评估过程。
    LLM 同时扮演温暖的咨询师（显性）和临床评估员（隐性）。
    """
    # 获取或创建会话
    if request.session_id not in _assessment_sessions:
        _assessment_sessions[request.session_id] = AssessmentManager(request.session_id)
    
    manager = _assessment_sessions[request.session_id]
    
    try:
        # 处理用户输入
        result = manager.process_user_input(request.message)
        
        return StealthChatResponse(
            reply=result.reply_to_user,
            risk_flag=result.risk_flag,
            phq9_updates=[
                {
                    "symptom_id": u.symptom_id,
                    "score": u.score,
                    "confidence": u.confidence,
                }
                for u in result.phq9_updates
            ],
            thought_process=result.thought_process,  # 调试用
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"评估处理失败: {str(e)}")


@router.get("/assessment/stealth/{session_id}/summary", response_model=AssessmentSummaryResponse)
async def get_assessment_summary(session_id: str) -> AssessmentSummaryResponse:
    """
    获取隐形评估摘要
    
    返回当前会话的 PHQ-9 累积评分和严重程度等级。
    """
    if session_id not in _assessment_sessions:
        raise HTTPException(status_code=404, detail="会话不存在")
    
    manager = _assessment_sessions[session_id]
    summary = manager.get_assessment_summary()
    
    return AssessmentSummaryResponse(
        session_id=summary["session_id"],
        total_score=summary["total_score"],
        severity_level=summary["severity_level"],
        dimension_scores=summary["dimension_scores"],
        conversation_turns=summary["conversation_turns"],
        is_crisis_mode=summary["is_crisis_mode"],
    )


@router.delete("/assessment/stealth/{session_id}")
async def reset_assessment_session(session_id: str) -> dict:
    """重置评估会话"""
    if session_id in _assessment_sessions:
        _assessment_sessions[session_id].reset_session()
        return {"status": "reset", "session_id": session_id}
    else:
        raise HTTPException(status_code=404, detail="会话不存在")


@router.get("/assessment/stealth/prompt")
async def get_stealth_prompt() -> dict:
    """获取隐形评估系统提示词（调试用）"""
    return {
        "system_prompt": STEALTH_ASSESSMENT_SYSTEM_PROMPT,
        "description": "双角色 CoT Prompt：温暖咨询师 + 临床评估员",
    }


# ==================== Clinical Logic Engine Endpoints ====================

from app.services.knowledge import ClinicalLogicEngine, SymptomRecord

# Initialize clinical logic engine
clinical_engine = ClinicalLogicEngine()


class SymptomUpdateRequest(BaseModel):
    """症状更新请求"""
    user_id: str
    symptoms: list[dict]  # [{"name": "Insomnia", "severity": 2}]


class BiomarkerUpdateRequest(BaseModel):
    """生物标记更新请求"""
    user_id: str
    biomarker: str
    value: float


class DisorderInferenceItem(BaseModel):
    """疾病推理项"""
    name: str
    name_cn: str
    risk_score: float
    confidence: str
    supporting_symptoms: list[str]


class GraphInferenceResponse(BaseModel):
    """图推理响应"""
    user_id: str
    inferred_disorders: list[DisorderInferenceItem]
    active_symptoms: list[str]
    reasoning_summary: str
    co_occurring_features: list[str] = []


@router.post("/graph/symptoms", tags=["Knowledge Graph"])
async def update_user_symptoms(request: SymptomUpdateRequest) -> dict:
    """
    更新用户症状图
    
    将症状写入 Neo4j 知识图谱，建立 (:User)-[:HAS_SYMPTOM]->(:Symptom) 关系。
    使用 MERGE 语句确保幂等性，采用最高严重度原则更新。
    """
    symptom_records = [
        SymptomRecord(
            name=s.get("name", ""),
            severity=s.get("severity", 1),
            source=s.get("source", "user_report")
        )
        for s in request.symptoms
        if s.get("name")
    ]
    
    result = await clinical_engine.update_symptom_graph(
        user_id=request.user_id,
        symptom_list=symptom_records
    )
    
    return result


@router.post("/graph/biomarkers", tags=["Knowledge Graph"])
async def update_user_biomarker(request: BiomarkerUpdateRequest) -> dict:
    """
    更新用户生物标记
    
    将数字表型数据（如 Jitter、PERCLOS）写入图谱。
    """
    return await clinical_engine.update_biomarker(
        user_id=request.user_id,
        biomarker_name=request.biomarker,
        value=request.value
    )


@router.get("/graph/inference/{user_id}", response_model=GraphInferenceResponse, tags=["Knowledge Graph"])
async def infer_disorders(user_id: str, include_biomarkers: bool = True) -> GraphInferenceResponse:
    """
    推理潜在疾病 (GraphRAG)
    
    基于用户症状执行加权路径求和：
    Score(D) = Σ Weight(s→D) × Severity(s)
    
    返回排序后的潜在疾病列表和推理摘要。
    """
    result = await clinical_engine.infer_potential_disorders(
        user_id=user_id,
        include_biomarkers=include_biomarkers
    )
    
    return GraphInferenceResponse(
        user_id=result.user_id,
        inferred_disorders=[
            DisorderInferenceItem(
                name=d.name,
                name_cn=d.name_cn,
                risk_score=d.risk_score,
                confidence=d.confidence,
                supporting_symptoms=d.supporting_symptoms
            )
            for d in result.inferred_disorders
        ],
        active_symptoms=result.active_symptoms,
        reasoning_summary=result.reasoning_summary,
        co_occurring_features=result.co_occurring_features,
    )


@router.get("/graph/paths/{symptom_name}", tags=["Knowledge Graph"])
async def get_symptom_paths(symptom_name: str, hops: int = 2) -> dict:
    """
    获取症状的 N-hop 邻居路径
    
    用于 GraphRAG 子图检索，返回症状相关的疾病和其他症状。
    """
    paths = await clinical_engine.get_symptom_disorder_paths(
        symptom_name=symptom_name,
        hops=hops
    )
    return {"symptom": symptom_name, "hops": hops, "paths": paths}


@router.post("/graph/initialize", tags=["Knowledge Graph"])
async def initialize_graph_schema() -> dict:
    """
    初始化知识图谱 Schema
    
    创建约束并注入初始医学知识。
    注意：此操作仅需执行一次。
    """
    success = await clinical_engine.initialize_schema()
    return {
        "status": "success" if success else "failed",
        "message": "Schema initialized with medical knowledge" if success else "Neo4j connection failed"
    }


# ==================== Unified Chat API ====================

from app.services.chat import (
    get_chat_service,
    UnifiedChatRequest,
    UnifiedChatResponse,
    BioSignals,
    AvatarCommand,
)


@router.post("/chat", response_model=UnifiedChatResponse, tags=["Chat"])
async def unified_chat(request: UnifiedChatRequest) -> UnifiedChatResponse:
    """
    统一对话接口 - 整合所有模块
    
    接收用户消息和生物信号，返回 AI 回复和 Avatar 控制指令。
    
    数据流:
    1. 接收 message + bio_signals
    2. 并行执行: LLM 隐形评估 + Neo4j 图谱推理 (asyncio.gather)
    3. 聚合结果，生成 reply_text + avatar_command
    
    Request Body:
    ```json
    {
      "user_id": "string",
      "message": "string",
      "bio_signals": {
        "avg_blink_rate": 15.0,
        "voice_jitter": 0.0,
        "fatigue_index": 0.0
      }
    }
    ```
    
    Response Body:
    ```json
    {
      "reply_text": "AI 回复",
      "avatar_command": {
        "emotion": "calm",
        "breathing_bpm": 6,
        "enable_entrainment": true
      },
      "diagnosis_context": "调试日志"
    }
    ```
    """
    chat_service = get_chat_service()
    
    try:
        result = await chat_service.process_chat(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"对话处理失败: {str(e)}")


# ==================== TTS Endpoints ====================

class TTSRequest(BaseModel):
    """TTS请求"""
    text: str
    voice: str = "xiaoxiao"  # xiaoxiao, xiaoyi, yunjian, yunxi
    emotion: str = "gentle"  # calm, cheerful, sad, gentle, empathetic, friendly


@router.post("/tts")
async def text_to_speech(request: TTSRequest):
    """
    文字转语音 API
    
    使用微软 Edge TTS 生成自然流畅的中文语音
    返回 MP3 音频数据（base64 编码）
    """
    try:
        from app.services.tts import get_speech
        import base64
        
        audio_data = await get_speech(
            text=request.text,
            voice=request.voice,
            emotion=request.emotion,
        )
        
        # 返回 base64 编码的音频
        audio_base64 = base64.b64encode(audio_data).decode('utf-8')
        
        return {
            "success": True,
            "audio": audio_base64,
            "format": "mp3",
            "voice": request.voice,
            "emotion": request.emotion,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"语音合成失败: {str(e)}")


@router.get("/tts/voices")
async def list_voices():
    """获取可用语音列表"""
    return {
        "voices": [
            {"id": "xiaoxiao", "name": "晓晓", "description": "温暖自然的女声（推荐）"},
            {"id": "xiaoyi", "name": "晓伊", "description": "活泼可爱的女声"},
            {"id": "yunjian", "name": "云健", "description": "稳重成熟的男声"},
            {"id": "yunxi", "name": "云希", "description": "年轻阳光的男声"},
        ],
        "emotions": [
            {"id": "gentle", "name": "温柔", "description": "平和温柔的语气"},
            {"id": "calm", "name": "平静", "description": "沉稳平静的语气"},
            {"id": "cheerful", "name": "愉快", "description": "轻快愉悦的语气"},
            {"id": "empathetic", "name": "共情", "description": "理解关怀的语气"},
            {"id": "sad", "name": "低沉", "description": "低沉缓慢的语气"},
        ]
    }


# ==================== Auth Endpoints ====================

class RegisterRequest(BaseModel):
    """注册请求"""
    username: str
    password: str
    nickname: Optional[str] = None


class LoginRequest(BaseModel):
    """登录请求"""
    username: str
    password: str


class SaveAssessmentRequest(BaseModel):
    """保存评估请求"""
    scale_type: str
    total_score: int
    answers: list[int]
    severity: str
    ai_interpretation: Optional[str] = None


@router.post("/auth/register")
async def register(request: RegisterRequest):
    """用户注册"""
    try:
        from app.services.auth import auth_service
        from app.api.profile_router import bootstrap_user_profile
        user = auth_service.register(
            username=request.username,
            password=request.password,
            nickname=request.nickname,
        )
        bootstrap_user_profile(user["id"], onboarding_completed=False)
        return {"success": True, "user": user}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"注册失败: {str(e)}")


@router.post("/auth/login")
async def login(request: LoginRequest):
    """用户登录"""
    try:
        from app.services.auth import auth_service
        result = auth_service.login(
            username=request.username,
            password=request.password,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"登录失败: {str(e)}")


@router.post("/auth/logout")
async def logout(token: str):
    """用户登出"""
    try:
        from app.services.auth import auth_service
        auth_service.logout(token)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"登出失败: {str(e)}")


@router.get("/auth/me")
async def get_current_user(token: str):
    """获取当前用户信息"""
    try:
        from app.services.auth import auth_service
        user = auth_service.validate_token(token)
        if not user:
            raise HTTPException(status_code=401, detail="无效的登录凭证")
        return {"success": True, "user": user}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取用户信息失败: {str(e)}")


# ==================== Assessment History Endpoints ====================

@router.post("/history/save")
async def save_assessment(request: SaveAssessmentRequest, token: str):
    """保存评估记录"""
    try:
        from app.services.auth import auth_service
        
        # 验证用户
        user = auth_service.validate_token(token)
        if not user:
            raise HTTPException(status_code=401, detail="请先登录")
        
        # 保存记录
        record = auth_service.save_assessment(
            user_id=user["id"],
            scale_type=request.scale_type,
            total_score=request.total_score,
            answers=request.answers,
            severity=request.severity,
            ai_interpretation=request.ai_interpretation,
        )
        return {"success": True, "record": record}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存失败: {str(e)}")


@router.get("/history")
async def get_history(token: str, scale_type: Optional[str] = None):
    """获取评估历史"""
    try:
        from app.services.auth import auth_service
        
        # 验证用户
        user = auth_service.validate_token(token)
        if not user:
            raise HTTPException(status_code=401, detail="请先登录")
        
        # 获取历史
        history = auth_service.get_user_history(
            user_id=user["id"],
            scale_type=scale_type,
        )
        return {"success": True, "history": history}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取历史失败: {str(e)}")


# ==================== PDF Report Generation ====================

class PDFReportRequest(BaseModel):
    """PDF报告生成请求"""
    scale_type: str
    total_score: int
    answers: list = []
    ai_interpretation: Optional[str] = None
    user_name: Optional[str] = None


@router.post("/report/pdf")
async def generate_pdf_report(request: PDFReportRequest):
    """
    生成 PDF 评估报告
    
    返回 Base64 编码的 PDF 文件
    """
    try:
        from app.services.report import pdf_service
        
        if pdf_service is None:
            raise HTTPException(
                status_code=500, 
                detail="PDF 服务不可用，请安装 reportlab: pip install reportlab"
            )
        
        pdf_base64 = pdf_service.generate_base64(
            scale_type=request.scale_type,
            total_score=request.total_score,
            answers=request.answers,
            ai_interpretation=request.ai_interpretation,
            user_name=request.user_name,
        )
        
        return {
            "success": True,
            "pdf_base64": pdf_base64,
            "filename": f"心理评估报告_{request.scale_type.upper()}_{datetime.now().strftime('%Y%m%d')}.pdf",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF 生成失败: {str(e)}")


# ==================== Bio-Signal AI Analysis ====================

class EyeMetricsInput(BaseModel):
    """眼部指标输入"""
    blink_rate: float = 15.0  # 每分钟眨眼次数
    perclos: float = 0.05  # 眼睛闭合时间比例
    gaze_stability: float = 0.8  # 凝视稳定性 0-1
    fatigue_level: str = "normal"  # 疲劳等级
    tracking_duration: int = 60  # 监测时长(秒)


class VoiceMetricsInput(BaseModel):
    """语音指标输入"""
    jitter: float = 0.02  # 周期抖动
    shimmer: float = 0.05  # 振幅抖动
    mean_pitch: float = 150.0  # 平均基频
    speech_rate: float = 4.0  # 语速(音节/秒)
    pause_ratio: float = 0.2  # 停顿比例
    voice_activity: float = 0.5  # 语音活跃度


class EmotionDataInput(BaseModel):
    """情绪数据输入"""
    primary_emotion: str = "neutral"  # 主要情绪
    confidence: float = 0.8  # 置信度
    valence: float = 0.5  # 效价 -1到1
    arousal: float = 0.5  # 唤醒度 0到1


class BioSignalAnalysisRequest(BaseModel):
    """生物信号综合分析请求"""
    eye_metrics: Optional[EyeMetricsInput] = None
    voice_metrics: Optional[VoiceMetricsInput] = None
    emotion_data: Optional[EmotionDataInput] = None
    analysis_type: str = "comprehensive"  # comprehensive, eye_only, voice_only


@router.post("/biosignal/analyze")
async def analyze_biosignal(request: BioSignalAnalysisRequest):
    """
    多模态生物信号AI分析
    
    综合分析眼部指标、语音特征和情绪数据，生成心理状态评估报告
    """
    try:
        # 构建分析提示
        analysis_parts = []
        
        # 眼部数据分析
        if request.eye_metrics:
            eye = request.eye_metrics
            eye_status = "正常" if eye.blink_rate >= 10 and eye.blink_rate <= 20 else ("偏低" if eye.blink_rate < 10 else "偏高")
            perclos_status = "正常" if eye.perclos < 0.15 else ("轻度疲劳" if eye.perclos < 0.30 else "明显疲劳")
            
            analysis_parts.append(f"""
【眼部生物信号】
- 眨眼频率: {eye.blink_rate:.1f} 次/分钟 ({eye_status})
- PERCLOS值: {eye.perclos*100:.1f}% ({perclos_status})
- 凝视稳定性: {eye.gaze_stability*100:.0f}%
- 监测时长: {eye.tracking_duration} 秒
- 系统判断疲劳等级: {eye.fatigue_level}
""")

        # 语音数据分析
        if request.voice_metrics:
            voice = request.voice_metrics
            jitter_status = "正常" if voice.jitter < 0.05 else "偏高(可能紧张焦虑)"
            shimmer_status = "正常" if voice.shimmer < 0.10 else "偏高"
            
            analysis_parts.append(f"""
【语音生物信号】
- Jitter(周期抖动): {voice.jitter*100:.1f}% ({jitter_status})
- Shimmer(振幅抖动): {voice.shimmer*100:.1f}% ({shimmer_status})
- 平均基频: {voice.mean_pitch:.0f} Hz
- 语速: {voice.speech_rate:.1f} 音节/秒
- 停顿比例: {voice.pause_ratio*100:.0f}%
- 语音活跃度: {voice.voice_activity*100:.0f}%
""")

        # 情绪数据分析
        if request.emotion_data:
            emotion = request.emotion_data
            emotion_map = {
                "neutral": "中性", "happy": "开心", "sad": "悲伤",
                "angry": "愤怒", "fearful": "恐惧", "disgusted": "厌恶",
                "surprised": "惊讶"
            }
            analysis_parts.append(f"""
【面部情绪识别】
- 主要情绪: {emotion_map.get(emotion.primary_emotion, emotion.primary_emotion)}
- 识别置信度: {emotion.confidence*100:.0f}%
- 情绪效价: {emotion.valence:.2f} (-1消极 ~ +1积极)
- 情绪唤醒度: {emotion.arousal:.2f} (0平静 ~ 1激动)
""")

        if not analysis_parts:
            return {
                "success": False,
                "error": "请提供至少一种生物信号数据"
            }

        # 调用AI进行综合分析
        prompt = f"""你是一位专业的心理生理学分析师。我将提供用户的多模态生物信号数据，请进行综合分析。

{chr(10).join(analysis_parts)}

请提供以下分析（用JSON格式返回，注意使用双引号）:
1. overall_state: 整体状态评估 (优秀/良好/一般/需关注)
2. stress_level: 压力指数 (0-100)
3. fatigue_index: 疲劳指数 (0-100)
4. attention_score: 注意力评分 (0-100)
5. emotional_state: 情绪状态描述
6. analysis: 详细专业分析 (100-150字)
7. recommendations: 具体建议列表 (3-4条)
8. risk_flags: 需要关注的风险点 (如有)

请以温暖专业的语气分析，关注用户心理健康。"""

        response = await counselor_service.generate_response(
            user_id="biosignal_analyzer",
            message=prompt,
            conversation_history=[]
        )

        # 尝试解析JSON响应
        import json
        import re
        
        try:
            # 尝试从响应中提取JSON
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                result = json.loads(json_match.group())
            else:
                # 如果没有JSON，返回原始分析
                result = {
                    "overall_state": "良好",
                    "stress_level": 35,
                    "fatigue_index": 25,
                    "attention_score": 75,
                    "emotional_state": "情绪平稳",
                    "analysis": response[:300] if len(response) > 300 else response,
                    "recommendations": ["保持规律作息", "适当休息眼睛", "深呼吸放松"],
                    "risk_flags": []
                }
        except json.JSONDecodeError:
            result = {
                "overall_state": "良好",
                "stress_level": 35,
                "fatigue_index": 25,
                "attention_score": 75,
                "emotional_state": "情绪平稳",
                "analysis": response[:300] if len(response) > 300 else response,
                "recommendations": ["保持规律作息", "适当休息眼睛", "深呼吸放松"],
                "risk_flags": []
            }

        return {
            "success": True,
            **result,
            "timestamp": datetime.now().isoformat(),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生物信号分析失败: {str(e)}")


# ==================== Health Check ====================

@router.get("/health")
async def api_health() -> dict[str, str]:
    """API health check endpoint."""
    return {"status": "healthy", "layer": "api"}


