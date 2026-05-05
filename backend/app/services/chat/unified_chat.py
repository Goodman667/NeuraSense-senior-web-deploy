"""
Unified Chat API - 统一对话接口
POST /api/v1/chat

整合所有模块的核心 API 端点：
1. PHQ-9 隐形评估 (Module 4)
2. Neo4j 知识图谱推理 (Module 5)
3. Avatar 指令生成 (Module 6)

使用 asyncio.gather 并行执行 LLM 调用和图谱查询，减少用户等待时间。
"""

from typing import Optional
import asyncio
import time

from pydantic import BaseModel, Field

from .insight_generator import ChatInsight, InsightGeneratorService

# =====================================================
# REQUEST/RESPONSE MODELS
# =====================================================

class BioSignals(BaseModel):
    """生物信号数据（前端 5 秒聚合后发送）"""
    avg_blink_rate: float = Field(default=0.0, description="平均眨眼频率 (BPM)")
    voice_jitter: float = Field(default=0.0, description="语音抖动百分比 (0-100)")
    fatigue_index: float = Field(default=0.0, description="疲劳指数/PERCLOS (0-100)")
    shimmer: Optional[float] = Field(default=None, description="语音振幅抖动 (0-100)")
    avg_ear: Optional[float] = Field(default=None, description="平均眼睛张开度 (0-1)")
    sample_count: int = Field(default=0, description="聚合窗口内的样本数")
    # Keystroke dynamics (optional, from useKeystrokeDynamics)
    keystroke_anxiety: Optional[float] = Field(default=None, description="击键焦虑指数 (0-100)")
    keystroke_focus: Optional[float] = Field(default=None, description="击键专注度 (0-100)")
    # Voice timing (optional, from useVoiceAnalyzer)
    speaking_duration_s: float = Field(default=0.0, description="本窗口说话时长(秒)")
    silence_duration_s: float = Field(default=0.0, description="本窗口沉默时长(秒)")


class ConversationMessage(BaseModel):
    """对话消息"""
    role: str = Field(..., description="消息角色: user 或 assistant")
    content: str = Field(..., description="消息内容")


class UnifiedChatRequest(BaseModel):
    """统一对话请求"""
    user_id: str = Field(..., description="用户唯一标识")
    message: str = Field(..., description="用户消息文本")
    conversation_history: Optional[list[ConversationMessage]] = Field(default=None, description="对话历史")
    bio_signals: Optional[BioSignals] = Field(default=None, description="生物信号数据")
    session_id: Optional[str] = Field(default=None, description="会话 ID")


class AvatarCommand(BaseModel):
    """Avatar 控制指令"""
    emotion: str = Field(default="calm", description="目标情绪状态")
    breathing_bpm: int = Field(default=12, description="目标呼吸频率")
    enable_entrainment: bool = Field(default=False, description="是否启用呼吸夹带")
    mirror_fatigue: bool = Field(default=False, description="是否镜像用户疲劳")


class ExerciseAction(BaseModel):
    """练习触发指令"""
    type: str = Field(default="OPEN_EXERCISE", description="动作类型")
    exercise: str = Field(..., description="练习类型: THOUGHT_RECORD | BEHAVIOR_ACTIVATION")
    context: Optional[dict] = Field(default=None, description="从对话中提取的上下文")


class UnifiedChatResponse(BaseModel):
    """统一对话响应"""
    reply_text: str = Field(..., description="AI 回复文本")
    avatar_command: AvatarCommand = Field(default_factory=AvatarCommand, description="Avatar 控制指令")
    diagnosis_context: Optional[str] = Field(default=None, description="诊断上下文（调试用）")
    phq9_score: Optional[int] = Field(default=None, description="当前 PHQ-9 累积分数")
    risk_flag: bool = Field(default=False, description="危机标记")
    action: Optional[ExerciseAction] = Field(default=None, description="练习触发指令")
    # Innovation 1 & 3 structured output
    assessment_mode: str = Field(default="text_only", description="评估模式: text_only / multimodal")
    hidden_distress_risk: Optional[str] = Field(default=None, description="隐性痛苦风险等级")
    hidden_distress_hdi: Optional[float] = Field(default=None, description="HDI 分数")
    insight: Optional[ChatInsight] = Field(default=None, description="用户可见的结构化提醒内容")


# =====================================================
# CHAT SERVICE
# =====================================================

class UnifiedChatService:
    """
    统一对话服务
    
    整合隐形评估、知识图谱推理和 Avatar 指令生成
    """
    
    def __init__(self):
        # 延迟导入避免循环依赖
        from app.services.assessment import AssessmentManager
        from app.services.assessment.embedded_assessment_service import EmbeddedAssessmentService
        from app.services.knowledge import ClinicalLogicEngine, SymptomRecord
        from app.services.llm import CounselorService

        self.counselor = CounselorService()
        self.insight_generator = InsightGeneratorService()
        self.clinical_engine = ClinicalLogicEngine()

        # 会话管理 — now uses EmbeddedAssessmentService
        self._sessions: dict[str, AssessmentManager] = {}
        self._embedded_sessions: dict[str, EmbeddedAssessmentService] = {}

        # 练习触发追踪
        self._last_exercise_suggestion: dict[str, float] = {}   # session_key -> timestamp
        self._session_turn_counts: dict[str, int] = {}          # session_key -> turn count

    # 练习触发关键词
    THOUGHT_RECORD_TRIGGERS = [
        "我总是", "我永远", "我不行", "我做不到", "没用", "失败",
        "都怪我", "我不够好", "没有人", "太笨了", "活该", "注定",
        "全都完了", "我真差", "一无是处", "什么都做不好",
        "所有人都", "从来没有", "再也不会",
    ]

    BEHAVIOR_ACTIVATION_TRIGGERS = [
        "不想动", "提不起劲", "不想出门", "逃避", "什么都不想做",
        "没有动力", "懒得", "不想起床", "躺着", "没意思",
        "不想见人", "害怕出门", "不想面对", "回避",
        "一整天都", "宅在家", "什么都没做",
    ]

    EXERCISE_COOLDOWN_SECONDS = 600  # 10 分钟冷却
    MIN_TURNS_BEFORE_TRIGGER = 3     # 至少 3 轮对话后才触发
    
    def _get_session(self, user_id: str, session_id: Optional[str] = None):
        """获取或创建评估会话"""
        from app.services.assessment import AssessmentManager

        key = session_id or user_id
        if key not in self._sessions:
            self._sessions[key] = AssessmentManager(key)
        return self._sessions[key]

    def _get_embedded_session(self, user_id: str, session_id: Optional[str] = None):
        """获取或创建嵌入式评估会话（创新点1）"""
        from app.services.assessment.embedded_assessment_service import EmbeddedAssessmentService

        key = session_id or user_id
        if key not in self._embedded_sessions:
            self._embedded_sessions[key] = EmbeddedAssessmentService(key)
        return self._embedded_sessions[key]
    
    async def process_chat(self, request: UnifiedChatRequest) -> UnifiedChatResponse:
        """
        处理对话请求

        流程：
        1. 调用 LLM 生成智能回复
        2. 并行执行嵌入式评估（创新点1）+ 图谱推理
        3. 计算隐性痛苦指数（创新点3）
        4. 生成 Avatar 控制指令
        """
        embedded_service = self._get_embedded_session(
            request.user_id, request.session_id,
        )

        # Step 1: 如果有生物信号，更新图谱
        if request.bio_signals:
            await self._update_bio_signals(request.user_id, request.bio_signals)

        # Step 2: 并行执行任务
        history_dicts = None
        if request.conversation_history:
            history_dicts = [
                {"role": msg.role, "content": msg.content}
                for msg in request.conversation_history
            ]

        counselor_task = self.counselor.generate_response(
            user_message=request.message,
            conversation_history=history_dicts,
            emotion_context=None,
        )

        # 构建 BioSignalSnapshot 供嵌入式评估使用
        bio_snapshot = self._build_bio_snapshot(request.bio_signals)

        assessment_task = self._run_embedded_assessment(
            embedded_service, request.message, bio_snapshot,
        )
        inference_task = self._run_graph_inference(request.user_id)

        # asyncio.gather 并行执行所有任务
        counselor_result, assessment_result, inference_result = await asyncio.gather(
            counselor_task,
            assessment_task,
            inference_task,
            return_exceptions=True
        )

        # 处理异常
        if isinstance(counselor_result, Exception):
            print(f"Counselor LLM call failed: {counselor_result}")
            counselor_result = None
        if isinstance(assessment_result, Exception):
            print(f"Embedded assessment failed: {assessment_result}")
            assessment_result = None
        if isinstance(inference_result, Exception):
            inference_result = None

        # Step 3: 生成最终回复（优先使用 LLM 回复）
        if counselor_result and counselor_result.message:
            reply_text = counselor_result.message
            risk_flag = counselor_result.crisis_flag
        elif assessment_result:
            reply_text = assessment_result.reply_to_user or "我在认真听你说。能告诉我更多吗？"
            risk_flag = assessment_result.risk_flag
        else:
            reply_text = "我在认真听你说。能告诉我更多吗？"
            risk_flag = False

        # Step 4: 隐性痛苦检测（创新点3）
        hdi_risk = None
        hdi_score = None
        if bio_snapshot and assessment_result:
            hdi_risk, hdi_score = self._compute_hidden_distress(
                assessment_result, bio_snapshot, request,
            )

        # Step 5: 生成 Avatar 指令
        avatar_command = self._generate_avatar_command(
            request.bio_signals,
            assessment_result,
        )

        # Step 6: 生成诊断上下文
        diagnosis_context = self._generate_diagnosis_context(
            assessment_result, inference_result,
        )

        # Step 7: 检测练习触发
        action = None
        if not risk_flag:
            session_key = request.session_id or request.user_id
            action = self._detect_exercise_trigger(
                user_message=request.message,
                conversation_history=history_dicts,
                session_key=session_key,
            )

        # Step 8: 持久化评估数据到 Supabase（fire-and-forget）
        if assessment_result:
            self._persist_assessment(assessment_result, request)

        # Step 9: 生成结构化提醒内容（供前端卡片/弹窗直接渲染）
        insight = await self.insight_generator.generate_insight(
            user_message=request.message,
            reply_text=reply_text,
            risk_flag=risk_flag,
            assessment_mode=assessment_result.mode if assessment_result else "text_only",
            hidden_distress_risk=hdi_risk,
            hidden_distress_hdi=hdi_score,
            phq9_score=assessment_result.total_score if assessment_result else None,
            conversation_history=history_dicts,
            bio_signals=request.bio_signals,
            contradictions=assessment_result.contradictions if assessment_result else None,
        )

        return UnifiedChatResponse(
            reply_text=reply_text,
            avatar_command=avatar_command,
            diagnosis_context=diagnosis_context,
            phq9_score=assessment_result.total_score if assessment_result else None,
            risk_flag=risk_flag,
            action=action,
            assessment_mode=assessment_result.mode if assessment_result else "text_only",
            hidden_distress_risk=hdi_risk,
            hidden_distress_hdi=hdi_score,
            insight=insight,
        )
    
    async def _update_bio_signals(self, user_id: str, signals: BioSignals):
        """更新生物信号到图谱"""
        try:
            # 更新 Jitter 生物标记
            if signals.voice_jitter > 0:
                await self.clinical_engine.update_biomarker(
                    user_id, "High Voice Jitter", signals.voice_jitter
                )

            # 更新 PERCLOS 生物标记
            if signals.fatigue_index > 50:
                await self.clinical_engine.update_biomarker(
                    user_id, "High PERCLOS", signals.fatigue_index
                )
        except Exception as e:
            print(f"Failed to update bio signals: {e}")

    def _build_bio_snapshot(self, bio_signals: Optional[BioSignals]):
        """将 BioSignals 转换为 BioSignalSnapshot（供嵌入式评估使用）"""
        if not bio_signals or bio_signals.sample_count == 0:
            return None

        from app.services.assessment.multimodal_evidence_encoder import BioSignalSnapshot

        return BioSignalSnapshot(
            avg_blink_rate=bio_signals.avg_blink_rate,
            avg_ear=bio_signals.avg_ear or 0.0,
            fatigue_index=bio_signals.fatigue_index,
            voice_jitter=bio_signals.voice_jitter,
            shimmer=bio_signals.shimmer or 0.0,
            speaking_duration_s=bio_signals.speaking_duration_s,
            silence_duration_s=bio_signals.silence_duration_s,
            keystroke_anxiety=bio_signals.keystroke_anxiety or 0.0,
            keystroke_focus=bio_signals.keystroke_focus or 0.0,
            sample_count=bio_signals.sample_count,
        )

    def _persist_assessment(self, assessment_result, request: UnifiedChatRequest):
        """持久化评估数据到 Supabase（创新点1）"""
        try:
            from app.services.database.innovation_logger import log_assessment_turn

            log_assessment_turn(
                session_id=request.session_id or request.user_id,
                turn_id=assessment_result.turn_id,
                user_id=request.user_id,
                text_evidence=assessment_result.text_evidence,
                biosignal_snapshot=assessment_result.biosignal_support,
                sensor_quality=assessment_result.sensor_quality,
                contradictions=assessment_result.contradictions,
                confidences=assessment_result.confidences,
                updated_scores=assessment_result.updated_scores,
                total_score=assessment_result.total_score,
                severity_level=assessment_result.severity_level,
                mode=assessment_result.mode,
                clarification_needed=assessment_result.clarification_needed,
                risk_flag=assessment_result.risk_flag,
                condition=assessment_result.condition,
                fallback_reasons=assessment_result.fallback_reasons,
            )
        except Exception as e:
            print(f"Assessment persist failed: {e}")

    async def _run_embedded_assessment(self, embedded_service, message: str, bio_snapshot):
        """运行嵌入式多模态评估（创新点1）"""
        try:
            import uuid
            turn_id = str(uuid.uuid4())[:8]
            result = embedded_service.process_turn(
                user_text=message,
                bio_snapshot=bio_snapshot,
                turn_id=turn_id,
            )
            # Attach turn_id for downstream DB logging
            if result:
                result.turn_id = turn_id
            return result
        except Exception as e:
            print(f"Embedded assessment failed: {e}")
            return None

    def _compute_hidden_distress(self, assessment_result, bio_snapshot, request):
        """计算隐性痛苦指数（创新点3）"""
        try:
            from app.services.emotion.hidden_distress_index import (
                HDIInput,
                compute_hidden_distress_index,
                compute_voice_depression_index,
            )
            from app.services.validation.discordance_reasoner import (
                generate_discordance_explanation,
            )
            from app.services.database.innovation_logger import (
                log_hidden_distress_event,
                query_recent_hdi,
            )

            session_id = request.session_id or request.user_id

            # Estimate text sentiment positivity from assessment
            # If text evidence shows low scores → language is positive
            text_scores = assessment_result.text_evidence
            if text_scores:
                avg_text_severity = sum(
                    v.get("score", 0) for v in text_scores.values()
                ) / max(len(text_scores), 1)
                sem_pos = max(0.0, 1.0 - avg_text_severity / 3.0)
            else:
                sem_pos = 0.7  # no symptoms detected → likely positive

            # Voice depression index
            voice_dep = compute_voice_depression_index(
                voice_jitter=bio_snapshot.voice_jitter,
                shimmer=bio_snapshot.shimmer,
                speaking_duration_s=bio_snapshot.speaking_duration_s,
                silence_duration_s=bio_snapshot.silence_duration_s,
            )

            # Fatigue normalized to [0,1]
            fatigue_norm = min(1.0, bio_snapshot.fatigue_index / 100.0)

            # Keystroke anxiety normalized to [0,1]
            keystroke_anxiety_norm = min(1.0, bio_snapshot.keystroke_anxiety / 100.0)

            # Compute trend_worsening from historical data
            trend_worsening = self._compute_trend_worsening(session_id)

            hdi_input = HDIInput(
                sem_pos=sem_pos,
                voice_depression_index_norm=voice_dep,
                fatigue_index_norm=fatigue_norm,
                keystroke_anxiety_norm=keystroke_anxiety_norm,
                trend_worsening=trend_worsening,
                session_id=session_id,
            )

            hdi_result = compute_hidden_distress_index(hdi_input)

            # Generate explanation (for structured logging)
            discordance_event = generate_discordance_explanation(
                hdi_result=hdi_result,
                voice_jitter=bio_snapshot.voice_jitter,
                shimmer=bio_snapshot.shimmer,
                fatigue_index=bio_snapshot.fatigue_index,
                keystroke_anxiety=bio_snapshot.keystroke_anxiety,
                keystroke_focus=bio_snapshot.keystroke_focus,
                speaking_duration_s=bio_snapshot.speaking_duration_s,
                silence_duration_s=bio_snapshot.silence_duration_s,
                session_id=session_id,
            )

            # Persist to database
            log_hidden_distress_event(
                session_id=session_id,
                turn_id=assessment_result.turn_id if assessment_result else "",
                sem_pos=hdi_result.sem_pos,
                obj_dist=hdi_result.obj_dist,
                self_report_norm=hdi_result.self_report_norm,
                gap_self=hdi_result.gap_self,
                trend_worsening=trend_worsening,
                hdi=hdi_result.hdi,
                risk_level=hdi_result.risk_level.value,
                reason_json={
                    "reasons": discordance_event.reasons,
                    "signals": discordance_event.signals,
                },
                voice_component=voice_dep,
                fatigue_component=fatigue_norm,
                keystroke_component=keystroke_anxiety_norm,
                trend_component=trend_worsening,
            )

            return hdi_result.risk_level.value, hdi_result.hdi

        except Exception as e:
            print(f"Hidden distress computation failed: {e}")
            return None, None

    def _compute_trend_worsening(self, session_id: str) -> float:
        """
        从历史 HDI 记录计算恶化趋势。

        策略：取最近 5 条 obj_dist 值，如果后半段均值 > 前半段均值
        则 trend > 0（恶化中），否则 trend = 0（稳定或改善）。
        """
        try:
            from app.services.database.innovation_logger import query_recent_hdi

            history = query_recent_hdi(session_id, limit=5)
            if len(history) < 3:
                return 0.0

            # history is newest-first, reverse to chronological
            values = [h.get("obj_dist", 0) for h in reversed(history)]
            mid = len(values) // 2
            early_avg = sum(values[:mid]) / mid
            late_avg = sum(values[mid:]) / max(len(values) - mid, 1)

            if late_avg > early_avg:
                # Normalize to [0, 1] — cap at 0.5 difference
                return min(1.0, (late_avg - early_avg) / 0.5)
            return 0.0
        except Exception:
            return 0.0

    async def _run_graph_inference(self, user_id: str):
        """运行图谱推理"""
        try:
            return await self.clinical_engine.infer_potential_disorders(user_id)
        except Exception as e:
            print(f"Graph inference failed: {e}")
            return None
    
    def _generate_avatar_command(
        self, 
        bio_signals: Optional[BioSignals],
        assessment_result
    ) -> AvatarCommand:
        """生成 Avatar 控制指令"""
        # 默认情绪
        emotion = "calm"
        breathing_bpm = 12
        enable_entrainment = False
        mirror_fatigue = False
        
        if bio_signals:
            # 高疲劳 -> 启用呼吸夹带干预
            if bio_signals.fatigue_index > 60:
                enable_entrainment = True
                breathing_bpm = 6  # 目标：0.1Hz 副交感激活频率
                mirror_fatigue = True
            
            # 高焦虑 (Jitter) -> 关切表情 + 呼吸干预
            if bio_signals.voice_jitter > 50:
                emotion = "concerned"
                enable_entrainment = True
                breathing_bpm = 6
            
            # 低眨眼率可能表示专注或疲劳
            if bio_signals.avg_blink_rate < 10:
                mirror_fatigue = True
        
        # 根据评估结果调整
        if assessment_result:
            if assessment_result.risk_flag:
                # 危机模式：保持平静但关切
                emotion = "concerned"
                enable_entrainment = True
                breathing_bpm = 6
        
        return AvatarCommand(
            emotion=emotion,
            breathing_bpm=breathing_bpm,
            enable_entrainment=enable_entrainment,
            mirror_fatigue=mirror_fatigue,
        )
    
    def _generate_diagnosis_context(
        self,
        assessment_result,
        inference_result
    ) -> str:
        """生成诊断上下文日志"""
        parts = []
        
        if assessment_result:
            parts.append(f"[PHQ-9] {assessment_result.thought_process[:200] if assessment_result.thought_process else 'N/A'}")
        
        if inference_result:
            parts.append(f"[Graph] {inference_result.reasoning_summary}")
        
        return " | ".join(parts) if parts else "No diagnosis context available"

    def _detect_exercise_trigger(
        self,
        user_message: str,
        conversation_history: Optional[list[dict]],
        session_key: str,
    ) -> Optional[ExerciseAction]:
        """
        规则驱动的练习触发检测

        规则:
        1. 至少 3 轮对话后才触发
        2. 10 分钟冷却期
        3. 扫描当前消息 + 最近 3 条用户消息
        4. 关键词匹配，选择匹配更多的练习类型
        """
        # 更新轮次计数
        turn_count = self._session_turn_counts.get(session_key, 0) + 1
        self._session_turn_counts[session_key] = turn_count

        # 规则 1: 最少轮次
        if turn_count < self.MIN_TURNS_BEFORE_TRIGGER:
            return None

        # 规则 2: 冷却期
        last_suggestion = self._last_exercise_suggestion.get(session_key, 0)
        if time.time() - last_suggestion < self.EXERCISE_COOLDOWN_SECONDS:
            return None

        # 构建文本语料: 当前消息 + 最近 3 条用户消息
        text_corpus = user_message
        if conversation_history:
            recent_user_msgs = [
                msg.get("content", "")
                for msg in conversation_history[-6:]
                if msg.get("role") == "user"
            ]
            text_corpus = " ".join(recent_user_msgs[-3:]) + " " + user_message

        # 计算触发匹配分数
        thought_score = sum(1 for kw in self.THOUGHT_RECORD_TRIGGERS if kw in text_corpus)
        activation_score = sum(1 for kw in self.BEHAVIOR_ACTIVATION_TRIGGERS if kw in text_corpus)

        # 至少需要 1 个关键词匹配
        if thought_score == 0 and activation_score == 0:
            return None

        # 记录触发时间
        self._last_exercise_suggestion[session_key] = time.time()

        if thought_score >= activation_score:
            return ExerciseAction(
                type="OPEN_EXERCISE",
                exercise="THOUGHT_RECORD",
                context={"trigger_thought": user_message[:100]},
            )
        else:
            return ExerciseAction(
                type="OPEN_EXERCISE",
                exercise="BEHAVIOR_ACTIVATION",
                context={"trigger_context": user_message[:100]},
            )


# =====================================================
# SINGLETON INSTANCE
# =====================================================

_chat_service: Optional[UnifiedChatService] = None

def get_chat_service() -> UnifiedChatService:
    global _chat_service
    if _chat_service is None:
        _chat_service = UnifiedChatService()
    return _chat_service
