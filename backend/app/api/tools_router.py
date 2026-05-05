"""
Tools Router - 工具箱内容引擎 API

GET    /tools              -> 工具列表 (筛选 + 搜索)
GET    /tools/{id}         -> 工具详情
POST   /tools/{id}/complete -> 完成打卡
POST   /tools/{id}/favorite -> 收藏/取消收藏
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

router = APIRouter(prefix="/tools", tags=["tools"])

# ---- Fallback 本地存储 ----
DATA_DIR = Path("./data")
TOOLS_FILE = DATA_DIR / "tool_items.json"
TOOLS_V2_FILE = DATA_DIR / "tool_items_v2.json"
COMPLETIONS_FILE = DATA_DIR / "tool_completions.json"
FAVORITES_FILE = DATA_DIR / "tool_favorites.json"


def _load_seed_tools() -> list:
    """从 tool_items_v2.json 加载 41 张卡片并适配字段格式"""
    if not TOOLS_V2_FILE.exists():
        return []
    raw = json.loads(TOOLS_V2_FILE.read_text(encoding="utf-8"))
    tools = []
    for i, item in enumerate(raw):
        tools.append({
            "id": item["id"],
            "title": item["title"],
            "subtitle": item.get("intro", ""),
            "category": item["category"],
            "icon": _category_icon(item["category"]),
            "duration_min": item.get("duration_minutes", 5),
            "difficulty": _difficulty_label(item.get("difficulty", 1)),
            "tags": item.get("tags", []),
            "sort_order": i + 1,
            "steps": [
                {
                    "title": s["title"],
                    "body": s["instruction"],
                    "duration_sec": s.get("seconds", 0),
                }
                for s in item.get("steps", [])
            ],
            "guidance": item.get("coach_script", []),
        })
    return tools


def _category_icon(cat: str) -> str:
    return {"breathing": "\U0001f32c\ufe0f", "cbt": "\U0001f4dd", "dbt": "\U0001f6d1",
            "mindfulness": "\U0001f9d8", "sleep": "\U0001f319", "focus": "\U0001f345"}.get(cat, "\U0001f527")


def _difficulty_label(d: int) -> str:
    return {1: "easy", 2: "medium", 3: "hard"}.get(d, "easy")


def _ensure_data():
    DATA_DIR.mkdir(exist_ok=True)
    if not COMPLETIONS_FILE.exists():
        COMPLETIONS_FILE.write_text("[]", encoding="utf-8")
    if not FAVORITES_FILE.exists():
        FAVORITES_FILE.write_text("[]", encoding="utf-8")
    # 每次启动都从 v2 种子数据重新生成，确保部署后工具列表始终最新
    if TOOLS_V2_FILE.exists():
        seed = _load_seed_tools()
        if seed:
            TOOLS_FILE.write_text(json.dumps(seed, ensure_ascii=False, indent=2), encoding="utf-8")


def _read_json(path: Path) -> list:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, data: list):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


# ---- Pydantic 模型 ----
class CompleteRequest(BaseModel):
    duration_sec: int = 0
    rating: Optional[int] = None      # 1-5
    note: Optional[str] = None


CATEGORY_LABELS = {
    "breathing": "呼吸放松",
    "cbt": "CBT 微练习",
    "dbt": "DBT 急救",
    "mindfulness": "正念冥想",
    "sleep": "睡前放松",
    "focus": "专注",
}


# ================ 路由 ================

@router.get("")
async def list_tools(
    category: Optional[str] = Query(None, description="分类筛选"),
    q: Optional[str] = Query(None, description="关键词搜索"),
):
    """获取工具列表"""
    if is_supabase_available():
        sb = get_supabase_client()
        query = sb.table("tool_items").select("*").eq("is_active", True).order("sort_order")
        if category:
            query = query.eq("category", category)
        result = query.execute()
        tools = result.data or []
    else:
        _ensure_data()
        tools = _read_json(TOOLS_FILE)
        if category:
            tools = [t for t in tools if t["category"] == category]

    if q:
        q_lower = q.lower()
        tools = [t for t in tools if q_lower in t["title"].lower() or q_lower in t.get("subtitle", "").lower() or any(q_lower in tag for tag in t.get("tags", []))]

    return {"success": True, "tools": tools, "categories": CATEGORY_LABELS}


@router.get("/{tool_id}")
async def get_tool(tool_id: str, token: Optional[str] = None):
    """获取工具详情，含用户完成次数和收藏状态"""
    tool = None

    if is_supabase_available():
        sb = get_supabase_client()
        res = sb.table("tool_items").select("*").eq("id", tool_id).execute()
        if res.data:
            tool = res.data[0]
    else:
        _ensure_data()
        tools = _read_json(TOOLS_FILE)
        tool = next((t for t in tools if t["id"] == tool_id), None)

    if not tool:
        raise HTTPException(status_code=404, detail="工具不存在")

    # 用户相关数据
    completion_count = 0
    is_favorited = False

    if token:
        user = auth_service.validate_token(token)
        if user:
            user_id = user["id"]
            if is_supabase_available():
                sb = get_supabase_client()
                comp_res = sb.table("tool_completions").select("id", count="exact").eq("user_id", user_id).eq("tool_id", tool_id).execute()
                completion_count = comp_res.count or 0
                fav_res = sb.table("tool_favorites").select("user_id").eq("user_id", user_id).eq("tool_id", tool_id).execute()
                is_favorited = bool(fav_res.data)
            else:
                completions = _read_json(COMPLETIONS_FILE)
                completion_count = sum(1 for c in completions if c["user_id"] == user_id and c["tool_id"] == tool_id)
                favorites = _read_json(FAVORITES_FILE)
                is_favorited = any(f["user_id"] == user_id and f["tool_id"] == tool_id for f in favorites)

    return {"success": True, "tool": tool, "completion_count": completion_count, "is_favorited": is_favorited}


@router.post("/{tool_id}/complete")
async def complete_tool(tool_id: str, body: CompleteRequest, token: str):
    """记录工具完成"""
    user = auth_service.validate_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")

    record = {
        "id": str(uuid4()),
        "user_id": user["id"],
        "tool_id": tool_id,
        "duration_sec": body.duration_sec,
        "rating": body.rating,
        "note": body.note,
        "created_at": datetime.utcnow().isoformat(),
    }

    if is_supabase_available():
        sb = get_supabase_client()
        sb.table("tool_completions").insert(record).execute()
    else:
        _ensure_data()
        completions = _read_json(COMPLETIONS_FILE)
        completions.append(record)
        _write_json(COMPLETIONS_FILE, completions)

    # 查找工具标题用于通知
    tool_title = tool_id
    if is_supabase_available():
        t_res = sb.table("tool_items").select("title").eq("id", tool_id).execute()
        if t_res.data:
            tool_title = t_res.data[0]["title"]
    else:
        tools = _read_json(TOOLS_FILE)
        t = next((t for t in tools if t["id"] == tool_id), None)
        if t:
            tool_title = t["title"]

    try:
        push_notification(
            user_id=user["id"],
            type="tool",
            title=f"完成练习: {tool_title}",
            content=f"你刚刚完成了「{tool_title}」，坚持练习是最好的投资！",
            meta={"tool_id": tool_id, "completion_id": record["id"]},
        )
    except Exception:
        pass  # 通知写入失败不影响主流程

    return {"success": True, "record": record}


@router.post("/{tool_id}/favorite")
async def toggle_favorite(tool_id: str, token: str):
    """收藏/取消收藏"""
    user = auth_service.validate_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")

    user_id = user["id"]

    if is_supabase_available():
        sb = get_supabase_client()
        existing = sb.table("tool_favorites").select("user_id").eq("user_id", user_id).eq("tool_id", tool_id).execute()
        if existing.data:
            sb.table("tool_favorites").delete().eq("user_id", user_id).eq("tool_id", tool_id).execute()
            return {"success": True, "favorited": False}
        else:
            sb.table("tool_favorites").insert({"user_id": user_id, "tool_id": tool_id}).execute()
            return {"success": True, "favorited": True}
    else:
        _ensure_data()
        favorites = _read_json(FAVORITES_FILE)
        existing = [f for f in favorites if f["user_id"] == user_id and f["tool_id"] == tool_id]
        if existing:
            favorites = [f for f in favorites if not (f["user_id"] == user_id and f["tool_id"] == tool_id)]
            _write_json(FAVORITES_FILE, favorites)
            return {"success": True, "favorited": False}
        else:
            favorites.append({"user_id": user_id, "tool_id": tool_id, "created_at": datetime.utcnow().isoformat()})
            _write_json(FAVORITES_FILE, favorites)
            return {"success": True, "favorited": True}
