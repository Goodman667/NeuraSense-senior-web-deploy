"""Build project-aware mental-health context for LLM calls.

This module keeps NeuraSense-specific prompting in one place so both the
standard mode and senior care mode can share the same safety/resource base
while still speaking differently to different users.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Iterable, Literal

UIMode = Literal["standard", "senior"]

DATA_FILE = Path(__file__).resolve().parents[3] / "data" / "mental_health_resources.json"
SENIOR_AGE_THRESHOLD = 60

FALLBACK_RESOURCES: list[dict[str, Any]] = [
    {
        "topic": "sleep",
        "label": "睡眠支持",
        "audience": ["standard", "senior"],
        "principles": ["睡眠差时先降低当天任务负荷，建议固定起床和睡前放松。"],
    },
    {
        "topic": "stress_breathing",
        "label": "压力与呼吸放松",
        "audience": ["standard", "senior"],
        "principles": ["压力或慌乱时，先让用户坐稳、放慢呼吸，再处理问题。"],
    },
    {
        "topic": "social_connection",
        "label": "社会连接与支持",
        "audience": ["standard", "senior"],
        "principles": ["孤单或需要陪伴时，建议一个具体联系人和一句可发送的话。"],
    },
    {
        "topic": "older_adult_loneliness",
        "label": "老年孤独与关怀",
        "audience": ["senior"],
        "principles": ["老年版回答要更慢、更短、更像真人在旁边陪着。"],
    },
    {
        "topic": "body_discomfort",
        "label": "身体不适线索",
        "audience": ["senior"],
        "principles": ["身体症状持续或加重时，建议咨询医生或联系当地医疗资源。"],
    },
    {
        "topic": "young_pressure",
        "label": "年轻/普通用户压力场景",
        "audience": ["standard"],
        "principles": ["承接学习、考试、工作、拖延、关系和自我评价压力。"],
    },
    {
        "topic": "crisis_safety",
        "label": "危机与安全",
        "audience": ["standard", "senior"],
        "principles": ["出现自杀、自伤或无法保证安全时，先处理安全。"],
    },
]


@lru_cache(maxsize=1)
def _load_resource_file() -> dict[str, Any]:
    try:
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {"version": "fallback", "resources": FALLBACK_RESOURCES}


def _resources() -> list[dict[str, Any]]:
    data = _load_resource_file()
    resources = data.get("resources")
    return resources if isinstance(resources, list) else FALLBACK_RESOURCES


def get_resource_topics() -> list[str]:
    """Return the built-in topic ids so tests and admin tools can verify coverage."""

    return [str(item.get("topic", "")) for item in _resources() if item.get("topic")]


def infer_ui_mode_from_age(age: int | str | None) -> UIMode:
    """Map onboarding age to the initial UI mode.

    The threshold is intentionally simple and transparent: 60+ starts in senior
    care mode, everyone else starts in the full standard experience. Users can
    still switch modes later.
    """

    if age is None or age == "":
        return "standard"
    try:
        numeric_age = int(age)
    except (TypeError, ValueError):
        return "standard"
    return "senior" if numeric_age >= SENIOR_AGE_THRESHOLD else "standard"


def _normalize_mode(user_mode: str | None) -> UIMode:
    if user_mode in {"senior", "elder", "elderly", "care"}:
        return "senior"
    return "standard"


def _answer_value(item: Any, *keys: str) -> str:
    for key in keys:
        if isinstance(item, dict):
            value = item.get(key)
        else:
            value = getattr(item, key, None)
        if value is not None:
            return str(value).strip()
    return ""


def _format_questions_answers(questions_answers: Iterable[Any] | None) -> str:
    if not questions_answers:
        return "无结构化问答。"

    lines: list[str] = []
    for index, item in enumerate(questions_answers, start=1):
        question_id = _answer_value(item, "question_id", "id")
        question_text = _answer_value(item, "question_text", "question")
        answer_text = _answer_value(item, "answer_text", "answer")
        label = f"Q{index}"
        if question_id:
            label += f"({question_id})"
        lines.append(f"- {label} 系统问题：{question_text or '未提供'}；用户回答：{answer_text or '未回答'}")
    return "\n".join(lines)


def _select_resources(mode: UIMode, interaction_kind: str) -> list[dict[str, Any]]:
    base_topics = {
        "self_care_boundaries",
        "sleep",
        "stress_breathing",
        "social_connection",
        "low_mood_activation",
        "crisis_safety",
        "embedded_assessment",
    }
    senior_topics = {"older_adult_loneliness", "body_discomfort", "caregiver_communication"}
    standard_topics = {"young_pressure", "cross_modal_discordance"}
    if "summary" in interaction_kind:
        base_topics.update({"sleep", "social_connection"})
    if "chat" in interaction_kind:
        base_topics.update({"stress_breathing", "low_mood_activation"})

    wanted = base_topics | (senior_topics if mode == "senior" else standard_topics)
    selected: list[dict[str, Any]] = []
    for item in _resources():
        topic = item.get("topic")
        audience = item.get("audience") or []
        if topic in wanted and (mode in audience or "standard" in audience and mode == "standard" or "senior" in audience and mode == "senior"):
            selected.append(item)
    return selected


def _resource_block(mode: UIMode, interaction_kind: str) -> str:
    lines: list[str] = []
    for item in _select_resources(mode, interaction_kind):
        label = item.get("label") or item.get("topic")
        principles = item.get("principles") or []
        source = item.get("source")
        lines.append(f"【{label}】")
        if source:
            lines.append(f"依据：{source}")
        for principle in principles[:3]:
            lines.append(f"- {principle}")
    return "\n".join(lines)


def _json_block(value: Any) -> str:
    if value is None:
        return "无"
    try:
        return json.dumps(value, ensure_ascii=False, indent=2)
    except TypeError:
        return str(value)


def build_ai_context(
    *,
    user_mode: str | None = "standard",
    interaction_kind: str = "chat",
    questions_answers: Iterable[Any] | None = None,
    user_message: str | None = None,
    recent_context: dict[str, Any] | None = None,
) -> str:
    """Create the context block sent to the LLM alongside the user message."""

    mode = _normalize_mode(user_mode)
    qa_block = _format_questions_answers(questions_answers)
    resource_block = _resource_block(mode, interaction_kind)
    message_block = (user_message or "").strip() or "无单句消息。"
    recent_block = _json_block(recent_context)

    if mode == "senior":
        scenario = (
            "这是 NeuraSense 陪伴版中老年用户完成的语音/文字问候。"
            "下面是系统询问的问题和用户回答，请把它当成心理健康支持网站的一次真实交互。"
        )
        output_rules = """
【老年版回答方式】
- 使用简体中文、短句、慢节奏，像家人旁边陪着说话。
- 内容要适合朗读，避免长句、英文缩写、量表名、评分、诊断词。
- 总结页面会做成一次只呈现一个小卡片，所以每张卡只放一个重点。
- 先说“现在最该做的一件事”，再说为什么，最后说如果加重该找谁。
- 每条建议必须有具体动作、时长或对象，例如“闭眼 10 分钟”“给家人发一句话”。
- 不要把用户的话原样复述成总结，要从回答里提炼线索并给出具体支持。
""".strip()
    else:
        scenario = (
            "这是 NeuraSense 完整功能中的心理健康对话。"
            "完整功能适合年轻/普通用户，可以承接学习、工作、关系、睡眠和压力等复杂场景。"
        )
        output_rules = """
【完整版回答方式】
- 适合年轻/普通用户，语言可以更细致，但仍然要温暖、具体、可执行。
- 结合用户当前消息、历史对话和可用状态线索，不要只重复用户原话。
- 先回应具体处境，再解释可能的压力循环，最后给 1-3 个下一步。
- 可以使用 CBT、行为激活、担忧时间、睡眠卫生等方法，但要说成人话。
- 如果存在跨模态不一致，温和说明“表达内容和状态线索有一点不一致”，不要说用户在伪装或说谎。
""".strip()

    return f"""
{scenario}

【交互类型】
{interaction_kind}

【系统问题和用户回答】
{qa_block}

【用户当前消息】
{message_block}

【近期上下文/可用状态线索】
{recent_block}

【项目内置心理健康资料】
{resource_block}

{output_rules}

【安全边界】
- NeuraSense 是心理健康支持平台，不是医疗诊断平台。
- 不要输出诊断结论，不要承诺治愈。
- 如出现自杀、自伤、伤害他人、无法保证安全等风险，先确认安全并建议联系现实中的可信任的人、当地急救或心理援助资源。
""".strip()
