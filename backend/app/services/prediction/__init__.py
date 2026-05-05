"""Prediction service exports"""

from .trend_predictor import (
    TrendPredictor,
    PredictionResult,
    FeatureVector,
    trend_predictor,
    predict_weekly_trend,
)

__all__ = [
    "TrendPredictor",
    "PredictionResult", 
    "FeatureVector",
    "trend_predictor",
    "predict_weekly_trend",
]
