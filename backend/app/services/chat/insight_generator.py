from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from typing import Optional

import httpx
from pydantic import BaseModel, Field, ValidationError


class ChatInsightContent(BaseModel):
    kind: str = Field(default="support", description="crisis | discordance | multimodal | support")
    title: str
    subtitle: str
    focus: str
    explanation: str
    why_popup: list[str]
    suggestions: list[str]
    note: str
    card_title: str
    card_badge: str
    action_label: str
    chip_tone: str = "slate"


ChatInsight = ChatInsightContent


@dataclass
class InsightGenerationContext:
    user_message: str
    reply_text: str
    risk_flag: bool
    assessment_mode: str
    phq9_score: Optional[int]
    hidden_distress_risk: Optional[str]
    hidden_distress_hdi: Optional[float]
    conversation_history: list[dict] | None
    bio_signals: object | None
    contradictions: dict | None


class InsightGeneratorService:
    LLM_API_KEY = os.getenv("LLM_API_KEY", "")
    LLM_MODEL = os.getenv("LLM_MODEL", "glm-4-flash")
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "zhipuai")
    LLM_API_BASE = os.getenv("LLM_API_BASE", os.getenv("LLM_BASE_URL", "")).rstrip("/")
    ALLOWED_KINDS = {"crisis", "discordance", "multimodal", "support"}
    LOW_SPECIFICITY_PHRASES = (
        "请关注您的心理健康",
        "保持良好的心态",
        "情绪支持",
        "必要的帮助和支持",
        "立即联系支持",
        "您的健康是我们最关心的事",
        "请留意自己的情绪变化",
        "关心你的心理健康",
        "适当的关注和支持",
        "分享更多关于",
        "压力管理小贴士",
    )

    CALM_MASKING_CUES = (
        "我还好",
        "还好",
        "没事",
        "没什么事",
        "没什么大事",
        "我能扛",
        "扛得住",
        "挺得住",
        "不用担心",
        "我可以",
    )

    TOPIC_PATTERNS = {
        "sleep": re.compile(r"失眠|睡不着|睡眠|睡不好|睡不好觉"),
        "fatigue": re.compile(r"累|疲惫|疲劳|没精神|精力差|透支|撑不住|扛不住"),
        "focus": re.compile(r"分心|注意力|专注|集中不起来"),
        "mood": re.compile(r"难受|压抑|灰暗|没兴趣|提不起劲|低落|麻木|烦死了"),
        "anxiety": re.compile(r"焦虑|紧张|心慌|喘不过气|胸口闷|害怕|不安"),
        "pressure": re.compile(r"压力|崩溃|压得|顶不住|撑不下去|好烦|好痛苦|太难了"),
        "hopeless": re.compile(r"没希望|没有希望|活着没意思|不想继续|不如消失|放弃算了"),
        "crisis": re.compile(r"自杀|自残|不想活|想死|死了算了|结束生命|伤害自己|一了百了|遗书"),
    }

    TOPIC_LABELS = {
        "sleep": "睡眠",
        "fatigue": "疲惫",
        "focus": "注意力",
        "mood": "情绪低落",
        "anxiety": "紧张不安",
        "pressure": "压力",
        "hopeless": "失去希望",
        "crisis": "安全风险",
    }

    def detect_topics(self, text: str) -> dict[str, bool]:
        value = text or ""
        topics = {
            name: bool(pattern.search(value))
            for name, pattern in self.TOPIC_PATTERNS.items()
        }
        topics["masking"] = any(cue in value for cue in self.CALM_MASKING_CUES)
        return topics

    def summarize_topics(self, topics: dict[str, bool]) -> list[str]:
        labels: list[str] = []
        for key in ("sleep", "fatigue", "focus", "anxiety", "pressure", "mood", "hopeless"):
            if topics.get(key):
                labels.append(self.TOPIC_LABELS[key])
        return labels[:3]

    def describe_bio_cues(self, bio_signals: object | None) -> list[str]:
        if not bio_signals:
            return []

        cues: list[str] = []
        fatigue_index = float(getattr(bio_signals, "fatigue_index", 0) or 0)
        voice_jitter = float(getattr(bio_signals, "voice_jitter", 0) or 0)
        shimmer = float(getattr(bio_signals, "shimmer", 0) or 0)
        speaking_duration = float(getattr(bio_signals, "speaking_duration_s", 0) or 0)
        silence_duration = float(getattr(bio_signals, "silence_duration_s", 0) or 0)
        keystroke_anxiety = float(getattr(bio_signals, "keystroke_anxiety", 0) or 0)

        if fatigue_index >= 20:
            cues.append("这会儿已经能看到一些明显的疲惫感")
        if voice_jitter >= 2 or shimmer >= 5:
            cues.append("声音状态里带着紧绷和发虚的感觉")
        if speaking_duration > 0 and silence_duration > 0:
            cues.append("说话和停顿的节奏不像表面上那么轻松")
        if keystroke_anxiety >= 50:
            cues.append("输入节奏偏急，像是心里还压着不少东西")

        return cues[:4]

    def decide_kind(self, ctx: InsightGenerationContext) -> Optional[str]:
        topics = self.detect_topics(ctx.user_message)
        topic_count = sum(1 for key, value in topics.items() if key != "masking" and value)

        if ctx.risk_flag or topics["crisis"]:
            return "crisis"
        if ctx.hidden_distress_risk in {"moderate", "high"}:
            return "discordance"
        if ctx.assessment_mode == "multimodal" and (topic_count > 0 or topics["masking"]):
            return "multimodal"
        if topic_count >= 2 or topics["pressure"] or topics["anxiety"] or topics["hopeless"]:
            return "support"
        return None

    async def generate_insight(
        self,
        ctx: Optional[InsightGenerationContext] = None,
        **kwargs,
    ) -> Optional[ChatInsightContent]:
        if ctx is None:
            ctx = InsightGenerationContext(
                user_message=kwargs.get("user_message", ""),
                reply_text=kwargs.get("reply_text", ""),
                risk_flag=kwargs.get("risk_flag", False),
                assessment_mode=kwargs.get("assessment_mode", "text_only"),
                phq9_score=kwargs.get("phq9_score"),
                hidden_distress_risk=kwargs.get("hidden_distress_risk"),
                hidden_distress_hdi=kwargs.get("hidden_distress_hdi"),
                conversation_history=kwargs.get("conversation_history"),
                bio_signals=kwargs.get("bio_signals"),
                contradictions=kwargs.get("contradictions"),
            )

        kind = self.decide_kind(ctx)
        if not kind:
            return None

        if self.LLM_API_KEY:
            try:
                generated = await self._call_llm(ctx, kind)
                if generated:
                    refined = self._post_process_generated(generated, ctx, kind)
                    if refined:
                        return refined
            except Exception as exc:
                print(f"Insight LLM generation failed: {exc}")

        return self._build_fallback(ctx, kind)

    async def _call_llm(self, ctx: InsightGenerationContext, kind: str) -> Optional[ChatInsightContent]:
        topics = self.detect_topics(ctx.user_message)
        topic_labels = self.summarize_topics(topics)
        bio_cues = self.describe_bio_cues(ctx.bio_signals)
        contradictions = []
        for item_id, value in (ctx.contradictions or {}).items():
            try:
                if float(value) > 0.5:
                    contradictions.append(str(item_id))
            except Exception:
                continue

        system_prompt = (
            "你要为心理健康聊天产品生成一个给用户看的“状态提醒”内容。"
            "输出必须是合法 JSON，不要输出 markdown、解释、代码块。"
            "文案必须像真实产品，不要像论文、评估报告或老师演示稿。"
            "绝对不要出现这些词：创新点、A/B、HDI、PHQ-9、多模态、Text Only、Multimodal、模型、算法、触发。"
            "kind 只能是 crisis、discordance、multimodal、support 之一。"
            "内容必须紧扣用户这一次具体说的话，至少有一处直接引用或近距离改写用户原话。"
            "不要写空泛提醒，例如“请关注您的心理健康”“保持良好的心态”“必要时联系支持”。"
            "如果是危机场景，语气要直接、温柔、清晰，建议必须以立即联系真人支持为优先。"
            "JSON 字段固定为："
            "kind,title,subtitle,focus,explanation,why_popup,suggestions,note,card_title,card_badge,action_label,chip_tone。"
            "why_popup 和 suggestions 必须是 2 到 4 条中文短句数组。"
            "chip_tone 只能是 rose、emerald、amber、slate 之一。"
        )

        user_payload = {
            "kind": kind,
            "user_message": ctx.user_message,
            "assistant_reply": ctx.reply_text,
            "assessment_mode": ctx.assessment_mode,
            "risk_flag": ctx.risk_flag,
            "hidden_distress_risk": ctx.hidden_distress_risk,
            "hidden_distress_hdi": ctx.hidden_distress_hdi,
            "phq9_score": ctx.phq9_score,
            "topic_labels": topic_labels,
            "masking_detected": topics.get("masking", False),
            "bio_cues": bio_cues,
            "high_contradiction_items": contradictions,
            "recent_history": (ctx.conversation_history or [])[-6:],
        }

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
        ]

        if self.LLM_PROVIDER.lower() in {"openai", "openai_compatible", "custom"} or self.LLM_API_BASE:
            if not self.LLM_API_BASE:
                raise RuntimeError("LLM_API_BASE is required for openai_compatible provider")
            base = self.LLM_API_BASE.rstrip("/")
            url = base if base.endswith("/chat/completions") else f"{base}/v1/chat/completions"
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    url,
                    headers={
                        "Authorization": f"Bearer {self.LLM_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.LLM_MODEL,
                        "messages": messages,
                        "temperature": 0.45,
                        "max_tokens": 900,
                    },
                )
                response.raise_for_status()
                data = response.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        else:
            from zhipuai import ZhipuAI

            client = ZhipuAI(api_key=self.LLM_API_KEY)
            response = client.chat.completions.create(
                model=self.LLM_MODEL,
                messages=messages,
                temperature=0.5,
                max_tokens=700,
            )
            content = response.choices[0].message.content
        return self._parse_llm_json(content)

    def _parse_llm_json(self, content: str) -> Optional[ChatInsightContent]:
        if not content:
            return None

        cleaned = content.strip()
        cleaned = cleaned.replace("```json", "").replace("```", "").strip()
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            cleaned = match.group(0)

        try:
            payload = json.loads(cleaned)
            return ChatInsightContent.model_validate(payload)
        except (json.JSONDecodeError, ValidationError):
            return None

    def _post_process_generated(
        self,
        generated: ChatInsightContent,
        ctx: InsightGenerationContext,
        fallback_kind: str,
    ) -> Optional[ChatInsightContent]:
        original_kind = generated.kind
        data = generated.model_copy(deep=True)
        if data.kind not in self.ALLOWED_KINDS:
            data.kind = fallback_kind

        topics = self.detect_topics(ctx.user_message)
        labels = self.summarize_topics(topics)
        short_quote = ctx.user_message.strip()
        short_quote = short_quote if len(short_quote) <= 22 else f"{short_quote[:22]}..."
        combined_text = " ".join([
            data.title,
            data.subtitle,
            data.focus,
            data.explanation,
            data.note,
            " ".join(data.why_popup),
            " ".join(data.suggestions),
        ])

        has_specific_topic = any(label and label in combined_text for label in labels)
        has_quote = short_quote and short_quote.replace("...", "") in combined_text
        is_low_specificity = any(phrase in combined_text for phrase in self.LOW_SPECIFICITY_PHRASES)

        if len(data.why_popup) < 2 or len(data.suggestions) < 2:
            return None
        if original_kind not in self.ALLOWED_KINDS:
            return None
        if data.kind == "crisis":
            return data
        if not has_quote:
            return None
        if is_low_specificity:
            return None
        if not has_specific_topic:
            return None

        return data

    def _build_fallback(self, ctx: InsightGenerationContext, kind: str) -> ChatInsightContent:
        topics = self.detect_topics(ctx.user_message)
        topic_labels = self.summarize_topics(topics)
        topic_summary = "、".join(topic_labels) if topic_labels else "当下状态"
        bio_cues = self.describe_bio_cues(ctx.bio_signals)
        quoted = ctx.user_message.strip()
        short_quote = quoted if len(quoted) <= 22 else f"{quoted[:22]}..."

        if kind == "crisis":
            return ChatInsightContent(
                kind="crisis",
                title="我现在最担心的是你的安全",
                subtitle="这不是你一个人该硬扛的时刻",
                focus=f"你刚才提到“{short_quote}”，这说明你现在可能已经非常痛苦，需要立刻把安全放在第一位。",
                explanation="这时候最重要的不是继续一个人撑着，而是马上联系真实的人来陪你、帮你。",
                why_popup=[
                    "你刚才说的话里出现了明显的自我伤害或放弃生命信号。",
                    "当这种念头已经说出口时，优先确保你身边有真人支持会更重要。",
                ],
                suggestions=[
                    "请立刻联系你现在最信任的一个人，直接告诉对方你现在需要陪伴。",
                    "尽快拨打心理援助热线 400-161-9995，或前往最近的医院急诊。",
                    "如果你身边有可能伤害自己的物品，先尽量把它们移远一点。",
                ],
                note="这不代表你做错了什么，而是说明你现在需要马上被接住、被保护。",
                card_title="安全提醒",
                card_badge="请立刻求助",
                action_label="查看现在该怎么做",
                chip_tone="rose",
            )

        if kind == "discordance":
            why_popup = [
                f"你刚才说“{short_quote}”，听起来像是在让自己继续撑住。",
            ]
            why_popup.extend(bio_cues[:2] or ["这轮状态线索显示，你现在可能比说出来的更吃力。"])
            return ChatInsightContent(
                kind="discordance",
                title="我想提醒你一下",
                subtitle="你现在可能比嘴上说出来的更辛苦一点",
                focus="我担心你正在一边说自己没事，一边默默把压力都扛在身上。",
                explanation="这不是在给你贴标签，而是在提醒你别把所有难受都压回去。",
                why_popup=why_popup[:4],
                suggestions=[
                    "先用一句更真实的话替代“我还好”，比如“我其实有点撑不住了”。",
                    "先停 1 分钟，让呼吸慢下来，再决定接下来最需要处理的一件事。",
                    "如果这种硬撑的状态最近反复出现，尽量联系一个你信得过的人说说。",
                ],
                note="有时候最需要被看见的，并不是你说出口的那部分，而是你一直在努力压住的那部分。",
                card_title="状态提醒",
                card_badge="建议多留意",
                action_label="查看建议",
                chip_tone="rose",
            )

        if kind == "multimodal":
            why_popup = [f"你刚才提到“{short_quote}”，我能感觉到这件事已经在影响你。"] if short_quote else []
            why_popup.extend(bio_cues[:3] or ["这轮我参考到的不只是你说的话，还有你当下状态里的细微变化。"])
            return ChatInsightContent(
                kind="multimodal",
                title="我留意到你最近有点吃力",
                subtitle="这轮我结合了你说的话和当下状态来理解你",
                focus=f"你刚才提到的{topic_summary}困扰，已经不只是想一想那么简单，可能正在真实影响你现在的状态。",
                explanation="所以我想给你一个更贴近当下的提醒，而不是只顺着对话表面往下聊。",
                why_popup=why_popup[:4],
                suggestions=self._build_support_suggestions(topics),
                note="这次提醒不是在放大你的问题，而是在帮你更早看见自己已经有点吃力了。",
                card_title="状态小结",
                card_badge="已结合更多线索",
                action_label="查看我可以怎么帮你",
                chip_tone="emerald",
            )

        why_popup = [f"你刚才提到“{short_quote}”，我感觉你现在并不轻松。"] if short_quote else []
        why_popup.extend(bio_cues[:2])
        if len(why_popup) < 2:
            why_popup.append("这轮对话里，你的压力和疲惫感已经比较明显了。")

        return ChatInsightContent(
            kind="support",
            title="我留意到你最近有点吃力",
            subtitle="我想给你一个更贴近当下的提醒",
            focus=f"你刚才说到的{topic_summary}，已经说明这件事正在影响你，而不只是短暂想太多。",
            explanation="我想先帮你稳住一下，而不是把你一个人留在这些感觉里。",
            why_popup=why_popup[:4],
            suggestions=self._build_support_suggestions(topics),
            note="先被理解、先稳下来，通常比立刻逼自己解决所有问题更重要。",
            card_title="状态提醒",
            card_badge="我在留意你",
            action_label="看看我给你的建议",
            chip_tone="slate",
        )

    def _build_support_suggestions(self, topics: dict[str, bool]) -> list[str]:
        suggestions: list[str] = []

        if topics.get("sleep"):
            suggestions.append("今晚尽量提前放下屏幕，把脑子里最烦的一件事写下来后再休息。")
        if topics.get("fatigue"):
            suggestions.append("先给自己留 10 分钟空白，不做决定，只让身体缓一缓。")
        if topics.get("focus"):
            suggestions.append("把接下来要做的事缩小成一个 10 分钟内能完成的小步骤。")
        if topics.get("anxiety"):
            suggestions.append("先慢慢吸气 4 秒、呼气 6 秒，重复几轮，让身体先降一点紧绷感。")
        if topics.get("pressure"):
            suggestions.append("先别逼自己一次把所有事都解决，挑一件最急的事，我们一点点拆开。")
        if topics.get("mood"):
            suggestions.append("如果你愿意，可以先告诉我，现在最压着你的那件事是什么。")
        if topics.get("hopeless"):
            suggestions.append("这会儿别一个人扛着，尽快联系一个你信得过的人，让对方知道你现在需要支持。")

        if not suggestions:
            suggestions.append("如果你愿意，可以先告诉我现在最困扰你的那一件事，我陪你一起慢慢拆开。")

        suggestions.append("如果这些状态已经持续了几天，我们可以继续聊聊它最影响你生活的哪个部分。")
        return suggestions[:4]
