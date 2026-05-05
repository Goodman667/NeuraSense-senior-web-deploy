"""
Discordance Reasoner
不一致性推理器 — 创新点2解释模块

Generates explainable reasons for hidden distress flags.
This is essential for thesis: reviewers need to understand
WHY a user was flagged, not just the score.

The reasoner is intentionally rule-based (not ML) because:
1. Fully interpretable — every flag has a traceable rule
2. Reproducible — same inputs always produce same explanation
3. Auditable — safety reviewers can inspect all logic
4. Sufficient for pilot study scale

Output format follows the research handoff template.
"""

from dataclasses import dataclass, field
from typing import Optional

from app.services.emotion.hidden_distress_index import HDIResult, HiddenDistressRisk


@dataclass
class DiscordanceEvent:
    """
    A single discordance event with full explanation.
    This record is stored in the hidden_distress_events table.
    """
    # Identification
    session_id: str = ""
    turn_id: str = ""

    # HDI scores (copied from HDIResult for flat storage)
    sem_pos: float = 0.0
    obj_dist: float = 0.0
    self_report_norm: float = 0.0
    gap_self: float = 0.0
    hdi: float = 0.0
    risk_level: str = "low"

    # Explanation
    signals: dict = field(default_factory=dict)
    reasons: list[str] = field(default_factory=list)

    # Raw sub-components for analysis
    voice_component: float = 0.0
    fatigue_component: float = 0.0
    keystroke_component: float = 0.0
    trend_component: float = 0.0


def generate_discordance_explanation(
    hdi_result: HDIResult,
    # Optional raw signal values for richer explanations
    voice_jitter: float = 0.0,
    shimmer: float = 0.0,
    fatigue_index: float = 0.0,
    keystroke_anxiety: float = 0.0,
    keystroke_focus: float = 0.0,
    speaking_duration_s: float = 0.0,
    silence_duration_s: float = 0.0,
    session_id: str = "",
    turn_id: str = "",
) -> DiscordanceEvent:
    """
    Generate an explainable discordance event from HDI results.

    Args:
        hdi_result: Computed HDI result
        voice_jitter: Raw jitter % for signal-level explanation
        shimmer: Raw shimmer % for signal-level explanation
        fatigue_index: PERCLOS fatigue (0-100)
        keystroke_anxiety: Keystroke anxiety index (0-100)
        keystroke_focus: Keystroke focus score (0-100)
        speaking_duration_s: Speaking time in seconds
        silence_duration_s: Silence time in seconds
        session_id: Session identifier
        turn_id: Turn identifier

    Returns:
        DiscordanceEvent with signals and human-readable reasons
    """
    signals: dict[str, bool] = {}
    reasons: list[str] = []

    # --- Signal detection ---

    # 1. Positive/neutral language
    positive_language = hdi_result.sem_pos >= 0.5
    signals["positive_or_neutral_language"] = positive_language

    # 2. Low voice energy / high jitter
    low_voice_energy = voice_jitter > 2.0 or shimmer > 5.0
    signals["voice_distress_indicators"] = low_voice_energy

    # 3. High pause ratio
    total_time = speaking_duration_s + silence_duration_s
    high_pause_ratio = False
    if total_time > 5:
        silence_ratio = silence_duration_s / total_time
        high_pause_ratio = silence_ratio > 0.6
    signals["high_pause_ratio"] = high_pause_ratio

    # 4. Fatigue index elevated
    fatigue_high = fatigue_index > 20.0
    signals["fatigue_index_high"] = fatigue_high

    # 5. Keystroke anxiety elevated
    keystroke_distress = keystroke_anxiety > 50.0
    signals["keystroke_anxiety_elevated"] = keystroke_distress

    # 6. Low focus score
    low_focus = keystroke_focus < 40.0 and keystroke_focus > 0
    signals["low_keystroke_focus"] = low_focus

    # 7. Self-report lower than objective
    low_self_report = hdi_result.gap_self > 0.15
    signals["low_self_report_relative_to_objective_state"] = low_self_report

    # --- Reason generation ---

    if positive_language and hdi_result.obj_dist >= 0.5:
        reasons.append(
            "Positive or neutral language co-occurred with "
            "elevated objective distress features."
        )

    if low_voice_energy and positive_language:
        reasons.append(
            "Voice-based indicators (jitter/shimmer) suggest distress "
            "despite positive verbal content."
        )

    if fatigue_high:
        reasons.append(
            "Fatigue indicators (PERCLOS) remained elevated, "
            "suggesting physical exhaustion not reflected in language."
        )

    if high_pause_ratio:
        reasons.append(
            "High silence-to-speech ratio may indicate "
            "psychomotor retardation or hesitation."
        )

    if keystroke_distress or low_focus:
        parts = []
        if keystroke_distress:
            parts.append("elevated typing anxiety")
        if low_focus:
            parts.append("reduced typing focus")
        reasons.append(
            f"Keystroke dynamics show {' and '.join(parts)}, "
            "suggesting cognitive or emotional strain."
        )

    if low_self_report:
        reasons.append(
            "Objective distress signals exceed self-reported distress level, "
            "suggesting possible underreporting."
        )

    # If no specific reasons but risk is moderate/high, add generic
    if not reasons and hdi_result.risk_level != HiddenDistressRisk.LOW:
        reasons.append(
            "Cross-modal discordance detected between language sentiment "
            "and objective biosignal indicators."
        )

    return DiscordanceEvent(
        session_id=session_id,
        turn_id=turn_id,
        sem_pos=hdi_result.sem_pos,
        obj_dist=hdi_result.obj_dist,
        self_report_norm=hdi_result.self_report_norm,
        gap_self=hdi_result.gap_self,
        hdi=hdi_result.hdi,
        risk_level=hdi_result.risk_level.value,
        signals=signals,
        reasons=reasons,
        voice_component=hdi_result.voice_component,
        fatigue_component=hdi_result.fatigue_component,
        keystroke_component=hdi_result.keystroke_component,
        trend_component=hdi_result.trend_component,
    )


def to_log_dict(event: DiscordanceEvent) -> dict:
    """Convert DiscordanceEvent to a flat dict for database insertion."""
    return {
        "session_id": event.session_id,
        "turn_id": event.turn_id,
        "sem_pos": event.sem_pos,
        "obj_dist": event.obj_dist,
        "self_report_norm": event.self_report_norm,
        "gap_self": event.gap_self,
        "hdi": event.hdi,
        "risk_level": event.risk_level,
        "reason_json": {
            "signals": event.signals,
            "reasons": event.reasons,
        },
        "voice_component": event.voice_component,
        "fatigue_component": event.fatigue_component,
        "keystroke_component": event.keystroke_component,
        "trend_component": event.trend_component,
    }
