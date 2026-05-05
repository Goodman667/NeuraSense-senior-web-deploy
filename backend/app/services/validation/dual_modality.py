"""
Dual-Modality Validation Service

Compares subjective self-report scores with objective bio-signal data
to detect hidden risks and assessment discrepancies.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Optional


class RiskTag(Enum):
    """Risk classification tags"""
    CONSISTENT = "consistent"           # Subjective and objective match
    HIDDEN_ANXIETY = "hidden_anxiety"   # Low self-report but high bio-signals
    OVER_REPORTING = "over_reporting"   # High self-report but low bio-signals
    ATTENTION_NEEDED = "attention_needed"  # Large discrepancy needs review


@dataclass
class SubjectiveData:
    """Self-reported assessment data"""
    phq9_score: int = 0      # 0-27
    gad7_score: int = 0      # 0-21
    sds_score: int = 0       # 25-100
    sas_score: int = 0       # 25-100
    pss_score: int = 0       # 0-40


@dataclass
class ObjectiveData:
    """Bio-signal derived data"""
    voice_stress_level: float = 50.0      # 0-100
    voice_emotion_score: float = 50.0     # 0-100
    fatigue_index: float = 0.0            # 0-100
    attention_score: float = 50.0         # 0-100
    typing_anxiety_index: float = 30.0    # 0-100
    typing_focus_score: float = 70.0      # 0-100
    stroop_cognitive_score: float = 70.0  # 0-100
    stroop_attention_score: float = 70.0  # 0-100


@dataclass
class ValidationResult:
    """Result of dual-modality validation"""
    subjective_distress_index: float  # 0-100, normalized from questionnaires
    objective_stress_index: float     # 0-100, normalized from bio-signals
    discrepancy_score: float          # Absolute difference
    risk_tag: RiskTag
    hidden_risk_flag: bool
    confidence: float                 # 0-1, based on data quality
    interpretation: str
    recommendations: list[str]


class DualModalityValidator:
    """
    Validates mental health assessment by comparing subjective (questionnaire)
    and objective (bio-signal) data sources.
    
    Key algorithm:
    1. Normalize subjective scores to 0-100 distress index
    2. Aggregate objective signals to 0-100 stress index  
    3. Calculate discrepancy and flag hidden risks
    """
    
    # PHQ-9 severity thresholds
    PHQ9_MAX = 27
    PHQ9_THRESHOLDS = [(4, 'minimal'), (9, 'mild'), (14, 'moderate'), (19, 'moderately_severe'), (27, 'severe')]
    
    # GAD-7 severity thresholds
    GAD7_MAX = 21
    GAD7_THRESHOLDS = [(4, 'minimal'), (9, 'mild'), (14, 'moderate'), (21, 'severe')]
    
    # Discrepancy thresholds
    DISCREPANCY_WARNING = 20  # Trigger warning if diff > 20%
    DISCREPANCY_CRITICAL = 35  # Critical discrepancy
    
    def __init__(self):
        pass
    
    def _normalize_subjective(self, data: SubjectiveData) -> float:
        """
        Normalize subjective questionnaire scores to a unified distress index (0-100).
        Weights: PHQ-9 (40%), GAD-7 (30%), SDS (15%), SAS (15%)
        """
        scores = []
        weights = []
        
        # PHQ-9: 0-27 -> 0-100
        if data.phq9_score > 0:
            scores.append((data.phq9_score / self.PHQ9_MAX) * 100)
            weights.append(0.4)
        
        # GAD-7: 0-21 -> 0-100
        if data.gad7_score > 0:
            scores.append((data.gad7_score / self.GAD7_MAX) * 100)
            weights.append(0.3)
        
        # SDS: 25-100 standardized -> convert to 0-100
        if data.sds_score > 0:
            sds_normalized = max(0, min(100, (data.sds_score - 25) / 75 * 100))
            scores.append(sds_normalized)
            weights.append(0.15)
        
        # SAS: 25-100 standardized -> convert to 0-100  
        if data.sas_score > 0:
            sas_normalized = max(0, min(100, (data.sas_score - 25) / 75 * 100))
            scores.append(sas_normalized)
            weights.append(0.15)
        
        # PSS: 0-40 -> 0-100
        if data.pss_score > 0:
            scores.append((data.pss_score / 40) * 100)
            weights.append(0.2)
        
        if not scores:
            return 0.0
        
        # Normalize weights to sum to 1
        total_weight = sum(weights)
        normalized_weights = [w / total_weight for w in weights]
        
        # Weighted average
        return sum(s * w for s, w in zip(scores, normalized_weights))
    
    def _normalize_objective(self, data: ObjectiveData) -> float:
        """
        Normalize objective bio-signals to a unified stress index (0-100).
        
        High stress indicators:
        - High voice_stress_level
        - Low attention_score (inverted)
        - High typing_anxiety_index
        - Low stroop scores (inverted)
        """
        components = []
        
        # Voice stress: direct mapping
        components.append(data.voice_stress_level * 0.25)
        
        # Fatigue: direct mapping
        components.append(data.fatigue_index * 0.15)
        
        # Attention: invert (low attention = high stress)
        components.append((100 - data.attention_score) * 0.15)
        
        # Typing anxiety: direct mapping
        components.append(data.typing_anxiety_index * 0.20)
        
        # Typing focus: invert (low focus = high stress)
        components.append((100 - data.typing_focus_score) * 0.10)
        
        # Stroop cognitive: invert (low score = high stress)
        components.append((100 - data.stroop_cognitive_score) * 0.15)
        
        return sum(components)
    
    def _determine_risk_tag(
        self, 
        subjective: float, 
        objective: float, 
        discrepancy: float
    ) -> RiskTag:
        """Determine risk classification based on discrepancy pattern"""
        
        if discrepancy <= self.DISCREPANCY_WARNING:
            return RiskTag.CONSISTENT
        
        # Hidden anxiety: reports low distress but bio-signals show high stress
        if subjective < 40 and objective > 60:
            return RiskTag.HIDDEN_ANXIETY
        
        # Over-reporting: reports high distress but bio-signals show low stress
        if subjective > 60 and objective < 40:
            return RiskTag.OVER_REPORTING
        
        return RiskTag.ATTENTION_NEEDED
    
    def _generate_interpretation(self, result: ValidationResult) -> str:
        """Generate human-readable interpretation"""
        
        interpretations = {
            RiskTag.CONSISTENT: 
                "Your self-reported feelings align well with objective indicators. "
                "This suggests good self-awareness about your mental state.",
            
            RiskTag.HIDDEN_ANXIETY:
                "⚠️ IMPORTANT: Your self-assessment indicates low distress, but objective "
                "bio-signals suggest elevated stress levels. This pattern, sometimes called "
                "'masked anxiety', may indicate suppressed emotional awareness. Consider "
                "consulting a mental health professional.",
            
            RiskTag.OVER_REPORTING:
                "Your self-reported distress levels are higher than what objective measures "
                "suggest. This could indicate heightened sensitivity to symptoms or a desire "
                "for support. Either way, your feelings are valid and worth exploring.",
            
            RiskTag.ATTENTION_NEEDED:
                "There's a notable discrepancy between your self-report and objective measures. "
                "This warrants further assessment to better understand your mental health status.",
        }
        
        return interpretations.get(result.risk_tag, "")
    
    def _generate_recommendations(self, result: ValidationResult) -> list[str]:
        """Generate personalized recommendations based on validation result"""
        
        recommendations = []
        
        if result.risk_tag == RiskTag.HIDDEN_ANXIETY:
            recommendations.extend([
                "Practice checking in with your body - notice physical tension, breathing patterns",
                "Consider keeping a brief daily mood journal to build emotional awareness",
                "Speak with a counselor about the discrepancy between how you report feeling and physiological indicators",
            ])
        
        elif result.risk_tag == RiskTag.OVER_REPORTING:
            recommendations.extend([
                "Your distress is real even if bio-signals differ - don't dismiss your feelings",
                "Explore what specific situations or thoughts trigger your distress",
                "Consider cognitive-behavioral techniques to address thought patterns",
            ])
        
        elif result.risk_tag == RiskTag.CONSISTENT:
            if result.subjective_distress_index > 50:
                recommendations.extend([
                    "Your consistent high distress level suggests seeking professional support",
                    "Practice daily relaxation techniques like deep breathing or meditation",
                ])
            else:
                recommendations.extend([
                    "Continue your current healthy practices",
                    "Regular self-check-ins help maintain mental wellness",
                ])
        
        else:
            recommendations.extend([
                "Schedule a comprehensive mental health assessment",
                "Keep tracking both self-reports and bio-signals over time",
            ])
        
        return recommendations
    
    def validate(
        self,
        subjective: SubjectiveData,
        objective: ObjectiveData,
    ) -> ValidationResult:
        """
        Perform dual-modality validation.
        
        Args:
            subjective: Self-reported questionnaire scores
            objective: Bio-signal derived metrics
            
        Returns:
            ValidationResult with discrepancy analysis and recommendations
        """
        # Normalize both data sources
        subj_index = self._normalize_subjective(subjective)
        obj_index = self._normalize_objective(objective)
        
        # Calculate discrepancy
        discrepancy = abs(subj_index - obj_index)
        
        # Determine risk tag
        risk_tag = self._determine_risk_tag(subj_index, obj_index, discrepancy)
        
        # Hidden risk flag
        hidden_risk = risk_tag == RiskTag.HIDDEN_ANXIETY
        
        # Calculate confidence based on data availability
        data_points = sum([
            subjective.phq9_score > 0,
            subjective.gad7_score > 0,
            objective.voice_stress_level != 50.0,
            objective.typing_anxiety_index != 30.0,
        ])
        confidence = min(1.0, data_points / 4)
        
        # Build result
        result = ValidationResult(
            subjective_distress_index=round(subj_index, 1),
            objective_stress_index=round(obj_index, 1),
            discrepancy_score=round(discrepancy, 1),
            risk_tag=risk_tag,
            hidden_risk_flag=hidden_risk,
            confidence=confidence,
            interpretation="",
            recommendations=[],
        )
        
        # Generate interpretation and recommendations
        result.interpretation = self._generate_interpretation(result)
        result.recommendations = self._generate_recommendations(result)
        
        return result


# Global singleton
dual_modality_validator = DualModalityValidator()


def validate_dual_modality(
    subjective: SubjectiveData,
    objective: ObjectiveData,
) -> ValidationResult:
    """
    Main API function for dual-modality validation.
    
    Compares subjective self-reports with objective bio-signals
    to detect hidden risks and discrepancies.
    """
    return dual_modality_validator.validate(subjective, objective)
