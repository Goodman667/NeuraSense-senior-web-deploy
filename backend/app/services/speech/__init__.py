"""Speech-to-text for voice input on devices where the browser's own recognition is unreliable."""

from .transcribe import SpeechUnavailable, speech_status, transcribe_audio

__all__ = ["SpeechUnavailable", "speech_status", "transcribe_audio"]
