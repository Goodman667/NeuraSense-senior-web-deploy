"""
Request language (Chinese by default, English when the app is switched to English).

The frontend sends the header ``X-Lang: en`` on every API call in English mode.
``LangMiddleware`` stores it in a context variable for the duration of the request,
so any code that talks to the LLM or the speech engine can ask ``is_english()``
without passing the language through every function.
"""

from __future__ import annotations

import re
from contextvars import ContextVar
from typing import Any

_current_lang: ContextVar[str] = ContextVar("neurasense_lang", default="zh")

EN_REPLY_INSTRUCTION = (
    "LANGUAGE: The user is using the English version of the app. "
    "Write every word of your reply in natural, plain English, even though the "
    "instructions and context above are in Chinese. Do not include Chinese text. "
    "If a JSON format is required, keep the JSON keys and fixed enum values exactly "
    "as specified, and write only the human-readable text values in English."
)

# English crisis phrases (used alongside the existing Chinese keyword lists).
EN_CRISIS_RE = re.compile(
    r"suicid|kill(ing)? myself|end(ing)? (my life|it all)|take my (own )?life|want(ed)? to die"
    r"|don'?t want to (live|be alive|be here)|self[- ]?harm|hurt(ing)? myself|cut(ting)? myself"
    r"|better off dead|no reason to live|not worth living|suicide note",
    re.IGNORECASE,
)


def set_lang(value: str | None) -> None:
    _current_lang.set("en" if (value or "").lower().startswith("en") else "zh")


def get_lang() -> str:
    return _current_lang.get()


def is_english() -> bool:
    return _current_lang.get() == "en"


def has_en_crisis(text: str | None) -> bool:
    return bool(text) and bool(EN_CRISIS_RE.search(text or ""))


def apply_lang(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Return messages with the English-reply instruction added when the request is English."""
    if not is_english() or not messages:
        return messages
    out = [dict(m) for m in messages]
    first = out[0]
    if str(first.get("role")) in {"system", "developer"}:
        first["content"] = f"{first.get('content') or ''}\n\n{EN_REPLY_INSTRUCTION}"
    else:
        out.insert(0, {"role": "system", "content": EN_REPLY_INSTRUCTION})
    return out


class LangMiddleware:
    """Pure ASGI middleware: reads ``X-Lang`` (or ``?lang=``) into the request context."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope.get("type") in {"http", "websocket"}:
            lang = ""
            for key, value in scope.get("headers") or []:
                if key == b"x-lang":
                    lang = value.decode("latin-1")
                    break
            if not lang:
                qs = (scope.get("query_string") or b"").decode("latin-1")
                match = re.search(r"(?:^|&)lang=([a-zA-Z-]+)", qs)
                lang = match.group(1) if match else ""
            token = _current_lang.set("en" if lang.lower().startswith("en") else "zh")
            try:
                await self.app(scope, receive, send)
            finally:
                _current_lang.reset(token)
            return
        await self.app(scope, receive, send)
