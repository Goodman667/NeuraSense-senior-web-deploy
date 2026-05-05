"""
Notifications Router — 站内通知中心 API

GET    /notifications?token=&unread_only=  -> 通知列表
POST   /notifications/{id}/read?token=     -> 标记已读
POST   /notifications/read-all?token=      -> 全部已读
GET    /notifications/unread-count?token=   -> 未读数

内部调用: push_notification(user_id, type, title, content, meta)
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

router = APIRouter(prefix="/notifications", tags=["notifications"])

# ---- Fallback 本地存储 ----
DATA_DIR = Path("./data")
NOTIFICATIONS_FILE = DATA_DIR / "notifications.json"


def _ensure_data():
    DATA_DIR.mkdir(exist_ok=True)
    if not NOTIFICATIONS_FILE.exists():
        NOTIFICATIONS_FILE.write_text("[]", encoding="utf-8")


def _read_json(path: Path) -> list:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, data: list):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


# =====================================================
# 内部 API: push_notification — 供其他模块调用
# =====================================================

def push_notification(
    user_id: str,
    type: str,
    title: str,
    content: str = "",
    meta: Optional[dict] = None,
) -> str:
    """
    写入一条站内通知 (同步, fire-and-forget).

    type: system | jitai | achievement | community | reminder | tool | program
    返回: notification id
    """
    record = {
        "id": str(uuid4()),
        "user_id": user_id,
        "type": type,
        "title": title,
        "content": content,
        "read": False,
        "meta": meta or {},
        "created_at": datetime.utcnow().isoformat(),
    }

    if is_supabase_available():
        try:
            sb = get_supabase_client()
            sb.table("notifications").insert(record).execute()
        except Exception as e:
            print(f"Notification push failed (supabase): {e}")
            _append_local(record)
    else:
        _append_local(record)

    return record["id"]


def _append_local(record: dict):
    _ensure_data()
    data = _read_json(NOTIFICATIONS_FILE)
    data.append(record)
    # 保留最新 500 条 per file
    if len(data) > 500:
        data = data[-500:]
    _write_json(NOTIFICATIONS_FILE, data)


# =====================================================
# REST 路由
# =====================================================

@router.get("")
async def list_notifications(
    token: str,
    unread_only: bool = Query(False, description="仅返回未读"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """获取通知列表"""
    user = auth_service.validate_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")

    user_id = user["id"]

    if is_supabase_available():
        sb = get_supabase_client()
        q = sb.table("notifications").select("*").eq("user_id", user_id)
        if unread_only:
            q = q.eq("read", False)
        q = q.order("created_at", desc=True).range(offset, offset + limit - 1)
        result = q.execute()
        notifications = result.data or []
    else:
        _ensure_data()
        all_notifs = _read_json(NOTIFICATIONS_FILE)
        filtered = [n for n in all_notifs if n["user_id"] == user_id]
        if unread_only:
            filtered = [n for n in filtered if not n.get("read", False)]
        filtered.sort(key=lambda n: n.get("created_at", ""), reverse=True)
        notifications = filtered[offset:offset + limit]

    return {"success": True, "notifications": notifications}


@router.get("/unread-count")
async def unread_count(token: str):
    """获取未读数"""
    user = auth_service.validate_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")

    user_id = user["id"]

    if is_supabase_available():
        sb = get_supabase_client()
        result = (
            sb.table("notifications")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .eq("read", False)
            .execute()
        )
        count = result.count or 0
    else:
        _ensure_data()
        all_notifs = _read_json(NOTIFICATIONS_FILE)
        count = sum(
            1 for n in all_notifs
            if n["user_id"] == user_id and not n.get("read", False)
        )

    return {"success": True, "count": count}


@router.post("/{notification_id}/read")
async def mark_read(notification_id: str, token: str):
    """标记单条已读"""
    user = auth_service.validate_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")

    user_id = user["id"]

    if is_supabase_available():
        sb = get_supabase_client()
        sb.table("notifications").update({"read": True}).eq("id", notification_id).eq("user_id", user_id).execute()
    else:
        _ensure_data()
        all_notifs = _read_json(NOTIFICATIONS_FILE)
        for n in all_notifs:
            if n["id"] == notification_id and n["user_id"] == user_id:
                n["read"] = True
                break
        _write_json(NOTIFICATIONS_FILE, all_notifs)

    return {"success": True}


@router.post("/read-all")
async def mark_all_read(token: str):
    """全部已读"""
    user = auth_service.validate_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")

    user_id = user["id"]

    if is_supabase_available():
        sb = get_supabase_client()
        sb.table("notifications").update({"read": True}).eq("user_id", user_id).eq("read", False).execute()
    else:
        _ensure_data()
        all_notifs = _read_json(NOTIFICATIONS_FILE)
        for n in all_notifs:
            if n["user_id"] == user_id:
                n["read"] = True
        _write_json(NOTIFICATIONS_FILE, all_notifs)

    return {"success": True}
