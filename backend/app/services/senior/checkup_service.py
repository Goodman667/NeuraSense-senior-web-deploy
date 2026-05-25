import hashlib
import json
import re
from datetime import datetime
from typing import Any

from app.schemas.senior import (
    SeniorCheckupAnswer,
    SeniorCheckupQuestion,
    SeniorCheckupScaleSnapshot,
    SeniorInsightCard,
    SeniorNextAction,
    SeniorRecommendation,
    SeniorRecommendedExercise,
    SeniorSafetyState,
    SeniorSummaryDimension,
    SeniorSummaryResponse,
)
from app.services.llm import CounselorService
from app.services.mental_health import build_ai_context
from app.services.senior import storage
from app.services.senior.card_service import build_family_message, build_insight_cards, recommend_exercise
from app.services.senior.safety_service import detect_senior_safety
from app.services.senior.summary_service import _extract_json
from app.services.tts.tts_service import sanitize_tts_text


YES_NO_OPTIONS = [
    {"value": "yes", "label": "是"},
    {"value": "no", "label": "不是"},
    {"value": "unsure", "label": "不确定"},
]

FREQUENCY_OPTIONS = [
    {"value": "not_at_all", "label": "没有"},
    {"value": "several_days", "label": "有几天"},
    {"value": "more_than_half", "label": "一半以上"},
    {"value": "nearly_every_day", "label": "几乎每天"},
]

LONELINESS_OPTIONS = [
    {"value": "hardly", "label": "很少"},
    {"value": "sometimes", "label": "有时候"},
    {"value": "often", "label": "经常"},
]

SEVERITY_OPTIONS = [
    {"value": "none", "label": "没有"},
    {"value": "mild", "label": "有一点"},
    {"value": "moderate", "label": "比较明显"},
    {"value": "severe", "label": "很严重"},
]


QUESTION_BANK: list[dict[str, Any]] = [
    # GDS-15 inspired mood items, user-facing wording is intentionally plain.
    {"id": "gds_life_satisfied", "scale": "gds15", "dimension": "mood", "response_type": "yes_no", "text": "最近一两周，您对自己的生活基本还满意吗？", "helper": "不用想太久，按大概感觉回答。", "concern": {"no": 1, "unsure": 0.5}},
    {"id": "gds_dropped_activities", "scale": "gds15", "dimension": "mood", "response_type": "yes_no", "text": "您是不是减少了很多原来愿意做的事情？", "helper": "比如少出门、少聊天、少做以前爱做的事。", "concern": {"yes": 1, "unsure": 0.5}},
    {"id": "gds_empty", "scale": "gds15", "dimension": "mood", "response_type": "yes_no", "text": "您会不会常常觉得心里空落落的？", "helper": "偶尔有也没关系，说最近的大概情况。", "concern": {"yes": 1, "unsure": 0.5}},
    {"id": "gds_bored", "scale": "gds15", "dimension": "mood", "response_type": "yes_no", "text": "您会不会经常觉得一天没什么意思？", "helper": "如果只是今天这样，也可以选不确定。", "concern": {"yes": 1, "unsure": 0.5}},
    {"id": "gds_good_spirits", "scale": "gds15", "dimension": "mood", "response_type": "yes_no", "text": "大多数时候，您的精神还算好吗？", "helper": "这里问的是整体精神头，不是某一个小时。", "concern": {"no": 1, "unsure": 0.5}},
    {"id": "gds_afraid", "scale": "gds15", "dimension": "anxiety", "response_type": "yes_no", "text": "您会不会担心会有不好的事情发生？", "helper": "比如担心身体、家人、钱、生活安排。", "concern": {"yes": 1, "unsure": 0.5}},
    {"id": "gds_happy", "scale": "gds15", "dimension": "mood", "response_type": "yes_no", "text": "大多数时候，您觉得自己还算开心吗？", "helper": "不是要求天天开心，只问大概。", "concern": {"no": 1, "unsure": 0.5}},
    {"id": "gds_helpless", "scale": "gds15", "dimension": "mood", "response_type": "yes_no", "text": "您会不会有时候觉得自己没什么办法？", "helper": "如果最近常觉得使不上力，可以选是。", "concern": {"yes": 1, "unsure": 0.5}},
    {"id": "gds_homebound", "scale": "gds15", "dimension": "social", "response_type": "yes_no", "text": "您最近是不是更愿意待在家里，不太想出门？", "helper": "天气或身体原因也可以算进去。", "concern": {"yes": 1, "unsure": 0.5}},
    {"id": "gds_memory_worry", "scale": "gds15", "dimension": "mood", "response_type": "yes_no", "text": "您会不会因为记性或反应变慢而烦心？", "helper": "这题只是了解困扰，不代表判断能力。", "concern": {"yes": 1, "unsure": 0.5}},
    {"id": "gds_worth", "scale": "gds15", "dimension": "mood", "response_type": "yes_no", "text": "您会不会觉得自己现在没什么用处？", "helper": "如果这句话让您难受，也可以选不确定。", "concern": {"yes": 1, "unsure": 0.5}},
    {"id": "gds_energy", "scale": "gds15", "dimension": "body", "response_type": "yes_no", "text": "最近做平常的小事，您会不会比以前更容易累？", "helper": "比如走动、做饭、收拾东西。", "concern": {"yes": 1, "unsure": 0.5}},
    # GAD-7 inspired anxiety frequency items.
    {"id": "gad_nervous", "scale": "gad7_short", "dimension": "anxiety", "response_type": "frequency", "text": "最近一两周，您感到紧张、急或心里不安的次数多吗？", "helper": "按次数回答，不用解释原因。"},
    {"id": "gad_control_worry", "scale": "gad7_short", "dimension": "anxiety", "response_type": "frequency", "text": "担心的事情来了以后，您会不会不太容易停下来？", "helper": "比如脑子一直转、反复想。"},
    {"id": "gad_worry_many", "scale": "gad7_short", "dimension": "anxiety", "response_type": "frequency", "text": "您最近会不会为好几件事反复担心？", "helper": "身体、家人、钱、睡眠都可以算。"},
    {"id": "gad_relax", "scale": "gad7_short", "dimension": "anxiety", "response_type": "frequency", "text": "您会不会觉得很难放松下来？", "helper": "比如坐着也不踏实。"},
    {"id": "gad_irritable", "scale": "gad7_short", "dimension": "anxiety", "response_type": "frequency", "text": "您最近会不会比平时更容易烦或急？", "helper": "只问最近，不评价对错。"},
    # UCLA-3 inspired loneliness items.
    {"id": "ucla_left_out", "scale": "ucla3", "dimension": "loneliness", "response_type": "severity", "text": "最近，您会不会觉得自己有点被落下了？", "helper": "比如别人忙，自己插不上话。"},
    {"id": "ucla_isolated", "scale": "ucla3", "dimension": "loneliness", "response_type": "severity", "text": "您会不会觉得身边能说话的人少了？", "helper": "不是问人多不多，是问能不能说上话。"},
    {"id": "ucla_companionship", "scale": "ucla3", "dimension": "loneliness", "response_type": "severity", "text": "您会不会觉得缺少一个能陪您聊几句的人？", "helper": "如果只是想安静，也可以选没有。"},
    # Sleep / ISI inspired items.
    {"id": "isi_falling_asleep", "scale": "sleep_short", "dimension": "sleep", "response_type": "severity", "text": "最近入睡困难明显吗？", "helper": "比如躺下很久睡不着。"},
    {"id": "isi_staying_asleep", "scale": "sleep_short", "dimension": "sleep", "response_type": "severity", "text": "夜里醒来或者早醒，会不会影响您白天精神？", "helper": "如果醒了还能睡回去，可以选轻一点。"},
    {"id": "isi_satisfaction", "scale": "sleep_short", "dimension": "sleep", "response_type": "severity", "text": "您对最近的睡眠满意吗？", "helper": "满意选没有或有一点，不满意选明显或严重。", "reverse": True},
    {"id": "sleep_daytime", "scale": "sleep_short", "dimension": "sleep", "response_type": "severity", "text": "白天没精神、打盹或发困明显吗？", "helper": "这能帮助判断今天适合休息还是练习。"},
    # Safety/body observation.
    {"id": "body_pain", "scale": "body_safety", "dimension": "body", "response_type": "severity", "text": "今天身体有没有明显不舒服？", "helper": "比如头痛、胸口不适、胃不舒服、眼睛痛。"},
    {"id": "safety_hopeless", "scale": "safety", "dimension": "safety", "response_type": "yes_no", "text": "最近有没有一刻觉得实在撑不下去？", "helper": "如果有，请如实选是，我会优先帮您找人。", "concern": {"yes": 2, "unsure": 0.5}},
    {"id": "safety_self_harm", "scale": "safety", "dimension": "safety", "response_type": "yes_no", "text": "有没有出现过想伤害自己、或不想活的念头？", "helper": "这题很重要，选是不会责怪您，只会优先保护您。", "concern": {"yes": 4, "unsure": 1}},
]


def _options_for(response_type: str) -> list[dict[str, str]]:
    if response_type == "frequency":
        return FREQUENCY_OPTIONS
    if response_type == "severity":
        return SEVERITY_OPTIONS
    return YES_NO_OPTIONS


def _question_model(item: dict[str, Any]) -> SeniorCheckupQuestion:
    options = item.get("options") or _options_for(item["response_type"])
    return SeniorCheckupQuestion(
        id=item["id"],
        text=item["text"],
        helper=item.get("helper", ""),
        dimension=item["dimension"],
        scale=item["scale"],
        response_type=item["response_type"],
        options=options,
    )


def build_checkup_questions(user_id: str, mode: str = "comprehensive") -> tuple[str, list[SeniorCheckupQuestion]]:
    seed = f"{user_id}:{storage.today_iso()}:{datetime.utcnow().hour // 6}:{mode}"
    digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()
    offset = int(digest[:8], 16)

    def pick(dimension: str, count: int, *, include_safety: bool = False) -> list[dict[str, Any]]:
        pool = [q for q in QUESTION_BANK if q["dimension"] == dimension]
        if not include_safety:
            pool = [q for q in pool if q["scale"] != "safety"]
        if not pool:
            return []
        start = offset % len(pool)
        rotated = pool[start:] + pool[:start]
        return rotated[:count]

    if mode == "mood":
        raw = pick("mood", 7) + pick("anxiety", 2) + pick("safety", 1, include_safety=True)
    elif mode == "sleep":
        raw = pick("sleep", 5) + pick("body", 2) + pick("mood", 2) + pick("safety", 1, include_safety=True)
    elif mode == "loneliness":
        raw = pick("loneliness", 3) + pick("social", 2) + pick("mood", 3) + pick("safety", 1, include_safety=True)
    else:
        raw = (
            pick("mood", 4)
            + pick("anxiety", 3)
            + pick("loneliness", 2)
            + pick("sleep", 3)
            + pick("body", 1)
            + pick("safety", 1, include_safety=True)
        )
    # Remove duplicates while preserving order.
    deduped: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in raw:
        if item["id"] in seen:
            continue
        seen.add(item["id"])
        deduped.append(item)
    session_id = f"senior-checkup-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{digest[:6]}"
    return session_id, [_question_model(item) for item in deduped[:14]]


def _answer_score(question: dict[str, Any], answer_value: str) -> float:
    response_type = question.get("response_type")
    if response_type == "frequency":
        return {
            "not_at_all": 0,
            "several_days": 1,
            "more_than_half": 2,
            "nearly_every_day": 3,
        }.get(answer_value, 0)
    if response_type == "severity":
        base = {
            "none": 0,
            "mild": 1,
            "moderate": 2,
            "severe": 3,
            "hardly": 0,
            "sometimes": 1.5,
            "often": 3,
        }.get(answer_value, 0)
        if question.get("reverse"):
            return max(0, 3 - base)
        return base
    concern = question.get("concern") or {}
    return float(concern.get(answer_value, 0))


def score_checkup(questions: list[SeniorCheckupQuestion], answers: list[SeniorCheckupAnswer]) -> SeniorCheckupScaleSnapshot:
    question_by_id = {q.id: next((item for item in QUESTION_BANK if item["id"] == q.id), q.model_dump()) for q in questions}
    scores = {"mood": 0.0, "anxiety": 0.0, "loneliness": 0.0, "sleep": 0.0, "safety": 0.0}
    uncertain = 0
    for answer in answers:
        question = question_by_id.get(answer.question_id)
        if not question:
            continue
        value = answer.answer_value
        if value in {"unsure"}:
            uncertain += 1
        dimension = str(question.get("dimension") or answer.dimension or "")
        score = _answer_score(question, value)
        if dimension == "mood":
            scores["mood"] += score
        elif dimension == "anxiety":
            scores["anxiety"] += score
        elif dimension == "loneliness":
            scores["loneliness"] += score
        elif dimension == "sleep":
            scores["sleep"] += score
        elif dimension == "safety":
            scores["safety"] += score
        elif dimension in {"body", "social"}:
            # Body/social items affect practical suggestions but not a diagnostic label.
            if dimension == "body":
                scores["safety"] += min(score, 2)
            else:
                scores["loneliness"] += min(score, 2)
    quality = "good"
    if len(answers) < 6 or uncertain >= max(3, len(answers) // 2):
        quality = "thin"
    elif len(answers) < 10 or uncertain >= 2:
        quality = "partial"
    return SeniorCheckupScaleSnapshot(
        mood_score=round(scores["mood"], 1),
        anxiety_score=round(scores["anxiety"], 1),
        loneliness_score=round(scores["loneliness"], 1),
        sleep_score=round(scores["sleep"], 1),
        safety_score=round(scores["safety"], 1),
        answered_count=len(answers),
        uncertain_count=uncertain,
        quality=quality,  # type: ignore[arg-type]
    )


def _joined_answers(answers: list[SeniorCheckupAnswer]) -> str:
    return "；".join(f"{item.question_text}：{item.answer_label}" for item in answers)


def _level_from_snapshot(snapshot: SeniorCheckupScaleSnapshot, answer_text: str) -> str:
    safety = detect_senior_safety(answer_text)
    if safety.level in {"urgent", "medical_emergency", "elevated"}:
        return safety.level
    if snapshot.safety_score >= 4:
        return "urgent"
    if snapshot.safety_score >= 2 or snapshot.mood_score >= 5 or snapshot.anxiety_score >= 6:
        return "elevated"
    if snapshot.sleep_score >= 6 or snapshot.loneliness_score >= 5 or snapshot.mood_score >= 3 or snapshot.anxiety_score >= 3:
        return "watch"
    return "normal"


def _dimension_text(snapshot: SeniorCheckupScaleSnapshot, answer_text: str) -> dict[str, SeniorSummaryDimension]:
    sleep = SeniorSummaryDimension(
        label="睡眠",
        status="需要关注" if snapshot.sleep_score >= 6 else ("一般" if snapshot.sleep_score >= 3 else "较平稳"),
        text="睡眠已经影响白天精神，今天先减少费神费眼的事。" if snapshot.sleep_score >= 6 else ("睡眠有些波动，睡前可以把节奏放慢。" if snapshot.sleep_score >= 3 else "睡眠线索暂时不重，继续保持规律作息。"),
    )
    mood = SeniorSummaryDimension(
        label="心情",
        status="需要陪伴" if snapshot.mood_score >= 5 else ("有些低落" if snapshot.mood_score >= 3 else "较平稳"),
        text="心情低落和没力气的线索较多，适合让身边的人知道。" if snapshot.mood_score >= 5 else ("心情有一点沉，今天先别给自己安排太多。" if snapshot.mood_score >= 3 else "心情线索暂时较平稳，可以做一点轻松的小事。"),
    )
    stress = SeniorSummaryDimension(
        label="担心",
        status="偏高" if snapshot.anxiety_score >= 6 else ("中等" if snapshot.anxiety_score >= 3 else "较轻"),
        text="担心比较容易停不下来，先把最挂念的一件事写短一点。" if snapshot.anxiety_score >= 6 else ("有些担心在心里转，适合先做一个小动作。" if snapshot.anxiety_score >= 3 else "担心线索不重，今天按自己的节奏来。"),
    )
    support = SeniorSummaryDimension(
        label="陪伴",
        status="建议联系家人" if snapshot.loneliness_score >= 5 else ("可以多聊几句" if snapshot.loneliness_score >= 2 else "暂时平稳"),
        text="孤单和缺少说话对象的线索较明显，今天适合主动联系一个人。" if snapshot.loneliness_score >= 5 else ("可以安排一次短聊天，不需要说很多。" if snapshot.loneliness_score >= 2 else "陪伴线索暂时不重，需要时再联系家人朋友。"),
    )
    if re.search(r"胸|呼吸|摔|晕|药|很严重", answer_text):
        sleep.text = "现在先不分析睡眠，身体安全更重要。"
    return {"sleep": sleep, "mood": mood, "stress": stress, "social_support": support}


def _fallback_summary(
    user_id: str,
    answers: list[SeniorCheckupAnswer],
    snapshot: SeniorCheckupScaleSnapshot,
    session_id: str | None = None,
) -> SeniorSummaryResponse:
    answer_text = _joined_answers(answers)
    safety_detection = detect_senior_safety(answer_text)
    risk_level = _level_from_snapshot(snapshot, answer_text)
    dimensions = _dimension_text(snapshot, answer_text)

    if risk_level in {"urgent", "medical_emergency"}:
        title = "现在先保证安全"
        plain = "这次回答里出现了让我担心您安全的线索。请先停下来，不要一个人待着，马上联系身边可信任的人；如果有现实危险或身体急症，请联系当地急救或专业帮助。"
        rec = SeniorRecommendation(type="help", title="马上找一个人", reason="现在最重要的是有人陪在身边，而不是继续自己忍着。")
        next_action = SeniorNextAction(label="打开帮助", route="help")
    elif risk_level == "elevated":
        title = "今天不要一个人扛"
        plain = "这次回答提示，心情、担心或安全感已经比较吃力。今天先不解决所有事，先联系一个可信任的人，说一句“我今天有点撑不住，想让你陪我一会儿”。"
        rec = SeniorRecommendation(type="help", title="联系可信任的人", reason="有人知道您的状态，会比一个人硬撑更稳。")
        next_action = SeniorNextAction(label="看看可以找谁", route="help")
    elif snapshot.sleep_score >= max(snapshot.mood_score, snapshot.anxiety_score, snapshot.loneliness_score):
        title = "先把睡眠照顾好"
        plain = "这次回答里，睡眠和白天精神是最需要先照顾的地方。今天先把屏幕放远，安排一次 15 分钟短休息；如果身体不舒服持续或加重，请告诉家人。"
        rec = SeniorRecommendation(type="rest", title="短休息 15 分钟", reason="先补一点精神，比继续硬撑更实际。", tool_id="rest_15min")
        next_action = SeniorNextAction(label="开始短休息", route="relax")
    elif snapshot.loneliness_score >= max(snapshot.mood_score, snapshot.anxiety_score):
        title = "今天需要有人说说话"
        plain = "这次回答里，孤单和缺少陪伴的线索比较明显。今天先不用讲很多道理，只给一个可信任的人发一句话，约对方陪您聊 10 分钟。"
        rec = SeniorRecommendation(type="chat", title="聊 10 分钟就好", reason="短一点的联系，比一大堆建议更容易做到。", tool_id="connection_message")
        next_action = SeniorNextAction(label="开始聊聊", route="chat")
    elif snapshot.anxiety_score >= 3:
        title = "先把担心放小一点"
        plain = "这次回答里，担心和放松不下来的线索比较明显。先把最挂念的一件事写成一句话，再做 6 次慢呼气，让脑子从反复打转里出来一点。"
        rec = SeniorRecommendation(type="relax", title="写下一件挂念", reason="把担心写短一点，会比在脑子里反复想更容易停下来。", tool_id="worry_note")
        next_action = SeniorNextAction(label="先做这一步", route="relax")
    elif snapshot.mood_score >= 3:
        title = "今天先轻一点"
        plain = "这次回答里，心情有一点沉。今天先不要求自己振作，只安排一件容易完成的小事，比如喝水、晒一会儿太阳，或者给熟人发一句问候。"
        rec = SeniorRecommendation(type="relax", title="1 分钟安心呼吸", reason="先让身体松一点，再决定下一步。", tool_id="breathing_3min")
        next_action = SeniorNextAction(label="做个短放松", route="relax")
    else:
        title = "整体还算平稳"
        plain = "这次回答没有看到特别紧急的信号。今天继续保持轻一点的节奏，只做一件让自己舒服的小事，晚一点再观察睡眠和心情有没有变化。"
        rec = SeniorRecommendation(type="relax", title="3 分钟慢呼吸", reason="短一点、慢一点，适合日常保持状态。", tool_id="breathing_3min")
        next_action = SeniorNextAction(label="做个短放松", route="relax")

    safety_state = safety_detection.state
    if risk_level != safety_state.level:
        safety_state = safety_state.model_copy(update={"level": risk_level})
    exercise = recommend_exercise(text=answer_text, recommendation=rec, safety=safety_state)
    family_message = build_family_message(
        summary_title=title,
        plain_summary=plain,
        recommendation=rec,
        safety=safety_state,
    )
    cards = build_insight_cards(
        summary_title=title,
        plain_summary=plain,
        dimensions=dimensions,
        recommendation=rec,
        safety=safety_state,
        family_message=family_message,
        exercise=exercise,
    )
    if snapshot.quality != "good":
        cards.insert(1, SeniorInsightCard(
            id="answer_quality",
            eyebrow="这次回答比较少",
            title="先给一个低门槛建议",
            body="有些题选了不确定，所以今天的建议先从最安全、最容易做的一步开始。等您愿意时，可以重新做一次，说得更细一点。",
            action="重新做一次",
            tone="watch",
            icon="clipboard",
            bullets=["不需要一次说清楚", "先按最小步骤来"],
            speak_text="这次回答比较少，所以先给一个最容易做到的建议。",
        ))
        cards = cards[:5]
    tts = sanitize_tts_text(f"{plain} 接下来可以先做：{rec.title}。")
    return SeniorSummaryResponse(
        interview_id=session_id,
        summary_title=title,
        plain_summary=plain,
        dimensions=dimensions,
        risk_level=risk_level,  # type: ignore[arg-type]
        risk_explanation="来自这次小测中的睡眠、心情、担心、陪伴和身体安全线索。",
        recommendation=rec,
        next_action=next_action,
        insight_cards=cards,
        family_message=family_message,
        safety=safety_state,
        recommended_exercise=exercise,
        tts_text=tts,
        summary_generation_status="fallback",
        created_at=datetime.utcnow().isoformat(),
    )


def _coerce_ai_summary(data: dict[str, Any], fallback: SeniorSummaryResponse, snapshot: SeniorCheckupScaleSnapshot, session_id: str | None) -> SeniorSummaryResponse:
    try:
        dimensions_raw = data.get("dimensions") or {}
        dimensions: dict[str, SeniorSummaryDimension] = {}
        for key in ["sleep", "mood", "stress", "social_support"]:
            raw = dimensions_raw.get(key) or fallback.dimensions[key].model_dump()
            dimensions[key] = SeniorSummaryDimension(
                label=str(raw.get("label") or fallback.dimensions[key].label),
                status=str(raw.get("status") or fallback.dimensions[key].status),
                text=str(raw.get("text") or fallback.dimensions[key].text),
            )
        risk = data.get("risk_level") if data.get("risk_level") in {"normal", "watch", "elevated", "urgent", "medical_emergency"} else fallback.risk_level
        rec_raw = data.get("recommendation") or {}
        rec_type = rec_raw.get("type") if rec_raw.get("type") in {"relax", "chat", "help", "rest"} else fallback.recommendation.type
        rec = SeniorRecommendation(
            type=rec_type,
            title=str(rec_raw.get("title") or fallback.recommendation.title),
            reason=str(rec_raw.get("reason") or fallback.recommendation.reason),
            tool_id=rec_raw.get("tool_id") or fallback.recommendation.tool_id,
        )
        next_raw = data.get("next_action") or {}
        next_route = next_raw.get("route") if next_raw.get("route") in {"relax", "chat", "help", "summary", "home"} else fallback.next_action.route
        next_action = SeniorNextAction(label=str(next_raw.get("label") or fallback.next_action.label), route=str(next_route))
        safety_raw = data.get("safety") or {}
        safety = fallback.safety or SeniorSafetyState(title="今天先照顾好自己")
        if isinstance(safety_raw, dict) and safety_raw:
            safety = safety.model_copy(update={
                "level": safety_raw.get("level") if safety_raw.get("level") in {"normal", "watch", "elevated", "urgent", "medical_emergency"} else risk,
                "title": str(safety_raw.get("title") or safety.title),
                "message": str(safety_raw.get("message") or safety.message),
                "steps": [str(item) for item in (safety_raw.get("steps") or safety.steps)][:4],
                "should_contact_family": bool(safety_raw.get("should_contact_family", safety.should_contact_family)),
                "emergency_note": safety_raw.get("emergency_note") or safety.emergency_note,
            })
        exercise_raw = data.get("recommended_exercise") or {}
        exercise = fallback.recommended_exercise or recommend_exercise(text="", recommendation=rec, safety=safety)
        if isinstance(exercise_raw, dict) and exercise_raw:
            exercise = SeniorRecommendedExercise(
                id=str(exercise_raw.get("id") or exercise.id),
                title=str(exercise_raw.get("title") or exercise.title),
                reason=str(exercise_raw.get("reason") or exercise.reason),
                duration_label=str(exercise_raw.get("duration_label") or exercise.duration_label),
                steps=[str(item) for item in (exercise_raw.get("steps") or exercise.steps or [])][:4],
                play_prompt=exercise_raw.get("play_prompt") or exercise.play_prompt,
                stop_rule=exercise_raw.get("stop_rule") or exercise.stop_rule,
            )
        summary_title = str(data.get("summary_title") or fallback.summary_title)
        plain_summary = str(data.get("plain_summary") or fallback.plain_summary)
        family_message = str(data.get("family_message") or fallback.family_message)
        cards: list[SeniorInsightCard] = []
        for idx, raw in enumerate(data.get("insight_cards") or data.get("cards") or []):
            if not isinstance(raw, dict):
                continue
            fb = fallback.insight_cards[min(idx, max(0, len(fallback.insight_cards) - 1))]
            cards.append(SeniorInsightCard(
                id=str(raw.get("id") or fb.id),
                eyebrow=str(raw.get("eyebrow") or fb.eyebrow),
                title=str(raw.get("title") or fb.title),
                body=str(raw.get("body") or fb.body),
                action=raw.get("action") or fb.action,
                tone=raw.get("tone") if raw.get("tone") in {"normal", "watch", "elevated", "urgent", "medical_emergency"} else risk,
                icon=raw.get("icon") or fb.icon,
                bullets=[str(item) for item in (raw.get("bullets") or fb.bullets or [])][:4],
                speak_text=raw.get("speak_text") or raw.get("speakText") or fb.speak_text,
            ))
        if len(cards) < 5:
            cards = build_insight_cards(
                summary_title=summary_title,
                plain_summary=plain_summary,
                dimensions=dimensions,
                recommendation=rec,
                safety=safety,
                family_message=family_message,
                exercise=exercise,
            )
        user_banned = re.compile(r"NeuraSense|项目|平台|AI|人工智能|诊断|量表|评分|分数|PHQ|GAD|抑郁症|焦虑症")

        def clean_user_text(text: str) -> str:
            return user_banned.sub("", text).replace("  ", " ").strip()

        summary_title = clean_user_text(summary_title)
        plain_summary = clean_user_text(plain_summary)
        family_message = clean_user_text(family_message)
        rec.title = clean_user_text(rec.title)
        rec.reason = clean_user_text(rec.reason)
        for card in cards:
            card.eyebrow = clean_user_text(card.eyebrow)
            card.title = clean_user_text(card.title)
            card.body = clean_user_text(card.body)
            card.speak_text = clean_user_text(card.speak_text or card.body)
            card.bullets = [clean_user_text(item) for item in card.bullets]
        safety.title = clean_user_text(safety.title)
        safety.message = clean_user_text(safety.message)
        safety.steps = [clean_user_text(item) for item in safety.steps]
        if safety.emergency_note:
            safety.emergency_note = clean_user_text(safety.emergency_note)
        exercise.title = clean_user_text(exercise.title)
        exercise.reason = clean_user_text(exercise.reason)
        exercise.steps = [clean_user_text(item) for item in (exercise.steps or [])]
        if exercise.play_prompt:
            exercise.play_prompt = clean_user_text(exercise.play_prompt)
        if exercise.stop_rule:
            exercise.stop_rule = clean_user_text(exercise.stop_rule)
        return SeniorSummaryResponse(
            interview_id=session_id,
            summary_title=summary_title,
            plain_summary=plain_summary,
            dimensions=dimensions,
            risk_level=risk,  # type: ignore[arg-type]
            risk_explanation=clean_user_text(str(data.get("risk_explanation") or fallback.risk_explanation)),
            recommendation=rec,
            next_action=next_action,
            insight_cards=cards[:5],
            family_message=family_message,
            safety=safety,
            recommended_exercise=exercise,
            tts_text=sanitize_tts_text(clean_user_text(str(data.get("tts_text") or fallback.tts_text))),
            summary_generation_status="ai",
            created_at=datetime.utcnow().isoformat(),
        )
    except Exception:
        return fallback


def _prompt_for_checkup(answers: list[SeniorCheckupAnswer], snapshot: SeniorCheckupScaleSnapshot, fallback: SeniorSummaryResponse) -> str:
    qa = "\n".join(f"- {a.question_text}：{a.answer_label}" for a in answers)
    project_context = build_ai_context(
        user_mode="senior",
        interaction_kind="scale_checkup",
        user_message=qa,
        recent_context={"scale_snapshot": snapshot.model_dump(), "fallback": fallback.model_dump()},
    )
    return f"""
{project_context}

【场景】
这是一个老年心理健康陪伴网站里的“小测”。题目内部参考了老年心情、担心、孤独、睡眠和安全观察维度，但用户本人不应看到专业名词。
你会收到“系统提问的问题”和“用户选择的答案”。请根据项目老年版要求，给老人本人输出可执行、生活化、低负担的建议。

【用户本轮回答】
{qa}

【内部参考线索】
{json.dumps(snapshot.model_dump(), ensure_ascii=False)}

【必须遵守】
1. 输出严格 JSON，不要 Markdown，不要代码块。
2. 给用户看的字段不要出现：NeuraSense、项目、平台、AI、人工智能、诊断、量表、评分、分数、PHQ、GAD、抑郁症、焦虑症、算法、模型。
3. 不要把用户答案复述一遍凑字数；必须给“今天能做”的动作、对象、时长。
4. 如果回答质量较少或很多“不确定”，要明确“先给低门槛建议”，不要假装很确定。
5. 对老年人用语：短句、具体、像家人/护理员提醒，不说教。
6. 如果有不想活、伤害自己、撑不住、胸痛、呼吸困难、摔倒、用药过量等，优先联系真人与急救/专业帮助，next_action.route 必须是 help。
7. insight_cards 固定 5 张，顺序：
   priority 今天先照顾哪里；
   first_action 现在先做一步；
   why 为什么这样建议；
   safety 如果等下更不舒服；
   family 可以给家人看的话。

【输出 JSON 结构】
{{
  "summary_title": "不超过18字",
  "plain_summary": "80-140字，先说今天最需要照顾的地方，再给一个具体动作，再说明加重时找谁",
  "dimensions": {{
    "sleep": {{"label":"睡眠","status":"较平稳/一般/需要关注","text":"一句话"}},
    "mood": {{"label":"心情","status":"较平稳/有些低落/需要陪伴","text":"一句话"}},
    "stress": {{"label":"担心","status":"较轻/中等/偏高","text":"一句话"}},
    "social_support": {{"label":"陪伴","status":"暂时平稳/可以多聊几句/建议联系家人","text":"一句话"}}
  }},
  "risk_level": "normal/watch/elevated/urgent/medical_emergency",
  "risk_explanation": "生活化依据，不写专业词",
  "recommendation": {{"type":"relax/chat/help/rest","title":"按钮式短标题","reason":"为什么现在适合做这一步","tool_id":"可选"}},
  "next_action": {{"label":"按钮文案","route":"relax/chat/help/summary/home"}},
  "insight_cards": [
    {{"id":"priority","eyebrow":"先看这一点","title":"短标题","body":"只讲一个重点","action":"可选","tone":"normal/watch/elevated/urgent/medical_emergency","icon":"spark","bullets":["短句1","短句2"],"speak_text":"适合朗读"}},
    {{"id":"first_action","eyebrow":"现在先做","title":"短标题","body":"具体动作、时长或对象","action":"可选","tone":"normal/watch/elevated/urgent/medical_emergency","icon":"leaf","bullets":["短句1","短句2"],"speak_text":"适合朗读"}},
    {{"id":"why","eyebrow":"为什么这样建议","title":"短标题","body":"只解释生活线索，不讲算法","action":"可选","tone":"normal/watch/elevated/urgent/medical_emergency","icon":"shield","bullets":["短句1","短句2"],"speak_text":"适合朗读"}},
    {{"id":"safety","eyebrow":"如果等下更不舒服","title":"短标题","body":"加重时怎么做","action":"打开帮助或练习名","tone":"normal/watch/elevated/urgent/medical_emergency","icon":"heart","bullets":["短句1","短句2","短句3"],"speak_text":"适合朗读"}},
    {{"id":"family","eyebrow":"可以给家人看的话","title":"短标题","body":"可直接发给家人的话","action":"复制给家人","tone":"normal/watch/elevated/urgent/medical_emergency","icon":"user","bullets":["短句1","短句2"],"speak_text":"适合朗读"}}
  ],
  "family_message": "可直接复制给家人的一句话",
  "safety": {{"level":"normal/watch/elevated/urgent/medical_emergency","title":"短标题","message":"给用户看的安全说明","steps":["一步","一步","一步"],"should_contact_family":false,"emergency_note":"可选"}},
  "recommended_exercise": {{"id":"breathing_3min","title":"练习名","reason":"为什么推荐","duration_label":"3 分钟","steps":["一步","一步","一步"],"play_prompt":"轻微有趣但不幼稚的小玩法","stop_rule":"什么时候停止并找人"}},
  "tts_text": "适合朗读的一小段"
}}
""".strip()


async def analyze_checkup(
    *,
    user_id: str,
    session_id: str | None,
    mode: str,
    questions: list[SeniorCheckupQuestion],
    answers: list[SeniorCheckupAnswer],
) -> tuple[SeniorSummaryResponse, SeniorCheckupScaleSnapshot]:
    snapshot = score_checkup(questions, answers)
    fallback = _fallback_summary(user_id, answers, snapshot, session_id)
    summary = fallback
    try:
        prompt = _prompt_for_checkup(answers, snapshot, fallback)
        counselor = CounselorService()
        response = await counselor.generate_response(
            user_message=prompt,
            user_id=user_id,
            conversation_history=[],
            emotion_context={"skip_project_context": True, "skip_memory": True, "neurasense_mode": "senior"},
        )
        data = _extract_json(response.message)
        if data:
            summary = _coerce_ai_summary(data, fallback, snapshot, session_id)
    except Exception as exc:
        print(f"[senior-checkup] AI fallback: {exc}")
    try:
        storage.insert("senior_checkup_sessions", {
            "user_id": user_id,
            "session_id": session_id,
            "mode": mode,
            "questions": [q.model_dump() for q in questions],
            "answers": [a.model_dump() for a in answers],
            "scale_snapshot": snapshot.model_dump(),
            "summary_json": summary.model_dump(),
            "generation_status": summary.summary_generation_status,
        })
    except Exception as exc:
        print(f"[senior-checkup] session save skipped: {exc}")
    return summary, snapshot
