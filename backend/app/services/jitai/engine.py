"""
JITAI Engine Service - Just-in-Time Adaptive Interventions

Computes vulnerability state and selects personalized interventions.
"""

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, asdict
from enum import Enum


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class InterventionType(str, Enum):
    BREATHING = "breathing"
    CBT = "cbt"
    GRATITUDE = "gratitude"
    COMMUNITY = "community"


@dataclass
class EMAData:
    mood: float  # 1-10
    stress_sources: List[str]
    activity: Optional[str] = None


@dataclass
class BioSignals:
    fatigue_index: float  # 0-1
    blink_rate: Optional[float] = None
    voice_stress: Optional[float] = None


@dataclass
class TimeContext:
    hour: int  # 0-23
    day_of_week: Optional[int] = None  # 0=Monday, 6=Sunday


@dataclass
class JITAIInput:
    user_id: str
    ema: Optional[EMAData] = None
    bio_signals: Optional[BioSignals] = None
    journal_emotion: Optional[str] = None
    scale_trend: Optional[float] = None  # -1 to 1, negative = worsening
    context: Optional[TimeContext] = None


@dataclass
class Intervention:
    type: InterventionType
    title: str
    description: str
    duration_seconds: int
    action_data: Optional[Dict] = None


@dataclass
class JITAIResult:
    vulnerability_score: float
    risk_level: RiskLevel
    trigger_intervention: bool
    intervention: Optional[Intervention] = None
    intervention_id: Optional[str] = None
    contributing_factors: Optional[List[str]] = None


# Intervention templates
INTERVENTIONS = {
    InterventionType.BREATHING: Intervention(
        type=InterventionType.BREATHING,
        title="深呼吸放松",
        description="让我们一起做一个简短的呼吸练习，帮助你放松身心。跟随呼吸球的节奏，慢慢吸气...慢慢呼气...",
        duration_seconds=60,
        action_data={"breath_in": 4, "hold": 4, "breath_out": 4}
    ),
    InterventionType.CBT: Intervention(
        type=InterventionType.CBT,
        title="认知重构练习",
        description="让我们来做一个简短的认知练习，帮助你换个角度看问题。",
        duration_seconds=180,
        action_data={"steps": ["识别想法", "检验证据", "替代想法"]}
    ),
    InterventionType.GRATITUDE: Intervention(
        type=InterventionType.GRATITUDE,
        title="感恩时刻",
        description="花一分钟想想今天让你感激的三件小事，无论多小都可以。",
        duration_seconds=90,
        action_data={"prompts": ["今天有什么让你微笑的事？", "有谁帮助过你？", "你的身体今天帮你做了什么？"]}
    ),
    InterventionType.COMMUNITY: Intervention(
        type=InterventionType.COMMUNITY,
        title="温暖社区",
        description="看看社区里其他人分享的正能量故事，你并不孤单。",
        duration_seconds=120,
        action_data={"show_posts": 3, "category": "encouragement"}
    ),
}

# Emotion to score mapping
EMOTION_SCORES = {
    "happy": 0.1, "joyful": 0.1, "excited": 0.15,
    "calm": 0.2, "peaceful": 0.2, "content": 0.25,
    "neutral": 0.4, "okay": 0.4,
    "tired": 0.55, "bored": 0.5,
    "sad": 0.7, "down": 0.65, "lonely": 0.7,
    "anxious": 0.75, "worried": 0.7, "stressed": 0.75,
    "angry": 0.7, "frustrated": 0.65,
    "depressed": 0.85, "hopeless": 0.9,
}


class JITAIEngine:
    """
    Just-in-Time Adaptive Interventions Engine
    
    Computes vulnerability score from multi-modal inputs
    and selects personalized interventions.
    """
    
    # Feature weights for vulnerability calculation
    WEIGHTS = {
        "ema_mood": 0.25,
        "stress_count": 0.15,
        "bio_fatigue": 0.20,
        "journal_emotion": 0.15,
        "scale_trend": 0.15,
        "time_risk": 0.10,
    }
    
    # Thresholds
    HIGH_RISK_THRESHOLD = 0.7
    MEDIUM_RISK_THRESHOLD = 0.4
    
    def __init__(self, data_dir: Path = Path("./data")):
        self.data_dir = data_dir
        self.interventions_file = data_dir / "jitai_interventions.json"
        self._ensure_data_dir()
    
    def _ensure_data_dir(self):
        self.data_dir.mkdir(exist_ok=True)
        if not self.interventions_file.exists():
            self.interventions_file.write_text("[]")
    
    def _load_interventions(self) -> List[Dict]:
        try:
            return json.loads(self.interventions_file.read_text())
        except:
            return []
    
    def _save_intervention(self, record: Dict):
        records = self._load_interventions()
        records.append(record)
        # Keep last 1000 records
        if len(records) > 1000:
            records = records[-1000:]
        self.interventions_file.write_text(json.dumps(records, ensure_ascii=False, indent=2))
    
    def compute_vulnerability(self, input_data: JITAIInput) -> tuple[float, List[str]]:
        """
        Compute vulnerability score from multi-modal inputs.
        
        Returns:
            (vulnerability_score, contributing_factors)
        """
        scores = {}
        factors = []
        
        # 1. EMA Mood (reverse: lower mood = higher vulnerability)
        if input_data.ema and input_data.ema.mood:
            # Convert 1-10 scale to 0-1 vulnerability (reverse)
            mood_vulnerability = (10 - input_data.ema.mood) / 9
            scores["ema_mood"] = mood_vulnerability
            if mood_vulnerability > 0.6:
                factors.append(f"心情较低 ({int(input_data.ema.mood)}/10)")
        
        # 2. Stress source count
        if input_data.ema and input_data.ema.stress_sources:
            stress_count = len(input_data.ema.stress_sources)
            # Normalize: 0 sources = 0, 5+ sources = 1
            stress_vulnerability = min(stress_count / 5, 1.0)
            scores["stress_count"] = stress_vulnerability
            if stress_count >= 2:
                factors.append(f"多重压力源 ({stress_count}个)")
        
        # 3. Bio-signal fatigue
        if input_data.bio_signals and input_data.bio_signals.fatigue_index is not None:
            fatigue = input_data.bio_signals.fatigue_index
            scores["bio_fatigue"] = fatigue
            if fatigue > 0.6:
                factors.append("疲劳指数偏高")
        
        # 4. Journal emotion
        if input_data.journal_emotion:
            emotion_lower = input_data.journal_emotion.lower()
            emotion_score = EMOTION_SCORES.get(emotion_lower, 0.4)
            scores["journal_emotion"] = emotion_score
            if emotion_score > 0.6:
                factors.append(f"日记情绪: {input_data.journal_emotion}")
        
        # 5. Scale trend (negative = worsening)
        if input_data.scale_trend is not None:
            # Convert -1 to 1 range to 0-1 vulnerability
            # -1 (worsening) -> 1, +1 (improving) -> 0
            trend_vulnerability = (1 - input_data.scale_trend) / 2
            scores["scale_trend"] = trend_vulnerability
            if input_data.scale_trend < -0.2:
                factors.append("量表分数下降趋势")
        
        # 6. Time context risk
        if input_data.context and input_data.context.hour is not None:
            hour = input_data.context.hour
            # Late night (23-5) = higher risk
            if 23 <= hour or hour <= 5:
                time_risk = 0.8
                factors.append("深夜时段")
            elif 22 <= hour <= 23 or 5 < hour <= 7:
                time_risk = 0.5
            else:
                time_risk = 0.2
            scores["time_risk"] = time_risk
        
        # Calculate weighted sum
        total_weight = 0
        total_score = 0
        for key, weight in self.WEIGHTS.items():
            if key in scores:
                total_score += scores[key] * weight
                total_weight += weight
        
        # Normalize if not all features present
        if total_weight > 0:
            vulnerability = total_score / total_weight
        else:
            vulnerability = 0.3  # Default baseline
        
        return min(max(vulnerability, 0), 1), factors  # Clamp to 0-1
    
    def get_risk_level(self, vulnerability: float) -> RiskLevel:
        if vulnerability >= self.HIGH_RISK_THRESHOLD:
            return RiskLevel.HIGH
        elif vulnerability >= self.MEDIUM_RISK_THRESHOLD:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW
    
    def select_intervention(
        self, 
        user_id: str, 
        input_data: JITAIInput,
        user_profile: Optional[Dict] = None
    ) -> InterventionType:
        """
        Select intervention type based on user profile and context.
        """
        # Check user preferences from profile
        if user_profile:
            preference = user_profile.get("intervention_preference")
            if preference and preference in InterventionType.__members__:
                return InterventionType(preference)
        
        # Context-based selection
        if input_data.journal_emotion:
            emotion = input_data.journal_emotion.lower()
            if emotion in ["anxious", "worried", "stressed"]:
                return InterventionType.BREATHING
            elif emotion in ["sad", "lonely", "down"]:
                return InterventionType.COMMUNITY
            elif emotion in ["angry", "frustrated"]:
                return InterventionType.CBT
        
        # Time-based selection
        if input_data.context and input_data.context.hour:
            hour = input_data.context.hour
            if 6 <= hour <= 10:  # Morning
                return InterventionType.GRATITUDE
            elif 22 <= hour or hour <= 2:  # Night
                return InterventionType.BREATHING
        
        # EMA activity based
        if input_data.ema and input_data.ema.activity:
            activity = input_data.ema.activity.lower()
            if activity in ["working", "studying"]:
                return InterventionType.BREATHING
            elif activity in ["resting", "relaxing"]:
                return InterventionType.GRATITUDE
        
        # Default
        return InterventionType.BREATHING
    
    def process(
        self, 
        input_data: JITAIInput,
        user_profile: Optional[Dict] = None
    ) -> JITAIResult:
        """
        Main engine process - compute vulnerability and generate intervention.
        """
        vulnerability, factors = self.compute_vulnerability(input_data)
        risk_level = self.get_risk_level(vulnerability)
        
        # Determine if intervention should trigger
        trigger = vulnerability >= self.HIGH_RISK_THRESHOLD
        
        intervention = None
        intervention_id = None
        
        if trigger:
            intervention_type = self.select_intervention(
                input_data.user_id, 
                input_data, 
                user_profile
            )
            intervention = INTERVENTIONS[intervention_type]
            intervention_id = str(uuid.uuid4())
            
            # Record intervention
            self._save_intervention({
                "id": intervention_id,
                "user_id": input_data.user_id,
                "timestamp": datetime.now().isoformat(),
                "vulnerability_score": vulnerability,
                "risk_level": risk_level.value,
                "intervention_type": intervention_type.value,
                "factors": factors,
                "accepted": None,
                "post_mood": None,
            })
        
        return JITAIResult(
            vulnerability_score=round(vulnerability, 3),
            risk_level=risk_level,
            trigger_intervention=trigger,
            intervention=intervention,
            intervention_id=intervention_id,
            contributing_factors=factors if factors else None,
        )
    
    def record_feedback(
        self, 
        intervention_id: str, 
        accepted: bool, 
        post_mood: Optional[float] = None
    ) -> bool:
        """
        Record whether user accepted intervention and their post-intervention mood.
        """
        records = self._load_interventions()
        
        for record in records:
            if record.get("id") == intervention_id:
                record["accepted"] = accepted
                record["post_mood"] = post_mood
                record["feedback_time"] = datetime.now().isoformat()
                self.interventions_file.write_text(
                    json.dumps(records, ensure_ascii=False, indent=2)
                )
                return True
        
        return False
    
    def get_user_history(self, user_id: str, limit: int = 20) -> List[Dict]:
        """
        Get intervention history for a user.
        """
        records = self._load_interventions()
        user_records = [r for r in records if r.get("user_id") == user_id]
        return user_records[-limit:]
    
    def get_acceptance_rate(self, user_id: Optional[str] = None) -> Dict:
        """
        Calculate intervention acceptance rate for model evaluation.
        """
        records = self._load_interventions()
        
        if user_id:
            records = [r for r in records if r.get("user_id") == user_id]
        
        accepted_records = [r for r in records if r.get("accepted") is not None]
        
        if not accepted_records:
            return {"total": 0, "accepted": 0, "rate": 0}
        
        total = len(accepted_records)
        accepted = sum(1 for r in accepted_records if r.get("accepted"))
        
        # Calculate mood improvement for accepted interventions
        mood_improvements = []
        for r in accepted_records:
            if r.get("accepted") and r.get("post_mood") and r.get("vulnerability_score"):
                # Compare post-mood (1-10) with pre-vulnerability
                pre_mood = (1 - r["vulnerability_score"]) * 9 + 1  # Convert back to 1-10
                improvement = r["post_mood"] - pre_mood
                mood_improvements.append(improvement)
        
        return {
            "total": total,
            "accepted": accepted,
            "rate": round(accepted / total, 2) if total > 0 else 0,
            "avg_mood_improvement": round(sum(mood_improvements) / len(mood_improvements), 2) if mood_improvements else None,
        }


# Singleton instance
_engine: Optional[JITAIEngine] = None

def get_jitai_engine() -> JITAIEngine:
    global _engine
    if _engine is None:
        _engine = JITAIEngine()
    return _engine
