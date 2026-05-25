import json
import re
from dataclasses import dataclass
from typing import Any

from app.schemas.senior import SeniorRiskAction
from app.services.llm import CounselorService
from app.services.senior.safety_service import detect_senior_safety


RISK_ORDER = {
    "normal": 0,
    "watch": 1,
    "elevated": 2,
    "urgent": 3,
    "medical_emergency": 4,
}


@dataclass
class SeniorRiskResult:
    level: str
    reason: str
    action: SeniorRiskAction
    source: str = "rule"


def _default_action_for_level(level: str, reason: str, message: str) -> SeniorRiskAction:
    if level == "medical_emergency":
        return SeniorRiskAction(
            should_show_modal=True,
            should_contact_family=True,
            reason=reason or "你刚才提到了比较明显的身体不舒服。",
            user_message="我有点担心您现在的身体情况。先别继续一个人判断，请联系家人、邻居或医生；如果胸痛、呼吸困难、摔倒或意识异常，请马上联系急救。",
            family_message="我现在身体有点不舒服，需要你尽快联系我或过来陪我一下。如果情况加重，请帮我联系医生或急救。",
            steps=["先坐稳或躺在安全位置", "马上联系一位可信任的人", "如果症状加重，请联系医生或急救"],
        )

    if level == "urgent":
        return SeniorRiskAction(
            should_show_modal=True,
            should_contact_family=True,
            reason=reason or "你刚才说的话里有让我担心安全的内容。",
            user_message="我有点担心您现在一个人承受太多。请先把可能伤害自己的东西放远一点，马上联系您设置的家人或身边可信任的人。",
            family_message="我现在情绪很难受，不太适合一个人待着。请你尽快联系我，陪我一会儿；如果联系不上，请帮我找身边的人或专业帮助。",
            steps=["离开可能伤害自己的东西", "马上联系家人或可信任的人", "如果马上有危险，请联系当地急救或心理援助"],
        )

    if level == "elevated":
        return SeniorRiskAction(
            should_show_modal=True,
            should_contact_family=True,
            reason=reason or "你刚才表达的难受已经比较重。",
            user_message="我有点担心您现在一个人扛着。建议先联系您设置的家人，让对方知道您今天需要陪一会儿。",
            family_message="我今天有点撑不住，想让你陪我说几句话。如果你方便，请尽快联系我一下。",
            steps=["先坐稳，喝一口水", "给家人发一句简短说明", "如果更难受，请打开帮助入口"],
        )

    if level == "watch":
        return SeniorRiskAction(
            should_show_modal=False,
            should_contact_family=False,
            reason=reason or "你提到了一些需要照顾的线索。",
            user_message="今天先放慢一点。我们先做一个小步骤，如果等下更不舒服，再联系身边可信任的人。",
            family_message="我今天有点累，想让自己慢一点。方便时陪我聊几句就好。",
            steps=["做一个短休息", "把最不舒服的一点说出来", "情况加重时联系家人"],
        )

    return SeniorRiskAction(
        should_show_modal=False,
        should_contact_family=False,
        reason=reason or "没有看到需要马上求助的线索。",
        user_message="我们先按自己的节奏来。",
        family_message="我今天还可以，先按自己的节奏来。",
        steps=["保持喝水和休息", "需要时再联系可信任的人"],
    )


def build_rule_risk_result(text: str) -> SeniorRiskResult:
    detection = detect_senior_safety(text or "")
    reason = "；".join(detection.reasons) if detection.reasons else detection.state.message
    action = _default_action_for_level(detection.level, reason, text)
    return SeniorRiskResult(level=detection.level, reason=reason, action=action, source="rule")


def _extract_json(text: str) -> dict[str, Any] | None:
    try:
        return json.loads(text)
    except Exception:
        pass
    match = re.search(r"\{[\s\S]*\}", text or "")
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except Exception:
        return None


def _coerce_ai_result(data: dict[str, Any], fallback: SeniorRiskResult) -> SeniorRiskResult:
    level = data.get("level") if data.get("level") in RISK_ORDER else fallback.level
    reason = str(data.get("reason") or fallback.reason)
    action = fallback.action.model_copy(update={
        "should_show_modal": bool(data.get("should_show_modal", fallback.action.should_show_modal)),
        "should_contact_family": bool(data.get("should_contact_family", fallback.action.should_contact_family)),
        "user_message": str(data.get("user_message") or fallback.action.user_message),
        "family_message": str(data.get("family_message") or fallback.action.family_message),
        "reason": reason,
        "steps": [str(item) for item in (data.get("steps") or fallback.action.steps)][:4],
    })
    return SeniorRiskResult(level=level, reason=reason, action=action, source="ai")


def _choose_stronger(a: SeniorRiskResult, b: SeniorRiskResult) -> SeniorRiskResult:
    return b if RISK_ORDER.get(b.level, 0) > RISK_ORDER.get(a.level, 0) else a


def _build_ai_prompt(message: str, history: list[dict[str, str]] | None, rule: SeniorRiskResult) -> str:
    recent = "\n".join(
        f"{item.get('role', 'user')}: {item.get('content', '')}"
        for item in (history or [])[-6:]
        if item.get("content")
    )
    return f"""
这是 NeuraSense 老年陪伴版的一段用户对话。请判断是否需要弹出“联系家人/休息/返回首页”的关怀提醒。
你必须只输出 JSON，不要 Markdown，不要解释。
不要做诊断，不要写专业术语。所有文案要像真实产品写给老人本人看的话。

【最近对话】
{recent or "无"}

【用户最新一句】
{message}

【规则层初判】
level={rule.level}
reason={rule.reason}

风险等级只能是：normal、watch、elevated、urgent、medical_emergency。
判断原则：
- 明确自伤、轻生、想死、不想活、已经准备工具：urgent
- 胸痛、呼吸困难、摔倒、意识异常、过量服药：medical_emergency
- 撑不住、受不了、很绝望、没人管、活不下去：elevated
- 失眠、孤独、担心、低落、疲惫、普通身体不适：watch
- 日常表达：normal

请输出：
{{
  "level": "normal/watch/elevated/urgent/medical_emergency",
  "reason": "一句生活化原因，不要写算法、模型、诊断、风险等级",
  "should_show_modal": true,
  "should_contact_family": true,
  "user_message": "给老人本人看的关怀提示，2-3句",
  "family_message": "可以直接发给家人的一句话",
  "steps": ["第一步", "第二步", "第三步"]
}}
""".strip()


async def analyze_senior_risk(
    user_id: str,
    message: str,
    history: list[dict[str, str]] | None = None,
) -> SeniorRiskResult:
    rule = build_rule_risk_result(message)
    try:
        counselor = CounselorService()
        response = await counselor.generate_response(
            user_message=_build_ai_prompt(message, history, rule),
            user_id=user_id,
            conversation_history=[],
            emotion_context={
                "skip_project_context": True,
                "skip_memory": True,
                "neurasense_mode": "senior",
            },
        )
        data = _extract_json(response.message)
        if not data:
            return rule
        ai = _coerce_ai_result(data, rule)
        # 规则层命中更高风险时，不能被 AI 降级。
        chosen = _choose_stronger(ai, rule)
        if RISK_ORDER.get(ai.level, 0) >= RISK_ORDER.get(rule.level, 0):
            chosen = ai
        if chosen.level in {"elevated", "urgent", "medical_emergency"}:
            chosen.action.should_show_modal = True
            chosen.action.should_contact_family = True
        return chosen
    except Exception as exc:
        print(f"[senior-risk] AI risk check fallback: {exc}")
        return rule
