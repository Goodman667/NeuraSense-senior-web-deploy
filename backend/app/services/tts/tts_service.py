"""
Text-to-Speech Service using Edge TTS

Provides natural-sounding Chinese speech synthesis using Microsoft Edge TTS.
Voice: zh-CN-XiaoxiaoNeural (温暖自然的女声)
"""

import edge_tts
import asyncio
import hashlib
import os
import re
from pathlib import Path
from typing import Optional

# 语音配置
VOICE_OPTIONS = {
    "xiaoxiao": "zh-CN-XiaoxiaoNeural",      # 温暖女声（默认）
    "xiaoyi": "zh-CN-XiaoyiNeural",          # 活泼女声
    "yunjian": "zh-CN-YunjianNeural",        # 稳重男声
    "yunxi": "zh-CN-YunxiNeural",            # 年轻男声
    "yunxia": "zh-CN-YunxiaNeural",          # 儿童女声
}

# 情感风格映射
EMOTION_STYLES = {
    "calm": "calm",
    "cheerful": "cheerful",
    "sad": "sad",
    "gentle": "gentle",
    "serious": "serious",
    "affectionate": "affectionate",
    "friendly": "friendly",
    "empathetic": "empathetic",
}

def sanitize_tts_text(text: str) -> str:
    """
    Convert screen text into speech-friendly text.

    LLM replies often contain Markdown like **重点**、列表星号、标题井号、
    links or code marks. These symbols are useful on screen, but TTS engines
    may read them aloud as “星号/井号/反引号”, which sounds broken.
    """
    if not text:
        return ""

    cleaned = text

    # Remove fenced code block markers but keep inner text if any.
    cleaned = re.sub(r"```[\w-]*\n?", "\n", cleaned)

    # Markdown links/images: keep human-readable label.
    cleaned = re.sub(r"!\[([^\]]*)\]\([^)]+\)", r"\1", cleaned)
    cleaned = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", cleaned)

    # Drop raw URLs; they are unpleasant and rarely useful in spoken guidance.
    cleaned = re.sub(r"https?://\S+|www\.\S+", " ", cleaned)

    # Strip common block syntax at line starts.
    cleaned = re.sub(r"(?m)^\s{0,3}#{1,6}\s*", "", cleaned)
    cleaned = re.sub(r"(?m)^\s{0,3}>\s*", "", cleaned)
    cleaned = re.sub(r"(?m)^\s*[-*+]\s+", "", cleaned)
    cleaned = re.sub(r"(?m)^\s*\d+[.)、]\s+", "", cleaned)

    # Remove inline Markdown emphasis/code markers.
    cleaned = re.sub(r"[*_`~]+", "", cleaned)

    # Tables/separators and miscellaneous visual delimiters.
    cleaned = cleaned.replace("|", "，")
    cleaned = re.sub(r"[-—]{3,}", "。", cleaned)
    cleaned = re.sub(r"[<>#]+", "", cleaned)

    # Collapse whitespace while preserving natural sentence pauses.
    cleaned = re.sub(r"[ \t\f\v]+", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    cleaned = re.sub(r"\s*\n\s*", "。", cleaned)
    cleaned = re.sub(r"。{2,}", "。", cleaned)

    return cleaned.strip()


class TTSService:
    """Edge TTS 语音合成服务"""
    
    def __init__(self, cache_dir: str = "./tts_cache"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
        self.default_voice = VOICE_OPTIONS["xiaoxiao"]
    
    def _get_cache_key(self, text: str, voice: str, rate: str, pitch: str) -> str:
        """生成缓存键"""
        content = f"{text}_{voice}_{rate}_{pitch}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def _get_cache_path(self, cache_key: str) -> Path:
        """获取缓存文件路径"""
        return self.cache_dir / f"{cache_key}.mp3"
    
    async def synthesize(
        self,
        text: str,
        voice: str = "xiaoxiao",
        rate: str = "+0%",
        pitch: str = "+0Hz",
        use_cache: bool = True,
    ) -> bytes:
        """
        合成语音
        
        Args:
            text: 要合成的文本
            voice: 语音名称 (xiaoxiao, xiaoyi, yunjian, yunxi, yunxia)
            rate: 语速调整，如 "+10%", "-10%"
            pitch: 音调调整，如 "+5Hz", "-5Hz"
            use_cache: 是否使用缓存
        
        Returns:
            MP3 音频数据
        """
        text = sanitize_tts_text(text)
        if not text:
            text = "我在这里。"

        voice_id = VOICE_OPTIONS.get(voice, self.default_voice)
        cache_key = self._get_cache_key(text, voice_id, rate, pitch)
        cache_path = self._get_cache_path(cache_key)
        
        # 检查缓存
        if use_cache and cache_path.exists():
            return cache_path.read_bytes()
        
        # 调用 Edge TTS
        communicate = edge_tts.Communicate(
            text=text,
            voice=voice_id,
            rate=rate,
            pitch=pitch,
        )
        
        # 收集音频数据
        audio_data = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data += chunk["data"]
        
        # 保存到缓存
        if use_cache:
            cache_path.write_bytes(audio_data)
        
        return audio_data
    
    async def synthesize_with_emotion(
        self,
        text: str,
        emotion: str = "gentle",
        voice: str = "xiaoxiao",
    ) -> bytes:
        """
        带情感的语音合成
        
        根据情感调整语速和音调
        """
        # 根据情感调整参数
        emotion_params = {
            "calm": {"rate": "-5%", "pitch": "-2Hz"},
            "cheerful": {"rate": "+5%", "pitch": "+3Hz"},
            "sad": {"rate": "-10%", "pitch": "-5Hz"},
            "gentle": {"rate": "-3%", "pitch": "+0Hz"},
            "empathetic": {"rate": "-5%", "pitch": "-1Hz"},
            "friendly": {"rate": "+0%", "pitch": "+2Hz"},
        }
        
        params = emotion_params.get(emotion, {"rate": "+0%", "pitch": "+0Hz"})
        
        return await self.synthesize(
            text=text,
            voice=voice,
            rate=params["rate"],
            pitch=params["pitch"],
        )
    
    def clear_cache(self):
        """清除语音缓存"""
        for file in self.cache_dir.glob("*.mp3"):
            file.unlink()


# 全局实例
tts_service = TTSService()


async def get_speech(
    text: str,
    voice: str = "xiaoxiao",
    emotion: str = "gentle",
) -> bytes:
    """获取语音合成结果的便捷函数"""
    return await tts_service.synthesize_with_emotion(
        text=text,
        emotion=emotion,
        voice=voice,
    )
