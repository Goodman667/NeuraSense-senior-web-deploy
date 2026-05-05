"""
Hidden Distress Index (HDI)
隐性痛苦指数 — 创新点2核心模块

Detects cross-modal discordance: situations where language appears
positive/neutral but objective biosignal indicators show distress.

This is NOT a clinical diagnosis. HDI is a supplementary risk flag
for research and decision support.

Core formula (thesis proposal Eq 5):
    z_obj = weighted objective distress composite
    z_sem = text-derived distress representation (1 - sem_pos)
    z_self = self-reported distress representation

    HDI(t) = max{0, z_obj(t) - z_sem(t)} + η · max{0, z_obj(t) - z_self(t)}

Intuition:
    HDI is high when objective distress EXCEEDS both:
    - what the language implies (cross-modal discordance)
    - what the user self-reports (self-presentation gap)
    HDI is zero when objective distress is low or when language
    and self-report already reflect the distress level.

Naming convention: use "hidden_distress" / "cross-modal discordance",
never "smiling depression" in code or thesis title.
"""

from dataclasses import dataclass, field
from typing import Optional
from enum import Enum


class HiddenDistressRisk(str, Enum):
    """Risk level classification for hidden distress."""
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"


@dataclass
class HDIInput:
    """Input data for HDI computation."""
    # Text sentiment polarity: 1.0 = very positive, 0.0 = very negative
    sem_pos: float = 0.5

    # Objective distress sub-components (all normalized to [0, 1])
    voice_depression_index_norm: float = 0.0
    fatigue_index_norm: float = 0.0
    keystroke_anxiety_norm: float = 0.0
    trend_worsening: float = 0.0

    # Self-report (if available)
    self_report_distress_norm: Optional[float] = None  # [0, 1]

    # Meta
    session_id: str = ""
    turn_id: str = ""


@dataclass
class HDIResult:
    """Output of HDI computation."""
    # Core scores
    sem_pos: float = 0.0           # text positivity [0, 1]
    obj_dist: float = 0.0         # objective distress [0, 1]
    self_report_norm: float = 0.0  # subjective report [0, 1]
    gap_self: float = 0.0         # obj - subj gap [0, 1]
    hdi: float = 0.0              # hidden distress index [0, 1]

    # Classification
    risk_level: HiddenDistressRisk = HiddenDistressRisk.LOW

    # Sub-component scores for explainability
    voice_component: float = 0.0
    fatigue_component: float = 0.0
    keystroke_component: float = 0.0
    trend_component: float = 0.0


# --- Configurable weights ---
# These can be tuned during ablation study

# obj_dist weights (must sum to 1.0)
W_VOICE = 0.40
W_FATIGUE = 0.25
W_KEYSTROKE = 0.20
W_TREND = 0.15

# HDI formula coefficient
ETA = 0.5  # η: weight for self-report gap


def compute_hidden_distress_index(hdi_input: HDIInput) -> HDIResult:
    """
    Compute the Hidden Distress Index (thesis Eq 5).

    HDI(t) = max{0, z_obj - z_sem} + η · max{0, z_obj - z_self}

    where:
        z_obj  = weighted objective distress composite
        z_sem  = text-derived distress level = 1 - sem_pos
        z_self = self-reported distress level (if available)

    HDI > 0 only when objective distress EXCEEDS what language or
    self-report suggest — this is the core discordance signal.

    Args:
        hdi_input: HDIInput with all sub-components

    Returns:
        HDIResult with scores and risk classification
    """
    # Step 1: Compute objective distress composite (z_obj)
    obj_dist = (
        W_VOICE * hdi_input.voice_depression_index_norm
        + W_FATIGUE * hdi_input.fatigue_index_norm
        + W_KEYSTROKE * hdi_input.keystroke_anxiety_norm
        + W_TREND * hdi_input.trend_worsening
    )
    obj_dist = max(0.0, min(1.0, obj_dist))

    # Step 2: Compute semantic distress (z_sem)
    # sem_pos ∈ [0,1] where 1=very positive; z_sem is its complement
    sem_pos = max(0.0, min(1.0, hdi_input.sem_pos))
    z_sem = 1.0 - sem_pos  # higher sem_pos → lower z_sem → larger discordance

    # Step 3: Compute self-report gap
    self_report = hdi_input.self_report_distress_norm
    if self_report is None:
        # When no self-report available, second term is 0
        self_report = obj_dist  # assume no gap
        gap_self = 0.0
    else:
        gap_self = max(0.0, obj_dist - self_report)

    # Step 4: Compute HDI (thesis Eq 5)
    # Term 1: discordance between objective and semantic
    discordance_sem = max(0.0, obj_dist - z_sem)
    # Term 2: discordance between objective and self-report
    discordance_self = gap_self

    hdi = discordance_sem + ETA * discordance_self
    hdi = max(0.0, min(1.0, hdi))

    # Step 5: Classify risk level
    risk_level = _classify_risk(sem_pos, obj_dist, gap_self, hdi)

    return HDIResult(
        sem_pos=round(sem_pos, 3),
        obj_dist=round(obj_dist, 3),
        self_report_norm=round(self_report, 3),
        gap_self=round(gap_self, 3),
        hdi=round(hdi, 3),
        risk_level=risk_level,
        voice_component=round(W_VOICE * hdi_input.voice_depression_index_norm, 3),
        fatigue_component=round(W_FATIGUE * hdi_input.fatigue_index_norm, 3),
        keystroke_component=round(W_KEYSTROKE * hdi_input.keystroke_anxiety_norm, 3),
        trend_component=round(W_TREND * hdi_input.trend_worsening, 3),
    )


def _classify_risk(
    sem_pos: float,
    obj_dist: float,
    gap_self: float,
    hdi: float,
) -> HiddenDistressRisk:
    """
    Classify hidden distress risk level.

    Thresholds reflect the discordance-based formula:
        HIGH:     language is positive (sem_pos >= 0.6) AND
                  objective distress is high (obj_dist >= 0.5) AND
                  HDI is substantial (hdi >= 0.40)
        MODERATE: either clear discordance (hdi >= 0.20, sem_pos >= 0.4),
                  or an early but meaningful discordance pattern where
                  language is relatively calm (sem_pos >= 0.55) while
                  objective distress has already risen (obj_dist >= 0.10,
                  hdi >= 0.10)
        LOW:      otherwise
    """
    if sem_pos >= 0.6 and obj_dist >= 0.5 and hdi >= 0.40:
        return HiddenDistressRisk.HIGH
    elif sem_pos >= 0.55 and obj_dist >= 0.10 and hdi >= 0.10:
        return HiddenDistressRisk.MODERATE
    elif sem_pos >= 0.4 and hdi >= 0.20:
        return HiddenDistressRisk.MODERATE
    else:
        return HiddenDistressRisk.LOW


def compute_voice_depression_index(
    voice_jitter: float,
    shimmer: float,
    speaking_duration_s: float,
    silence_duration_s: float,
) -> float:
    """
    Compute a normalized voice depression proxy score.

    Based on the existing fusion.py logic but normalized to [0, 1].

    Indicators:
    - High jitter (> 1.04% is pathological)
    - High shimmer (> 3.81% is pathological)
    - Low speech activity
    - High silence ratio

    Returns:
        Normalized voice depression index [0, 1]
    """
    score = 0.0

    # Jitter contribution (normal < 1.04%, max concern around 5%)
    if voice_jitter > 1.04:
        score += min(1.0, voice_jitter / 5.0) * 1.0

    # Shimmer contribution (normal < 3.81%, max concern around 15%)
    if shimmer > 3.81:
        score += min(1.0, shimmer / 15.0) * 1.5

    # Speech activity
    total_time = speaking_duration_s + silence_duration_s
    if total_time > 5:
        silence_ratio = silence_duration_s / total_time
        if silence_ratio > 0.5:
            score += min(1.0, (silence_ratio - 0.5) * 4) * 1.0
        speech_rate_low = speaking_duration_s / total_time < 0.3
        if speech_rate_low:
            score += 0.5

    # Normalize to [0, 1] (max possible score ≈ 4.0)
    return min(1.0, score / 4.0)
