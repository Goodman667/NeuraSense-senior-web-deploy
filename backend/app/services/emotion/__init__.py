"""
Emotion Analysis Module

This module provides multimodal emotion analysis including:
- Text sentiment analysis
- Voice feature analysis
- Multimodal fusion for detecting hidden depression (e.g., "smiling depression")
"""

from .fusion import EmotionFusionService, EmotionAnalysisResult, VoiceFeatures

__all__ = ["EmotionFusionService", "EmotionAnalysisResult", "VoiceFeatures"]
