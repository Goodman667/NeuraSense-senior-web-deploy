"""
Embedded Assessment Service
嵌入式评估服务 — 创新点1核心编排模块

Orchestrates multimodal embedded conversational assessment by combining:
1. Text evidence from stealth_phq9 (LLM-based)
2. Biosignal evidence from multimodal_evidence_encoder
3. Sensor quality gating from sensor_quality_estimator
4. Confidence calibration from confidence_calibrator

Core formula (from research handoff):
    raw_i(t) = E_text(i,t) + α_i * Q(t) * E_bio(i,t) - β_i * C(i,t)
    candidate_i(t) = clip(round(raw_i(t)), 0, 3)

Safety constraint:
    PHQ-9 item 9 (suicidal ideation) is NEVER updated by biosignals.
"""

from dataclasses import dataclass, field
from typing import Optional
import logging

from .stealth_phq9 import (
    AssessmentManager,
    StealthAssessmentResult,
    PHQ9Update,
)
from .sensor_quality_estimator import (
    SensorQuality,
    estimate_sensor_quality,
)
from .multimodal_evidence_encoder import (
    BioSignalSnapshot,
    ItemBioEvidence,
    encode_biosignal_evidence,
)
from .confidence_calibrator import (
    ItemConfidence,
    calibrate_confidence,
    compute_contradiction,
)

logger = logging.getLogger(__name__)


# --- Per-item biosignal enhancement weights ---
# α_i: how much biosignal can boost a text-derived score
# Items not listed here cannot be biosignal-enhanced
ALPHA = {
    3: 0.8,   # Sleep
    4: 0.9,   # Fatigue — strongest biosignal correlation
    7: 0.6,   # Concentration
    8: 0.6,   # Psychomotor
}

# β_i: contradiction penalty weight
BETA = {
    3: 0.3,
    4: 0.3,
    7: 0.4,
    8: 0.4,
}

# Items that ONLY use text evidence
TEXT_ONLY_ITEMS = {1, 2, 5, 6, 9}

# Items eligible for biosignal enhancement
BIO_ELIGIBLE_ITEMS = {3, 4, 7, 8}


@dataclass
class TurnAssessmentResult:
    """
    Complete assessment output for a single conversation turn.
    This is the structured log record for thesis evaluation.
    """
    turn_id: str = ""
    session_id: str = ""

    # Text-derived evidence
    text_evidence: dict = field(default_factory=dict)
    # Biosignal support per item
    biosignal_support: dict = field(default_factory=dict)
    # Sensor quality
    sensor_quality: dict = field(default_factory=dict)
    # Contradiction values per item
    contradictions: dict = field(default_factory=dict)
    # Confidence per item
    confidences: dict = field(default_factory=dict)

    # Final updated scores (all 9 items)
    updated_scores: dict = field(default_factory=dict)
    total_score: int = 0
    severity_level: str = ""

    # Flags
    risk_flag: bool = False
    clarification_needed: bool = False
    mode: str = "text_only"  # "text_only" or "multimodal"
    condition: str = "C2"    # "C1" / "C2" / "C3"
    fallback_reasons: list = field(default_factory=list)

    # LLM reply (passthrough from stealth_phq9)
    reply_to_user: str = ""
    thought_process: str = ""


class EmbeddedAssessmentService:
    """
    Main orchestrator for Innovation Point 1.

    Call flow:
        1. process_turn() receives user text + biosignal snapshot
        2. stealth_phq9 produces text evidence
        3. If biosignals available: encode → estimate quality → calibrate
        4. Fuse text + bio evidence per item
        5. Update scores via stealth_phq9.update_score_with_confidence()
        6. Return structured TurnAssessmentResult for logging
    """

    def __init__(self, session_id: str = "default"):
        self.assessment_manager = AssessmentManager(session_id=session_id)
        self.session_id = session_id

    def process_turn(
        self,
        user_text: str,
        bio_snapshot: Optional[BioSignalSnapshot] = None,
        turn_id: str = "",
        condition: str = "C2",
    ) -> TurnAssessmentResult:
        """
        Process a single conversation turn with multimodal assessment.

        Args:
            user_text: User's text input
            bio_snapshot: Aggregated biosignal data (None = text-only mode)
            turn_id: Unique turn identifier for logging
            condition: Experimental condition per thesis design
                "C1" = text-only (force text-only regardless of bio data)
                "C2" = full multimodal (quality gating + confidence calibration)
                "C3" = multimodal ablation (NO quality gating, NO confidence calibration)

        Returns:
            TurnAssessmentResult with complete assessment output
        """
        result = TurnAssessmentResult(
            turn_id=turn_id,
            session_id=self.session_id,
            condition=condition,
        )

        # Step 1: Text-based assessment via stealth_phq9
        text_result = self.assessment_manager.process_user_input(user_text)
        result.reply_to_user = text_result.reply_to_user
        result.thought_process = text_result.thought_process
        result.risk_flag = text_result.risk_flag

        # Extract text evidence
        text_evidence_map: dict[int, tuple[int, str]] = {}
        for update in text_result.phq9_updates:
            text_evidence_map[update.symptom_id] = (
                update.score,
                update.confidence,
            )
            result.text_evidence[str(update.symptom_id)] = {
                "score": update.score,
                "confidence": update.confidence,
            }

        # Step 2: Determine mode
        has_bio = (bio_snapshot is not None
                   and bio_snapshot.sample_count > 0)

        # C1 forces text-only regardless of biosignal availability
        if condition == "C1":
            has_bio = False

        if not has_bio:
            # Text-only mode — no biosignal processing
            result.mode = "text_only"
            if condition == "C1":
                result.fallback_reasons.append("forced_text_only_C1")
            elif bio_snapshot is None:
                result.fallback_reasons.append("no_biosignal_data")
            else:
                result.fallback_reasons.append("zero_sample_count")
            result.updated_scores = {
                str(k): v
                for k, v in self.assessment_manager.get_current_scores().items()
            }
            result.total_score = self.assessment_manager.get_total_score()
            result.severity_level = self.assessment_manager.get_severity_level()
            return result

        # Step 3: Multimodal mode (C2 or C3)
        result.mode = "multimodal"

        # C3 ablation: skip quality gating (treat all quality as perfect)
        is_ablation = (condition == "C3")

        # 3a: Estimate sensor quality
        sensor_quality = estimate_sensor_quality(
            sample_count=bio_snapshot.sample_count,
            avg_ear=bio_snapshot.avg_ear if bio_snapshot.avg_ear > 0 else None,
            fatigue_index=bio_snapshot.fatigue_index if bio_snapshot.fatigue_index > 0 else None,
            voice_jitter=bio_snapshot.voice_jitter if bio_snapshot.voice_jitter > 0 else None,
            shimmer=bio_snapshot.shimmer if bio_snapshot.shimmer > 0 else None,
            speaking_duration_s=bio_snapshot.speaking_duration_s,
            silence_duration_s=bio_snapshot.silence_duration_s,
            keystroke_count=0,  # TODO: wire from frontend
            keystroke_anxiety=bio_snapshot.keystroke_anxiety if bio_snapshot.keystroke_anxiety > 0 else None,
            keystroke_focus=bio_snapshot.keystroke_focus if bio_snapshot.keystroke_focus > 0 else None,
        )
        result.sensor_quality = {
            "eye": sensor_quality.eye,
            "voice": sensor_quality.voice,
            "keystroke": sensor_quality.keystroke,
            "overall": sensor_quality.overall,
        }

        # For C3 ablation: override quality to 1.0 (bypass gating)
        effective_quality = 1.0 if is_ablation else sensor_quality.overall

        # 3b: Encode biosignal evidence
        bio_evidence = encode_biosignal_evidence(bio_snapshot)
        for item_id, ev in bio_evidence.items():
            result.biosignal_support[str(item_id)] = round(ev.support, 3)

        # 3c: For each bio-eligible item, compute fused score
        for item_id in BIO_ELIGIBLE_ITEMS:
            alpha = ALPHA[item_id]
            beta = BETA[item_id]

            # Get text evidence for this item (if any in this turn)
            text_score = 0
            text_conf_str = "low"
            if item_id in text_evidence_map:
                text_score, text_conf_str = text_evidence_map[item_id]

            # Get bio evidence
            bio_ev = bio_evidence.get(item_id)
            bio_support = bio_ev.support if bio_ev else 0.0

            # Compute contradiction
            contradiction = compute_contradiction(
                item_id, text_score, bio_support,
            )
            result.contradictions[str(item_id)] = round(contradiction, 3)

            # Skip if no text evidence AND bio support is weak
            if item_id not in text_evidence_map and bio_support < 0.3:
                continue

            # Compute fused raw score (use effective_quality for C2/C3 difference)
            raw_score = (
                text_score
                + alpha * effective_quality * bio_support
                - beta * contradiction
            )
            candidate_score = max(0, min(3, round(raw_score)))

            if is_ablation:
                # C3: skip confidence calibration, always update if candidate > 0
                result.confidences[str(item_id)] = 1.0
                if candidate_score > 0:
                    self.assessment_manager.update_score_with_confidence(
                        symptom_id=item_id,
                        new_score=candidate_score,
                        confidence=1.0,
                        evidence=f"ablation_fused (bio_support={bio_support:.2f})",
                        confidence_threshold=0.0,
                    )
            else:
                # C2: full confidence calibration
                conf_result = calibrate_confidence(
                    item_id=item_id,
                    text_confidence=text_conf_str,
                    sensor_quality_overall=sensor_quality.overall,
                    bio_support=bio_support,
                    text_score=text_score,
                )
                result.confidences[str(item_id)] = round(
                    conf_result.confidence, 3
                )

                # Update score if confident enough
                if conf_result.should_update and candidate_score > 0:
                    updated = self.assessment_manager.update_score_with_confidence(
                        symptom_id=item_id,
                        new_score=candidate_score,
                        confidence=conf_result.confidence,
                        evidence=f"multimodal_fused (bio_support={bio_support:.2f})",
                    )
                    if not updated:
                        logger.debug(
                            "Score update rejected for item %d "
                            "(candidate=%d, conf=%.3f)",
                            item_id, candidate_score, conf_result.confidence,
                        )

        # Step 4: Compile final scores
        result.updated_scores = {
            str(k): v
            for k, v in self.assessment_manager.get_current_scores().items()
        }
        result.total_score = self.assessment_manager.get_total_score()
        result.severity_level = self.assessment_manager.get_severity_level()

        # Check if clarification might be needed
        high_contradiction_items = [
            int(k) for k, v in result.contradictions.items()
            if v > 0.5
        ]
        if high_contradiction_items:
            result.clarification_needed = True
            logger.info(
                "High contradiction on items %s — clarification suggested",
                high_contradiction_items,
            )

        return result

    def get_assessment_summary(self) -> dict:
        """Proxy to underlying AssessmentManager."""
        return self.assessment_manager.get_assessment_summary()

    def reset(self):
        """Reset session state."""
        self.assessment_manager.reset_session()
