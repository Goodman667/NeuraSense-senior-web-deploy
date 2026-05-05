"""
Programs Router — 课程/项目系统 API

GET    /programs                       -> 项目列表
GET    /programs/{id}                  -> 项目详情 (含每日内容 + 用户进度)
POST   /programs/{id}/start            -> 开始项目
POST   /programs/{id}/days/{day}/complete -> 完成某天 (含复盘答案)
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.auth import auth_service
from app.services.database.supabase_client import get_supabase_client, is_supabase_available
from app.api.notifications_router import push_notification

router = APIRouter(prefix="/programs", tags=["programs"])

# ---- Fallback 本地存储 ----
DATA_DIR = Path("./data")
PROGRAMS_FILE = DATA_DIR / "programs.json"
PROGRAM_DAYS_FILE = DATA_DIR / "program_days.json"
PROGRAM_PROGRESS_FILE = DATA_DIR / "program_progress.json"


def _ensure_data():
    DATA_DIR.mkdir(exist_ok=True)
    if not PROGRAMS_FILE.exists():
        PROGRAMS_FILE.write_text(json.dumps(SEED_PROGRAMS, ensure_ascii=False, indent=2), encoding="utf-8")
    # Always regenerate from JSON seed file to ensure all program days exist
    if PROGRAM_DAYS_FILE.exists():
        existing = json.loads(PROGRAM_DAYS_FILE.read_text(encoding="utf-8"))
        existing_keys = {(d["program_id"], d["day_number"]) for d in existing}
        added = 0
        for sd in SEED_DAYS:
            if (sd["program_id"], sd["day_number"]) not in existing_keys:
                existing.append(sd)
                added += 1
        if added:
            PROGRAM_DAYS_FILE.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")
    else:
        PROGRAM_DAYS_FILE.write_text(json.dumps(SEED_DAYS, ensure_ascii=False, indent=2), encoding="utf-8")
    if not PROGRAM_PROGRESS_FILE.exists():
        PROGRAM_PROGRESS_FILE.write_text("[]", encoding="utf-8")


def _read_json(path: Path) -> list:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, data: list):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


# ---- Pydantic 模型 ----
class CompleteDayRequest(BaseModel):
    review_answer: Optional[str] = None
    tool_completed: bool = False


# ---- 种子数据 ----
SEED_PROGRAMS = [
    {"id": "stress-7", "title": "7 天减压训练营", "subtitle": "每天 10 分钟，科学管理压力",
     "description": "基于循证心理学的 7 天压力管理课程。融合呼吸训练、正念冥想、认知行为疗法，帮助你建立一套可持续的压力应对系统。每天只需 10 分钟，从身体放松到认知重构，循序渐进地掌握减压技能。",
     "icon": "🌿", "gradient": "from-emerald-400 to-teal-500", "duration_days": 7, "daily_minutes": 10,
     "category": "stress", "tags": ["减压", "呼吸", "正念", "CBT"], "is_active": True, "sort_order": 1},
    {"id": "sleep-7", "title": "7 天睡眠改善计划", "subtitle": "CBT-I 精简版，重建健康睡眠",
     "description": "基于失眠认知行为疗法（CBT-I）的 7 天睡眠改善课程。通过睡眠卫生教育、放松训练、认知重构，帮助你告别失眠，建立规律的睡眠节律。",
     "icon": "🌙", "gradient": "from-indigo-400 to-violet-500", "duration_days": 7, "daily_minutes": 10,
     "category": "sleep", "tags": ["睡眠", "助眠", "放松"], "is_active": True, "sort_order": 2},
    {"id": "focus-7", "title": "7 天专注力提升", "subtitle": "训练注意力，提高效率",
     "description": "结合正念注意力训练和番茄工作法的 7 天专注力课程。通过渐进式注意力练习，帮助你减少分心，提升深度工作能力。",
     "icon": "🎯", "gradient": "from-amber-400 to-orange-500", "duration_days": 7, "daily_minutes": 15,
     "category": "focus", "tags": ["专注", "效率", "正念"], "is_active": True, "sort_order": 3},
    {"id": "emotion-7", "title": "7 天情绪管理", "subtitle": "DBT + 积极心理学实践",
     "description": "融合辩证行为疗法（DBT）和积极心理学的情绪管理课程。学习识别情绪、调节情绪、表达情绪的技能。",
     "icon": "💛", "gradient": "from-rose-400 to-pink-500", "duration_days": 7, "daily_minutes": 10,
     "category": "emotion", "tags": ["情绪", "DBT", "积极心理"], "is_active": True, "sort_order": 4},
]

SEED_DAYS = [
    {"program_id": "stress-7", "day_number": 1, "title": "认识压力 — 身体信号觉察",
     "learn_text": "压力并不总是坏事。适度的压力（良性压力 eustress）能激发潜能，但长期的慢性压力会损害身心健康。\n\n今天的目标是觉察压力在你身体上的表现：肩膀紧绷？胃部不适？呼吸变浅？\n\n了解自己的压力信号是管理压力的第一步。",
     "tool_id": "mindfulness_body_scan", "video_url": "https://www.bilibili.com/video/BV1NM4y1d7aC/", "video_title": "正念入门 — 身体扫描冥想引导",
     "review_question": "完成身体扫描后，你注意到身体哪个部位最紧张？", "tip": "不需要改变什么，只是观察和感受。"},
    {"program_id": "stress-7", "day_number": 2, "title": "呼吸即药 — 激活副交感神经",
     "learn_text": "当我们感到压力时，交感神经系统会被激活（战斗或逃跑反应），心率加快，呼吸变浅。\n\n好消息是，我们可以通过刻意控制呼吸来「反向操作」——延长呼气时间能激活副交感神经（休息与消化系统），快速降低生理唤醒水平。\n\n4-7-8 呼吸法正是基于这个原理。",
     "tool_id": "breathing_478", "video_url": "https://www.bilibili.com/video/BV1xQW1zUETr/", "video_title": "4-7-8 呼吸法口令引导",
     "review_question": "练习 4-7-8 呼吸后，你的身体感受有什么变化？", "tip": "每天练习 2-3 次，效果会随时间累积。"},
    {"program_id": "stress-7", "day_number": 3, "title": "箱式呼吸 — 任何场景都能用的减压工具",
     "learn_text": "箱式呼吸（Box Breathing）最初由美国海豹突击队使用，用于在高压环境下快速恢复冷静。\n\n它的原理简单：吸气、屏息、呼气、屏息各 4 秒，形成一个「正方形」节奏。这种规律的呼吸模式能快速稳定心率变异性（HRV）。",
     "tool_id": "breathing_box", "video_url": "https://www.bilibili.com/video/BV1Rw4m1e7jD/", "video_title": "呼吸减压 — 箱式呼吸练习",
     "review_question": "你打算在什么日常场景中使用箱式呼吸？", "tip": "想象一个正方形，沿着四条边呼吸。"},
    {"program_id": "stress-7", "day_number": 4, "title": "认知重构 — 改变想法就能改变感受",
     "learn_text": "CBT（认知行为疗法）的核心观点：不是事件本身让我们痛苦，而是我们对事件的「解读」导致了痛苦。\n\n今天我们学习用「自动化思维记录」来捕捉那些自动冒出来的消极想法，然后像侦探一样审视它们：有证据支持吗？有没有更平衡的看法？",
     "tool_id": "cbt_thought_record", "video_url": "https://www.bilibili.com/video/av253501476/", "video_title": "Headspace 冥想正念指南 — 认知觉察",
     "review_question": "你捕捉到了什么自动化消极想法？重新审视后有什么新的看法？", "tip": "消极想法不是事实，只是想法。"},
    {"program_id": "stress-7", "day_number": 5, "title": "肌肉放松 — 身体放松了，心也会跟着放松",
     "learn_text": "渐进式肌肉放松（PMR）由 Edmund Jacobson 在 1930 年代发明。原理是：当你故意紧张一组肌肉再释放，大脑会更清晰地感受到「放松」的状态。\n\n研究表明，PMR 能有效降低皮质醇水平、改善睡眠质量、减轻焦虑症状。",
     "tool_id": "sleep_pmr", "video_url": "https://www.bilibili.com/video/BV1qh411y7Bc/", "video_title": "渐进式肌肉放松练习 — 深度放松引导",
     "review_question": "做完渐进式肌肉放松后，1-10 分你给自己的放松程度打几分？", "tip": "睡前做效果特别好。"},
    {"program_id": "stress-7", "day_number": 6, "title": "担忧管理 — 给担忧一个固定的「约会时间」",
     "learn_text": "你是否发现自己总是在各种时候被担忧打扰？「担忧时间」是一种悖论式的干预技术：与其试图压制担忧（反而会适得其反），不如给它一个固定的时间段。\n\n规则：白天任何时候冒出担忧，告诉自己「我一会儿在担忧时间处理」。",
     "tool_id": "cbt_worry_time", "video_url": "https://www.bilibili.com/video/BV1n58AzvEH6/", "video_title": "正念冥想 — 快速平复心绪",
     "review_question": "你的担忧中，有多少是你能控制的？有多少需要放手？", "tip": "大部分担忧的事情永远不会发生。"},
    {"program_id": "stress-7", "day_number": 7, "title": "回顾与展望 — 你已经拥有了一套减压工具箱",
     "learn_text": "恭喜你完成了 7 天减压训练营！让我们回顾这周学到的工具：\n\n- Day 1: 身体扫描 — 觉察压力信号\n- Day 2: 4-7-8 呼吸 — 激活副交感神经\n- Day 3: 箱式呼吸 — 随时随地可用\n- Day 4: 思维记录 — 认知重构\n- Day 5: 肌肉放松 — 身体层面释放\n- Day 6: 担忧时间 — 管理反刍思维\n\n今天的练习是「三件好事」——减压不仅是消除负面，更是增加正面体验。",
     "tool_id": "cbt_three_good", "video_url": "https://www.bilibili.com/video/BV1eHGyzFE57/", "video_title": "温度觉知正念冥想 — 疗愈自己",
     "review_question": "这 7 天里，哪个工具对你帮助最大？你打算如何在日常中继续使用它？", "tip": "结束不是终点，而是新习惯的开始。"},
]


# ================ 路由 ================

@router.get("")
async def list_programs():
    """获取项目列表"""
    if is_supabase_available():
        sb = get_supabase_client()
        result = sb.table("programs").select("*").eq("is_active", True).order("sort_order").execute()
        programs = result.data or []
    else:
        _ensure_data()
        programs = _read_json(PROGRAMS_FILE)

    return {"success": True, "programs": programs}


@router.get("/{program_id}")
async def get_program(program_id: str, token: Optional[str] = None):
    """获取项目详情，含每日内容和用户进度"""
    program = None
    days = []

    if is_supabase_available():
        sb = get_supabase_client()
        p_res = sb.table("programs").select("*").eq("id", program_id).execute()
        if p_res.data:
            program = p_res.data[0]
        d_res = sb.table("program_days").select("*").eq("program_id", program_id).order("day_number").execute()
        days = d_res.data or []
    else:
        _ensure_data()
        programs = _read_json(PROGRAMS_FILE)
        program = next((p for p in programs if p["id"] == program_id), None)
        all_days = _read_json(PROGRAM_DAYS_FILE)
        days = sorted(
            [d for d in all_days if d["program_id"] == program_id],
            key=lambda d: d["day_number"],
        )

    if not program:
        raise HTTPException(status_code=404, detail="项目不存在")

    # 用户进度
    progress = None
    if token:
        user = auth_service.validate_token(token)
        if user:
            user_id = user["id"]
            if is_supabase_available():
                sb = get_supabase_client()
                pr_res = (
                    sb.table("program_progress")
                    .select("*")
                    .eq("user_id", user_id)
                    .eq("program_id", program_id)
                    .execute()
                )
                if pr_res.data:
                    progress = pr_res.data[0]
            else:
                all_progress = _read_json(PROGRAM_PROGRESS_FILE)
                progress = next(
                    (p for p in all_progress if p["user_id"] == user_id and p["program_id"] == program_id),
                    None,
                )

    return {"success": True, "program": program, "days": days, "progress": progress}


@router.post("/{program_id}/start")
async def start_program(program_id: str, token: str):
    """开始项目"""
    user = auth_service.validate_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")

    user_id = user["id"]

    # 检查项目是否存在
    if is_supabase_available():
        sb = get_supabase_client()
        p_res = sb.table("programs").select("id").eq("id", program_id).execute()
        if not p_res.data:
            raise HTTPException(status_code=404, detail="项目不存在")

        # 检查是否已开始
        existing = (
            sb.table("program_progress")
            .select("id")
            .eq("user_id", user_id)
            .eq("program_id", program_id)
            .execute()
        )
        if existing.data:
            return {"success": True, "message": "已在进行中", "progress": existing.data[0]}

        record = {
            "id": str(uuid4()),
            "user_id": user_id,
            "program_id": program_id,
            "current_day": 1,
            "completed_days": [],
            "review_answers": {},
            "started_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
        sb.table("program_progress").insert(record).execute()
    else:
        _ensure_data()
        programs = _read_json(PROGRAMS_FILE)
        if not any(p["id"] == program_id for p in programs):
            raise HTTPException(status_code=404, detail="项目不存在")

        all_progress = _read_json(PROGRAM_PROGRESS_FILE)
        existing = next(
            (p for p in all_progress if p["user_id"] == user_id and p["program_id"] == program_id),
            None,
        )
        if existing:
            return {"success": True, "message": "已在进行中", "progress": existing}

        record = {
            "id": str(uuid4()),
            "user_id": user_id,
            "program_id": program_id,
            "current_day": 1,
            "completed_days": [],
            "review_answers": {},
            "started_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
        all_progress.append(record)
        _write_json(PROGRAM_PROGRESS_FILE, all_progress)

    return {"success": True, "progress": record}


@router.post("/{program_id}/days/{day}/complete")
async def complete_day(program_id: str, day: int, body: CompleteDayRequest, token: str):
    """完成某天的课程"""
    user = auth_service.validate_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")

    user_id = user["id"]

    if is_supabase_available():
        sb = get_supabase_client()
        # 获取进度
        pr_res = (
            sb.table("program_progress")
            .select("*")
            .eq("user_id", user_id)
            .eq("program_id", program_id)
            .execute()
        )
        if not pr_res.data:
            raise HTTPException(status_code=400, detail="请先开始项目")

        progress = pr_res.data[0]
        completed_days = progress.get("completed_days", [])
        review_answers = progress.get("review_answers", {})

        if day not in completed_days:
            completed_days.append(day)
        if body.review_answer:
            review_answers[str(day)] = body.review_answer

        # 计算下一天
        p_res = sb.table("programs").select("duration_days").eq("id", program_id).execute()
        max_days = p_res.data[0]["duration_days"] if p_res.data else 7
        next_day = min(day + 1, max_days)

        sb.table("program_progress").update({
            "completed_days": completed_days,
            "review_answers": review_answers,
            "current_day": max(progress.get("current_day", 1), next_day),
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("user_id", user_id).eq("program_id", program_id).execute()

        progress["completed_days"] = completed_days
        progress["review_answers"] = review_answers
        progress["current_day"] = max(progress.get("current_day", 1), next_day)
    else:
        _ensure_data()
        all_progress = _read_json(PROGRAM_PROGRESS_FILE)
        progress = next(
            (p for p in all_progress if p["user_id"] == user_id and p["program_id"] == program_id),
            None,
        )
        if not progress:
            raise HTTPException(status_code=400, detail="请先开始项目")

        if day not in progress["completed_days"]:
            progress["completed_days"].append(day)
        if body.review_answer:
            progress["review_answers"][str(day)] = body.review_answer

        programs = _read_json(PROGRAMS_FILE)
        p = next((p for p in programs if p["id"] == program_id), None)
        max_days = p["duration_days"] if p else 7
        progress["current_day"] = max(progress["current_day"], min(day + 1, max_days))
        progress["updated_at"] = datetime.utcnow().isoformat()

        _write_json(PROGRAM_PROGRESS_FILE, all_progress)

    # 发送通知
    try:
        # 获取课程标题
        prog_title = program_id
        if is_supabase_available():
            sb = get_supabase_client()
            p_res = sb.table("programs").select("title,duration_days").eq("id", program_id).execute()
            if p_res.data:
                prog_title = p_res.data[0]["title"]
                max_days = p_res.data[0]["duration_days"]
        else:
            _ensure_data()
            programs = _read_json(PROGRAMS_FILE)
            p = next((p for p in programs if p["id"] == program_id), None)
            if p:
                prog_title = p["title"]
                max_days = p["duration_days"]
            else:
                max_days = 7

        completed_days = progress.get("completed_days", [])
        if len(completed_days) >= max_days:
            # 课程全部完成
            push_notification(
                user_id=user_id,
                type="achievement",
                title=f"课程完成: {prog_title}",
                content=f"恭喜你完成了「{prog_title}」全部 {max_days} 天的学习！",
                meta={"program_id": program_id, "completed": True},
            )
        else:
            push_notification(
                user_id=user_id,
                type="program",
                title=f"Day {day} 完成: {prog_title}",
                content=f"「{prog_title}」第 {day} 天学习完成，继续加油！",
                meta={"program_id": program_id, "day": day},
            )
    except Exception:
        pass  # 通知写入失败不影响主流程

    return {"success": True, "progress": progress}
