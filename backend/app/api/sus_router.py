"""
SUS Router — 系统可用性量表（研究用）

POST /sus/responses?token=...   -> 保存一份 SUS 问卷（需登录、需知情同意）
GET  /sus/researcher?token=...   -> 当前账号是否为研究者，以及已收集的问卷份数
GET  /sus/export?token=...       -> 研究者导出全部参与者的 SUS 结果（CSV，仅研究者账号）
GET  /sus/list?token=...         -> 研究者查看全部问卷（不含逐题答案），用于管理
POST /sus/delete?token=...       -> 研究者删除选中的问卷（例如自己测试时填的数据），不可恢复

计分（Brooke, 1996）:
  奇数题贡献 = 得分 - 1，偶数题贡献 = 5 - 得分；10 题贡献之和为原始分 (0-40)，
  SUS 分 = 原始分 × 2.5 (0-100)。
  子量表（Lewis & Sauro, 2009）: 可用性 = 第 1,2,3,5,6,7,8,9 题贡献和 × 3.125；
  易学性 = 第 4,10 题贡献和 × 12.5。

存储：优先写入 Supabase 表 sus_responses（见 backend/sql/011_sus_responses.sql）；
表不存在或 Supabase 不可用时写入本地 data/sus_responses.json，导出时两处合并。
"""

import csv
import io
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from app.services.auth import auth_service
from app.services.database.supabase_client import get_supabase_client, is_supabase_available

router = APIRouter(prefix="/sus", tags=["sus"])

DATA_DIR = Path("./data")
LOCAL_FILE = DATA_DIR / "sus_responses.json"
TABLE = "sus_responses"

MODES = {"standard": "标准版", "companion": "陪伴版"}
# 研究者账号（可导出全部参与者数据）。可用环境变量 SUS_RESEARCHERS（逗号分隔）覆盖。
RESEARCHERS = {
    u.strip() for u in os.getenv("SUS_RESEARCHERS", "ggxxmm25").split(",") if u.strip()
}
AGE_GROUPS = ["18-29", "30-44", "45-59", "60-69", "70-79", "80+"]


class SUSDeleteRequest(BaseModel):
    ids: list[str]


class SUSResponseRequest(BaseModel):
    mode: str
    age_group: str
    answers: list[int]
    consent: bool


def sus_scores(answers: list[int]) -> dict:
    """返回原始分、SUS 分和两个子量表分。answers 为 10 个 1-5 的整数。"""
    contrib = [(a - 1) if i % 2 == 0 else (5 - a) for i, a in enumerate(answers)]
    raw = sum(contrib)
    learn = contrib[3] + contrib[9]
    usab = raw - learn
    return {
        "raw_score": raw,
        "sus_score": raw * 2.5,
        "usability": usab * 3.125,
        "learnability": learn * 12.5,
    }


def _read_local() -> list[dict]:
    if not LOCAL_FILE.exists():
        return []
    try:
        data = json.loads(LOCAL_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except Exception:
        return []


def _append_local(record: dict) -> None:
    DATA_DIR.mkdir(exist_ok=True)
    rows = _read_local()
    rows.append(record)
    LOCAL_FILE.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")


@router.post("/responses")
async def save_response(body: SUSResponseRequest, token: str):
    user = auth_service.validate_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")
    if not body.consent:
        raise HTTPException(status_code=400, detail="需要先同意参加")
    if body.mode not in MODES:
        raise HTTPException(status_code=400, detail="版本无效")
    if body.age_group not in AGE_GROUPS:
        raise HTTPException(status_code=400, detail="年龄段无效")
    if len(body.answers) != 10 or any(a not in (1, 2, 3, 4, 5) for a in body.answers):
        raise HTTPException(status_code=400, detail="需要回答全部 10 题，每题 1-5 分")

    record = {
        "id": str(uuid4()),
        "user_id": user["id"],
        "username": user.get("username", ""),
        "mode": body.mode,
        "age_group": body.age_group,
        "answers": body.answers,
        **sus_scores(body.answers),
        "consent": True,
        "created_at": datetime.utcnow().isoformat(),
    }

    saved = False
    if is_supabase_available():
        try:
            get_supabase_client().table(TABLE).insert(record).execute()
            saved = True
        except Exception as exc:
            print(f"[sus] Supabase insert failed, using local file: {exc}")
    if not saved:
        _append_local(record)

    return {
        "success": True,
        "id": record["id"],
        "raw_score": record["raw_score"],
        "sus_score": record["sus_score"],
    }


def _all_rows() -> list[dict]:
    rows: dict[str, dict] = {}
    if is_supabase_available():
        try:
            res = get_supabase_client().table(TABLE).select("*").order("created_at").execute()
            for r in res.data or []:
                rows[str(r["id"])] = r
        except Exception as exc:
            print(f"[sus] Supabase export skipped: {exc}")
    for r in _read_local():
        rows.setdefault(str(r["id"]), r)
    return sorted(rows.values(), key=lambda r: str(r.get("created_at", "")))


def _researcher(token: str) -> dict:
    user = auth_service.validate_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")
    if user.get("username") not in RESEARCHERS:
        raise HTTPException(status_code=403, detail="只有研究者账号可以使用此功能")
    return user


@router.get("/researcher")
async def researcher_status(token: str):
    user = auth_service.validate_token(token)
    if not user or user.get("username") not in RESEARCHERS:
        return {"is_researcher": False}
    return {"is_researcher": True, "count": len(_all_rows())}


@router.get("/export")
async def export_csv(token: str):
    _researcher(token)

    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["id", "user_id", "username", "mode", "age_group",
                *[f"q{i}" for i in range(1, 11)],
                "raw_score", "sus_score", "usability", "learnability", "created_at_utc"])
    for r in _all_rows():
        answers = r.get("answers") or []
        if isinstance(answers, str):
            answers = json.loads(answers)
        w.writerow([r.get("id"), r.get("user_id"), r.get("username"), r.get("mode"),
                    r.get("age_group"), *answers, r.get("raw_score"), r.get("sus_score"),
                    r.get("usability"), r.get("learnability"), r.get("created_at")])

    stamp = datetime.utcnow().strftime("%Y%m%d")
    return Response(
        content="\ufeff" + buf.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="sus_responses_{stamp}.csv"'},
    )


@router.get("/list")
async def list_responses(token: str):
    _researcher(token)
    rows = [
        {k: r.get(k) for k in ("id", "username", "mode", "age_group", "sus_score", "created_at")}
        for r in _all_rows()
    ]
    rows.reverse()  # 最新的在前
    return {"success": True, "responses": rows}


@router.post("/delete")
async def delete_responses(body: SUSDeleteRequest, token: str):
    _researcher(token)
    ids = {str(i) for i in body.ids if i}
    if not ids:
        raise HTTPException(status_code=400, detail="没有选择要删除的问卷")

    if is_supabase_available():
        try:
            get_supabase_client().table(TABLE).delete().in_("id", list(ids)).execute()
        except Exception as exc:
            print(f"[sus] Supabase delete skipped: {exc}")

    local = _read_local()
    kept = [r for r in local if str(r.get("id")) not in ids]
    if len(kept) != len(local):
        DATA_DIR.mkdir(exist_ok=True)
        LOCAL_FILE.write_text(json.dumps(kept, ensure_ascii=False, indent=2), encoding="utf-8")

    remaining = _all_rows()
    left = ids & {str(r.get("id")) for r in remaining}
    return {"success": not left, "deleted": len(ids) - len(left), "remaining": len(remaining)}
