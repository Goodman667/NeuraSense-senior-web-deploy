"""
Checkin Router — 每日签到 API

POST   /checkins          -> 提交签到
GET    /checkins           -> 查询历史 (range=7d|30d)
GET    /recommendations/today -> 今日推荐
"""

import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.auth import auth_service
from app.services.recommendation import (
    build_context,
    evaluate_rules,
    log_recommendation,
    update_recommendation_status,
)
from app.services.database.supabase_client import get_supabase_client, is_supabase_available

router = APIRouter(tags=["checkins"])

# ---- Fallback 本地存储 ----
DATA_DIR = Path("./data")
CHECKINS_FILE = DATA_DIR / "daily_checkins.json"


def _ensure_data():
    DATA_DIR.mkdir(exist_ok=True)
    if not CHECKINS_FILE.exists():
        CHECKINS_FILE.write_text("[]", encoding="utf-8")


def _read_json(path: Path) -> list:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, data: list):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


# ---- Pydantic 模型 ----
class CheckinRequest(BaseModel):
    mood: int = Field(ge=0, le=10)
    stress: int = Field(ge=0, le=10)
    energy: int = Field(ge=0, le=10)
    sleep_quality: int = Field(ge=0, le=10)
    note: Optional[str] = None


# ---- 鼓励文案池 ----
DAILY_QUOTES = [
    "每一天都是新的开始，你已经迈出了最重要的一步。",
    "觉察是改变的起点。记录今天的状态，就是在照顾自己。",
    "不需要完美，只需要真实。",
    "你比你想象的更有力量。",
    "深呼吸。你正在这里，这就够了。",
    "小小的进步也是进步。为自己感到骄傲吧。",
    "照顾好自己，才能更好地面对世界。",
    "今天的你，值得被温柔以待。",
    "每一次练习，都在为内心积攒力量。",
    "坚持记录第 {streak} 天，你做得很棒。",
    "关注当下的感受，你已经在成长了。",
    "即使是阴天，太阳依然在云层之上。",
    "给自己一点时间，一切都会好起来。",
    "你的感受很重要，谢谢你愿意分享。",
]


# ================ 路由 ================

@router.post("/checkins")
async def create_checkin(body: CheckinRequest, token: str):
    """提交每日签到"""
    user = auth_service.validate_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")

    record = {
        "id": str(uuid4()),
        "user_id": user["id"],
        "mood": body.mood,
        "stress": body.stress,
        "energy": body.energy,
        "sleep_quality": body.sleep_quality,
        "note": body.note,
        "created_at": datetime.utcnow().isoformat(),
    }

    if is_supabase_available():
        sb = get_supabase_client()
        sb.table("daily_checkins").insert(record).execute()
    else:
        _ensure_data()
        checkins = _read_json(CHECKINS_FILE)
        checkins.append(record)
        _write_json(CHECKINS_FILE, checkins)

    return {"success": True, "record": record}


@router.get("/checkins")
async def get_checkins(
    token: str,
    range: Optional[str] = Query("7d", description="7d | 30d | all"),
):
    """查询签到历史"""
    user = auth_service.validate_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")

    user_id = user["id"]

    # 时间范围
    now = datetime.utcnow()
    if range == "30d":
        since = now - timedelta(days=30)
    elif range == "all":
        since = datetime(2000, 1, 1)
    else:
        since = now - timedelta(days=7)

    if is_supabase_available():
        sb = get_supabase_client()
        result = (
            sb.table("daily_checkins")
            .select("*")
            .eq("user_id", user_id)
            .gte("created_at", since.isoformat())
            .order("created_at", desc=True)
            .execute()
        )
        checkins = result.data or []
    else:
        _ensure_data()
        all_checkins = _read_json(CHECKINS_FILE)
        checkins = [
            c for c in all_checkins
            if c["user_id"] == user_id and c["created_at"] >= since.isoformat()
        ]
        checkins.sort(key=lambda c: c["created_at"], reverse=True)

    return {"success": True, "checkins": checkins}


@router.get("/recommendations/today")
async def get_today_recommendations(token: str):
    """
    今日推荐（JITAI v2 决策引擎）

    基于: 今日签到 + 近7天趋势 + 工具完成记录 + 时间上下文
    返回: 1~2个工具推荐 + 1个小任务 + 理由
    """
    user = auth_service.validate_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")

    user_id = user["id"]
    latest = None

    # 获取今天最近一次签到
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    if is_supabase_available():
        sb = get_supabase_client()
        result = (
            sb.table("daily_checkins")
            .select("*")
            .eq("user_id", user_id)
            .gte("created_at", today_start.isoformat())
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if result.data:
            latest = result.data[0]
    else:
        _ensure_data()
        all_checkins = _read_json(CHECKINS_FILE)
        today_checkins = [
            c for c in all_checkins
            if c["user_id"] == user_id and c["created_at"] >= today_start.isoformat()
        ]
        today_checkins.sort(key=lambda c: c["created_at"], reverse=True)
        if today_checkins:
            latest = today_checkins[0]

    # 构建个性化变量上下文
    ctx = build_context(checkin=latest, user_id=user_id)

    # 运行 JITAI v2 规则引擎
    result = evaluate_rules(ctx, max_tools=2)

    # 记录推荐日志（近端结果追踪）
    rec_ids = log_recommendation(user_id, result)

    return {
        "success": True,
        "has_checkin": latest is not None,
        "checkin": latest,
        "recommendations": result["tools"],
        "task": result.get("task"),
        "matched_rules": result.get("matched_rules", []),
        "recommendation_ids": rec_ids,
    }


# ---- 近端结果上报 ----

class OutcomeRequest(BaseModel):
    recommendation_id: str
    status: str  # opened / completed / dismissed
    duration_sec: Optional[int] = None
    post_mood: Optional[int] = None
    helpfulness: Optional[int] = None


@router.post("/recommendations/outcome")
async def report_recommendation_outcome(body: OutcomeRequest, token: str):
    """上报推荐近端结果（用户点开/完成/忽略）"""
    user = auth_service.validate_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")

    if body.status not in ("opened", "completed", "dismissed", "abandoned"):
        raise HTTPException(status_code=400, detail="status 必须是 opened/completed/dismissed/abandoned")

    extra = {}
    if body.duration_sec is not None:
        extra["duration_sec"] = body.duration_sec
    if body.post_mood is not None:
        extra["post_mood"] = body.post_mood
    if body.helpfulness is not None:
        extra["helpfulness"] = body.helpfulness

    update_recommendation_status(body.recommendation_id, body.status, user["id"], extra or None)

    return {"success": True, "message": f"已记录: {body.status}"}
