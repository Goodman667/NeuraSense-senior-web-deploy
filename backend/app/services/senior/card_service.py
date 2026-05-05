from app.schemas.senior import (
    SeniorInsightCard,
    SeniorRecommendedExercise,
    SeniorSafetyState,
    SeniorSummaryDimension,
    SeniorRecommendation,
)


def recommend_exercise(
    *,
    text: str,
    recommendation: SeniorRecommendation,
    safety: SeniorSafetyState,
) -> SeniorRecommendedExercise:
    combined = f"{text} {recommendation.title} {recommendation.reason}"
    if safety.level in {"urgent", "medical_emergency"}:
        return SeniorRecommendedExercise(
            id="grounding_1min",
            title="1 分钟安心定位",
            reason="先让自己回到安全位置，再联系身边可信任的人。",
            duration_label="1 分钟",
            steps=["说出眼前 3 样东西", "摸到 2 个安全触感", "听见 1 个声音后联系可信任的人"],
            play_prompt="像在房间里找三个安全锚点，一样一样找。",
            stop_rule="如果仍觉得不安全，请不要继续练习，先联系身边的人。",
        )
    if "眼" in combined or "屏幕" in combined:
        return SeniorRecommendedExercise(
            id="eye_rest_10min",
            title="眼睛休息 10 分钟",
            reason="您提到眼睛不舒服，先减少屏幕刺激更实际。",
            duration_label="10 分钟",
            steps=["把屏幕放远", "闭眼或看窗外远处", "十分钟后再决定要不要继续看屏幕"],
            play_prompt="找一个远处安静的点，只看它几秒钟，再闭眼休息。",
            stop_rule="如果眼痛、视力变化或胸闷持续，请告诉家人并咨询医生。",
        )
    if any(word in combined for word in ["睡", "累", "疲惫", "没精神", "乏"]):
        return SeniorRecommendedExercise(
            id="rest_15min",
            title="短休息 15 分钟",
            reason="睡眠和疲惫线索比较明显，先补一点精神。",
            duration_label="15 分钟",
            steps=["找一个安全位置坐下或躺下", "把屏幕放远，闭眼休息", "十五分钟后喝一口水"],
            play_prompt="这次的目标不是睡着，只是让身体少用一点力。",
            stop_rule="如果身体不适加重，请停止练习并联系身边的人。",
        )
    if any(word in combined for word in ["孤单", "孤独", "陪", "家人", "联系"]):
        return SeniorRecommendedExercise(
            id="connection_message",
            title="给家人发一句话",
            reason="今天更适合把陪伴变成一个具体联系。",
            duration_label="1 分钟",
            steps=["选一个可信任的人", "发一句简单的话", "等回复时先坐稳喝口水"],
            play_prompt="只完成一句话挑战，不解释很多。",
            stop_rule="如果一直联系不上且更难受，请打开帮助入口。",
        )
    if any(word in combined for word in ["担心", "焦虑", "挂念", "惦记", "压力"]):
        return SeniorRecommendedExercise(
            id="worry_note",
            title="把担心写成一句话",
            reason="把绕在脑子里的事写短一点，会更容易停下来。",
            duration_label="2 分钟",
            steps=["写下“我现在最担心的是……”", "只写一句，不写长篇", "写完问自己今天最小的一步是什么"],
            play_prompt="像把一团线只拉出一个线头，不需要全解开。",
            stop_rule="如果写完更难受，请先停下，找人陪一会儿。",
        )
    return SeniorRecommendedExercise(
        id="breathing_3min",
        title="3 分钟慢呼吸",
        reason="短一点、慢一点，适合今天先稳定当下。",
        duration_label="3 分钟",
        steps=["坐稳，双脚放在地上", "轻轻吸气，再慢慢呼气", "连续做 6 次，做完就停"],
        play_prompt="只找一口更轻的呼气，不追求标准。",
        stop_rule="如果头晕或胸口不舒服，请立刻停止。",
    )


def build_family_message(
    *,
    summary_title: str,
    plain_summary: str,
    recommendation: SeniorRecommendation,
    safety: SeniorSafetyState,
) -> str:
    if safety.level in {"urgent", "medical_emergency"}:
        return "我现在很不舒服，需要你马上陪我一下。如果情况危险，请帮我联系急救或专业帮助。"
    if safety.level == "elevated":
        return f"我今天有点撑不住，想让你陪我一会儿。可以先陪我做这一步：{recommendation.title}。"
    return f"我今天想先照顾一下自己：{summary_title}。可以的话，请陪我做这一步：{recommendation.title}。"


def build_insight_cards(
    *,
    summary_title: str,
    plain_summary: str,
    dimensions: dict[str, SeniorSummaryDimension],
    recommendation: SeniorRecommendation,
    safety: SeniorSafetyState,
    family_message: str,
    exercise: SeniorRecommendedExercise,
) -> list[SeniorInsightCard]:
    primary = next(
        (
            item
            for item in dimensions.values()
            if any(word in f"{item.status}{item.text}" for word in ["需要", "偏高", "陪伴", "不适", "低落", "补休"])
        ),
        next(iter(dimensions.values()), None),
    )
    tone = safety.level
    return [
        SeniorInsightCard(
            id="priority",
            eyebrow="先看这一点",
            title=summary_title,
            body=plain_summary,
            action=recommendation.title,
            tone=tone,
            icon="spark",
            bullets=[
                f"{primary.label}：{primary.status}" if primary else "先照顾今天最明显的地方",
                "今天只先做一件小事",
            ],
            speak_text=plain_summary,
        ),
        SeniorInsightCard(
            id="first_action",
            eyebrow="现在先做",
            title=recommendation.title,
            body=recommendation.reason,
            action=recommendation.title,
            tone=tone,
            icon="leaf" if safety.level not in {"urgent", "medical_emergency"} else "phone",
            bullets=[
                f"预计 {exercise.duration_label}",
                "做完这一步就可以停",
            ],
            speak_text=f"现在先做：{recommendation.title}。{recommendation.reason}",
        ),
        SeniorInsightCard(
            id="why",
            eyebrow="为什么这样建议",
            title=f"因为先照顾：{primary.label}" if primary else "因为今天先要减轻负担",
            body=(primary.text if primary else "这条建议不是要一次解决所有问题，而是先照顾今天最明显的不舒服。"),
            action=exercise.title,
            tone="watch" if safety.level == "normal" else tone,
            icon="shield",
            bullets=[
                item for item in [
                    f"{value.label}：{value.status}" for value in list(dimensions.values())[:3]
                ] if item
            ],
            speak_text=(primary.text if primary else recommendation.reason),
        ),
        SeniorInsightCard(
            id="safety",
            eyebrow="如果等下更不舒服",
            title=safety.title,
            body=safety.message,
            action="打开帮助" if safety.should_contact_family else exercise.title,
            tone=tone,
            icon="warning" if safety.level in {"urgent", "medical_emergency"} else "heart",
            bullets=safety.steps[:3],
            speak_text=f"{safety.title}。{safety.message}",
        ),
        SeniorInsightCard(
            id="family",
            eyebrow="可以给家人看的话",
            title="不用解释很多，直接发这一段",
            body=family_message,
            action="复制给家人",
            tone="watch" if safety.level == "normal" else tone,
            icon="user",
            bullets=["不写完整聊天内容", "只说今天希望家人怎么陪"],
            speak_text="这里有一段可以给家人看的话。只说今天希望家人怎么陪您。",
        ),
    ]
