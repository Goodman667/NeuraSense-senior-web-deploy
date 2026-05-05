"""
Phenotyping Predictor Service

Uses Machine Learning (RandomForest + LSTM principles) to predict
mental health risks based on multi-modal digital phenotypes.
"""

from typing import Dict, Any, List, Optional
import numpy as np
import random
from datetime import datetime, timedelta
from dataclasses import dataclass
from .feature_engine import FeatureEngine

# Mocking sklearn for portability if not installed, but usually it is in this env
try:
    from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
except ImportError:
    class RandomForestRegressor:
        def fit(self, X, y): pass
        def predict(self, X): return np.array([random.random() for _ in range(len(X))])

@dataclass
class PredictionOutput:
    risk_probability: float
    risk_level: str  # 'low', 'medium', 'high'
    predicted_trend: List[float]  # 7-day forecast
    dominant_factors: List[Dict[str, Any]]
    insights: List[str]

class PhenotypingPredictor:
    def __init__(self):
        self.feature_engine = FeatureEngine()
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        self._is_trained = False
        self._train_dummy_model()

    def _train_dummy_model(self):
        """
        Train a dummy model on synthetic data to ensure valid outputs
        before real user data is accumulated.
        """
        # Feature vector size is 9 (defined in FeatureEngine.fuse_features)
        X_mock = np.random.rand(100, 9)
        # Target: Risk score 0-1
        y_mock = np.random.rand(100)
        self.model.fit(X_mock, y_mock)
        self._is_trained = True

    def predict_risk(self, 
                    passive_data: Dict[str, Any], 
                    active_data: Dict[str, Any],
                    ema_data: Optional[Dict[str, Any]] = None) -> PredictionOutput:
        """
        Predict mental health risk for next 7 days using current snapshot.
        """
        # 1. Feature Engineering
        p_feats = self.feature_engine.process_passive_features(passive_data)
        a_feats = self.feature_engine.process_active_features(active_data)
        
        # EMA data normalization
        e_feats = {}
        if ema_data:
            e_feats["mood_avg"] = ema_data.get("mood_avg", 5.0)
            e_feats["stress_count"] = ema_data.get("stress_count", 0.0)

        # Fuse
        X = self.feature_engine.fuse_features(p_feats, a_feats, e_feats)
        
        # 2. Inference
        current_risk = float(self.model.predict([X])[0])
        
        # Adjust risk based on heuristics (Hybrid Approach)
        # If HRV is very low (< 30ms) or Sleep is very low (< 5h), boost risk
        heuristics_boost = 0.0
        if passive_data.get("hrv_mean", 50) < 30:
            heuristics_boost += 0.15
        if passive_data.get("sleep_minutes", 420) < 300:
            heuristics_boost += 0.15
            
        final_risk = min(1.0, max(0.0, current_risk + heuristics_boost))

        # 3. Generate 7-day Trend (Simulated using LSTM-like decay)
        trend = self._simulate_forecast(final_risk)

        # 4. Interpretability (SHAP-like)
        factors = self._explain_prediction(p_feats, a_feats, e_feats)
        
        # 5. Generate Insights
        insights = self._generate_insights(factors, final_risk)

        return PredictionOutput(
            risk_probability=round(final_risk, 2),
            risk_level=self._get_risk_level(final_risk),
            predicted_trend=[round(x, 2) for x in trend],
            dominant_factors=factors,
            insights=insights
        )

    def _simulate_forecast(self, current_risk: float) -> List[float]:
        """
        Simulate 7-day forecast. In a real system, this would be an LSTM output.
        """
        trend = []
        val = current_risk
        for _ in range(7):
            # Mean reversion + random walk
            val = val * 0.9 + (0.5 * 0.1) + np.random.normal(0, 0.05)
            trend.append(min(1.0, max(0.0, val)))
        return trend

    def _explain_prediction(self, p: Dict, a: Dict, e: Dict) -> List[Dict]:
        """
        Identify top contributing factors (Simplified heuristic for demo).
        """
        factors = []
        
        # Check HRV
        if p.get("hrv_normalized", 1.0) < 0.8:
            factors.append({"factor": "HRV", "impact": "negative", "description": "心率变异性偏低，显示生理压力较大"})
            
        # Check Sleep
        if p.get("sleep_efficiency_proxy", 1.0) < 0.85:
             factors.append({"factor": "Sleep", "impact": "negative", "description": "睡眠效率不足，影响恢复"})
             
        # Check Activity
        if p.get("log_steps", 8.0) < np.log1p(3000):
            factors.append({"factor": "Activity", "impact": "negative", "description": "身体活动量显著减少"})
            
        # Check Voice
        if a.get("voice_stress", 0.0) > 0.6:
            factors.append({"factor": "Voice", "impact": "negative", "description": "语音中检测到紧张情绪"})

        # If everything is good
        if not factors and e.get("mood_avg", 5.0) > 7:
            factors.append({"factor": "Mood", "impact": "positive", "description": "情绪报告积极"})
            
        return factors

    def _generate_insights(self, factors: List[Dict], risk: float) -> List[str]:
        insights = []
        if risk > 0.7:
            insights.append("检测到较高的复发风险，建议立即进行正念练习。")
        elif risk > 0.4:
            insights.append("生理压力指标略有升高，注意劳逸结合。")
        else:
            insights.append("您的身心状态保持良好，继续保持！")
            
        for f in factors[:2]:
            insights.append(f"注意：{f['description']}")
            
        return insights

    def _get_risk_level(self, prob: float) -> str:
        if prob < 0.4: return "low"
        if prob < 0.7: return "medium"
        return "high"
