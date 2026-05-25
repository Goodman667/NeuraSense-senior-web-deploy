import json
import uuid
from datetime import datetime, date
from pathlib import Path
from typing import Any, Optional

from app.services.database.supabase_client import get_supabase_client, is_supabase_available

DATA_DIR = Path("./data")

TABLE_FILES = {
    "senior_user_preferences": DATA_DIR / "senior_user_preferences.json",
    "senior_support_contacts": DATA_DIR / "senior_support_contacts.json",
    "senior_voice_interviews": DATA_DIR / "senior_voice_interviews.json",
    "senior_daily_summaries": DATA_DIR / "senior_daily_summaries.json",
    "senior_help_events": DATA_DIR / "senior_help_events.json",
    "senior_memory": DATA_DIR / "senior_memory.json",
    "senior_checkup_sessions": DATA_DIR / "senior_checkup_sessions.json",
}

def utc_now() -> str:
    return datetime.utcnow().isoformat()

def make_id() -> str:
    return str(uuid.uuid4())

def today_iso() -> str:
    return date.today().isoformat()

def _file_for(table: str) -> Path:
    DATA_DIR.mkdir(exist_ok=True)
    path = TABLE_FILES[table]
    if not path.exists():
        path.write_text("[]", encoding="utf-8")
    return path

def _read_local(table: str) -> list[dict[str, Any]]:
    path = _file_for(table)
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except Exception:
        return []

def _write_local(table: str, rows: list[dict[str, Any]]) -> None:
    path = _file_for(table)
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")

def _try_supabase_select(table: str, user_id: Optional[str] = None, limit: Optional[int] = None) -> Optional[list[dict[str, Any]]]:
    if not is_supabase_available():
        return None
    try:
        sb = get_supabase_client()
        query = sb.table(table).select("*")
        if user_id:
            query = query.eq("user_id", user_id)
        query = query.order("created_at", desc=True)
        if limit:
            query = query.limit(limit)
        res = query.execute()
        return res.data or []
    except Exception as exc:
        print(f"[senior-storage] Supabase select fallback for {table}: {exc}")
        return None

def list_by_user(table: str, user_id: str, limit: Optional[int] = None) -> list[dict[str, Any]]:
    rows = _try_supabase_select(table, user_id=user_id, limit=limit)
    if rows is None:
        rows = [r for r in _read_local(table) if r.get("user_id") == user_id]
        rows.sort(key=lambda r: r.get("created_at", ""), reverse=True)
        if limit:
            rows = rows[:limit]
    return rows

def get_one(table: str, **conditions: Any) -> Optional[dict[str, Any]]:
    if is_supabase_available():
        try:
            sb = get_supabase_client()
            query = sb.table(table).select("*")
            for key, value in conditions.items():
                query = query.eq(key, value)
            res = query.limit(1).execute()
            if res.data:
                return res.data[0]
        except Exception as exc:
            print(f"[senior-storage] Supabase get fallback for {table}: {exc}")
    for row in _read_local(table):
        if all(row.get(k) == v for k, v in conditions.items()):
            return row
    return None

def insert(table: str, data: dict[str, Any]) -> dict[str, Any]:
    now = utc_now()
    row = dict(data)
    row.setdefault("id", make_id())
    row.setdefault("created_at", now)
    row.setdefault("updated_at", now)
    if is_supabase_available():
        try:
            res = get_supabase_client().table(table).insert(row).execute()
            if res.data:
                return res.data[0]
        except Exception as exc:
            print(f"[senior-storage] Supabase insert fallback for {table}: {exc}")
    rows = _read_local(table)
    rows.append(row)
    _write_local(table, rows)
    return row

def upsert_by(table: str, conflict_key: str, data: dict[str, Any]) -> dict[str, Any]:
    now = utc_now()
    row = dict(data)
    row.setdefault("created_at", now)
    row["updated_at"] = now
    if is_supabase_available():
        try:
            res = get_supabase_client().table(table).upsert(row, on_conflict=conflict_key).execute()
            if res.data:
                return res.data[0]
        except Exception as exc:
            print(f"[senior-storage] Supabase upsert fallback for {table}: {exc}")
    rows = _read_local(table)
    for idx, existing in enumerate(rows):
        if existing.get(conflict_key) == row.get(conflict_key):
            merged = {**existing, **row}
            rows[idx] = merged
            _write_local(table, rows)
            return merged
    row.setdefault("id", make_id())
    rows.append(row)
    _write_local(table, rows)
    return row

def upsert_daily_summary(user_id: str, summary_date: str, data: dict[str, Any]) -> dict[str, Any]:
    now = utc_now()
    row = dict(data)
    row["user_id"] = user_id
    row["summary_date"] = summary_date
    row.setdefault("created_at", now)
    row["updated_at"] = now
    if is_supabase_available():
        try:
            res = get_supabase_client().table("senior_daily_summaries").upsert(row, on_conflict="user_id,summary_date").execute()
            if res.data:
                return res.data[0]
        except Exception as exc:
            print(f"[senior-storage] Supabase daily summary fallback: {exc}")
    rows = _read_local("senior_daily_summaries")
    for idx, existing in enumerate(rows):
        if existing.get("user_id") == user_id and existing.get("summary_date") == summary_date:
            merged = {**existing, **row}
            rows[idx] = merged
            _write_local("senior_daily_summaries", rows)
            return merged
    row.setdefault("id", make_id())
    rows.append(row)
    _write_local("senior_daily_summaries", rows)
    return row
