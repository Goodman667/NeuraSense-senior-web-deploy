"""
Prompt for the companion-mode advice cards (daily greeting summary and the check-up).

Why it looks like this (third version):
- Earlier prompts piled up rules (fixed five card roles, banned phrases, "family/doctor at most
  once", eight worked examples). Models follow each rule less well as the number of rules grows,
  and the examples were copied almost word for word. So this version keeps a handful of
  principles and lets the model decide how many cards to write and what each one covers.
- Expert-rated health coaching (e.g. Google's PH-LLM sleep case studies) is written as
  "what I notice -> why it is probably happening -> what to do". Advice feels generic mostly
  because the "why" for this particular person is missing, so every card now starts with it,
  and the model first works it out in a hidden "analysis" field.
- Two of the old five cards were always about other people (warning signs, a message for the
  family), and the shared chat service added a crisis notice to every call because the prompt's
  own safety rules contain words like "自杀". Contacting family or a doctor is now written only
  when the answers call for it, and the crisis decision comes from the answers (see
  CounselorService.generate_response(task_crisis=...)).
"""
from __future__ import annotations

import re
from typing import Any, Iterable

from app.services.mental_health.context_builder import build_resource_block

SENIOR_ADVICE_SYSTEM = """
你是一位在社区做了二十多年老年健康工作的护士，也学过心理支持。你熟悉老年人常见的睡眠变化、慢性疼痛和关节问题、慢病自我管理、用眼和听力、记忆变化、孤独和家庭关系、照顾家人的辛苦。
现在你要根据一位老人今天的回答，写几张给他本人看的建议卡片。卡片会在网页上一张一张显示，也会被朗读出来。
目标：老人看完觉得你真的听懂了他说的话，并且学到了一个以前不知道、今天就能用上的办法。
只输出 JSON，不要 Markdown，不要代码块。
""".strip()

# Reference topics that are about the person's own situation. Project/meta topics are left out.
_EVERYDAY_TOPICS = {
    "sleep",
    "body_discomfort",
    "older_adult_loneliness",
    "low_mood_activation",
    "stress_breathing",
    "self_care_boundaries",
}

_RISK_NOTES = {
    "elevated": "今天的回答里有一些需要多留意的地方{reasons}。在合适的卡片里说清楚：出现什么具体情况时，要告诉家人或去看医生。",
    "urgent": (
        "今天的回答里有需要先处理的安全情况{reasons}。第一张卡先讲现在怎么保证安全：请身边信得过的人马上来陪，"
        "可以拨打心理援助热线 400-161-9995，情况紧急时拨 120；这张卡的 id 写 safety，next_action.route 写 help。"
        "后面的卡可以照常回应他说的其他事，语气温和，不要吓到他。"
    ),
    "medical_emergency": (
        "今天的回答里提到了需要尽快看医生的身体情况{reasons}。第一张卡先讲现在怎么做：症状还在或加重就拨 120，"
        "请人到身边陪着，不要独自出门；这张卡的 id 写 safety，next_action.route 写 help。"
        "其余卡片照常写，但不要建议运动或外出活动。"
    ),
}

_EXAMPLE_CARD = (
    '{"id":"card1","eyebrow":"关于饭后犯困","title":"午饭后别马上躺下",'
    '"body":"饭后犯困很常见，午饭吃得多、主食多的时候更明显；白天活动少，困劲也更容易上来。'
    '可以把午饭吃到七八分饱，饭后先慢走十分钟，再决定要不要睡。",'
    '"bullets":["一部分米饭换成杂粮或蔬菜","真要午睡，靠在沙发上睡二三十分钟，定个闹钟"]}'
)


# Which reference notes fit what the person said. Only matching notes are included, so for example
# the loneliness note (ways to connect with people) is not there for someone who never mentioned it.
_TOPIC_PATTERNS = {
    "sleep": r"睡|醒|失眠|困|打盹",
    "body_discomfort": r"疼|痛|酸|僵|麻|胸|晕|累|乏|眼|膝|腰|背|腿|手指|手腕|肩|血压|起夜|喘",
    "older_adult_loneliness": r"孤单|孤独|一个人|没人|冷清|想有人|说说话|陪|很少出门|老伴走",
    "low_mood_activation": r"闷|没劲|提不起|低落|没意思|难受|委屈|烦|不开心|空落",
    "stress_breathing": r"担心|惦记|挂念|紧张|着急|焦虑|放不下|害怕|怕|吵",
}


def topics_from_text(text: str) -> set[str]:
    topics = {"self_care_boundaries"}
    for topic, pattern in _TOPIC_PATTERNS.items():
        if re.search(pattern, text or ""):
            topics.add(topic)
    if topics == {"self_care_boundaries"}:
        topics.add("low_mood_activation")  # few clues: a small pleasant activity
    return topics


def _risk_note(risk_level: str, reasons: Iterable[str] | None) -> str:
    template = _RISK_NOTES.get(risk_level)
    if not template:
        return "今天没有发现需要马上找人帮忙的情况。"
    listed = "、".join(r for r in (reasons or []) if r)
    return template.format(reasons=f"（{listed}）" if listed else "")


def build_senior_advice_prompt(
    *,
    kind: str,
    qa_lines: list[str],
    risk_level: str,
    risk_reasons: Iterable[str] | None = None,
    memory_lines: Iterable[str] | None = None,
    notes: Iterable[str] | None = None,
    topics: set[str] | None = None,
) -> str:
    """User message for the advice cards. kind is "daily" (greeting answers) or "checkup" (multiple choice)."""
    topics = set(topics or _EVERYDAY_TOPICS)
    if risk_level in {"urgent", "medical_emergency"}:
        topics.add("crisis_safety")
    resources = build_resource_block(topics, mode="senior")

    if kind == "checkup":
        source = "【老人刚做完的小测（选择题），题目和他选的答案】"
        kind_note = "这是选择题，线索比较少：从答案的组合里看出最需要照顾的方面；不太确定的地方就说“可以先试试”，不要假装很确定，也不要把题目和答案复述一遍。"
    else:
        source = "【老人今天的问候回答】"
        kind_note = "他说过的具体细节（时间、部位、人、事）要用上。"

    extra: list[str] = [kind_note, _risk_note(risk_level, risk_reasons)]
    extra.extend(n for n in (notes or []) if n)
    memory = [m for m in (memory_lines or []) if m]
    memory_block = "\n".join(f"- {m}" for m in memory) if memory else "- 暂无"

    qa_block = "\n".join(f"- {line}" for line in qa_lines) or "- 没有回答"
    extra_block = "\n".join(f"- {line}" for line in extra)

    return f"""
{source}
{qa_block}

【以前聊过的事】
{memory_block}

【需要注意】
{extra_block}

【参考资料（项目内置，可以选用，不必每条都用）】
{resources}

【怎么写】
先在 analysis 里想清楚（这部分不给老人看）：
1. 他说了哪些具体情况；
2. 这些情况在老年人身上常见的原因有哪些，哪一个最可能对得上他；
3. 今天最值得帮他的是哪一两件事。

然后写卡片：
- 写 2 到 5 张，每张讲一件事，最重要的放第一张。讲哪几件事、分几张，由你根据他的回答决定；线索少就少写，不要为了凑数写没用的卡。
- 每张先用一两句话说清“为什么会这样”，要和他的情况对得上，让他明白自己身上发生了什么；再说“可以怎么做”：什么时候做、做多久、怎么做、要留意什么。
- 以他自己能做的办法为主。找家人、找医生不是每次都要写：只有他说需要别人帮忙，或者出现了确实该看医生的情况时才写，并说清楚是什么情况。
- 像当面聊天那样说话：口语、简体中文、称呼“您”。不用专业术语、诊断名称和分数，也不要写正确但空的话（比如“注意休息”“保持好心情”“多和家人沟通”）。

下面这张卡只示范写法，内容不要照搬：
{_EXAMPLE_CARD}

【输出 JSON】
{{
  "analysis": "不展示：线索、可能的原因、今天的重点",
  "summary_title": "不超过 16 字，点出今天的重点",
  "plain_summary": "120-200 字的一段话，适合朗读：今天最值得照顾的事、为什么、最关键的办法",
  "insight_cards": [
    {{"id": "card1", "eyebrow": "不超过 8 个字，说明这张讲什么", "title": "不超过 14 字", "body": "2-4 句：为什么会这样 + 可以怎么做", "bullets": ["具体做法，0-3 条"]}}
  ],
  "family_message": "一句老人可以直接发给家人的话：需要家人帮忙就说清帮什么；不需要就写一句报平安、说说今天打算做什么",
  "next_action": {{"label": "按钮文字，不超过 8 个字", "route": "relax/chat/help/summary"}},
  "risk_level": "normal/watch/elevated/urgent/medical_emergency",
  "tts_text": "和 plain_summary 意思一致的朗读稿"
}}
讲“什么情况要找医生或家人”的那张卡，id 写 "safety"；专门给家人发消息的卡（只在需要时写），id 写 "family"；其他卡 id 写 card1、card2……
""".strip()


_RISK_LEVELS = {"normal", "watch", "elevated", "urgent", "medical_emergency"}
_CARD_ICONS = ["spark", "leaf", "shield"]


def normalize_ai_cards(raw_cards: Any, risk_level: str, *, max_cards: int = 5) -> list[dict[str, Any]]:
    """Cards from the model -> card dicts the result page can show. Returns [] if unusable."""
    cards: list[dict[str, Any]] = []
    seen: set[str] = set()
    if not isinstance(raw_cards, list):
        return cards
    for raw in raw_cards:
        if not isinstance(raw, dict):
            continue
        title = str(raw.get("title") or "").strip()
        body = str(raw.get("body") or "").strip()
        if not title or not body:
            continue
        card_id = str(raw.get("id") or "").strip() or f"card{len(cards) + 1}"
        if card_id in seen:
            card_id = f"{card_id}-{len(cards) + 1}"
        seen.add(card_id)
        if card_id == "safety":
            icon, action = "heart", "打开帮助"
            tone = risk_level if risk_level in _RISK_LEVELS else "watch"
        elif card_id == "family":
            icon, action, tone = "user", "复制给家人", "normal"
        else:
            icon, action = _CARD_ICONS[len(cards) % len(_CARD_ICONS)], None
            tone = "normal"
        bullets = [str(item).strip() for item in (raw.get("bullets") or []) if str(item).strip()][:3]
        cards.append({
            "id": card_id,
            "eyebrow": str(raw.get("eyebrow") or "今天的建议").strip()[:12],
            "title": title,
            "body": body,
            "action": action,
            "tone": tone,
            "icon": icon,
            "bullets": bullets,
            "speak_text": body,
        })
    return cards[:max_cards]


_RISK_ORDER = ["normal", "watch", "elevated", "urgent", "medical_emergency"]


def stricter_risk(model_level: Any, rule_level: str) -> str:
    """The model may raise the level the rules found, never lower it."""
    if model_level not in _RISK_ORDER:
        return rule_level
    if rule_level not in _RISK_ORDER:
        return model_level
    return max(model_level, rule_level, key=_RISK_ORDER.index)
