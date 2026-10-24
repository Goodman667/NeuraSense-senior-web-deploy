"""
Assessments Router — 测评中心 API

GET    /assessments/catalog              -> 测评目录（可按 category 筛选）
GET    /assessments/catalog/{key}        -> 单个测评详情
POST   /assessments/results              -> 保存测评结果
GET    /assessments/results              -> 用户测评历史（可按 assessment_key 筛选）
GET    /assessments/results/{result_id}  -> 单次测评结果详情
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

router = APIRouter(prefix="/assessments", tags=["assessments-center"])

# ---- Fallback 本地存储 ----
DATA_DIR = Path("./data")
CATALOG_FILE = DATA_DIR / "assessments_catalog.json"
RESULTS_FILE = DATA_DIR / "assessment_results.json"


def _ensure_data():
    DATA_DIR.mkdir(exist_ok=True)
    if not CATALOG_FILE.exists():
        CATALOG_FILE.write_text(json.dumps(SEED_CATALOG, ensure_ascii=False, indent=2), encoding="utf-8")
    if not RESULTS_FILE.exists():
        RESULTS_FILE.write_text("[]", encoding="utf-8")


def _read_json(path: Path) -> list:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, data: list):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


# ---- Pydantic 模型 ----
class SaveResultRequest(BaseModel):
    assessment_key: str
    total_score: int
    raw_score: Optional[int] = None
    severity: str
    answers: list = []
    ai_interpretation: Optional[str] = None


# ---- 种子数据 ----
SEED_CATALOG = [
    {"key": "phq9", "title": "PHQ-9", "subtitle": "患者健康问卷-9",
     "description": "国际通用的抑郁筛查量表，9 道题快速评估过去两周的抑郁症状严重程度。被广泛应用于初级保健和心理健康筛查。",
     "category": "emotion", "estimated_minutes": 2, "icon": "😔",
     "gradient": "from-rose-500 to-pink-600",
     "tags": ["抑郁", "情绪", "筛查"], "question_count": 9, "score_range": "0-27",
     "enabled": True, "sort_order": 1},
    {"key": "gad7", "title": "GAD-7", "subtitle": "广泛性焦虑量表-7",
     "description": "7 道题评估过去两周的广泛性焦虑水平，是全球使用最广泛的焦虑筛查工具之一。",
     "category": "anxiety", "estimated_minutes": 2, "icon": "😰",
     "gradient": "from-blue-500 to-cyan-600",
     "tags": ["焦虑", "紧张", "筛查"], "question_count": 7, "score_range": "0-21",
     "enabled": True, "sort_order": 2},
    {"key": "sds", "title": "SDS", "subtitle": "抑郁自评量表",
     "description": "由 Zung 编制的 20 题抑郁自评量表，深度评估抑郁程度，包含正向和反向计分项目。",
     "category": "emotion", "estimated_minutes": 5, "icon": "💜",
     "gradient": "from-purple-500 to-violet-600",
     "tags": ["抑郁", "自评", "深度"], "question_count": 20, "score_range": "25-100",
     "enabled": True, "sort_order": 3},
    {"key": "sas", "title": "SAS", "subtitle": "焦虑自评量表",
     "description": "由 Zung 编制的 20 题焦虑自评量表，全面评估焦虑相关的身心症状，含标准分换算。",
     "category": "anxiety", "estimated_minutes": 5, "icon": "🧡",
     "gradient": "from-orange-500 to-amber-600",
     "tags": ["焦虑", "自评", "深度"], "question_count": 20, "score_range": "25-100",
     "enabled": True, "sort_order": 4},
    {"key": "pss10", "title": "PSS-10", "subtitle": "压力感知量表",
     "description": "由 Cohen 等人开发的 10 道题经典量表，评估过去一个月的压力感知水平。",
     "category": "stress", "estimated_minutes": 3, "icon": "💪",
     "gradient": "from-indigo-500 to-purple-600",
     "tags": ["压力", "感知", "月度"], "question_count": 10, "score_range": "0-40",
     "enabled": True, "sort_order": 5},
    {"key": "isi", "title": "ISI", "subtitle": "失眠严重程度指数",
     "description": "7 道题评估失眠严重程度，适用于睡眠问题筛查和疗效追踪。",
     "category": "sleep", "estimated_minutes": 3, "icon": "🌙",
     "gradient": "from-indigo-400 to-blue-500",
     "tags": ["失眠", "睡眠"], "question_count": 7, "score_range": "0-28",
     "enabled": False, "sort_order": 10},
    {"key": "asrs", "title": "ASRS-v1.1", "subtitle": "成人 ADHD 自评量表",
     "description": "6 道题筛查成人注意力缺陷多动障碍（ADHD），世界卫生组织推荐工具。",
     "category": "focus", "estimated_minutes": 2, "icon": "🎯",
     "gradient": "from-amber-400 to-orange-500",
     "tags": ["注意力", "ADHD", "专注"], "question_count": 6, "score_range": "0-24",
     "enabled": False, "sort_order": 11},
]


# SUS（研究用可用性问卷）：直接在代码里补进目录，不需要改数据库里的目录表
SUS_CATALOG_ITEM = {
    "key": "sus", "title": "SUS", "subtitle": "系统可用性量表（平台内测）",
    "description": "10 道题评价你刚才使用 NeuraSense 的感受，用于研究和改进平台。",
    "category": "research", "estimated_minutes": 3, "icon": "🧭",
    "gradient": "from-emerald-500 to-teal-600",
    "tags": ["可用性", "内测", "评估"], "question_count": 10, "score_range": "0-100",
    "enabled": True, "sort_order": 6,
}


def _with_sus(catalog: list, category: Optional[str] = None) -> list:
    if any(c.get("key") == "sus" for c in catalog):
        return catalog
    if category and category != SUS_CATALOG_ITEM["category"]:
        return catalog
    merged = catalog + [SUS_CATALOG_ITEM]
    merged.sort(key=lambda c: c.get("sort_order", 0))
    return merged


# ================ 路由 ================

@router.get("/catalog")
async def list_catalog(category: Optional[str] = None):
    """获取测评目录"""
    if is_supabase_available():
        sb = get_supabase_client()
        query = sb.table("assessments_catalog").select("*").eq("enabled", True).order("sort_order")
        if category:
            query = query.eq("category", category)
        result = query.execute()
        catalog = result.data or []
    else:
        _ensure_data()
        catalog = [c for c in _read_json(CATALOG_FILE) if c.get("enabled", True)]
        if category:
            catalog = [c for c in catalog if c.get("category") == category]
        catalog.sort(key=lambda c: c.get("sort_order", 0))

    return {"success": True, "catalog": _with_sus(catalog, category)}


@router.get("/catalog/{key}")
async def get_catalog_item(key: str):
    """获取单个测评详情"""
    if key == "sus":
        return {"success": True, "assessment": SUS_CATALOG_ITEM}
    if is_supabase_available():
        sb = get_supabase_client()
        result = sb.table("assessments_catalog").select("*").eq("key", key).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="测评不存在")
        return {"success": True, "assessment": result.data[0]}
    else:
        _ensure_data()
        catalog = _read_json(CATALOG_FILE)
        item = next((c for c in catalog if c["key"] == key), None)
        if not item:
            raise HTTPException(status_code=404, detail="测评不存在")
        return {"success": True, "assessment": item}


@router.post("/results")
async def save_result(body: SaveResultRequest, token: str):
    """保存测评结果"""
    user = auth_service.validate_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")

    user_id = user["id"]
    record = {
        "id": str(uuid4()),
        "user_id": user_id,
        "assessment_key": body.assessment_key,
        "total_score": body.total_score,
        "raw_score": body.raw_score,
        "severity": body.severity,
        "answers": body.answers,
        "ai_interpretation": body.ai_interpretation,
        "created_at": datetime.utcnow().isoformat(),
    }

    if is_supabase_available():
        sb = get_supabase_client()
        sb.table("assessment_results").insert(record).execute()
    else:
        _ensure_data()
        results = _read_json(RESULTS_FILE)
        results.append(record)
        _write_json(RESULTS_FILE, results)

    # 同时写入旧版 /history 格式，保持向后兼容
    try:
        auth_service.save_assessment(
            user_id=user_id,
            scale_type=body.assessment_key,
            total_score=body.total_score,
            answers=body.answers if isinstance(body.answers, list) else [],
            severity=body.severity,
            ai_interpretation=body.ai_interpretation,
        )
    except Exception:
        pass  # best-effort

    return {"success": True, "result": record}


@router.get("/results")
async def list_results(token: str, assessment_key: Optional[str] = None):
    """获取用户测评历史"""
    user = auth_service.validate_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")

    user_id = user["id"]

    if is_supabase_available():
        sb = get_supabase_client()
        query = (
            sb.table("assessment_results")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
        )
        if assessment_key:
            query = query.eq("assessment_key", assessment_key)
        result = query.execute()
        results = result.data or []
    else:
        _ensure_data()
        all_results = _read_json(RESULTS_FILE)
        results = [r for r in all_results if r.get("user_id") == user_id]
        if assessment_key:
            results = [r for r in results if r.get("assessment_key") == assessment_key]
        results.sort(key=lambda r: r.get("created_at", ""), reverse=True)

    return {"success": True, "results": results}


@router.get("/results/{result_id}")
async def get_result(result_id: str, token: str):
    """获取单次测评结果详情"""
    user = auth_service.validate_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")

    user_id = user["id"]

    if is_supabase_available():
        sb = get_supabase_client()
        result = (
            sb.table("assessment_results")
            .select("*")
            .eq("id", result_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="记录不存在")
        return {"success": True, "result": result.data[0]}
    else:
        _ensure_data()
        all_results = _read_json(RESULTS_FILE)
        record = next(
            (r for r in all_results if r["id"] == result_id and r.get("user_id") == user_id),
            None,
        )
        if not record:
            raise HTTPException(status_code=404, detail="记录不存在")
        return {"success": True, "result": record}
