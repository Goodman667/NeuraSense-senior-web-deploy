"""
Turn a short voice recording into text.

Why this exists: on iPad/iPhone the browser's built-in speech recognition is not dependable.
Safari's recognition goes "deaf" after the first use or after the page has played audio
(WebKit bug 321436), and other iPad browsers (Chrome, Edge, ...) cannot use it at all
(service-not-allowed, WebKit bug 239816). On those devices the page records the audio itself
and sends it here.

Engine: a Gemini model reached through the same AI gateway as the chat (LLM_API_BASE,
LLM_API_KEY), using the Gemini-native generateContent route with the audio inline. The model is
picked from what the gateway lists, or set with ASR_MODEL. If the gateway also offers an
OpenAI-style /v1/audio/transcriptions route, that is tried when no Gemini model is available.
"""
from __future__ import annotations

import base64
import os
import re
import time
from typing import Any

import httpx

from app.services.llm.client import DEFAULT_LLM_API_BASE

MAX_AUDIO_BYTES = 6 * 1024 * 1024  # about 3 minutes of 16 kHz mono WAV
_PREFERRED = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-3-flash",
    "gemini-3-flash-preview",
    "gemini-2.0-flash",
    "gemini-flash-latest",
]
_STATUS_TTL = 600.0
_status_cache: dict[str, Any] = {"at": 0.0, "value": None}


class SpeechUnavailable(RuntimeError):
    """No speech-to-text engine can be reached with the current configuration."""


def _base() -> str:
    return (os.getenv("LLM_API_BASE") or os.getenv("LLM_BASE_URL") or DEFAULT_LLM_API_BASE).strip().rstrip("/").removesuffix("/v1")


def _key() -> str:
    return os.getenv("ASR_API_KEY") or os.getenv("LLM_API_KEY") or ""


def _prompt(lang: str) -> str:
    if lang.lower().startswith("en"):
        return (
            "Transcribe this recording word for word in English. Output only what the speaker said, "
            "with normal punctuation. Leave out parts you cannot hear. If nobody speaks, output nothing. "
            "No explanations, no quotation marks."
        )
    return (
        "把这段录音逐字转写成简体中文。只输出说话人说的话，加上合适的标点；"
        "说的是方言或夹杂英文也照实写下来；听不清的部分省略；如果没有人说话，什么都不要输出。"
        "不要解释，不要加引号。"
    )


async def _list_gemini_models(client: httpx.AsyncClient) -> list[str]:
    resp = await client.get(f"{_base()}/v1beta/models", headers={"x-goog-api-key": _key()})
    if resp.status_code != 200:
        return []
    data = resp.json()
    names: list[str] = []
    for item in data.get("models") or data.get("data") or []:
        name = str(item.get("name") or item.get("id") or "").removeprefix("models/")
        methods = item.get("supportedGenerationMethods") or ["generateContent"]
        if name and "gemini" in name.lower() and "generateContent" in methods:
            names.append(name)
    return names


def _pick_model(available: list[str]) -> str | None:
    wanted = os.getenv("ASR_MODEL", "").strip()
    if wanted:
        return wanted
    for name in _PREFERRED:
        if name in available:
            return name
    flash = [n for n in available if "flash" in n.lower() and "image" not in n.lower() and "tts" not in n.lower()]
    if flash:
        return sorted(flash)[-1]
    return available[0] if available else None


async def speech_status(force: bool = False) -> dict[str, Any]:
    """Which engine voice input would use. Cached for a few minutes."""
    now = time.monotonic()
    if not force and _status_cache["value"] is not None and now - _status_cache["at"] < _STATUS_TTL:
        return _status_cache["value"]
    value: dict[str, Any] = {"available": False, "engine": None, "model": None}
    if _key():
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                model = os.getenv("ASR_MODEL", "").strip() or _pick_model(await _list_gemini_models(client))
                if model:
                    value = {"available": True, "engine": "gemini", "model": model}
                else:
                    probe = await client.post(f"{_base()}/v1/audio/transcriptions", headers={"Authorization": f"Bearer {_key()}"})
                    if probe.status_code not in (404, 405):
                        value = {"available": True, "engine": "openai", "model": os.getenv("ASR_OPENAI_MODEL", "gpt-4o-mini-transcribe")}
        except httpx.HTTPError as exc:
            value["error"] = type(exc).__name__
    _status_cache.update(at=now, value=value)
    return value


def _clean(text: str) -> str:
    text = (text or "").strip().strip("\"'“”「」")
    if re.fullmatch(r"[（(]?(无|没有人说话|空|静音|无内容|no speech|silence)[)）]?[。.]?", text, re.I):
        return ""
    return text


async def _gemini(client: httpx.AsyncClient, model: str, audio: bytes, mime: str, lang: str) -> str:
    payload = {
        "contents": [{
            "role": "user",
            "parts": [
                {"inline_data": {"mime_type": mime, "data": base64.b64encode(audio).decode("ascii")}},
                {"text": _prompt(lang)},
            ],
        }],
        "generationConfig": {"temperature": 0},
    }
    resp = await client.post(
        f"{_base()}/v1beta/models/{model}:generateContent",
        headers={"x-goog-api-key": _key(), "Content-Type": "application/json"},
        json=payload,
    )
    resp.raise_for_status()
    data = resp.json()
    parts = ((data.get("candidates") or [{}])[0].get("content") or {}).get("parts") or []
    return _clean("".join(str(p.get("text") or "") for p in parts if not p.get("thought")))


async def _openai(client: httpx.AsyncClient, model: str, audio: bytes, mime: str, lang: str) -> str:
    ext = {"audio/wav": "wav", "audio/x-wav": "wav", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/webm": "webm"}.get(mime, "wav")
    resp = await client.post(
        f"{_base()}/v1/audio/transcriptions",
        headers={"Authorization": f"Bearer {_key()}"},
        data={"model": model, "language": "en" if lang.lower().startswith("en") else "zh"},
        files={"file": (f"speech.{ext}", audio, mime)},
    )
    resp.raise_for_status()
    return _clean(str(resp.json().get("text") or ""))


async def transcribe_audio(audio: bytes, mime: str = "audio/wav", lang: str = "zh-CN") -> dict[str, Any]:
    """Returns {"text", "engine", "model"}. Raises SpeechUnavailable or httpx errors."""
    status = await speech_status()
    if not status.get("available"):
        raise SpeechUnavailable("no speech-to-text engine is configured")
    async with httpx.AsyncClient(timeout=45.0) as client:
        if status["engine"] == "gemini":
            text = await _gemini(client, status["model"], audio, mime, lang)
        else:
            text = await _openai(client, status["model"], audio, mime, lang)
    return {"text": text, "engine": status["engine"], "model": status["model"]}
