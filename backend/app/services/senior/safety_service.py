import re
from dataclasses import dataclass

from app.schemas.senior import SeniorSafetyState


@dataclass
class SeniorSafetyDetection:
    level: str
    reasons: list[str]
    state: SeniorSafetyState


MEDICAL_PATTERNS = [
    r"胸口?.{0,4}(痛|疼|闷)|胸闷|喘不上气|呼吸困难",
    r"摔倒|跌倒|晕倒|昏迷|意识不清|说话不清",
    r"突然.*(麻|无力)|半边.*(麻|无力)",
    r"吃多了药|药吃多了|过量服药|多吃了.*药",
    r"(吃|吞|喝).*很多.*药|想.*(吃|吞|喝).*药",
]

URGENT_PATTERNS = [
    r"不想活|想死|自杀|自残|伤害自己|结束生命|跳楼|割腕",
    r"活着没意思|不如死了|死了算了",
    r"准备.*(死|自杀|跳楼|割腕)|已经.*(刀|绳|药)",
]

ELEVATED_PATTERNS = [
    r"撑不住|受不了|太痛苦|很绝望|没人管|没人理",
    r"活不下去|没有希望|不想见人|什么都没意义",
]

WATCH_PATTERNS = [
    r"睡不着|失眠|半夜醒|早醒",
    r"孤单|孤独|一个人|没人陪",
    r"担心|焦虑|烦|害怕|压力|累|没精神|难过|低落",
    r"眼睛.*(痛|疼|酸|胀)|头痛|头疼|胃痛|腰痛|不舒服",
]


def _matches(text: str, patterns: list[str]) -> list[str]:
    return [pattern for pattern in patterns if re.search(pattern, text)]


def detect_senior_safety(text: str) -> SeniorSafetyDetection:
    normalized = text or ""
    if _matches(normalized, MEDICAL_PATTERNS):
        return SeniorSafetyDetection(
            level="medical_emergency",
            reasons=["出现需要优先排查的身体急症线索"],
            state=SeniorSafetyState(
                level="medical_emergency",
                title="先处理身体安全",
                message="您刚才提到的身体不舒服需要优先处理。请先停止继续使用页面，联系身边可信任的人，必要时拨打当地急救电话。",
                steps=["坐稳或躺在安全位置", "马上告诉身边可信任的人", "如果胸痛、呼吸困难、摔倒或意识异常，请联系急救"],
                should_contact_family=True,
                emergency_note="身体急症不能靠线上建议判断，请优先找真人和医疗帮助。",
            ),
        )

    if _matches(normalized, URGENT_PATTERNS):
        return SeniorSafetyDetection(
            level="urgent",
            reasons=["出现明确自伤或生命安全表达"],
            state=SeniorSafetyState(
                level="urgent",
                title="现在先不要一个人待着",
                message="我很担心您现在的安全。请先把手机放在手边，马上联系一个可信任的人，让对方陪着您。",
                steps=["离开可能伤害自己的东西", "给家人、朋友或邻居打电话", "如果马上有危险，请联系当地急救或心理援助"],
                should_contact_family=True,
                emergency_note="现在最重要的是让现实中的人知道您需要帮助。",
            ),
        )

    if _matches(normalized, ELEVATED_PATTERNS):
        return SeniorSafetyDetection(
            level="elevated",
            reasons=["表达了较强痛苦或无助感"],
            state=SeniorSafetyState(
                level="elevated",
                title="今天不要一个人扛",
                message="这份难受已经比较重了。今天先不急着解决问题，请让一个可信任的人知道您需要陪一会儿。",
                steps=["先坐稳，喝一口水", "给可信任的人发一句话", "如果更难受，请打开帮助入口"],
                should_contact_family=True,
            ),
        )

    if _matches(normalized, WATCH_PATTERNS):
        return SeniorSafetyDetection(
            level="watch",
            reasons=["出现睡眠、孤独、担心、疲惫或身体不适线索"],
            state=SeniorSafetyState(
                level="watch",
                title="今天先放慢一点",
                message="今天有一些需要照顾的线索。先做一件小事，如果加重，再联系家人或专业帮助。",
                steps=["先做一个短休息或慢呼吸", "把最不舒服的一点告诉家人", "如果身体症状持续或加重，请咨询医生"],
                should_contact_family=False,
            ),
        )

    return SeniorSafetyDetection(
        level="normal",
        reasons=[],
        state=SeniorSafetyState(
            level="normal",
            title="今天保持轻一点",
            message="现在没有看到需要马上求助的线索。今天先按自己的节奏来，只做一件容易完成的小事。",
            steps=["保持喝水和休息", "做一个短放松", "如果状态变差，再联系可信任的人"],
            should_contact_family=False,
        ),
    )
