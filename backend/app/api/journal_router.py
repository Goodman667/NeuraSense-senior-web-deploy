"""
Journal API Router

Endpoints for daily mood journal and gratitude entries
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import json
from pathlib import Path
import os

router = APIRouter(prefix="/journal", tags=["Journal"])

# Data storage
DATA_DIR = Path("./data")
JOURNAL_FILE = DATA_DIR / "journals.json"

# Initialize
if not DATA_DIR.exists():
    DATA_DIR.mkdir(exist_ok=True)
if not JOURNAL_FILE.exists():
    JOURNAL_FILE.write_text("[]")


class JournalEntry(BaseModel):
    """Daily journal entry"""
    mood: str
    mood_name: str
    journal_text: str = ""
    gratitude_items: List[str] = []
    timestamp: str


class JournalResponse(BaseModel):
    """Response after saving journal"""
    success: bool
    ai_response: str
    points_earned: int = 15


def _load_journals() -> List[dict]:
    return json.loads(JOURNAL_FILE.read_text())


def _save_journals(data: List[dict]):
    JOURNAL_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2))


def _generate_ai_response(entry: JournalEntry) -> str:
    """Generate warm AI response based on mood and content"""
    
    mood_responses = {
        "happy": [
            "太棒了！开心的心情值得被记住 🌟",
            "你的好心情感染到我了！继续保持！✨",
        ],
        "calm": [
            "平静是一种力量。享受这份宁静吧 🍃",
            "内心的平和是最珍贵的礼物 🌊",
        ],
        "grateful": [
            "感恩的心让生活更美好！💜",
            "当我们学会感恩，幸福就会离我们更近 🌸",
        ],
        "excited": [
            "期待和兴奋是生活的调味剂！🎉",
            "保持这份热情，你一定会做到！🔥",
        ],
        "tired": [
            "累了就休息一下吧，你已经很努力了 💤",
            "记得照顾好自己，休息也是进步的一部分 🌙",
        ],
        "anxious": [
            "焦虑是正常的情绪。试试深呼吸，我陪着你 🧘",
            "一步一步来，你比自己想象的更强大 💪",
        ],
        "sad": [
            "难过的时候不必强撑。允许自己哭一哭也没关系 💙",
            "这种感觉会过去的。我在这里陪着你 🤗",
        ],
        "angry": [
            "愤怒是正常的情绪。试着深呼吸，释放这些能量 ❤️",
            "感受到这些情绪没关系，重要的是如何处理它们 🌈",
        ],
    }
    
    # Get mood-based response
    responses = mood_responses.get(entry.mood, ["感谢你的分享！记录心情是了解自己的第一步 💜"])
    base_response = responses[hash(entry.timestamp) % len(responses)]
    
    # Add gratitude acknowledgment
    if len(entry.gratitude_items) >= 3:
        base_response += " 你记录的感恩事项真温暖，这个习惯会让你越来越幸福！"
    
    # Add journal content acknowledgment
    if len(entry.journal_text) > 50:
        base_response += " 感谢你愿意写下这么多想法，文字记录是最好的自我对话 📝"
    
    return base_response


@router.post("/daily", response_model=JournalResponse)
async def save_daily_journal(entry: JournalEntry) -> JournalResponse:
    """
    Save daily mood journal entry.
    Returns AI-generated warm response and points earned.
    """
    # Load existing journals
    journals = _load_journals()
    
    # Add new entry
    journal_data = {
        "id": len(journals) + 1,
        "mood": entry.mood,
        "mood_name": entry.mood_name,
        "journal_text": entry.journal_text,
        "gratitude_items": entry.gratitude_items,
        "timestamp": entry.timestamp,
        "created_at": datetime.now().isoformat(),
    }
    journals.append(journal_data)
    _save_journals(journals)
    
    # Calculate points
    points = 5  # Base points for mood check-in
    if entry.journal_text.strip():
        points += 5  # Bonus for journal text
    if len(entry.gratitude_items) >= 3:
        points += 5  # Bonus for gratitude
    
    # Generate AI response
    ai_response = _generate_ai_response(entry)
    
    return JournalResponse(
        success=True,
        ai_response=ai_response,
        points_earned=points,
    )


@router.get("/history")
async def get_journal_history(limit: int = 30):
    """Get recent journal entries"""
    journals = _load_journals()
    return {
        "entries": journals[-limit:][::-1],  # Most recent first
        "total": len(journals),
    }


@router.get("/stats")
async def get_journal_stats():
    """Get journal statistics"""
    journals = _load_journals()
    
    if not journals:
        return {
            "total_entries": 0,
            "mood_distribution": {},
            "gratitude_count": 0,
        }
    
    # Calculate mood distribution
    mood_counts = {}
    gratitude_count = 0
    
    for j in journals:
        mood = j.get("mood_name", "unknown")
        mood_counts[mood] = mood_counts.get(mood, 0) + 1
        gratitude_count += len(j.get("gratitude_items", []))
    
    return {
        "total_entries": len(journals),
        "mood_distribution": mood_counts,
        "gratitude_count": gratitude_count,
    }
