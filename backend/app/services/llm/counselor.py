"""
Counselor Service

LLM-based psychological counselor service that generates empathetic,
supportive responses in Chinese using Claude/Gemini/other LLMs.

Key features:
- Warm, professional tone
- Extensive use of empathetic language
- Mandatory Chinese responses
- Mental health context awareness
- Long-term memory via vector store
"""

from dataclasses import dataclass, field
from typing import Optional
from enum import Enum
import os
import httpx
from app.services.mental_health import build_ai_context

# 导入向量记忆服务。使用自定义非智谱聊天 Key 时，本地默认关闭，避免 embedding 仍拿聊天 Key 调智谱导致 401。
if os.getenv("ENABLE_VECTOR_MEMORY", "true").lower() in {"0", "false", "no"}:
    vector_memory = None
    MEMORY_AVAILABLE = False
else:
    try:
        from ..memory.vector_store import vector_memory
        MEMORY_AVAILABLE = True
    except Exception:
        vector_memory = None
        MEMORY_AVAILABLE = False


class ResponseStyle(str, Enum):
    """回复风格"""
    EMPATHETIC = "empathetic"      # 共情为主
    SUPPORTIVE = "supportive"      # 支持鼓励
    EDUCATIONAL = "educational"    # 心理教育
    EXPLORATORY = "exploratory"    # 探索引导


@dataclass
class CounselorResponse:
    """
    心理咨询师回复
    """
    # 主要回复内容
    message: str
    
    # 后续问题（用于继续对话）
    follow_up_question: Optional[str] = None
    
    # 建议的应对策略
    coping_suggestions: list[str] = field(default_factory=list)
    
    # 相关心理学知识
    psychoeducation: Optional[str] = None
    
    # 是否需要专业转介
    needs_referral: bool = False
    
    # 危机干预标记
    crisis_flag: bool = False
    
    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "message": self.message,
            "follow_up_question": self.follow_up_question,
            "coping_suggestions": self.coping_suggestions,
            "psychoeducation": self.psychoeducation,
            "needs_referral": self.needs_referral,
            "crisis_flag": self.crisis_flag,
        }


class CounselorService:
    """
    心理咨询师服务
    
    使用 LLM (Claude/Gemini) 生成温暖、专业的心理咨询回复
    """
    
    # LLM API 配置
    LLM_API_KEY = os.getenv("LLM_API_KEY", "")
    LLM_MODEL = os.getenv("LLM_MODEL", "glm-4-flash")
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "zhipuai")
    LLM_API_BASE = os.getenv("LLM_API_BASE", os.getenv("LLM_BASE_URL", "")).rstrip("/")
    
    # 系统提示词 - 核心配置
    SYSTEM_PROMPT = """你是 NeuraSense 心理健康支持平台中的 AI 陪伴助手，名字叫“小心”。
你的角色不是普通闲聊机器人，而是一个具备心理健康支持知识、能长期陪伴用户的温和对话伙伴。

## 核心要求

1. 必须使用简体中文回复。
2. 永远先理解用户当下的处境，再给建议；不要机械套用“我理解你/这确实不容易”。
3. 回复要有上下文记忆：如果用户前面说了“抽烟、成绩、睡眠、家人、压力”等内容，后续必须自然承接。
4. 不要只给一句泛泛安慰。默认给出：
   - 对用户处境的具体复述或理解；
   - 1-3 个马上能做的小步骤；
   - 一个温和的追问，帮助继续对话。
5. 可以使用心理健康知识，但要说成人能听懂的话，避免堆术语；必要时可提到 CBT、呼吸放松、行为激活、睡眠卫生等方法。
6. 语气像专业、温暖、有耐心的人类心理健康助手：细致、稳定、不过度热情、不说教。
7. 避免“你应该/你必须/别想太多/坚强一点”等评判或命令式表达。
8. 不要冒充医生，不做诊断；可以说“这可能提示……”“建议进一步咨询专业人员”。
9. 如果用户问的是量表结果，请结合具体分数和高分维度做个性化解释，不要输出固定模板。

## 对话深度

- 用户只说一句短话时，也要从生活场景中推断可能的压力来源，并给出可执行建议。
- 用户表达痛苦时，不要急着总结，要先陪伴，再给小步骤。
- 用户提到成瘾/抽烟/拖延/学习压力时，要给具体替代行为和下一步计划。
- 用户连续多轮对话时，要显式记住并连接前文，例如：“刚才你提到最近抽烟，这次又说成绩不好……”

## 危机响应

如果用户出现自杀、自伤、伤害他人或强烈绝望信号：
1. 先表达明确关心；
2. 询问“你现在是否安全，身边是否有人可以陪你”；
3. 建议立即联系当地急救/医院/可信任的人；
4. 提供心理援助热线：400-161-9995；
5. 不要只给普通安慰。

记住：你服务的是心理健康平台中的真实用户。回答要具体、有上下文、有帮助，而不是模板化安慰。"""

    # 共情短语库
    EMPATHY_PHRASES = [
        "我理解你的感受",
        "这确实不容易",
        "听起来你经历了很多",
        "谢谢你愿意与我分享",
        "你的感受是完全合理的",
        "我能感受到你的心情",
        "这种情况下有这些感受很正常",
        "你愿意说出来需要很大勇气",
        "我在这里倾听你",
        "无论发生什么，你都值得被关心",
    ]
    
    # 危机关键词
    CRISIS_KEYWORDS = [
        "自杀", "不想活", "结束生命", "死", "活着没意思",
        "自残", "伤害自己", "割腕", "跳楼",
        "没有希望", "绝望", "解脱",
    ]
    
    def __init__(self):
        """初始化服务"""
        self._client = None
    
    def get_system_prompt(self) -> str:
        """
        获取系统提示词
        """
        return self.SYSTEM_PROMPT
    
    def check_crisis_signals(self, text: str) -> bool:
        """
        检查危机信号
        """
        text_lower = text.lower()
        return any(keyword in text_lower for keyword in self.CRISIS_KEYWORDS)
    
    async def generate_response(
        self,
        user_message: str,
        user_id: str = "anonymous",
        conversation_history: Optional[list[dict]] = None,
        emotion_context: Optional[dict] = None,
        style: ResponseStyle = ResponseStyle.EMPATHETIC,
    ) -> CounselorResponse:
        """
        生成咨询师回复
        
        Args:
            user_message: 用户消息
            conversation_history: 对话历史
            emotion_context: 情感分析结果（来自 EmotionFusionService）
            style: 回复风格
            
        Returns:
            CounselorResponse 咨询师回复
        """
        # 检查危机信号
        crisis_flag = self.check_crisis_signals(user_message)
        
        # 获取长期记忆上下文
        memory_context = ""
        skip_memory = bool((emotion_context or {}).get("skip_memory"))
        if not skip_memory and MEMORY_AVAILABLE and vector_memory:
            try:
                # 检索过去3天的相关记忆
                relevant_memories = await vector_memory.retrieve_relevant(
                    user_id=user_id,
                    query=user_message,
                    days=3,
                    top_k=5
                )
                if relevant_memories:
                    memory_context = vector_memory.format_context_for_prompt(relevant_memories)
                    memory_context = f"\n【用户历史对话记忆】\n{memory_context}\n"
            except Exception as e:
                print(f"Memory retrieval failed: {e}")
        
        # 构建上下文（包含长期记忆）
        context = self._build_context(
            user_message, 
            emotion_context,
            style
        )
        if memory_context:
            context = memory_context + context
        
        # 尝试调用 LLM API
        if self.LLM_API_KEY:
            try:
                response = await self._call_llm(
                    user_message,
                    context,
                    conversation_history,
                    crisis_flag
                )
                
                # 保存到长期记忆
                if not skip_memory and MEMORY_AVAILABLE and vector_memory:
                    try:
                        await vector_memory.add_memory(user_id, user_message, "user")
                        await vector_memory.add_memory(user_id, response.message, "assistant")
                    except Exception as e:
                        print(f"Memory save failed: {e}")
                
                return response
            except Exception as e:
                print(f"LLM API call failed: {e}")
        
        # 使用模板生成回复（后备方案）
        return self._generate_fallback_response(
            user_message,
            emotion_context,
            crisis_flag
        )
    
    def _build_context(
        self,
        user_message: str,
        emotion_context: Optional[dict],
        style: ResponseStyle,
    ) -> str:
        """
        构建额外上下文
        """
        context_parts = []
        emotion_context = emotion_context or {}
        skip_project_context = bool(emotion_context.get("skip_project_context"))
        project_mode = "senior" if emotion_context.get("neurasense_mode") == "senior" else "standard"
        if not skip_project_context and "【项目内置心理健康资料】" not in user_message:
            context_parts.append(
                build_ai_context(
                    user_mode=project_mode,
                    interaction_kind="chat",
                    user_message=user_message,
                    recent_context=emotion_context,
                )
            )
        
        if emotion_context:
            if emotion_context.get("emotional_inconsistency"):
                context_parts.append(
                    "【注意】用户可能存在情绪不一致（微笑抑郁风险），"
                    "虽然言语积极但语音特征显示低落。请特别关注其真实感受。"
                )
            
            risk_level = emotion_context.get("risk_level")
            if risk_level in ["moderate", "high"]:
                context_parts.append(
                    f"【风险提示】检测到{risk_level}级别风险，请在回复中表达关心。"
                )
        
        if style == ResponseStyle.EDUCATIONAL:
            context_parts.append("请在回复中适当加入心理学知识科普。")
        elif style == ResponseStyle.EXPLORATORY:
            context_parts.append("请多使用开放式问题引导用户自我探索。")
        
        return "\n".join(context_parts)
    
    async def _call_llm(
        self,
        user_message: str,
        context: str,
        conversation_history: Optional[list[dict]],
        crisis_flag: bool,
    ) -> CounselorResponse:
        """
        调用 LLM 生成回复。

        支持：
        - zhipuai：智谱 SDK
        - openai_compatible/custom：OpenAI-compatible /v1/chat/completions
        """
        if self.LLM_PROVIDER.lower() in {"openai", "openai_compatible", "custom"} or self.LLM_API_BASE:
            return await self._call_openai_compatible(
                user_message=user_message,
                context=context,
                conversation_history=conversation_history,
                crisis_flag=crisis_flag,
            )

        try:
            from zhipuai import ZhipuAI
            
            # 使用智谱 AI API Key
            api_key = self.LLM_API_KEY
            client = ZhipuAI(api_key=api_key)
            
            # 构建消息列表（包含对话历史）
            messages = [
                {
                    "role": "system",
                    "content": self._compose_system_prompt(context, crisis_flag)
                }
            ]
            
            # 添加对话历史（保持上下文）
            if conversation_history:
                for msg in conversation_history:
                    messages.append({
                        "role": msg.get("role", "user"),
                        "content": msg.get("content", "")
                    })
            
            # 添加当前用户消息
            messages.append({
                "role": "user",
                "content": user_message
            })
            
            # 调用 GLM-4 API
            response = client.chat.completions.create(
                model=self.LLM_MODEL,
                messages=messages,
                temperature=0.75,
                max_tokens=900,
            )
            
            # 解析回复
            reply_text = response.choices[0].message.content
            
            return CounselorResponse(
                message=reply_text,
                follow_up_question=None,
                crisis_flag=crisis_flag,
                needs_referral=crisis_flag,
            )
            
        except ImportError:
            print("zhipuai not installed, using fallback")
            raise
        except Exception as e:
            print(f"Zhipu AI error: {e}")
            raise

    def _compose_system_prompt(self, context: str, crisis_flag: bool) -> str:
        extras = []
        if context:
            extras.append(context)
        if crisis_flag:
            extras.append("【当前重要提示】用户文本命中危机关键词。请优先确认安全、建议联系现实支持与专业资源。")
        if extras:
            return self.SYSTEM_PROMPT + "\n\n## 当前上下文\n" + "\n".join(extras)
        return self.SYSTEM_PROMPT

    @staticmethod
    def _normalize_history_message(msg: dict) -> Optional[dict]:
        role = msg.get("role", "user")
        if role not in {"user", "assistant", "system"}:
            role = "user"
        content = msg.get("content") or msg.get("text") or ""
        content = str(content).strip()
        if not content:
            return None
        return {"role": role, "content": content}

    async def _call_openai_compatible(
        self,
        user_message: str,
        context: str,
        conversation_history: Optional[list[dict]],
        crisis_flag: bool,
    ) -> CounselorResponse:
        if not self.LLM_API_BASE:
            raise RuntimeError("LLM_API_BASE is required for openai_compatible provider")

        base = self.LLM_API_BASE.rstrip("/")
        url = base if base.endswith("/chat/completions") else f"{base}/v1/chat/completions"

        messages = [{"role": "system", "content": self._compose_system_prompt(context, crisis_flag)}]
        if conversation_history:
            for raw in conversation_history[-12:]:
                normalized = self._normalize_history_message(raw)
                if normalized:
                    messages.append(normalized)
        messages.append({"role": "user", "content": user_message})

        payload = {
            "model": self.LLM_MODEL,
            "messages": messages,
            "temperature": 0.72,
            "max_tokens": 1200,
        }

        headers = {
            "Authorization": f"Bearer {self.LLM_API_KEY}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()

        reply_text = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            .strip()
        )
        if not reply_text:
            raise RuntimeError("LLM returned empty content")

        return CounselorResponse(
            message=reply_text,
            follow_up_question=None,
            crisis_flag=crisis_flag,
            needs_referral=crisis_flag,
        )
    
    def _generate_fallback_response(
        self,
        user_message: str,
        emotion_context: Optional[dict],
        crisis_flag: bool,
    ) -> CounselorResponse:
        """
        生成后备回复（当 LLM API 不可用时）
        使用预设模板
        """
        import random
        
        # 危机响应
        if crisis_flag:
            return CounselorResponse(
                message=(
                    "我很担心你现在的状态。听到你说这些，我想让你知道，"
                    "你的感受是真实的，你值得被帮助。\n\n"
                    "如果你正在经历困难时刻，请立即联系专业帮助：\n"
                    "• 全国24小时心理援助热线：400-161-9995\n"
                    "• 北京心理危机研究与干预中心：010-82951332\n"
                    "• 生命热线：400-821-1215\n\n"
                    "你愿意告诉我，现在你安全吗？"
                ),
                crisis_flag=True,
                needs_referral=True,
            )
        
        # 根据情感上下文选择回复
        if emotion_context:
            risk_type = emotion_context.get("risk_type", "")
            
            if risk_type == "smiling_depression":
                return CounselorResponse(
                    message=(
                        f"{random.choice(self.EMPATHY_PHRASES)}。"
                        "我注意到虽然你说的内容听起来还不错，"
                        "但我感觉你可能还有一些没有说出口的感受。\n\n"
                        "有时候我们习惯性地说\"还好\"、\"没事\"，"
                        "但内心却不一定是这样的。这完全没关系，"
                        "你不需要在任何人面前假装坚强。\n\n"
                        "如果你愿意的话，可以告诉我，最近有什么事情让你感到困扰吗？"
                    ),
                    follow_up_question="最近有什么事情让你感到困扰吗？",
                    psychoeducation=(
                        "「微笑抑郁」是一种隐藏的抑郁形式，"
                        "患者会在外表保持开朗，但内心却在承受痛苦。"
                        "这并不代表不坚强，而是一种值得关注的心理状态。"
                    ),
                )
        
        # 通用共情回复
        empathy_phrase = random.choice(self.EMPATHY_PHRASES)
        
        return CounselorResponse(
            message=(
                f"{empathy_phrase}。谢谢你愿意与我分享这些。\n\n"
                "我能感受到你正在经历一些事情。"
                "无论是什么，你的感受都是真实和重要的。\n\n"
                "你愿意告诉我更多吗？我在这里倾听你。"
            ),
            follow_up_question="你愿意告诉我更多吗？",
            coping_suggestions=[
                "尝试深呼吸，让自己放松下来",
                "与信任的朋友或家人聊聊",
                "记录下你的感受，把想法写下来",
            ],
        )
    
    def get_prompt_template(self) -> dict:
        """
        获取提示词模板（用于自定义）
        """
        return {
            "system_prompt": self.SYSTEM_PROMPT,
            "empathy_phrases": self.EMPATHY_PHRASES,
            "crisis_keywords": self.CRISIS_KEYWORDS,
            "usage_instructions": """
使用说明：

1. 系统提示词 (System Prompt) 定义了 AI 的角色和行为规范
2. 共情短语库可用于模板回复或作为 LLM 的参考
3. 危机关键词用于检测需要紧急干预的情况

调用 LLM 时，将 system_prompt 作为系统消息发送，
用户消息作为用户消息发送，即可获得符合要求的回复。
"""
        }
