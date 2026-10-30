import json
import re
from datetime import datetime
from typing import Any

from app.schemas.senior import (
    SeniorInsightCard,
    SeniorQuestionAnswer,
    SeniorSummaryDimension,
    SeniorSummaryResponse,
    SeniorRecommendation,
    SeniorNextAction,
)
from app.services.llm import CounselorService
from app.services.senior.advice_guidelines import SENIOR_ADVICE_SYSTEM, build_senior_advice_prompt, normalize_ai_cards, stricter_risk, topics_from_text
from app.services.senior.card_service import build_family_message, build_insight_cards, recommend_exercise
from app.services.senior.memory_service import get_senior_memory, update_senior_memory
from app.services.senior.safety_service import detect_senior_safety

CRISIS_PATTERNS = ["不想活", "想死", "自杀", "自残", "伤害自己", "活着没意思", "结束生命", "跳楼", "割腕"]
ELEVATED_PATTERNS = ["撑不住", "没人管", "很绝望", "太痛苦", "受不了", "不想见人"]
WATCH_PATTERNS = ["睡不着", "失眠", "孤单", "孤独", "担心", "焦虑", "烦", "害怕", "压力", "累", "没精神"]

def _joined_text(answers: list[SeniorQuestionAnswer] | list[dict[str, Any]]) -> str:
    parts: list[str] = []
    for item in answers:
        if isinstance(item, dict):
            parts.append(str(item.get("answer_text", "")))
        else:
            parts.append(item.answer_text)
    return "；".join(p.strip() for p in parts if p and p.strip())

def _answer_map(answers: list[SeniorQuestionAnswer] | list[dict[str, Any]]) -> dict[str, str]:
    result: dict[str, str] = {}
    for item in answers:
        if isinstance(item, dict):
            key = str(item.get("question_id", ""))
            value = str(item.get("answer_text", ""))
        else:
            key = item.question_id
            value = item.answer_text
        if key:
            result[key] = value.strip()
    return result

def _has(text: str, pattern: str) -> bool:
    return bool(re.search(pattern, text))

def detect_risk_level(text: str) -> tuple[str, list[str]]:
    detection = detect_senior_safety(text)
    return detection.level, detection.reasons

def _status_for_sleep(text: str) -> tuple[str, str]:
    if re.search(r"睡不着|失眠|半夜醒|醒了|睡不好|睡得差|早醒", text):
        return "需要关注", "昨晚睡眠不太踏实，今天可以把节奏放慢一点。"
    if re.search(r"睡得好|睡眠好|睡得还行|睡得不错", text):
        return "较平稳", "睡眠情况还可以，继续保持固定作息。"
    return "一般", "还需要多观察睡眠变化，睡前尽量减少刺激信息。"

def _status_for_mood(text: str) -> tuple[str, str]:
    if re.search(r"难过|低落|没意思|烦|孤单|孤独|心情不好|不开心", text):
        return "有些低落", "今天情绪有些累，需要温和陪伴和一点现实支持。"
    if re.search(r"开心|高兴|还好|不错|平静|轻松", text):
        return "较平稳", "今天情绪整体较平稳，可以做一个轻量练习保持状态。"
    return "一般", "今天的心情还可以继续观察，不需要急着下结论。"

def _status_for_stress(text: str) -> tuple[str, str]:
    if re.search(r"担心|焦虑|压力|害怕|放不下|惦记|操心", text):
        return "偏高", "有一些挂念的事情，建议先从一个能做的小动作开始。"
    return "中等", "暂时没有看到特别强的压力线索，今天按自己的节奏来。"

def _build_practical_fallback(
    answers: list[SeniorQuestionAnswer] | list[dict[str, Any]],
    risk_level: str,
) -> tuple[
    str,
    str,
    dict[str, SeniorSummaryDimension],
    SeniorRecommendation,
    SeniorNextAction,
    str,
]:
    answer_by_id = _answer_map(answers)
    text = _joined_text(answers)
    sleep_text = answer_by_id.get("sleep", "")
    mood_text = answer_by_id.get("mood", "")
    body_text = answer_by_id.get("body", "") or answer_by_id.get("energy", "")
    worry_text = answer_by_id.get("worry", "")
    social_text = answer_by_id.get("social_support", "")
    support_text = answer_by_id.get("support_need", "")

    poor_sleep = _has(f"{sleep_text}；{text}", r"没睡好|睡不好|睡得差|失眠|睡不着|半夜醒|早醒|不踏实")
    fatigue = _has(f"{mood_text}；{body_text}；{text}", r"累|疲惫|没精神|乏|困|撑不住")
    eye_pain = _has(f"{body_text}；{text}", r"眼睛.*(痛|疼|酸|胀)|眼.*不舒服|眼下.*痛|眼眶.*痛|视力")
    medical_body = _has(f"{body_text}；{text}", r"胸闷|胸痛|胸口痛|喘不上气|呼吸困难|摔倒|晕倒|意识不清|吃多了药|过量服药")
    body_pain = _has(f"{body_text}；{text}", r"头痛|头疼|胸闷|腰痛|胃痛|哪里.*痛|不舒服")
    lonely = _has(mood_text + support_text + social_text + text, r"孤单|孤独|没人|陪|聊聊天|聊天|说说话")
    worry = _has(worry_text or text, r"担心|焦虑|放不下|惦记|操心|害怕|压力")
    wants_chat = _has(support_text, r"聊聊天|聊天|陪|说说话")

    if risk_level == "medical_emergency":
        dimensions = {
            "sleep": SeniorSummaryDimension(label="睡眠", status="先放一放", text="现在先不分析睡眠，身体安全更重要。"),
            "mood": SeniorSummaryDimension(label="心情", status="需要陪伴", text="请先让现实中的人知道您现在不舒服。"),
            "stress": SeniorSummaryDimension(label="压力", status="先停下来", text="继续自己判断会很累，先找人陪您处理。"),
            "social_support": SeniorSummaryDimension(label="支持", status="马上联系", text="请优先联系家人、邻居、医生或当地急救。"),
        }
        return (
            "先处理身体安全",
            "您刚才提到的身体不舒服需要优先处理。请先停止继续使用页面，坐稳或躺在安全位置，马上联系身边可信任的人；如果胸痛、呼吸困难、摔倒或意识异常，请联系急救。",
            dimensions,
            SeniorRecommendation(type="help", title="马上联系真人帮助", reason="身体急症不能靠线上建议判断，请优先找身边的人和医疗帮助。"),
            SeniorNextAction(label="打开帮助", route="help"),
            "出现需要优先排查的身体急症线索。",
        )

    if risk_level == "urgent":
        dimensions = {
            "sleep": SeniorSummaryDimension(label="睡眠", status="先不评估", text="现在最重要的是安全，不是分析睡眠。"),
            "mood": SeniorSummaryDimension(label="心情", status="需要马上支持", text="刚才的话已经说明现在不适合一个人扛着。"),
            "stress": SeniorSummaryDimension(label="压力", status="很高", text="先把身边的人叫过来，比继续忍着更重要。"),
            "social_support": SeniorSummaryDimension(label="支持", status="马上联系", text="请优先联系家人、朋友或当地急救/心理援助。"),
        }
        return (
            "现在先保证安全",
            "我更担心您现在的安全。先别一个人待着，请马上联系身边可信任的人，或拨打当地急救、心理援助电话。",
            dimensions,
            SeniorRecommendation(type="help", title="马上联系一个人", reason="现在需要真人陪在身边，先把安全放在第一位。"),
            SeniorNextAction(label="打开帮助", route="help"),
            "出现明确安全风险表达，需要立即获得真人支持。",
        )

    if risk_level == "elevated":
        dimensions = {
            "sleep": SeniorSummaryDimension(label="睡眠", status="需要放慢", text="今天先不要安排费神的事，把休息放在前面。"),
            "mood": SeniorSummaryDimension(label="心情", status="需要陪伴", text="这不是普通的心情不好，适合让身边的人知道。"),
            "stress": SeniorSummaryDimension(label="压力", status="偏高", text="先处理最小的一步，不要一次解决所有问题。"),
            "social_support": SeniorSummaryDimension(label="支持", status="建议联系家人", text="可以直接告诉家人：我今天有点撑不住，想有人陪一会儿。"),
        }
        return (
            "今天不要一个人扛",
            "您刚才表达的辛苦已经比较重。今天先不追求把事情解决，先联系一个可信任的人，让对方知道您需要陪一会儿。",
            dimensions,
            SeniorRecommendation(type="help", title="给可信任的人打电话", reason="有人在旁边时，情绪和安全都会更稳一点。"),
            SeniorNextAction(label="看看可以找谁", route="help"),
            "表达了较强痛苦或无助感，建议优先增加真人陪伴。",
        )

    if medical_body:
        title = "先确认身体安全"
        plain = "您提到的身体不舒服需要先让真人知道。请先坐稳，联系家人或邻居陪您观察；如果胸闷、胸痛、呼吸困难、摔倒或意识异常，请尽快联系医生或急救。"
        rec = SeniorRecommendation(
            type="help",
            title="联系家人陪您处理",
            reason="身体症状持续或加重时，先找真人和医疗帮助，比继续线上聊天更安全。",
        )
        next_action = SeniorNextAction(label="看看可以找谁", route="help")
    elif eye_pain:
        title = "先让眼睛休息一下"
        plain = "今天最需要先处理的不是继续聊天，而是睡眠不足后眼睛不舒服。先把屏幕放远，闭眼或看远处 10 分钟；如果眼痛持续或加重，请让家人陪您咨询医生。"
        rec = SeniorRecommendation(
            type="rest",
            title="眼睛休息 10 分钟",
            reason="昨晚没睡好又眼睛痛，继续盯屏幕容易更不舒服；先让眼睛离开屏幕更实际。",
            tool_id="eye_rest_10min",
        )
        next_action = SeniorNextAction(label="先休息眼睛", route="relax")
    elif poor_sleep and fatigue:
        title = "今天先补一点精神"
        plain = "昨晚睡得不踏实，今天的累更像是休息不足带来的。先把今天的任务减到一件小事，可以做一个 5 分钟的身体放松，晚上再尽量固定睡觉时间。"
        rec = SeniorRecommendation(
            type="rest",
            title="身体放松 5 分钟",
            reason="先补一点精神，比继续硬撑更能减少今天的不舒服。",
            tool_id="body_relax_5min",
        )
        next_action = SeniorNextAction(label="做 5 分钟放松", route="relax")
    elif wants_chat or lonely:
        title = "今天需要有人陪一会儿"
        plain = "您今天最需要的不是很多建议，而是有人陪着说几句话。可以先聊 10 分钟，把最难受的一点说出来；如果方便，也可以给家人发一句：我今天有点累，想有人陪我聊会儿。"
        rec = SeniorRecommendation(
            type="chat",
            title="聊 10 分钟就好",
            reason="您明确说想被陪着，短一点的聊天比一堆建议更合适。",
            tool_id="connection_message",
        )
        next_action = SeniorNextAction(label="开始聊 10 分钟", route="chat")
    elif worry:
        title = "先把挂念放小一点"
        plain = "今天有事情在心里挂着。先别反复想全部问题，只把最担心的一件事写成一句话，再决定今天能不能做其中最小的一步。"
        rec = SeniorRecommendation(
            type="relax",
            title="写下一件挂念",
            reason="把担心写成一句话，能先减少脑子里反复打转的感觉。",
            tool_id="worry_note",
        )
        next_action = SeniorNextAction(label="先做这一步", route="relax")
    else:
        title = "今天保持轻一点"
        plain = "今天没有看到明显危险信号。可以按平常节奏来，只安排一件容易完成的小事，保留一点体力和心情。"
        rec = SeniorRecommendation(
            type="relax",
            title="1 分钟安心呼吸",
            reason="短一点、轻一点，适合日常保持状态。",
            tool_id="breathing_3min",
        )
        next_action = SeniorNextAction(label="做一个短放松", route="relax")

    sleep_status = "需要补休" if poor_sleep else "暂时平稳"
    mood_status = "需要陪伴" if wants_chat or lonely else ("被疲惫压着" if fatigue else "暂时平稳")
    stress_status = "有挂念" if worry else "较轻"
    support_status = "适合主动联系" if wants_chat or lonely else "暂时平稳"
    dimensions = {
        "sleep": SeniorSummaryDimension(
            label="睡眠",
            status=sleep_status,
            text="昨晚睡得不踏实，今天先减少费眼、费脑的事情。" if poor_sleep else "目前没有明显睡眠风险，继续保持规律作息。",
        ),
        "mood": SeniorSummaryDimension(
            label="心情",
            status=mood_status,
            text="今天的情绪更多被疲惫和身体不舒服影响，先别急着要求自己振作。" if fatigue else "今天可以继续观察心情变化，不急着下结论。",
        ),
        "stress": SeniorSummaryDimension(
            label="压力",
            status=stress_status,
            text="如果没有特别放不下的事，今天就先把身体照顾好。" if not worry else "有挂念时，先写下最担心的一件事，再决定要不要处理。",
        ),
        "social_support": SeniorSummaryDimension(
            label="支持",
            status=support_status,
            text="您说想有人陪聊，可以直接安排一次短聊天，不需要解释很多。" if wants_chat or lonely else "今天先按自己的节奏来，必要时再联系家人朋友。",
        ),
    }
    explanation_parts = []
    if poor_sleep:
        explanation_parts.append("睡眠不踏实")
    if fatigue:
        explanation_parts.append("明显疲惫")
    if eye_pain:
        explanation_parts.append("眼睛不舒服")
    if wants_chat or lonely:
        explanation_parts.append("希望有人陪聊")
    if worry:
        explanation_parts.append("有挂念或担心")
    risk_explanation = "；".join(explanation_parts) if explanation_parts else "未发现明确危机信号。"
    return title, plain, dimensions, rec, next_action, risk_explanation

def build_fallback_summary(
    answers: list[SeniorQuestionAnswer] | list[dict[str, Any]],
    interview_id: str | None = None,
    memory_snapshot: Any | None = None,
) -> SeniorSummaryResponse:
    text = _joined_text(answers)
    safety_detection = detect_senior_safety(text)
    risk_level, reasons = safety_detection.level, safety_detection.reasons
    title, plain, dimensions, rec, next_action, practical_reason = _build_practical_fallback(answers, risk_level)
    risk_text = practical_reason or ("；".join(reasons) if reasons else "未发现明确危机信号。")
    exercise = recommend_exercise(text=text, recommendation=rec, safety=safety_detection.state)
    family_message = build_family_message(
        summary_title=title,
        plain_summary=plain,
        recommendation=rec,
        safety=safety_detection.state,
    )
    cards = build_insight_cards(
        summary_title=title,
        plain_summary=plain,
        dimensions=dimensions,
        recommendation=rec,
        safety=safety_detection.state,
        family_message=family_message,
        exercise=exercise,
    )
    tts = plain
    if rec.type in {"relax", "rest", "chat"}:
        tts += f" 接下来先做一件事：{rec.title}。"
    elif rec.type == "help":
        tts += " 如果现在很难受，请先打开帮助入口。"
    if safety_detection.state.should_contact_family:
        tts += " 请尽量不要一个人待着，先联系身边可信任的人。"

    return SeniorSummaryResponse(
        interview_id=interview_id,
        summary_title=title,
        plain_summary=plain,
        dimensions=dimensions,
        risk_level=risk_level,  # type: ignore[arg-type]
        risk_explanation=risk_text,
        recommendation=rec,
        next_action=next_action,
        insight_cards=cards,
        family_message=family_message,
        safety=safety_detection.state,
        recommended_exercise=exercise,
        memory_snapshot=memory_snapshot,
        tts_text=tts,
        summary_generation_status="fallback",
        created_at=datetime.utcnow().isoformat(),
    )

def _extract_json(text: str) -> dict[str, Any] | None:
    try:
        return json.loads(text)
    except Exception:
        pass
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except Exception:
        return None

def _is_generic_summary(summary: SeniorSummaryResponse, source_text: str) -> bool:
    combined = " ".join([
        summary.summary_title,
        summary.plain_summary,
        summary.recommendation.title,
        summary.recommendation.reason,
        summary.risk_explanation,
        summary.family_message,
        " ".join(f"{card.title} {card.body}" for card in summary.insight_cards),
    ])
    generic_phrases = [
        "慢一点",
        "放松一点",
        "有人陪",
        "聊聊天",
        "按自己的节奏",
        "不用急",
        "先照顾自己",
    ]
    concrete_cues = [
        "眼睛",
        "屏幕",
        "闭眼",
        "看远处",
        "10 分钟",
        "15 分钟",
        "20 分钟",
        "打电话",
        "发一句",
        "喝水",
        "短休息",
        "家人",
    ]
    user_facing_banned = [
        "NeuraSense",
        "关怀模式",
        "项目",
        "平台",
        "诊断",
        "评分",
        "分数",
        "量表",
        "PHQ",
        "GAD",
        "AI",
    ]
    repeated_source = source_text and len(source_text) > 12 and source_text[:18] in summary.plain_summary
    too_generic = sum(1 for phrase in generic_phrases if phrase in combined) >= 3
    lacks_action = not any(cue in combined for cue in concrete_cues)
    leaks_project_language = any(term in combined for term in user_facing_banned)
    missing_cards = len(summary.insight_cards or []) < 2
    missing_family = not summary.family_message or len(summary.family_message.strip()) < 12
    return leaks_project_language or repeated_source or missing_cards or missing_family or (too_generic and lacks_action)

def _coerce_summary(data: dict[str, Any], fallback: SeniorSummaryResponse, interview_id: str | None) -> SeniorSummaryResponse:
    try:
        raw_dimensions = data.get("dimensions") or {}
        dimensions = {}
        for key in ["sleep", "mood", "stress", "social_support"]:
            value = raw_dimensions.get(key) or fallback.dimensions[key].model_dump()
            dimensions[key] = SeniorSummaryDimension(
                label=str(value.get("label") or fallback.dimensions[key].label),
                status=str(value.get("status") or fallback.dimensions[key].status),
                text=str(value.get("text") or fallback.dimensions[key].text),
            )
        rec_raw = data.get("recommendation") or fallback.recommendation.model_dump()
        rec_type = rec_raw.get("type") if rec_raw.get("type") in {"relax", "chat", "help", "rest"} else fallback.recommendation.type
        next_raw = data.get("next_action") or fallback.next_action.model_dump()
        risk = stricter_risk(data.get("risk_level"), fallback.risk_level)
        rec = SeniorRecommendation(
            type=rec_type,
            title=str(rec_raw.get("title") or fallback.recommendation.title),
            reason=str(rec_raw.get("reason") or fallback.recommendation.reason),
            tool_id=rec_raw.get("tool_id") or fallback.recommendation.tool_id,
        )
        next_action = SeniorNextAction(
            label=str(next_raw.get("label") or fallback.next_action.label),
            route=str(next_raw.get("route") if next_raw.get("route") in {"relax", "chat", "help", "summary"} else fallback.next_action.route),
        )
        safety_raw = data.get("safety") or {}
        safety = fallback.safety
        if safety_raw:
            safety = fallback.safety.model_copy(update={
                "level": safety_raw.get("level") if safety_raw.get("level") in {"normal", "watch", "elevated", "urgent", "medical_emergency"} else risk,
                "title": str(safety_raw.get("title") or fallback.safety.title),
                "message": str(safety_raw.get("message") or safety_raw.get("action_text") or fallback.safety.message),
                "steps": [str(item) for item in (safety_raw.get("steps") or fallback.safety.steps)][:4],
                "should_contact_family": bool(safety_raw.get("should_contact_family", safety_raw.get("needs_human_support", fallback.safety.should_contact_family))),
                "emergency_note": safety_raw.get("emergency_note") or fallback.safety.emergency_note,
            })
        exercise_raw = data.get("recommended_exercise") or {}
        exercise = fallback.recommended_exercise
        if isinstance(exercise_raw, dict) and exercise_raw:
            exercise = fallback.recommended_exercise.model_copy(update={
                "id": str(exercise_raw.get("id") or fallback.recommended_exercise.id),
                "title": str(exercise_raw.get("title") or fallback.recommended_exercise.title),
                "reason": str(exercise_raw.get("reason") or exercise_raw.get("scenario") or fallback.recommended_exercise.reason),
                "duration_label": str(exercise_raw.get("duration_label") or (f"{exercise_raw.get('duration_minutes')} 分钟" if exercise_raw.get("duration_minutes") else fallback.recommended_exercise.duration_label)),
                "steps": [str(item) for item in (exercise_raw.get("steps") or fallback.recommended_exercise.steps or [])][:4],
                "play_prompt": exercise_raw.get("play_prompt") or exercise_raw.get("playPrompt") or fallback.recommended_exercise.play_prompt,
                "stop_rule": exercise_raw.get("stop_rule") or exercise_raw.get("stopRule") or fallback.recommended_exercise.stop_rule,
            })
        family_message = str(data.get("family_message") or fallback.family_message)
        summary_title = str(data.get("summary_title") or fallback.summary_title)
        plain_summary = str(data.get("plain_summary") or fallback.plain_summary)
        cards = [SeniorInsightCard(**card) for card in normalize_ai_cards(data.get("insight_cards") or data.get("cards"), risk)]
        if len(cards) < 2:
            cards = build_insight_cards(
                summary_title=summary_title,
                plain_summary=plain_summary,
                dimensions=dimensions,
                recommendation=rec,
                safety=safety,
                family_message=family_message,
                exercise=exercise,
            )

        return SeniorSummaryResponse(
            interview_id=interview_id,
            summary_title=summary_title,
            plain_summary=plain_summary,
            dimensions=dimensions,
            risk_level=risk,
            risk_explanation=str(data.get("risk_explanation") or fallback.risk_explanation),
            recommendation=rec,
            next_action=next_action,
            insight_cards=cards,
            family_message=family_message,
            safety=safety,
            recommended_exercise=exercise,
            memory_snapshot=fallback.memory_snapshot,
            tts_text=str(data.get("tts_text") or fallback.tts_text),
            summary_generation_status="ai",
            created_at=datetime.utcnow().isoformat(),
        )
    except Exception:
        return fallback

def _build_senior_summary_prompt(
    answers: list[SeniorQuestionAnswer],
    risk_level: str,
    risk_reasons: list[str] | None = None,
    memory: Any | None = None,
) -> str:
    qa_lines = [f"{item.question_text}：{item.answer_text or '没有回答'}" for item in answers]
    memory_lines: list[str] = []
    if memory is not None:
        concerns = [c for c in (getattr(memory, "frequent_concerns", None) or []) if c][:4]
        if concerns:
            memory_lines.append("以前常提到：" + "、".join(concerns))
    return build_senior_advice_prompt(
        kind="daily",
        qa_lines=qa_lines,
        risk_level=risk_level,
        risk_reasons=risk_reasons,
        memory_lines=memory_lines,
        topics=topics_from_text(_joined_text(answers)),
    )

async def generate_senior_summary(
    user_id: str,
    answers: list[SeniorQuestionAnswer],
    interview_id: str | None = None,
    checkin: dict[str, Any] | None = None,
    recent_context: dict[str, Any] | None = None,
) -> SeniorSummaryResponse:
    memory_before = get_senior_memory(user_id)
    fallback = build_fallback_summary(answers, interview_id=interview_id, memory_snapshot=memory_before)
    source_text = _joined_text(answers)
    prompt = _build_senior_summary_prompt(
        answers=answers,
        risk_level=fallback.risk_level,
        risk_reasons=detect_senior_safety(source_text).reasons,
        memory=memory_before,
    )
    summary = fallback
    try:
        counselor = CounselorService()
        response = await counselor.generate_response(
            user_message=prompt,
            user_id=user_id,
            conversation_history=[],
            emotion_context={"skip_project_context": True, "skip_memory": True, "neurasense_mode": "senior"},
            max_tokens=3200,
            task_system_prompt=SENIOR_ADVICE_SYSTEM,
            task_crisis=fallback.risk_level in {"urgent", "medical_emergency"},
        )
        data = _extract_json(response.message)
        if data:
            candidate = _coerce_summary(data, fallback, interview_id)
            if not _is_generic_summary(candidate, source_text):
                summary = candidate
    except Exception as exc:
        print(f"[senior-summary] AI summary fallback: {exc}")
    try:
        summary.memory_snapshot = update_senior_memory(
            user_id,
            answers,
            action=summary.recommendation.title,
            risk_level=summary.risk_level,
        )
    except Exception as exc:
        print(f"[senior-summary] memory update skipped: {exc}")
        summary.memory_snapshot = memory_before
    return summary
