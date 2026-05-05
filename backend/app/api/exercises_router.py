"""
Exercises Router — 结构化练习 API

POST   /exercises/records              -> 保存练习记录
GET    /exercises/records              -> 用户练习历史（可按 exercise_type 筛选）
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

router = APIRouter(prefix="/exercises", tags=["exercises"])

# ---- Fallback 本地存储 ----
DATA_DIR = Path("./data")
EXERCISES_FILE = DATA_DIR / "exercise_records.json"


def _ensure_data():
    DATA_DIR.mkdir(exist_ok=True)
    if not EXERCISES_FILE.exists():
        EXERCISES_FILE.write_text("[]", encoding="utf-8")


def _read_json(path: Path) -> list:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, data: list):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


# ---- Pydantic 模型 ----
class ExerciseRecordRequest(BaseModel):
    exercise_type: str          # "THOUGHT_RECORD" | "BEHAVIOR_ACTIVATION"
    exercise_data: dict         # structured exercise content
    post_mood: Optional[int] = None  # 1-10
    trigger_source: str = "chat"
    session_id: Optional[str] = None


# ================ 路由 ================

@router.post("/records")
async def save_exercise_record(body: ExerciseRecordRequest, token: str):
    """保存练习记录"""
    user = auth_service.validate_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")

    now = datetime.utcnow().isoformat()
    record = {
        "id": str(uuid4()),
        "user_id": user["id"],
        "exercise_type": body.exercise_type,
        "status": "completed",
        "trigger_source": body.trigger_source,
        "session_id": body.session_id,
        "exercise_data": body.exercise_data,
        "post_mood": body.post_mood,
        "created_at": now,
        "completed_at": now,
    }

    if is_supabase_available():
        sb = get_supabase_client()
        sb.table("exercise_records").insert(record).execute()
    else:
        _ensure_data()
        records = _read_json(EXERCISES_FILE)
        records.append(record)
        _write_json(EXERCISES_FILE, records)

    return {"success": True, "record": record}


@router.get("/records")
async def get_exercise_records(
    token: str,
    exercise_type: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
):
    """获取用户练习历史"""
    user = auth_service.validate_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")

    user_id = user["id"]

    if is_supabase_available():
        sb = get_supabase_client()
        query = (
            sb.table("exercise_records")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
        )
        if exercise_type:
            query = query.eq("exercise_type", exercise_type)
        result = query.execute()
        records = result.data or []
    else:
        _ensure_data()
        all_records = _read_json(EXERCISES_FILE)
        records = [r for r in all_records if r.get("user_id") == user_id]
        if exercise_type:
            records = [r for r in records if r.get("exercise_type") == exercise_type]
        records.sort(key=lambda r: r.get("created_at", ""), reverse=True)
        records = records[:limit]

    return {"success": True, "records": records, "total": len(records)}
