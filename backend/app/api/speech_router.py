"""Speech-to-text for voice input (used on iPad/iPhone, see app/services/speech/transcribe.py)."""
import httpx
from fastapi import APIRouter, HTTPException, Query, Request

from app.services.speech import SpeechUnavailable, speech_status, transcribe_audio
from app.services.speech.transcribe import MAX_AUDIO_BYTES

router = APIRouter(prefix="/speech", tags=["Speech"])

_ALLOWED = {"audio/wav", "audio/x-wav", "audio/wave", "audio/mpeg", "audio/mp3", "audio/mp4", "audio/aac", "audio/ogg", "audio/webm", "audio/flac"}


@router.get("/status")
async def get_speech_status():
    status = await speech_status()
    return {"available": bool(status.get("available")), "engine": status.get("engine")}


@router.post("/transcribe")
async def transcribe(request: Request, lang: str = Query(default="zh-CN", max_length=12)):
    mime = (request.headers.get("content-type") or "audio/wav").split(";")[0].strip().lower()
    if mime not in _ALLOWED:
        raise HTTPException(status_code=415, detail="unsupported_audio_type")
    audio = await request.body()
    if not audio:
        raise HTTPException(status_code=400, detail="empty_audio")
    if len(audio) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="audio_too_long")
    if mime in {"audio/x-wav", "audio/wave"}:
        mime = "audio/wav"
    if mime == "audio/mpeg":
        mime = "audio/mp3"
    try:
        result = await transcribe_audio(audio, mime=mime, lang=lang)
    except SpeechUnavailable:
        raise HTTPException(status_code=503, detail="speech_unavailable")
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"speech_upstream_{exc.response.status_code}")
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="speech_upstream_unreachable")
    return {"success": True, "text": result["text"], "engine": result["engine"]}
