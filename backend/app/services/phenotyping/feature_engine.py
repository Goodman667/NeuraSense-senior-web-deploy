"""
Feature Engineering Service

Transforms raw passive sensing data (wearables) and active biomarkers
into standardized feature vectors for ML models.
"""

from typing import Dict, Any, List, Optional
import numpy as np
from datetime import datetime, timedelta

class FeatureEngine:
    def __init__(self):
        # Baseline values for normalization
        self.baselines = {
            "hrv": 50.0,
            "sleep_duration": 420.0,  # 7 hours
            "step_count": 5000.0,
            "activity_entropy": 0.5,
            "voice_jitter": 0.05,
            "typing_speed": 180.0
        }

    def process_passive_features(self, raw_data: Dict[str, Any]) -> Dict[str, float]:
        """
        Process raw wearable/sensor data into features.
        
        Args:
            raw_data: Dictionary containing:
                - hrv_mean (ms)
                - sleep_minutes (int)
                - step_count (int)
                - active_minutes (int)
                - heart_rate_series (List[int])
        """
        features = {}
        
        # 1. Physiology Features
        features["hrv_normalized"] = self._normalize(
            raw_data.get("hrv_mean", self.baselines["hrv"]), 
            self.baselines["hrv"]
        )
        
        features["sleep_efficiency_proxy"] = min(1.0, raw_data.get("sleep_minutes", 420) / 480.0)
        
        # 2. Activity Features
        steps = raw_data.get("step_count", 5000)
        features["log_steps"] = np.log1p(steps)
        features["sedentary_ratio"] = 1.0 - (raw_data.get("active_minutes", 30) / (16 * 60))

        # 3. Time-series derived (mocked if raw series absent)
        if "heart_rate_series" in raw_data and raw_data["heart_rate_series"]:
            features["hr_volatility"] = np.std(raw_data["heart_rate_series"])
        else:
            features["hr_volatility"] = 10.0

        return features

    def process_active_features(self, raw_data: Dict[str, Any]) -> Dict[str, float]:
        """
        Process active biomarkers (voice, eye, keystroke).
        """
        features = {}
        
        features["voice_stress"] = raw_data.get("voice_jitter", 0.05) * 10 
        features["fatigue_level"] = raw_data.get("fatigue_index", 0.3)
        features["psychomotor_agitation"] = raw_data.get("keystroke_variability", 0.1)
        
        return features

    def fuse_features(self, 
                     passive_feats: Dict[str, float], 
                     active_feats: Dict[str, float],
                     ema_feats: Optional[Dict[str, float]] = None) -> np.ndarray:
        """
        Fuse all features into a single vector for the model.
        Returns a numpy array.
        """
        # Order matters! Must match model training order
        feature_list = [
            passive_feats.get("hrv_normalized", 1.0),
            passive_feats.get("sleep_efficiency_proxy", 0.8),
            passive_feats.get("log_steps", 8.0),
            passive_feats.get("hr_volatility", 10.0),
            active_feats.get("voice_stress", 0.5),
            active_feats.get("fatigue_level", 0.3),
            active_feats.get("psychomotor_agitation", 0.1)
        ]
        
        if ema_feats:
            feature_list.append(ema_feats.get("mood_avg", 5.0) / 10.0)
            feature_list.append(ema_feats.get("stress_count", 0.0))
        else:
            feature_list.extend([0.5, 0.0]) # Default EMA values
            
        return np.array(feature_list)

    def _normalize(self, value: float, baseline: float) -> float:
        if baseline == 0: return 0.0
        return value / baseline
