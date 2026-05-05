"""
Profile Router - 用户画像 / Onboarding 数据 CRUD

GET  /profile?token=xxx       -> 获取当前用户画像
PUT  /profile?token=xxx       -> 更新画像 (onboarding 完成后调用)
GET  /profile/stats?token=xxx -> 聚合统计数据 (MePage 使用)
GET  /profile/export?token=xxx -> 导出用户数据 (JSON)
"""

import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from postgrest.exceptions import APIError

from app.services.auth import auth_service
from app.services.database.supabase_client import get_supabase_client, is_supabase_available

router = APIRouter(prefix="/profile", tags=["profile"])

# ---- Fallback 本地存储 ----
DATA_DIR = Path("./data")
PROFILES_FILE = DATA_DIR / "user_profiles.json"

LOCAL_PROFILE_OVERLAY_FIELDS = {
    "ui_mode",
    "preferred_input",
    "tts_enabled",
    "high_contrast",
    "font_scale",
    "senior_mode_enabled",
}


def _load_profiles() -> list[dict]:
    DATA_DIR.mkdir(exist_ok=True)
    if not PROFILES_FILE.exists():
        PROFILES_FILE.write_text("[]", encoding="utf-8")
    return json.loads(PROFILES_FILE.read_text(encoding="utf-8"))


def _save_profiles(profiles: list[dict]):
    DATA_DIR.mkdir(exist_ok=True)
    PROFILES_FILE.write_text(json.dumps(profiles, ensure_ascii=False, indent=2), encoding="utf-8")


# ---- Pydantic 模型 ----
class ProfileUpdate(BaseModel):
    """前端提交的 profile 更新"""
    onboarding_completed: Optional[bool] = None
    goals: Optional[list[str]] = None
    reminder_freq: Optional[str] = None
    practices: Optional[list[str]] = None
    reminder_time: Optional[str] = None
    baseline_sleep: Optional[int] = None
    baseline_stress: Optional[int] = None
    baseline_mood: Optional[int] = None
    baseline_energy: Optional[int] = None
    ui_mode: Optional[str] = None
    preferred_input: Optional[str] = None
    tts_enabled: Optional[bool] = None
    high_contrast: Optional[bool] = None
    font_scale: Optional[float] = None
    senior_mode_enabled: Optional[bool] = None


def _default_profile(user_id: str) -> dict:
    now = datetime.utcnow().isoformat()
    return {
        "user_id": user_id,
        "onboarding_completed": False,
        "goals": [],
        "reminder_freq": "daily",
        "practices": [],
        "reminder_time": "09:00",
        "baseline_sleep": None,
        "baseline_stress": None,
        "baseline_mood": None,
        "baseline_energy": None,
        "ui_mode": "standard",
        "preferred_input": "mixed",
        "tts_enabled": True,
        "high_contrast": False,
        "font_scale": 1.0,
        "senior_mode_enabled": False,
        "created_at": now,
        "updated_at": now,
    }


def bootstrap_user_profile(user_id: str, onboarding_completed: bool) -> dict:
    """
    Seed a user profile when none exists yet.

    - 新注册用户：onboarding_completed = False
    - 历史老用户（以前没有这套 onboarding profile）：onboarding_completed = True
    """
    profile = _default_profile(user_id)
    profile["onboarding_completed"] = onboarding_completed

    if is_supabase_available():
        return _upsert_profile_supabase(user_id, profile)
    return _upsert_profile_local(user_id, profile)


# ---- Supabase helpers ----
def _get_profile_supabase(user_id: str) -> Optional[dict]:
    sb = get_supabase_client()
    res = sb.table("user_profile").select("*").eq("user_id", user_id).execute()
    if res.data:
        return _merge_profile_with_local_overlay(user_id, res.data[0])
    return None


def _extract_missing_column_name(err: APIError) -> Optional[str]:
    try:
        payload = err.json()
    except Exception:
        payload = getattr(err, "args", [None])[0]

    if not isinstance(payload, dict):
        return None

    if payload.get("code") != "PGRST204":
        return None

    message = payload.get("message", "")
    marker = "Could not find the '"
    if marker not in message:
        return None

    tail = message.split(marker, 1)[1]
    return tail.split("' column", 1)[0] if "' column" in tail else None


def _merge_profile_with_local_overlay(user_id: str, profile: dict) -> dict:
    local_profile = _get_profile_local(user_id)
    if not local_profile:
        return profile

    merged = dict(profile)
    for key, value in local_profile.items():
        if key in {"id", "user_id"}:
            continue
        if key in LOCAL_PROFILE_OVERLAY_FIELDS or key not in merged:
            merged[key] = value
    return merged


def _upsert_profile_supabase(user_id: str, data: dict) -> dict:
    sb = get_supabase_client()
    payload = dict(data)
    payload["user_id"] = user_id
    payload["updated_at"] = datetime.utcnow().isoformat()

    remote_payload = dict(payload)
    local_overlay: dict = {}
    removed_columns: set[str] = set()

    while True:
        try:
            res = sb.table("user_profile").upsert(remote_payload, on_conflict="user_id").execute()
            if local_overlay:
                _upsert_profile_local(user_id, local_overlay)

            merged_profile = _default_profile(user_id)
            merged_profile.update(remote_payload)
            if res.data:
                merged_profile.update(res.data[0])
            merged_profile.update(local_overlay)
            return merged_profile
        except APIError as err:
            missing_column = _extract_missing_column_name(err)
            if not missing_column or missing_column in removed_columns or missing_column not in remote_payload:
                raise

            removed_columns.add(missing_column)
            local_overlay[missing_column] = remote_payload.pop(missing_column)


# ---- 本地文件 helpers ----
def _get_profile_local(user_id: str) -> Optional[dict]:
    profiles = _load_profiles()
    for p in profiles:
        if p["user_id"] == user_id:
            return p
    return None


def _upsert_profile_local(user_id: str, data: dict) -> dict:
    profiles = _load_profiles()
    existing = None
    for i, p in enumerate(profiles):
        if p["user_id"] == user_id:
            existing = i
            break

    data["user_id"] = user_id
    data["updated_at"] = datetime.utcnow().isoformat()

    if existing is not None:
        profiles[existing].update(data)
        result = profiles[existing]
    else:
        new_profile = _default_profile(user_id)
        new_profile.update(data)
        profiles.append(new_profile)
        result = new_profile

    _save_profiles(profiles)
    return result


# ---- 路由 ----
@router.get("")
async def get_profile(token: str):
    """获取用户画像，不存在则返回默认值"""
    user = auth_service.validate_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")

    user_id = user["id"]

    if is_supabase_available():
        profile = _get_profile_supabase(user_id)
    else:
        profile = _get_profile_local(user_id)

    if not profile:
        local_profile = _get_profile_local(user_id)
        if local_profile:
            profile = _default_profile(user_id)
            profile.update(local_profile)
            return {"success": True, "profile": profile}

        # 历史用户在引入 onboarding 前已经存在，缺少 profile 不应被误判为新用户
        profile = bootstrap_user_profile(user_id, onboarding_completed=True)

    return {"success": True, "profile": profile}


@router.get("/stats")
async def get_profile_stats(token: str):
    """聚合统计数据（MePage 使用）: 打卡天数、工具完成数、评估数等"""
    user = auth_service.validate_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")

    user_id = user["id"]
    now = datetime.utcnow()
    week_ago = (now - timedelta(days=7)).isoformat()

    stats = {
        "checkin_total": 0,
        "tool_completions_total": 0,
        "tool_completions_7d": 0,
        "assessments_total": 0,
        "exercises_total": 0,
    }

    if is_supabase_available():
        sb = get_supabase_client()
        # 签到总数
        r = sb.table("daily_checkins").select("id", count="exact").eq("user_id", user_id).execute()
        stats["checkin_total"] = r.count or 0
        # 工具完成总数
        r = sb.table("tool_completions").select("id", count="exact").eq("user_id", user_id).execute()
        stats["tool_completions_total"] = r.count or 0
        # 近7天工具完成
        r = sb.table("tool_completions").select("id", count="exact").eq("user_id", user_id).gte("created_at", week_ago).execute()
        stats["tool_completions_7d"] = r.count or 0
        # 评估总数
        r = sb.table("assessment_results").select("id", count="exact").eq("user_id", user_id).execute()
        stats["assessments_total"] = r.count or 0
        # 练习总数
        r = sb.table("exercise_records").select("id", count="exact").eq("user_id", user_id).execute()
        stats["exercises_total"] = r.count or 0
    else:
        DATA_DIR.mkdir(exist_ok=True)
        # 本地 JSON 统计
        for fname, key in [
            ("daily_checkins.json", "checkin_total"),
            ("tool_completions.json", "tool_completions_total"),
            ("assessment_results.json", "assessments_total"),
            ("exercise_records.json", "exercises_total"),
        ]:
            fpath = DATA_DIR / fname
            if fpath.exists():
                try:
                    records = json.loads(fpath.read_text(encoding="utf-8"))
                    stats[key] = sum(1 for r in records if r.get("user_id") == user_id)
                except Exception:
                    pass
        # 近7天工具完成
        tc_file = DATA_DIR / "tool_completions.json"
        if tc_file.exists():
            try:
                records = json.loads(tc_file.read_text(encoding="utf-8"))
                stats["tool_completions_7d"] = sum(
                    1 for r in records
                    if r.get("user_id") == user_id and r.get("created_at", "") >= week_ago
                )
            except Exception:
                pass

    return {"success": True, "stats": stats}


@router.get("/export")
async def export_user_data(token: str):
    """导出用户全部数据 (JSON)"""
    user = auth_service.validate_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")

    user_id = user["id"]
    export = {"user": {"id": user_id, "username": user.get("username"), "nickname": user.get("nickname")}}

    if is_supabase_available():
        sb = get_supabase_client()
        for table_name in ["daily_checkins", "tool_completions", "assessment_results", "exercise_records"]:
            try:
                r = sb.table(table_name).select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
                export[table_name] = r.data or []
            except Exception:
                export[table_name] = []
        # profile
        r = sb.table("user_profile").select("*").eq("user_id", user_id).execute()
        export["profile"] = r.data[0] if r.data else {}
    else:
        DATA_DIR.mkdir(exist_ok=True)
        for fname in ["daily_checkins.json", "tool_completions.json", "assessment_results.json", "exercise_records.json"]:
            fpath = DATA_DIR / fname
            key = fname.replace(".json", "")
            if fpath.exists():
                try:
                    records = json.loads(fpath.read_text(encoding="utf-8"))
                    export[key] = [r for r in records if r.get("user_id") == user_id]
                except Exception:
                    export[key] = []
            else:
                export[key] = []
        # profile
        profile = _get_profile_local(user_id)
        export["profile"] = profile or {}

    export["exported_at"] = datetime.utcnow().isoformat()
    return {"success": True, "data": export}


@router.put("")
async def update_profile(body: ProfileUpdate, token: str):
    """更新用户画像 (onboarding 完成时调用)"""
    user = auth_service.validate_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")

    user_id = user["id"]
    update_data = body.model_dump(exclude_none=True)

    if is_supabase_available():
        profile = _upsert_profile_supabase(user_id, update_data)
    else:
        profile = _upsert_profile_local(user_id, update_data)

    return {"success": True, "profile": profile}
