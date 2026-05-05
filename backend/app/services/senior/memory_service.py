from typing import Any

from app.schemas.senior import SeniorMemorySnapshot, SeniorQuestionAnswer
from app.services.senior import storage


CONCERN_RULES: list[tuple[str, list[str]]] = [
    ("睡眠", ["睡", "失眠", "半夜醒", "早醒", "没睡好"]),
    ("孤单", ["孤单", "孤独", "没人陪", "一个人"]),
    ("身体不适", ["痛", "疼", "不舒服", "胸闷", "头晕", "没力气"]),
    ("担心家事", ["家人", "孩子", "老伴", "孙", "担心家"]),
    ("压力担心", ["担心", "焦虑", "压力", "害怕", "放不下", "惦记"]),
]

SUPPORT_RULES: list[tuple[str, list[str]]] = [
    ("聊天", ["聊天", "说说话", "陪我聊"]),
    ("短放松", ["放松", "呼吸", "安静"]),
    ("家属陪伴", ["家人", "女儿", "儿子", "老伴", "孩子", "联系"]),
    ("休息", ["休息", "睡", "躺", "闭眼"]),
]

FAMILY_TERMS = ["女儿", "儿子", "老伴", "孩子", "孙子", "孙女", "朋友", "邻居", "家人"]


def _joined_text(answers: list[SeniorQuestionAnswer] | list[dict[str, Any]]) -> str:
    parts: list[str] = []
    for item in answers:
        if isinstance(item, dict):
            parts.append(str(item.get("answer_text", "")))
        else:
            parts.append(item.answer_text)
    return "；".join(part.strip() for part in parts if part and part.strip())


def _match_labels(text: str, rules: list[tuple[str, list[str]]]) -> list[str]:
    labels: list[str] = []
    for label, keywords in rules:
        if any(keyword in text for keyword in keywords):
            labels.append(label)
    return labels


def get_senior_memory(user_id: str) -> SeniorMemorySnapshot:
    row = storage.get_one("senior_memory", user_id=user_id)
    if not row:
        return SeniorMemorySnapshot()
    return SeniorMemorySnapshot(
        frequent_concerns=list(row.get("frequent_concerns") or []),
        preferred_support=list(row.get("preferred_support") or []),
        family_terms=list(row.get("family_terms") or []),
        recent_patterns=list(row.get("recent_patterns") or []),
        updated_at=row.get("updated_at"),
    )


def update_senior_memory(
    user_id: str,
    answers: list[SeniorQuestionAnswer],
    *,
    action: str,
    risk_level: str,
) -> SeniorMemorySnapshot:
    text = _joined_text(answers)
    current = get_senior_memory(user_id)
    concerns = list(dict.fromkeys([*current.frequent_concerns, *_match_labels(text, CONCERN_RULES)]))[:8]
    supports = list(dict.fromkeys([*current.preferred_support, *_match_labels(text, SUPPORT_RULES)]))[:6]
    family_terms = list(dict.fromkeys([*current.family_terms, *[term for term in FAMILY_TERMS if term in text]]))[:6]
    signals = _match_labels(text, CONCERN_RULES) or ([risk_level] if risk_level != "normal" else ["日常问候"])
    recent_patterns = [
        {
            "date": storage.today_iso(),
            "signals": signals[:4],
            "action": action,
        },
        *current.recent_patterns,
    ][:6]
    row = storage.upsert_by(
        "senior_memory",
        "user_id",
        {
            "user_id": user_id,
            "frequent_concerns": concerns,
            "preferred_support": supports,
            "family_terms": family_terms,
            "recent_patterns": recent_patterns,
        },
    )
    return SeniorMemorySnapshot(
        frequent_concerns=list(row.get("frequent_concerns") or []),
        preferred_support=list(row.get("preferred_support") or []),
        family_terms=list(row.get("family_terms") or []),
        recent_patterns=list(row.get("recent_patterns") or []),
        updated_at=row.get("updated_at"),
    )
