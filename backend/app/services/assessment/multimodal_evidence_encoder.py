"""
Multimodal Evidence Encoder
多模态证据编码器

Maps raw biosignal features to PHQ-9 item-level support scores.

Only PHQ-3 (sleep), PHQ-4 (fatigue), PHQ-7 (concentration),
and PHQ-8 (psychomotor) are eligible for biosignal enhancement.

PHQ-9 item 9 (suicidal ideation) is NEVER influenced by biosignals.

Each mapping outputs a support value in [0, 1] indicating how strongly
the biosignal evidence suggests symptom presence for that item.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class BioSignalSnapshot:
    """
    Biosignal values for a single assessment window.
    Mirrors the frontend AggregatedBioSignals + keystroke data.
    """
    # Eye tracking
    avg_blink_rate: float = 0.0     # blinks per minute
    avg_ear: float = 0.0            # eye aspect ratio (0-1)
    fatigue_index: float = 0.0      # PERCLOS percentage (0-100)
    # Voice
    voice_jitter: float = 0.0       # relative jitter % (0-100)
    shimmer: float = 0.0            # relative shimmer % (0-100)
    speaking_duration_s: float = 0.0
    silence_duration_s: float = 0.0
    # Keystroke
    keystroke_anxiety: float = 0.0  # anxiety index (0-100)
    keystroke_focus: float = 0.0    # focus score (0-100)
    pause_frequency: float = 0.0    # pauses per minute
    backspace_rate: float = 0.0     # backspace ratio (0-1)
    # Meta
    sample_count: int = 0


@dataclass
class ItemBioEvidence:
    """Biosignal evidence for a single PHQ-9 item."""
    item_id: int
    support: float  # [0, 1] — how strongly biosignals support this symptom
    contributing_signals: list[str] = field(default_factory=list)


def encode_biosignal_evidence(
    snapshot: BioSignalSnapshot,
) -> dict[int, ItemBioEvidence]:
    """
    Encode a biosignal snapshot into per-item support scores.

    Returns:
        Dictionary mapping PHQ-9 item ID (3,4,7,8) to ItemBioEvidence.
        Items 1,2,5,6,9 are NOT included (text-only or prohibited).
    """
    evidence: dict[int, ItemBioEvidence] = {}

    # --- PHQ-3: Sleep Disturbance ---
    # Indicators: high fatigue (PERCLOS), low voice energy, excessive drowsiness
    phq3_signals = []
    phq3_score = 0.0

    if snapshot.fatigue_index > 0:
        # PERCLOS > 15% suggests fatigue, > 30% moderate, > 50% severe
        fatigue_contrib = min(1.0, snapshot.fatigue_index / 50.0)
        phq3_score += fatigue_contrib * 0.5
        if fatigue_contrib > 0.2:
            phq3_signals.append("fatigue_index_elevated")

    if snapshot.voice_jitter > 0 and snapshot.shimmer > 0:
        # Low voice energy often correlates with poor sleep
        voice_distress = min(1.0, (snapshot.voice_jitter + snapshot.shimmer) / 20.0)
        phq3_score += voice_distress * 0.3
        if voice_distress > 0.2:
            phq3_signals.append("voice_distress_indicators")

    if snapshot.avg_blink_rate > 0:
        # Abnormal blink rate (< 10 or > 30) may indicate fatigue
        if snapshot.avg_blink_rate < 10 or snapshot.avg_blink_rate > 30:
            phq3_score += 0.2
            phq3_signals.append("abnormal_blink_rate")

    evidence[3] = ItemBioEvidence(
        item_id=3,
        support=min(1.0, phq3_score),
        contributing_signals=phq3_signals,
    )

    # --- PHQ-4: Fatigue ---
    # Indicators: PERCLOS, low voice energy, jitter/shimmer, speech activity drop
    phq4_signals = []
    phq4_score = 0.0

    if snapshot.fatigue_index > 0:
        fatigue_contrib = min(1.0, snapshot.fatigue_index / 40.0)
        phq4_score += fatigue_contrib * 0.4
        if fatigue_contrib > 0.2:
            phq4_signals.append("perclos_fatigue")

    if snapshot.voice_jitter > 0:
        # Jitter > 1.04% is clinically significant
        jitter_contrib = min(1.0, snapshot.voice_jitter / 5.0)
        phq4_score += jitter_contrib * 0.25
        if jitter_contrib > 0.2:
            phq4_signals.append("elevated_jitter")

    if snapshot.shimmer > 0:
        # Shimmer > 3.81% is clinically significant
        shimmer_contrib = min(1.0, snapshot.shimmer / 15.0)
        phq4_score += shimmer_contrib * 0.2
        if shimmer_contrib > 0.2:
            phq4_signals.append("elevated_shimmer")

    total_speech = snapshot.speaking_duration_s + snapshot.silence_duration_s
    if total_speech > 5:
        speech_ratio = snapshot.speaking_duration_s / total_speech
        if speech_ratio < 0.3:
            phq4_score += 0.15
            phq4_signals.append("low_speech_activity")

    evidence[4] = ItemBioEvidence(
        item_id=4,
        support=min(1.0, phq4_score),
        contributing_signals=phq4_signals,
    )

    # --- PHQ-7: Concentration Problems ---
    # Indicators: keystroke focus drop, pause frequency, backspace rate
    phq7_signals = []
    phq7_score = 0.0

    if snapshot.keystroke_focus > 0:
        # Low focus score suggests concentration difficulty
        focus_deficit = max(0.0, 1.0 - snapshot.keystroke_focus / 100.0)
        phq7_score += focus_deficit * 0.4
        if focus_deficit > 0.3:
            phq7_signals.append("low_keystroke_focus")

    if snapshot.pause_frequency > 0:
        # High pause frequency suggests cognitive difficulty
        pause_contrib = min(1.0, snapshot.pause_frequency / 20.0)
        phq7_score += pause_contrib * 0.3
        if pause_contrib > 0.2:
            phq7_signals.append("high_pause_frequency")

    if snapshot.backspace_rate > 0:
        # High backspace rate suggests difficulty formulating thoughts
        backspace_contrib = min(1.0, snapshot.backspace_rate / 0.3)
        phq7_score += backspace_contrib * 0.3
        if backspace_contrib > 0.2:
            phq7_signals.append("high_backspace_rate")

    evidence[7] = ItemBioEvidence(
        item_id=7,
        support=min(1.0, phq7_score),
        contributing_signals=phq7_signals,
    )

    # --- PHQ-8: Psychomotor Changes ---
    # Indicators: keystroke variability, speech rhythm instability, long pauses
    phq8_signals = []
    phq8_score = 0.0

    if snapshot.keystroke_anxiety > 0:
        # High anxiety index may indicate psychomotor agitation
        anxiety_contrib = min(1.0, snapshot.keystroke_anxiety / 100.0)
        phq8_score += anxiety_contrib * 0.35
        if anxiety_contrib > 0.3:
            phq8_signals.append("keystroke_agitation")

    if snapshot.voice_jitter > 0 and snapshot.shimmer > 0:
        # Speech rhythm instability
        rhythm_instability = min(
            1.0,
            (snapshot.voice_jitter + snapshot.shimmer) / 15.0,
        )
        phq8_score += rhythm_instability * 0.35
        if rhythm_instability > 0.2:
            phq8_signals.append("speech_rhythm_instability")

    total_speech = snapshot.speaking_duration_s + snapshot.silence_duration_s
    if total_speech > 5 and snapshot.silence_duration_s > 0:
        # Excessive silence suggests psychomotor retardation
        silence_ratio = snapshot.silence_duration_s / total_speech
        if silence_ratio > 0.7:
            phq8_score += 0.3
            phq8_signals.append("excessive_silence")

    evidence[8] = ItemBioEvidence(
        item_id=8,
        support=min(1.0, phq8_score),
        contributing_signals=phq8_signals,
    )

    return evidence
