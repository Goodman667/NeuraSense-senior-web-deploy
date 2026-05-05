"""
Recommendation Service v2 — JITAI 可配置决策系统

结构: 决策点 → 候选干预 → 个性化变量(tailoring variables) → 规则匹配 → 近端结果

规则从 data/jitai_rules.json 加载，支持:
- AND/OR 复合条件
- 5层优先级 (CRISIS > ACUTE > PREVENTIVE > MAINTENANCE > DEFAULT)
- 近端结果追踪 (delivered/opened/completed/dismissed)
- 向后兼容 get_recommendations() 签名
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Optional
from uuid import uuid4

# =====================================================
# 数据结构
# =====================================================

TIER_ORDER = {"CRISIS": 0, "ACUTE": 1, "PREVENTIVE": 2, "MAINTENANCE": 3, "DEFAULT": 4}

DATA_DIR = Path("./data")
RULES_FILE = DATA_DIR / "jitai_rules.json"
TOOL_ITEMS_FILE = DATA_DIR / "tool_items.json"
TOOL_COMPLETIONS_FILE = DATA_DIR / "tool_completions.json"
CHECKINS_FILE = DATA_DIR / "daily_checkins.json"
REC_LOG_FILE = DATA_DIR / "recommendation_log.json"


def _read_json(path: Path) -> list:
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except Exception:
        return []


def _write_json(path: Path, data: list):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2, default=str), encoding="utf-8")


# =====================================================
# 规则加载
# =====================================================

_rules_cache: Optional[dict] = None
_rules_mtime: float = 0


def _load_rules() -> dict:
    """加载规则配置（带文件修改时间缓存）"""
    global _rules_cache, _rules_mtime
    try:
        mtime = RULES_FILE.stat().st_mtime
        if _rules_cache is not None and mtime == _rules_mtime:
            return _rules_cache
        _rules_cache = json.loads(RULES_FILE.read_text(encoding="utf-8"))
        _rules_mtime = mtime
        return _rules_cache
    except Exception as e:
        print(f"Failed to load jitai_rules.json: {e}")
        return {"rules": [], "default_actions": [], "default_task": None}


# =====================================================
# 工具信息缓存
# =====================================================

_tools_cache: Optional[dict[str, dict]] = None


def _load_tools() -> dict[str, dict]:
    global _tools_cache
    if _tools_cache is not None:
        return _tools_cache
    try:
        items = json.loads(TOOL_ITEMS_FILE.read_text(encoding="utf-8"))
        _tools_cache = {t["id"]: t for t in items}
    except Exception:
        _tools_cache = {}
    return _tools_cache


# =====================================================
# 条件求值器
# =====================================================

OPS = {
    "<":  lambda a, b: a < b,
    "<=": lambda a, b: a <= b,
    ">":  lambda a, b: a > b,
    ">=": lambda a, b: a >= b,
    "==": lambda a, b: a == b,
    "!=": lambda a, b: a != b,
    "in": lambda a, b: a in b,
    "between": lambda a, b: len(b) == 2 and b[0] <= a <= b[1],
}


def _resolve_field(ctx: dict, field: str) -> Any:
    """从上下文字典中解析 dotted 路径，如 'checkin.mood'"""
    parts = field.split(".")
    val = ctx
    for p in parts:
        if isinstance(val, dict):
            val = val.get(p)
        else:
            return None
    return val


def evaluate_condition(condition: dict, ctx: dict, _depth: int = 0) -> bool:
    """递归求值条件树（最大深度 20）"""
    if _depth > 20:
        return False
    if "AND" in condition:
        return all(evaluate_condition(c, ctx, _depth + 1) for c in condition["AND"])
    if "OR" in condition:
        return any(evaluate_condition(c, ctx, _depth + 1) for c in condition["OR"])
    if "NOT" in condition:
        inner = condition["NOT"]
        if not isinstance(inner, dict):
            return False
        return not evaluate_condition(inner, ctx, _depth + 1)

    # 叶子条件: {field, op, value}
    field = condition.get("field")
    op = condition.get("op")
    value = condition.get("value")
    if not field or not op:
        return False

    actual = _resolve_field(ctx, field)
    if actual is None:
        return False

    op_fn = OPS.get(op)
    if op_fn is None:
        return False

    try:
        return op_fn(actual, value)
    except (TypeError, ValueError):
        return False


# =====================================================
# Tailoring Variables 构建器
# =====================================================

def build_context(
    checkin: Optional[dict] = None,
    user_id: Optional[str] = None,
) -> dict:
    """
    构建个性化变量上下文:
    - checkin.* : 当日签到
    - trend.*   : 近7天趋势
    - context.* : 时间上下文
    - engagement.* : 工具参与度
    """
    ctx: dict[str, Any] = {}

    # 1. 签到数据
    if checkin:
        ctx["checkin"] = {
            "mood": checkin.get("mood", 5),
            "stress": checkin.get("stress", 5),
            "energy": checkin.get("energy", 5),
            "sleep_quality": checkin.get("sleep_quality", 5),
        }
    else:
        ctx["checkin"] = {"mood": 5, "stress": 5, "energy": 5, "sleep_quality": 5}

    # 2. 时间上下文
    now = datetime.now()
    hour = now.hour
    if 5 <= hour < 12:
        period = "morning"
    elif 12 <= hour < 18:
        period = "afternoon"
    elif 18 <= hour < 23:
        period = "evening"
    else:
        period = "late_night"

    ctx["context"] = {
        "hour": hour,
        "period": period,
        "day_of_week": now.weekday(),
        "is_weekend": now.weekday() >= 5,
    }

    # 3. 近7天趋势
    ctx["trend"] = _compute_trend(user_id)

    # 4. 工具参与度
    ctx["engagement"] = _compute_engagement(user_id)

    return ctx


def _compute_trend(user_id: Optional[str]) -> dict:
    """计算近7天签到趋势"""
    default = {"mood_avg_7d": 5.0, "stress_avg_7d": 5.0, "mood_slope": 0.0, "direction": "stable"}
    if not user_id:
        return default

    try:
        cutoff = (datetime.now() - timedelta(days=7)).isoformat()

        from app.services.database.supabase_client import is_supabase_available, get_supabase_client
        if is_supabase_available():
            sb = get_supabase_client()
            result = sb.table("daily_checkins").select("mood,stress,created_at").eq(
                "user_id", user_id
            ).gte("created_at", cutoff).order("created_at").execute()
            records = result.data or []
        else:
            all_checkins = _read_json(CHECKINS_FILE)
            records = [c for c in all_checkins if c.get("user_id") == user_id and c.get("created_at", "") >= cutoff]
            records.sort(key=lambda c: c.get("created_at", ""))

        if not records:
            return default

        moods = [r.get("mood", 5) for r in records]
        stresses = [r.get("stress", 5) for r in records]
        mood_avg = sum(moods) / len(moods)
        stress_avg = sum(stresses) / len(stresses)

        # 简单线性趋势: 后半段 vs 前半段
        mid = len(moods) // 2 if len(moods) >= 4 else 0
        if mid > 0:
            first_half = sum(moods[:mid]) / mid
            second_half = sum(moods[mid:]) / (len(moods) - mid)
            slope = (second_half - first_half) / 10  # 归一化
        else:
            slope = 0.0

        if slope < -0.1:
            direction = "worsening"
        elif slope > 0.1:
            direction = "improving"
        else:
            direction = "stable"

        return {
            "mood_avg_7d": round(mood_avg, 1),
            "stress_avg_7d": round(stress_avg, 1),
            "mood_slope": round(slope, 3),
            "direction": direction,
        }
    except Exception:
        return default


def _compute_engagement(user_id: Optional[str]) -> dict:
    """计算工具参与度"""
    default = {"days_since_last_completion": 999, "tools_completed_7d": 0, "last_tool_id": None, "last_tool_status": None}
    if not user_id:
        return default

    try:
        from app.services.database.supabase_client import is_supabase_available, get_supabase_client
        if is_supabase_available():
            sb = get_supabase_client()
            result = sb.table("tool_completions").select("tool_id,created_at").eq(
                "user_id", user_id
            ).order("created_at", desc=True).limit(1).execute()
            completions = result.data or []
        else:
            all_completions = _read_json(TOOL_COMPLETIONS_FILE)
            completions = [c for c in all_completions if c.get("user_id") == user_id]
            completions.sort(key=lambda c: c.get("created_at", ""), reverse=True)

        if not completions:
            return default

        last = completions[0]
        last_time = datetime.fromisoformat(last["created_at"].replace("Z", "+00:00").replace("+00:00", ""))
        days_since = (datetime.now() - last_time).days

        # 近7天完成数
        cutoff = (datetime.now() - timedelta(days=7)).isoformat()
        if is_supabase_available():
            sb = get_supabase_client()
            count_result = sb.table("tool_completions").select("id", count="exact").eq(
                "user_id", user_id
            ).gte("created_at", cutoff).execute()
            completed_7d = count_result.count or 0
        else:
            completed_7d = sum(1 for c in completions if c.get("created_at", "") >= cutoff)

        return {
            "days_since_last_completion": days_since,
            "tools_completed_7d": completed_7d,
            "last_tool_id": last.get("tool_id"),
            "last_tool_status": "completed",
        }
    except Exception:
        return default


# =====================================================
# 规则引擎核心
# =====================================================

def evaluate_rules(ctx: dict, max_tools: int = 2) -> dict:
    """
    核心决策引擎: 评估所有规则，返回推荐结果。

    返回:
    {
        "tools": [{"id", "reason", "name", "icon", "category", "rule_id", "tier", "priority"}],
        "task": {"text", "reason_zh"} | None,
        "matched_rules": ["rule_id", ...],
        "context_snapshot": {...}
    }
    """
    config = _load_rules()
    rules = config.get("rules", [])
    tools_db = _load_tools()

    candidates: list[tuple[int, int, dict, dict]] = []  # (tier_rank, priority, action, rule)

    for rule in rules:
        if not rule.get("enabled", True):
            continue
        condition = rule.get("condition", {})
        if not evaluate_condition(condition, ctx):
            continue

        tier = rule.get("tier", "DEFAULT")
        tier_rank = TIER_ORDER.get(tier, 4)
        priority = rule.get("priority", 0)

        for action in rule.get("actions", []):
            if action.get("type") == "recommend_tool":
                candidates.append((tier_rank, priority, action, rule))

    # 按 tier ASC, priority DESC 排序
    candidates.sort(key=lambda x: (x[0], -x[1]))

    # 去重 tool_id，取 top max_tools
    seen: set[str] = set()
    result_tools: list[dict] = []
    matched_rules: list[str] = []
    best_task = None

    for tier_rank, priority, action, rule in candidates:
        tool_id = action.get("tool_id", "")
        if tool_id in seen:
            continue
        seen.add(tool_id)

        tool_info = tools_db.get(tool_id, {})
        result_tools.append({
            "id": tool_id,
            "reason": action.get("reason_zh", ""),
            "name": tool_info.get("title", tool_id),
            "icon": tool_info.get("icon", ""),
            "category": tool_info.get("category", ""),
            "rule_id": rule.get("rule_id", ""),
            "tier": rule.get("tier", "DEFAULT"),
            "priority": priority,
        })

        if rule.get("rule_id") not in matched_rules:
            matched_rules.append(rule["rule_id"])
        if best_task is None and rule.get("task"):
            best_task = rule["task"]

        if len(result_tools) >= max_tools:
            break

    # 无匹配 → 使用默认
    if not result_tools:
        for da in config.get("default_actions", [])[:max_tools]:
            tool_id = da.get("tool_id", "")
            tool_info = tools_db.get(tool_id, {})
            result_tools.append({
                "id": tool_id,
                "reason": da.get("reason_zh", ""),
                "name": tool_info.get("title", tool_id),
                "icon": tool_info.get("icon", ""),
                "category": tool_info.get("category", ""),
                "rule_id": "default",
                "tier": "DEFAULT",
                "priority": 0,
            })
        best_task = config.get("default_task")

    return {
        "tools": result_tools,
        "task": best_task,
        "matched_rules": matched_rules,
        "context_snapshot": {
            "checkin": ctx.get("checkin"),
            "trend_direction": ctx.get("trend", {}).get("direction"),
            "hour": ctx.get("context", {}).get("hour"),
            "period": ctx.get("context", {}).get("period"),
        },
    }


# =====================================================
# 近端结果追踪
# =====================================================

def log_recommendation(user_id: str, result: dict) -> list[str]:
    """记录推荐到日志，返回 intervention_id 列表"""
    from app.services.database.supabase_client import is_supabase_available, get_supabase_client

    ids = []
    for tool in result.get("tools", []):
        rec_id = str(uuid4())
        record = {
            "id": rec_id,
            "user_id": user_id,
            "rule_id": tool.get("rule_id", "default"),
            "tool_id": tool.get("id", ""),
            "action_type": "recommend_tool",
            "reason_zh": tool.get("reason", ""),
            "tier": tool.get("tier", "DEFAULT"),
            "priority": tool.get("priority", 0),
            "context_snapshot": result.get("context_snapshot", {}),
            "status": "delivered",
            "created_at": datetime.now().isoformat(),
        }

        if is_supabase_available():
            try:
                sb = get_supabase_client()
                sb.table("recommendation_log").insert(record).execute()
            except Exception as e:
                print(f"Supabase log insert failed: {e}")
                _append_local_log(record)
        else:
            _append_local_log(record)

        ids.append(rec_id)
    return ids


def update_recommendation_status(rec_id: str, status: str, user_id: str, extra: Optional[dict] = None):
    """更新推荐状态 (opened/completed/dismissed)，需验证 user_id"""
    from app.services.database.supabase_client import is_supabase_available, get_supabase_client

    allowed = {"opened", "completed", "dismissed", "abandoned"}
    if status not in allowed:
        return

    update_data: dict[str, Any] = {"status": status}
    if status == "opened":
        update_data["opened_at"] = datetime.now().isoformat()
    elif status == "completed":
        update_data["completed_at"] = datetime.now().isoformat()
    elif status == "dismissed":
        update_data["dismissed_at"] = datetime.now().isoformat()

    # 只允许安全字段
    if extra:
        safe_keys = {"duration_sec", "post_mood", "helpfulness"}
        for k, v in extra.items():
            if k in safe_keys:
                update_data[k] = v

    if is_supabase_available():
        try:
            sb = get_supabase_client()
            sb.table("recommendation_log").update(update_data).eq("id", rec_id).eq("user_id", user_id).execute()
            return
        except Exception as e:
            print(f"Supabase log update failed: {e}")

    # Fallback: 本地 JSON
    logs = _read_json(REC_LOG_FILE)
    for log in logs:
        if log.get("id") == rec_id and log.get("user_id") == user_id:
            log.update(update_data)
            break
    _write_json(REC_LOG_FILE, logs)


def _append_local_log(record: dict):
    logs = _read_json(REC_LOG_FILE)
    logs.append(record)
    if len(logs) > 2000:
        logs = logs[-2000:]
    _write_json(REC_LOG_FILE, logs)


# =====================================================
# 向后兼容接口
# =====================================================

def get_recommendations(
    mood: int, stress: int, energy: int, sleep_quality: int, max_items: int = 2
) -> list[dict]:
    """
    向后兼容 v1 接口。

    返回格式: [{"id": "xxx", "reason": "xxx"}, ...]
    """
    ctx = build_context(checkin={
        "mood": mood,
        "stress": stress,
        "energy": energy,
        "sleep_quality": sleep_quality,
    })
    result = evaluate_rules(ctx, max_tools=max_items)
    # v1 格式: 只要 id + reason
    return [{"id": t["id"], "reason": t["reason"]} for t in result["tools"]]
