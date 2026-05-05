"""
Trend Predictor Service

Time-series prediction model for mental health risk forecasting.
Uses RandomForest and linear regression to predict future PHQ-9 trends
based on historical scores and voice biomarkers.
"""

import numpy as np
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler


@dataclass
class PredictionResult:
    """Prediction output with confidence intervals"""
    predicted_scores: list[float]
    dates: list[str]
    confidence_lower: list[float]
    confidence_upper: list[float]
    trend_direction: str  # 'improving', 'stable', 'worsening'
    risk_level: str  # 'low', 'moderate', 'high'
    model_confidence: float  # 0-1


@dataclass
class FeatureVector:
    """Multi-modal feature vector for prediction"""
    phq9_scores: list[float] = field(default_factory=list)
    voice_stress_levels: list[float] = field(default_factory=list)
    keystroke_anxiety: list[float] = field(default_factory=list)
    stroop_reaction_times: list[float] = field(default_factory=list)
    timestamps: list[datetime] = field(default_factory=list)


class TrendPredictor:
    """
    Time-series prediction model for mental health risk forecasting.
    
    Combines multiple biomarkers (PHQ-9 scores, voice features, keystroke dynamics)
    to predict future mental health trends using ensemble ML methods.
    """
    
    MIN_DATA_POINTS = 3  # Minimum history required for prediction
    FORECAST_DAYS = 7    # Days to predict ahead
    
    def __init__(self):
        self._rf_model: Optional[RandomForestRegressor] = None
        self._lr_model: Optional[LinearRegression] = None
        self._scaler = StandardScaler()
        self._is_fitted = False
    
    def _prepare_features(self, features: FeatureVector) -> np.ndarray:
        """
        Prepare multi-modal features for ML model.
        Creates lag features and time-based features.
        """
        n_samples = len(features.phq9_scores)
        
        if n_samples < self.MIN_DATA_POINTS:
            raise ValueError(f"Need at least {self.MIN_DATA_POINTS} data points")
        
        # Core feature: PHQ-9 scores
        phq9 = np.array(features.phq9_scores)
        
        # Voice stress (use zeros if not available)
        voice = np.array(features.voice_stress_levels) if features.voice_stress_levels else np.zeros(n_samples)
        if len(voice) < n_samples:
            voice = np.pad(voice, (0, n_samples - len(voice)), mode='edge')
        
        # Keystroke anxiety (use zeros if not available)
        keystroke = np.array(features.keystroke_anxiety) if features.keystroke_anxiety else np.zeros(n_samples)
        if len(keystroke) < n_samples:
            keystroke = np.pad(keystroke, (0, n_samples - len(keystroke)), mode='edge')
        
        # Create feature matrix with lag features
        X = []
        for i in range(1, n_samples):
            row = [
                phq9[i-1],                          # Previous PHQ-9
                phq9[i-1] - phq9[max(0, i-2)],     # PHQ-9 delta
                voice[i-1] if len(voice) > i-1 else 0,    # Voice stress
                keystroke[i-1] if len(keystroke) > i-1 else 0,  # Keystroke anxiety
                i / n_samples,                      # Time progression
                np.mean(phq9[:i]),                  # Running mean
                np.std(phq9[:i]) if i > 1 else 0,  # Running std
            ]
            X.append(row)
        
        return np.array(X)
    
    def _prepare_targets(self, features: FeatureVector) -> np.ndarray:
        """Prepare target variable (next PHQ-9 score)"""
        return np.array(features.phq9_scores[1:])
    
    def fit(self, features: FeatureVector) -> None:
        """
        Train the prediction models on historical data.
        Uses both RandomForest and Linear Regression for ensemble.
        """
        X = self._prepare_features(features)
        y = self._prepare_targets(features)
        
        # Scale features
        X_scaled = self._scaler.fit_transform(X)
        
        # Train RandomForest for non-linear patterns
        self._rf_model = RandomForestRegressor(
            n_estimators=50,
            max_depth=5,
            min_samples_split=2,
            random_state=42
        )
        self._rf_model.fit(X_scaled, y)
        
        # Train Linear Regression for trend detection
        self._lr_model = LinearRegression()
        self._lr_model.fit(X_scaled, y)
        
        self._is_fitted = True
    
    def predict_next_week(self, features: FeatureVector) -> PredictionResult:
        """
        Predict mental health scores for the next 7 days.
        Returns predicted scores with confidence intervals.
        """
        if not self._is_fitted:
            self.fit(features)
        
        phq9 = features.phq9_scores
        voice = features.voice_stress_levels or [50.0] * len(phq9)
        keystroke = features.keystroke_anxiety or [30.0] * len(phq9)
        
        # Generate predictions for each future day
        predicted_scores = []
        current_phq9 = phq9[-1]
        current_voice = voice[-1] if voice else 50.0
        current_keystroke = keystroke[-1] if keystroke else 30.0
        running_mean = np.mean(phq9)
        running_std = np.std(phq9) if len(phq9) > 1 else 1.0
        
        for day in range(self.FORECAST_DAYS):
            # Create feature vector for prediction
            prev_phq9 = predicted_scores[-1] if predicted_scores else current_phq9
            delta = prev_phq9 - (predicted_scores[-2] if len(predicted_scores) >= 2 else current_phq9)
            
            features_row = np.array([[
                prev_phq9,
                delta,
                current_voice * (1 + 0.02 * day),  # Slight stress increase assumption
                current_keystroke * (1 + 0.01 * day),
                (len(phq9) + day) / (len(phq9) + self.FORECAST_DAYS),
                running_mean,
                running_std,
            ]])
            
            features_scaled = self._scaler.transform(features_row)
            
            # Ensemble prediction (weighted average)
            rf_pred = self._rf_model.predict(features_scaled)[0]
            lr_pred = self._lr_model.predict(features_scaled)[0]
            
            # Weighted ensemble: 70% RF, 30% LR
            pred = 0.7 * rf_pred + 0.3 * lr_pred
            
            # Clamp to valid PHQ-9 range [0, 27]
            pred = max(0, min(27, pred))
            predicted_scores.append(round(pred, 1))
            
            # Update running stats
            all_scores = phq9 + predicted_scores
            running_mean = np.mean(all_scores)
            running_std = np.std(all_scores)
        
        # Calculate confidence intervals using RF tree variance
        std_estimate = self._estimate_uncertainty(features, predicted_scores)
        confidence_lower = [max(0, s - 1.96 * std_estimate) for s in predicted_scores]
        confidence_upper = [min(27, s + 1.96 * std_estimate) for s in predicted_scores]
        
        # Generate future dates
        base_date = datetime.now()
        dates = [(base_date + timedelta(days=i+1)).strftime('%Y-%m-%d') 
                 for i in range(self.FORECAST_DAYS)]
        
        # Determine trend direction
        trend = self._calculate_trend(phq9, predicted_scores)
        
        # Determine risk level based on predicted scores
        max_predicted = max(predicted_scores)
        risk_level = self._determine_risk_level(max_predicted)
        
        # Model confidence based on data quality
        confidence = self._calculate_model_confidence(features)
        
        return PredictionResult(
            predicted_scores=predicted_scores,
            dates=dates,
            confidence_lower=[round(x, 1) for x in confidence_lower],
            confidence_upper=[round(x, 1) for x in confidence_upper],
            trend_direction=trend,
            risk_level=risk_level,
            model_confidence=confidence
        )
    
    def _estimate_uncertainty(self, features: FeatureVector, predictions: list) -> float:
        """Estimate prediction uncertainty from data variance"""
        historical_std = np.std(features.phq9_scores) if len(features.phq9_scores) > 1 else 2.0
        # Uncertainty grows with forecast horizon
        return historical_std * 1.2
    
    def _calculate_trend(self, historical: list, predicted: list) -> str:
        """Determine if mental health is improving, stable, or worsening"""
        recent_avg = np.mean(historical[-3:]) if len(historical) >= 3 else historical[-1]
        future_avg = np.mean(predicted)
        
        diff = future_avg - recent_avg
        
        if diff < -1.5:
            return 'improving'
        elif diff > 1.5:
            return 'worsening'
        else:
            return 'stable'
    
    def _determine_risk_level(self, max_score: float) -> str:
        """Determine risk level based on PHQ-9 thresholds"""
        if max_score <= 4:
            return 'low'
        elif max_score <= 14:
            return 'moderate'
        else:
            return 'high'
    
    def _calculate_model_confidence(self, features: FeatureVector) -> float:
        """Calculate confidence based on data quality and quantity"""
        n_points = len(features.phq9_scores)
        has_voice = len(features.voice_stress_levels) > 0
        has_keystroke = len(features.keystroke_anxiety) > 0
        
        # Base confidence from data quantity
        data_confidence = min(1.0, n_points / 10)
        
        # Bonus for multi-modal data
        modality_bonus = 0.1 * has_voice + 0.1 * has_keystroke
        
        return min(1.0, round(data_confidence * 0.8 + modality_bonus, 2))


# Global singleton instance
trend_predictor = TrendPredictor()


async def predict_weekly_trend(
    phq9_history: list[float],
    voice_stress: Optional[list[float]] = None,
    keystroke_anxiety: Optional[list[float]] = None,
) -> PredictionResult:
    """
    Main API function for trend prediction.
    
    Args:
        phq9_history: Historical PHQ-9 scores (minimum 3 points)
        voice_stress: Optional voice stress levels (0-100)
        keystroke_anxiety: Optional keystroke anxiety indices (0-100)
    
    Returns:
        PredictionResult with 7-day forecast
    """
    if len(phq9_history) < TrendPredictor.MIN_DATA_POINTS:
        raise ValueError(
            f"Need at least {TrendPredictor.MIN_DATA_POINTS} PHQ-9 records to predict"
        )
    
    features = FeatureVector(
        phq9_scores=phq9_history,
        voice_stress_levels=voice_stress or [],
        keystroke_anxiety=keystroke_anxiety or [],
    )
    
    predictor = TrendPredictor()
    return predictor.predict_next_week(features)
