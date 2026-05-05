"""
EMA (Ecological Momentary Assessment) API Router

Endpoints for quick mood check-ins throughout the day
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import json
from pathlib import Path

router = APIRouter(prefix="/ema", tags=["EMA"])

# Data storage
DATA_DIR = Path("./data")
EMA_FILE = DATA_DIR / "ema_records.json"

# Initialize
if not DATA_DIR.exists():
    DATA_DIR.mkdir(exist_ok=True)
if not EMA_FILE.exists():
    EMA_FILE.write_text("[]")


class EMARecord(BaseModel):
    """EMA check-in record"""
    moodScore: int  # 1-10
    stressSource: str
    currentActivity: str
    timestamp: str


class EMAResponse(BaseModel):
    """Response after recording EMA"""
    success: bool
    message: str
    intervention: Optional[str] = None


def _load_records() -> List[dict]:
    return json.loads(EMA_FILE.read_text())


def _save_records(data: List[dict]):
    EMA_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2))


@router.post("/record", response_model=EMAResponse)
async def record_ema(record: EMARecord) -> EMAResponse:
    """
    Record an EMA check-in.
    """
    records = _load_records()
    
    record_data = {
        "id": len(records) + 1,
        "moodScore": record.moodScore,
        "stressSource": record.stressSource,
        "currentActivity": record.currentActivity,
        "timestamp": record.timestamp,
        "created_at": datetime.now().isoformat(),
    }
    records.append(record_data)
    _save_records(records)
    
    # Generate intervention based on mood
    intervention = None
    if record.moodScore <= 3:
        intervention = "breathing"
    elif record.moodScore <= 6 and record.stressSource != "none":
        intervention = "journal"
    
    return EMAResponse(
        success=True,
        message="记录成功",
        intervention=intervention,
    )


@router.get("/history")
async def get_ema_history(limit: int = 50):
    """Get EMA history"""
    records = _load_records()
    return {
        "records": records[-limit:][::-1],
        "total": len(records),
    }


@router.get("/today")
async def get_today_ema():
    """Get today's EMA records"""
    records = _load_records()
    today = datetime.now().date().isoformat()
    
    today_records = [r for r in records if r.get("timestamp", "").startswith(today)]
    
    return {
        "count": len(today_records),
        "records": today_records,
        "average_mood": sum(r.get("moodScore", 5) for r in today_records) / len(today_records) if today_records else None,
    }
