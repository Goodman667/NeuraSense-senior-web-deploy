"""
Confidence Calibrator
置信度校准器

Computes per-item update confidence for multimodal assessment.

Confidence determines whether a PHQ-9 score update should be applied.
High confidence → update allowed; low confidence → skip update.

Formula (from research handoff):
    Conf(i,t) = sigmoid(
        γ1 * text_conf
      + γ2 * Q(t)
      + γ3 * modality_consistency
      - γ4 * contradiction_strength
    )
"""

import math
from dataclasses import dataclass


@dataclass
class ItemConfidence:
    """Confidence result for a single PHQ-9 item update."""
    item_id: int
    confidence: float           # [0, 1]
    text_confidence_term: float
    quality_term: float
    consistency_term: float
    contradiction_term: float
    should_update: bool         # True if confidence >= threshold


# Default parameters (can be tuned via ablation study)
_GAMMA = {
    "text_conf": 2.0,       # γ1: weight for text confidence
    "quality": 1.5,          # γ2: weight for sensor quality
    "consistency": 1.0,      # γ3: weight for modality agreement
    "contradiction": 2.0,    # γ4: penalty for contradictions
}

# Per-item confidence thresholds
# Items with stronger biosignal mapping get lower thresholds
_THRESHOLDS = {
    3: 0.55,  # Sleep — strong fatigue signal
    4: 0.55,  # Fatigue — strong PERCLOS/voice signal
    7: 0.60,  # Concentration — keystroke signals less direct
    8: 0.60,  # Psychomotor — mixed signal sources
}

DEFAULT_THRESHOLD = 0.65


def _sigmoid(x: float) -> float:
    """Numerically stable sigmoid."""
    if x >= 0:
        return 1.0 / (1.0 + math.exp(-x))
    else:
        exp_x = math.exp(x)
        return exp_x / (1.0 + exp_x)


def _text_confidence_to_numeric(confidence_str: str) -> float:
    """Convert LLM text confidence label to numeric value."""
    mapping = {
        "high": 0.9,
        "medium": 0.6,
        "low": 0.3,
    }
    return mapping.get(confidence_str.lower(), 0.5)


def calibrate_confidence(
    item_id: int,
    text_confidence: str,
    sensor_quality_overall: float,
    bio_support: float,
    text_score: int,
    threshold: float = None,
) -> ItemConfidence:
    """
    Compute confidence for a single PHQ-9 item update.

    Args:
        item_id: PHQ-9 dimension (1-9)
        text_confidence: LLM confidence label ("low"/"medium"/"high")
        sensor_quality_overall: Overall sensor quality Q(t) ∈ [0,1]
        bio_support: Biosignal support for this item E_bio(i,t) ∈ [0,1]
        text_score: Text-derived score for this item (0-3)
        threshold: Override confidence threshold

    Returns:
        ItemConfidence with calibrated confidence and update decision
    """
    if threshold is None:
        threshold = _THRESHOLDS.get(item_id, DEFAULT_THRESHOLD)

    text_conf_num = _text_confidence_to_numeric(text_confidence)

    # Modality consistency: do text and bio agree?
    # If text says high score and bio support is high → consistent
    # If text says low score but bio support is high → inconsistent
    text_severity = text_score / 3.0  # normalize to [0,1]
    consistency = 1.0 - abs(text_severity - bio_support)
    consistency = max(0.0, consistency)

    # Contradiction: text and bio strongly disagree
    contradiction = max(0.0, abs(text_severity - bio_support) - 0.3)

    # Compute raw logit
    logit = (
        _GAMMA["text_conf"] * text_conf_num
        + _GAMMA["quality"] * sensor_quality_overall
        + _GAMMA["consistency"] * consistency
        - _GAMMA["contradiction"] * contradiction
    )

    confidence = _sigmoid(logit - 2.5)  # offset to center around 0.5

    return ItemConfidence(
        item_id=item_id,
        confidence=round(confidence, 4),
        text_confidence_term=round(text_conf_num, 3),
        quality_term=round(sensor_quality_overall, 3),
        consistency_term=round(consistency, 3),
        contradiction_term=round(contradiction, 3),
        should_update=confidence >= threshold,
    )


def compute_contradiction(
    item_id: int,
    text_score: int,
    bio_support: float,
) -> float:
    """
    Compute contradiction strength between text evidence and biosignal.

    Returns value in [0, 1] where 0 = no contradiction, 1 = full contradiction.
    Used both in confidence calibration and in the assessment output log.
    """
    text_severity = text_score / 3.0
    raw_diff = abs(text_severity - bio_support)
    # Only count as contradiction if difference exceeds noise margin
    return max(0.0, min(1.0, raw_diff - 0.2))
