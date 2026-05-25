import json
import re
from typing import Any, Literal

from app.services.llm import CounselorService

Question = dict[str, Any]
Phase = Literal["pre", "post_day"]


CATEGORY_BANK: dict[str, dict[str, Any]] = {
    "stress": {
        "label": "压力",
        "pre": [
            ("最近一周，你感到压力压在身上的频率？", ["几乎没有", "偶尔", "经常", "几乎每天"]),
            ("压力来时，你最常见的身体信号是？", ["肩颈紧", "呼吸浅", "胃不舒服", "暂时不明显"]),
            ("这门课你最想改善哪一点？", ["更快平静下来", "少反复担心", "睡前放松", "提高掌控感"]),
        ],
        "post": [
            ("今天这个练习后，你的紧绷感有什么变化？", ["更放松", "稍微好一点", "没太变化", "更紧张"]),
            ("你觉得今天的方法难度如何？", ["很容易", "能完成", "有点难", "不适合我"]),
            ("生活里哪个场景最适合用今天的方法？", ["学习/工作前", "睡前", "情绪上来时", "暂时想不到"]),
        ],
    },
    "sleep": {
        "label": "睡眠",
        "pre": [
            ("最近一周，你入睡通常需要多久？", ["30分钟内", "30-60分钟", "1小时以上", "不固定"]),
            ("你最想先改善哪类睡眠困扰？", ["入睡慢", "半夜醒", "早醒", "睡醒仍累"]),
            ("睡前最容易影响你的因素是？", ["手机/屏幕", "担心事情", "作息不固定", "身体不舒服"]),
        ],
        "post": [
            ("今天内容让你最想调整的睡前习惯是？", ["少看屏幕", "固定上床时间", "放松身体", "记录担心"]),
            ("今晚你愿意尝试一个多小的改变？", ["5分钟", "10分钟", "15分钟", "今天先观察"]),
            ("学完这一章后，你对改善睡眠的把握感？", ["更有把握", "有一点", "还不确定", "觉得困难"]),
        ],
    },
    "focus": {
        "label": "专注",
        "pre": [
            ("最近做事时，你最常被什么打断？", ["手机消息", "脑子走神", "环境声音", "情绪压力"]),
            ("你一次能稳定专注多久？", ["5分钟内", "5-15分钟", "15-30分钟", "30分钟以上"]),
            ("你希望这门课帮你做到什么？", ["开始更容易", "减少分心", "做完任务", "恢复学习节奏"]),
        ],
        "post": [
            ("今天的方法对你减少分心有帮助吗？", ["很有帮助", "有一点", "不明显", "还没试出来"]),
            ("下一次练习，你想放在哪个任务前？", ["学习", "工作", "整理", "运动/阅读"]),
            ("今天最需要保留的一步是？", ["先定目标", "计时开始", "减少干扰", "做完复盘"]),
        ],
    },
    "emotion": {
        "label": "情绪",
        "pre": [
            ("最近一周，情绪起伏对你的影响有多大？", ["很小", "有一点", "比较明显", "很影响"]),
            ("情绪上来时，你最常见的反应是？", ["憋着", "发火", "想逃开", "反复想"]),
            ("你最想练习的能力是？", ["识别情绪", "稳定下来", "好好表达", "减少自责"]),
        ],
        "post": [
            ("今天内容让你更看清了哪一点？", ["情绪名字", "触发原因", "身体反应", "表达方式"]),
            ("今天的方法下次能用上的可能性？", ["很可能", "可以试试", "不确定", "不太适合"]),
            ("情绪再来时，你愿意先做哪一步？", ["停一下", "说出情绪", "写下来", "找人说"]),
        ],
    },
}


def _category(program: dict[str, Any]) -> str:
    raw = str(program.get("category") or program.get("id") or "").lower()
    for key in CATEGORY_BANK:
        if key in raw:
            return key
    return "stress"


def _question(qid: str, text: str, options: list[str]) -> Question:
    return {
        "id": qid,
        "text": text,
        "options": [{"label": option, "value": index} for index, option in enumerate(options)],
    }


def build_pre_assessment_questions(program: dict[str, Any]) -> list[Question]:
    category = _category(program)
    return [_question(f"pre_{category}_{idx + 1}", text, options) for idx, (text, options) in enumerate(CATEGORY_BANK[category]["pre"])]


def build_day_assessment_questions(program: dict[str, Any], day: dict[str, Any]) -> list[Question]:
    category = _category(program)
    base = CATEGORY_BANK[category]["post"]
    title = str(day.get("title") or "今天这章")
    questions = [
        (f"学完“{title}”后，你觉得最有用的一点是？", ["一个具体方法", "一个新的理解", "一次身体体验", "还不明显"]),
        base[0],
        base[2],
    ]
    # 保证最后一题有“生活里”，用于课程迁移。
    return [_question(f"day_{category}_{day.get('day_number', 0)}_{idx + 1}", text, options) for idx, (text, options) in enumerate(questions)]


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


def build_fallback_feedback(
    phase: Phase,
    program: dict[str, Any],
    day: dict[str, Any] | None,
    responses: list[dict[str, Any]],
) -> dict[str, Any]:
    category = _category(program)
    label = CATEGORY_BANK[category]["label"]
    selected = "；".join(str(item.get("answer_text") or "") for item in responses if item.get("answer_text"))
    if phase == "pre":
        return {
            "title": f"先从一个小目标开始",
            "summary": f"你这次的回答说明，{label}方面可以先从最容易执行的一步开始，不需要一上来追求全部改变。",
            "next_step": "接下来学习第一章时，只抓住一个能马上试的小动作，做完再看感受。",
            "tone": "steady",
            "tags": [label, "课前基线", "小步骤"],
        }
    day_title = str((day or {}).get("title") or "今天这章")
    return {
        "title": "这一章已经形成一次反馈",
        "summary": f"围绕“{day_title}”，你已经完成了学习后的自我检查。{selected[:40] or '今天先保留一个最容易做到的小步骤。'}",
        "next_step": "今天不用加量。下一次遇到相似场景时，先试一次今天选中的方法，再回来继续下一章。",
        "tone": "encouraging",
        "tags": [label, "章节后测", "迁移练习"],
    }


def _build_prompt(phase: Phase, program: dict[str, Any], day: dict[str, Any] | None, responses: list[dict[str, Any]]) -> str:
    response_lines = "\n".join(
        f"- {item.get('question_text')}: {item.get('answer_text')}"
        for item in responses
    )
    return f"""
这是 NeuraSense 标准版课程系统的{ "课前测评" if phase == "pre" else "章节后测" }。
请根据课程、章节和用户选择，输出给用户看的简短反馈。
必须输出严格 JSON，不要 Markdown。不要诊断，不要写“模型/算法/项目”。

课程：{program.get("title")}
课程类型：{program.get("category")}
章节：{(day or {}).get("day_number", "")} {(day or {}).get("title", "")}
用户回答：
{response_lines}

输出：
{{
  "title": "不超过16字",
  "summary": "60-100字，具体说明用户当前适合怎么学",
  "next_step": "一个下一步动作，必须和课程相关",
  "tone": "steady/encouraging/supportive",
  "tags": ["短标签1","短标签2","短标签3"]
}}
""".strip()


async def generate_program_assessment_feedback(
    phase: Phase,
    program: dict[str, Any],
    day: dict[str, Any] | None,
    responses: list[dict[str, Any]],
) -> dict[str, Any]:
    fallback = build_fallback_feedback(phase, program, day, responses)
    try:
        counselor = CounselorService()
        result = await counselor.generate_response(
            user_message=_build_prompt(phase, program, day, responses),
            user_id="program_assessment",
            conversation_history=[],
            emotion_context={"skip_project_context": True, "skip_memory": True},
        )
        data = _extract_json(result.message)
        if not data:
            return fallback
        return {
            "title": str(data.get("title") or fallback["title"])[:24],
            "summary": str(data.get("summary") or fallback["summary"]),
            "next_step": str(data.get("next_step") or fallback["next_step"]),
            "tone": data.get("tone") if data.get("tone") in {"steady", "encouraging", "supportive"} else fallback["tone"],
            "tags": [str(item) for item in (data.get("tags") or fallback["tags"])][:4],
        }
    except Exception as exc:
        print(f"[program-assessment] AI feedback fallback: {exc}")
        return fallback
