"""
Test script for Digital Phenotyping Service
"""
import sys
import os
from pprint import pprint

# Add project root to path
sys.path.append(os.getcwd())

from app.services.phenotyping import PhenotypingPredictor, FeatureEngine

def test_phenotyping():
    print("Testing Phenotyping Service...")
    
    # 1. Test Feature Engine
    engine = FeatureEngine()
    
    passive_data = {
        "hrv_mean": 45.0,
        "sleep_minutes": 380,  # 6h 20m
        "step_count": 3000,
        "active_minutes": 15,
        "heart_rate_series": [70, 72, 75, 68, 70]
    }
    
    active_data = {
        "voice_jitter": 0.08,
        "fatigue_index": 0.6
    }
    
    print("\n[Passive Features]")
    p_feats = engine.process_passive_features(passive_data)
    pprint(p_feats)
    
    print("\n[Active Features]")
    a_feats = engine.process_active_features(active_data)
    pprint(a_feats)
    
    # 2. Test Predictor
    predictor = PhenotypingPredictor()
    
    print("\n[Prediction Output]")
    result = predictor.predict_risk(passive_data, active_data, ema_data={"mood_avg": 6.0})
    
    print(f"Risk Prob: {result.risk_probability}")
    print(f"Risk Level: {result.risk_level}")
    print(f"Trend: {result.predicted_trend}")
    print("\n[Insights]")
    for i in result.insights:
        print(f"- {i}")
        
    print("\n[Factors]")
    for f in result.dominant_factors:
        print(f"- {f['description']} ({f['impact']})")

if __name__ == "__main__":
    test_phenotyping()
