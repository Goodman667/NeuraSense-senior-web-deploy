"""
Sensor Quality Estimator
传感器质量评估模块

Estimates the reliability of each biosignal modality based on
data availability, coverage, and noise indicators.

Used as a gating mechanism: when sensor quality is low, biosignal
evidence is downweighted or excluded from assessment updates.

Reference formula (from research handoff):
    Q_eye   = min(1.0, valid_face_frames / expected_frames)
    Q_voice = min(1.0, voiced_seconds / 20.0) * (1 - noise_ratio)
    Q_key   = min(1.0, keystroke_count / 30.0)
    Q(t)    = weighted_mean(available_modalities)
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class SensorQuality:
    """Per-modality and overall sensor quality scores."""
    eye: float = 0.0       # [0, 1]
    voice: float = 0.0     # [0, 1]
    keystroke: float = 0.0  # [0, 1]
    overall: float = 0.0   # [0, 1]
    available_modalities: list[str] = None

    def __post_init__(self):
        if self.available_modalities is None:
            self.available_modalities = []


# Default modality weights (sum = 1.0)
_WEIGHTS = {
    "eye": 0.35,
    "voice": 0.35,
    "keystroke": 0.30,
}


def estimate_sensor_quality(
    # Eye tracking indicators
    sample_count: int = 0,
    avg_ear: Optional[float] = None,
    fatigue_index: Optional[float] = None,
    # Voice indicators
    voice_jitter: Optional[float] = None,
    shimmer: Optional[float] = None,
    speaking_duration_s: float = 0.0,
    silence_duration_s: float = 0.0,
    # Keystroke indicators
    keystroke_count: int = 0,
    keystroke_anxiety: Optional[float] = None,
    keystroke_focus: Optional[float] = None,
) -> SensorQuality:
    """
    Estimate quality for each modality and compute overall score.

    The approach is intentionally simple and rule-based so that
    it can be clearly described in the thesis Methods section.

    Args:
        sample_count: Number of aggregated bio-signal samples
        avg_ear: Average eye aspect ratio (None = camera unavailable)
        fatigue_index: PERCLOS-based fatigue (None = camera unavailable)
        voice_jitter: Jitter % (None = mic unavailable)
        shimmer: Shimmer % (None = mic unavailable)
        speaking_duration_s: Total speaking time in seconds
        silence_duration_s: Total silence time in seconds
        keystroke_count: Number of keystrokes in window
        keystroke_anxiety: Keystroke anxiety index (None = no typing)
        keystroke_focus: Keystroke focus score (None = no typing)

    Returns:
        SensorQuality with per-modality and overall scores
    """
    available = []
    q_eye = 0.0
    q_voice = 0.0
    q_key = 0.0

    # --- Eye quality ---
    # Eye data is valid when we have face frames and EAR readings
    if avg_ear is not None and sample_count > 0:
        # Coverage: how many samples vs expected (5s window @ ~30fps → ~150)
        coverage = min(1.0, sample_count / 30.0)
        # EAR sanity: valid range is roughly 0.15-0.45
        ear_valid = 1.0 if 0.10 <= avg_ear <= 0.50 else 0.5
        q_eye = coverage * ear_valid
        available.append("eye")

    # --- Voice quality ---
    # Voice data is valid when we have jitter readings and speech
    if voice_jitter is not None:
        total_audio_s = speaking_duration_s + silence_duration_s
        # Need at least some voiced duration for meaningful features
        speech_coverage = min(1.0, speaking_duration_s / 10.0)
        # If mostly silence, voice features are less reliable
        noise_penalty = 1.0
        if total_audio_s > 0:
            silence_ratio = silence_duration_s / total_audio_s
            noise_penalty = max(0.3, 1.0 - silence_ratio * 0.5)
        q_voice = speech_coverage * noise_penalty
        available.append("voice")

    # --- Keystroke quality ---
    if keystroke_count > 0 and (keystroke_anxiety is not None
                                or keystroke_focus is not None):
        # Need enough keystrokes for statistical validity
        q_key = min(1.0, keystroke_count / 30.0)
        available.append("keystroke")

    # --- Overall quality (weighted mean of available modalities) ---
    if available:
        weight_sum = sum(_WEIGHTS[m] for m in available)
        weighted_total = 0.0
        for m in available:
            score = {"eye": q_eye, "voice": q_voice, "keystroke": q_key}[m]
            weighted_total += _WEIGHTS[m] * score
        q_overall = weighted_total / weight_sum
    else:
        q_overall = 0.0

    return SensorQuality(
        eye=round(q_eye, 3),
        voice=round(q_voice, 3),
        keystroke=round(q_key, 3),
        overall=round(q_overall, 3),
        available_modalities=available,
    )
