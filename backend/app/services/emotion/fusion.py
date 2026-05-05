"""
Multimodal Emotion Fusion Service

Implements multimodal emotion analysis by combining:
- Text sentiment analysis
- Voice/audio features (speech rate, pitch variation, pauses)

Key feature: Detection of "smiling depression" (微笑抑郁) where verbal content
is positive but paralinguistic features indicate depression.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class EmotionCategory(str, Enum):
    """情感分类"""
    POSITIVE = "positive"  # 积极
    NEGATIVE = "negative"  # 消极
    NEUTRAL = "neutral"    # 中性
    MIXED = "mixed"        # 混合情绪


class RiskLevel(str, Enum):
    """风险等级"""
    NONE = "none"          # 无风险
    LOW = "low"            # 低风险
    MODERATE = "moderate"  # 中等风险
    HIGH = "high"          # 高风险


class RiskType(str, Enum):
    """风险类型"""
    NONE = "none"
    SMILING_DEPRESSION = "smiling_depression"    # 微笑抑郁
    ANXIETY = "anxiety"                          # 焦虑
    DEPRESSION = "depression"                    # 抑郁
    EMOTIONAL_SUPPRESSION = "emotional_suppression"  # 情绪压抑


@dataclass
class VoiceFeatures:
    """
    语音特征数据
    Voice/audio paralinguistic features
    """
    # 语速 (words per minute, normal ~120-150)
    speech_rate: float = 120.0
    
    # 音调变化/抖动 (pitch jitter, higher indicates more variability)
    pitch_jitter: float = 0.5
    
    # 平均音调 (Hz, lower may indicate depression)
    mean_pitch: float = 150.0
    
    # 停顿比例 (ratio of pause duration to speech duration)
    pause_ratio: float = 0.2
    
    # 平均停顿时长 (seconds)
    mean_pause_duration: float = 0.3
    
    # 音量变化 (loudness variation)
    volume_variation: float = 0.5
    
    # 能量/活力 (overall energy, 0-1)
    energy: float = 0.5


@dataclass
class TextSentiment:
    """
    文本情感分析结果
    Text sentiment analysis result
    """
    # 情感分类
    category: EmotionCategory = EmotionCategory.NEUTRAL
    
    # 情感得分 (-1 to 1, negative to positive)
    score: float = 0.0
    
    # 置信度 (0-1)
    confidence: float = 0.5
    
    # 检测到的情感关键词
    keywords: list[str] = field(default_factory=list)


@dataclass
class EmotionAnalysisResult:
    """
    多模态情感分析结果
    Multimodal emotion analysis result
    """
    # 文本情感
    text_sentiment: TextSentiment
    
    # 语音特征
    voice_features: Optional[VoiceFeatures] = None
    
    # 融合后的情感分类
    fused_emotion: EmotionCategory = EmotionCategory.NEUTRAL
    
    # 融合置信度
    fused_confidence: float = 0.5
    
    # 风险等级
    risk_level: RiskLevel = RiskLevel.NONE
    
    # 风险类型
    risk_type: RiskType = RiskType.NONE
    
    # 是否检测到情绪不一致
    emotional_inconsistency: bool = False
    
    # 中文反馈
    feedback: list[str] = field(default_factory=list)
    
    # 建议
    recommendations: list[str] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "text_sentiment": {
                "category": self.text_sentiment.category.value,
                "score": self.text_sentiment.score,
                "confidence": self.text_sentiment.confidence,
                "keywords": self.text_sentiment.keywords,
            },
            "voice_features": {
                "speech_rate": self.voice_features.speech_rate,
                "pitch_jitter": self.voice_features.pitch_jitter,
                "mean_pitch": self.voice_features.mean_pitch,
                "pause_ratio": self.voice_features.pause_ratio,
                "mean_pause_duration": self.voice_features.mean_pause_duration,
                "energy": self.voice_features.energy,
            } if self.voice_features else None,
            "fused_emotion": self.fused_emotion.value,
            "fused_confidence": self.fused_confidence,
            "risk_level": self.risk_level.value,
            "risk_type": self.risk_type.value,
            "emotional_inconsistency": self.emotional_inconsistency,
            "feedback": self.feedback,
            "recommendations": self.recommendations,
        }


class EmotionFusionService:
    """
    多模态情感融合服务
    
    核心功能：
    1. 分析文本情感
    2. 分析语音特征
    3. 融合多模态信号，检测隐藏的心理风险
    
    特别关注：微笑抑郁 (Smiling Depression)
    - 表现：言语内容积极正面
    - 实际：语音特征显示低沉、停顿长、能量低
    """
    
    # 语音特征阈值
    LOW_SPEECH_RATE_THRESHOLD = 100.0      # 语速过慢阈值 (wpm)
    HIGH_PAUSE_RATIO_THRESHOLD = 0.35      # 停顿比例过高阈值
    LOW_ENERGY_THRESHOLD = 0.3             # 能量过低阈值
    LOW_PITCH_THRESHOLD = 100.0            # 音调过低阈值 (Hz)
    LONG_PAUSE_THRESHOLD = 0.8             # 长停顿阈值 (seconds)
    
    # 积极词汇列表（用于简单文本情感分析）
    POSITIVE_KEYWORDS = [
        "好", "开心", "高兴", "快乐", "幸福", "满意", "感谢", "谢谢",
        "棒", "优秀", "成功", "希望", "期待", "喜欢", "爱", "美好",
        "没问题", "没事", "挺好", "还行", "可以", "不错", "很好",
        "fine", "good", "happy", "great", "okay", "alright"
    ]
    
    # 消极词汇列表
    NEGATIVE_KEYWORDS = [
        "难过", "伤心", "痛苦", "焦虑", "担心", "害怕", "恐惧",
        "失眠", "疲惫", "累", "烦", "压力", "紧张", "抑郁", "绝望",
        "孤独", "无聊", "无助", "失败", "讨厌", "生气", "愤怒",
        "不想", "不行", "不好", "糟糕", "难受",
        "sad", "anxious", "worried", "tired", "stressed", "depressed"
    ]
    
    def __init__(self):
        """初始化服务"""
        pass
    
    def analyze_text_sentiment(self, text: str) -> TextSentiment:
        """
        分析文本情感
        简化版实现，基于关键词匹配
        
        生产环境应使用专业的 NLP 模型
        """
        text_lower = text.lower()
        
        positive_count = sum(1 for kw in self.POSITIVE_KEYWORDS if kw in text_lower)
        negative_count = sum(1 for kw in self.NEGATIVE_KEYWORDS if kw in text_lower)
        
        detected_positive = [kw for kw in self.POSITIVE_KEYWORDS if kw in text_lower]
        detected_negative = [kw for kw in self.NEGATIVE_KEYWORDS if kw in text_lower]
        
        # 计算情感得分
        total = positive_count + negative_count
        if total == 0:
            score = 0.0
            category = EmotionCategory.NEUTRAL
            confidence = 0.3
        else:
            score = (positive_count - negative_count) / total
            
            if score > 0.3:
                category = EmotionCategory.POSITIVE
            elif score < -0.3:
                category = EmotionCategory.NEGATIVE
            elif positive_count > 0 and negative_count > 0:
                category = EmotionCategory.MIXED
            else:
                category = EmotionCategory.NEUTRAL
            
            confidence = min(0.9, 0.4 + total * 0.1)
        
        return TextSentiment(
            category=category,
            score=score,
            confidence=confidence,
            keywords=detected_positive + detected_negative
        )
    
    def analyze_voice_features(self, features: VoiceFeatures) -> dict:
        """
        分析语音特征，识别潜在的情绪信号
        
        Returns:
            字典，包含各项风险指标
        """
        indicators = {
            "low_speech_rate": features.speech_rate < self.LOW_SPEECH_RATE_THRESHOLD,
            "high_pause_ratio": features.pause_ratio > self.HIGH_PAUSE_RATIO_THRESHOLD,
            "low_energy": features.energy < self.LOW_ENERGY_THRESHOLD,
            "low_pitch": features.mean_pitch < self.LOW_PITCH_THRESHOLD,
            "long_pauses": features.mean_pause_duration > self.LONG_PAUSE_THRESHOLD,
        }
        
        # 计算语音抑郁指数
        depression_score = sum([
            1.0 if indicators["low_speech_rate"] else 0.0,
            1.0 if indicators["high_pause_ratio"] else 0.0,
            1.5 if indicators["low_energy"] else 0.0,  # 能量低权重更高
            0.5 if indicators["low_pitch"] else 0.0,
            0.5 if indicators["long_pauses"] else 0.0,
        ])
        
        indicators["depression_score"] = depression_score
        indicators["max_score"] = 4.5
        
        return indicators
    
    def fuse_emotions(
        self, 
        text: str, 
        voice_features: Optional[VoiceFeatures] = None
    ) -> EmotionAnalysisResult:
        """
        多模态情感融合
        
        核心逻辑：
        1. 分析文本情感
        2. 分析语音特征
        3. 检测不一致性（言语积极但语音消极 → 微笑抑郁风险）
        
        Args:
            text: 用户说的文本内容
            voice_features: 语音特征（可选）
            
        Returns:
            EmotionAnalysisResult 完整的分析结果
        """
        # 1. 文本情感分析
        text_sentiment = self.analyze_text_sentiment(text)
        
        # 2. 初始化结果
        result = EmotionAnalysisResult(
            text_sentiment=text_sentiment,
            voice_features=voice_features,
            fused_emotion=text_sentiment.category,
            fused_confidence=text_sentiment.confidence,
        )
        
        # 3. 如果没有语音特征，仅返回文本分析结果
        if voice_features is None:
            if text_sentiment.category == EmotionCategory.NEGATIVE:
                result.risk_level = RiskLevel.LOW
                result.feedback.append("从您的表述中感受到一些情绪波动")
            return result
        
        # 4. 分析语音特征
        voice_indicators = self.analyze_voice_features(voice_features)
        depression_score = voice_indicators["depression_score"]
        
        # 5. 关键检测：微笑抑郁 (Smiling Depression)
        # 言语积极 + 语音特征显示抑郁信号
        is_verbal_positive = text_sentiment.category in [
            EmotionCategory.POSITIVE, 
            EmotionCategory.NEUTRAL
        ] and text_sentiment.score >= 0
        
        has_depression_voice_signals = depression_score >= 2.0
        
        if is_verbal_positive and has_depression_voice_signals:
            # 检测到微笑抑郁风险
            result.emotional_inconsistency = True
            result.risk_type = RiskType.SMILING_DEPRESSION
            result.fused_emotion = EmotionCategory.MIXED
            
            # 根据严重程度确定风险等级
            if depression_score >= 3.5:
                result.risk_level = RiskLevel.HIGH
                result.feedback.append("⚠️ 潜在抑郁风险（微笑抑郁）")
                result.feedback.append("虽然您说的内容是积极的，但语音特征显示可能存在情绪困扰")
                result.recommendations.append("建议与专业心理咨询师进行深入交流")
                result.recommendations.append("微笑抑郁是一种隐藏的抑郁形式，值得关注")
            elif depression_score >= 2.5:
                result.risk_level = RiskLevel.MODERATE
                result.feedback.append("检测到情绪不一致信号")
                result.feedback.append("您的语音特征显示可能有些疲惫或低落")
                result.recommendations.append("适当休息，关注自己的真实感受")
            else:
                result.risk_level = RiskLevel.LOW
                result.feedback.append("轻微的情绪波动")
        
        # 6. 其他情况处理
        elif text_sentiment.category == EmotionCategory.NEGATIVE:
            if depression_score >= 2.0:
                result.risk_level = RiskLevel.MODERATE
                result.risk_type = RiskType.DEPRESSION
                result.feedback.append("感受到您可能正在经历一些困难")
                result.recommendations.append("请记住寻求帮助是勇敢的表现")
            else:
                result.risk_level = RiskLevel.LOW
                result.feedback.append("情绪略有波动，这是正常的")
        
        elif has_depression_voice_signals:
            result.risk_level = RiskLevel.LOW
            result.risk_type = RiskType.EMOTIONAL_SUPPRESSION
            result.feedback.append("语音特征显示可能有些疲惫")
        
        # 7. 更新融合置信度
        result.fused_confidence = min(
            0.95,
            text_sentiment.confidence * 0.4 + 0.6 * (depression_score / 4.5)
        ) if voice_features else text_sentiment.confidence
        
        return result
    
    def get_smiling_depression_explanation(self) -> str:
        """
        获取微笑抑郁的科普说明
        """
        return """
        【微笑抑郁症】
        
        微笑抑郁是一种隐藏的抑郁形式。患者在外表上表现得开朗、积极，
        但内心实际上正在经历痛苦、绝望等负面情绪。
        
        常见特征：
        • 在他人面前保持微笑和积极态度
        • 语速变慢、声音低沉
        • 说话时停顿增多
        • 整体能量和活力下降
        
        如果您或身边的人有这些迹象，请考虑寻求专业帮助。
        您的感受是真实的，值得被认真对待。
        """
