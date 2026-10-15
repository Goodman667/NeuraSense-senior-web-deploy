"""Small HTTP client for the project's LLM calls.

Defaults target an OpenAI Responses-compatible gateway, while keeping the
legacy chat-completions path available through LLM_PROVIDER.
"""

from __future__ import annotations

from typing import Any

import httpx


DEFAULT_LLM_MODEL = "gpt-6-luna"
DEFAULT_LLM_PROVIDER = "responses"
DEFAULT_LLM_API_BASE = "https://ai.ha7e.com"

RESPONSES_PROVIDERS = {"response", "responses", "openai_responses"}
CHAT_COMPLETION_PROVIDERS = {"openai", "openai_compatible", "custom", "chat_completions"}


def normalize_provider(provider: str | None) -> str:
    return (provider or DEFAULT_LLM_PROVIDER).strip().lower()


def normalize_api_base(api_base: str | None) -> str:
    return (api_base or DEFAULT_LLM_API_BASE).strip().rstrip("/")


def provider_uses_responses(provider: str | None) -> bool:
    return normalize_provider(provider) in RESPONSES_PROVIDERS


def provider_uses_chat_completions(provider: str | None) -> bool:
    return normalize_provider(provider) in CHAT_COMPLETION_PROVIDERS


def build_llm_url(api_base: str, endpoint: str) -> str:
    base = normalize_api_base(api_base)
    endpoint = endpoint.strip("/")

    if base.endswith(f"/{endpoint}"):
        return base
    if base.endswith("/v1"):
        return f"{base}/{endpoint}"
    return f"{base}/v1/{endpoint}"


def normalize_messages(messages: list[dict[str, Any]]) -> list[dict[str, str]]:
    normalized: list[dict[str, str]] = []
    for raw in messages:
        role = str(raw.get("role") or "user").strip()
        if role not in {"system", "developer", "user", "assistant"}:
            role = "user"
        content = raw.get("content") or raw.get("text") or ""
        content = str(content).strip()
        if content:
            normalized.append({"role": role, "content": content})
    return normalized


def extract_text_from_llm_response(data: dict[str, Any]) -> str:
    output_text = data.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        return output_text.strip()

    texts: list[str] = []
    for item in data.get("output", []) or []:
        if not isinstance(item, dict):
            continue
        content = item.get("content")
        if isinstance(content, list):
            for part in content:
                if isinstance(part, dict):
                    text = part.get("text") or part.get("output_text")
                    if isinstance(text, str) and text.strip():
                        texts.append(text.strip())
        text = item.get("text")
        if isinstance(text, str) and text.strip():
            texts.append(text.strip())
    if texts:
        return "\n".join(texts).strip()

    choices = data.get("choices")
    if isinstance(choices, list) and choices:
        first = choices[0]
        if isinstance(first, dict):
            message = first.get("message") or {}
            if isinstance(message, dict):
                content = message.get("content")
                if isinstance(content, str) and content.strip():
                    return content.strip()
            text = first.get("text")
            if isinstance(text, str) and text.strip():
                return text.strip()

    return ""


def build_responses_payload(
    *,
    model: str,
    messages: list[dict[str, Any]],
    temperature: float,
    max_tokens: int,
) -> dict[str, Any]:
    return {
        "model": model,
        "input": normalize_messages(messages),
        "temperature": temperature,
        "max_output_tokens": max_tokens,
    }


def build_chat_completions_payload(
    *,
    model: str,
    messages: list[dict[str, Any]],
    temperature: float,
    max_tokens: int,
) -> dict[str, Any]:
    return {
        "model": model,
        "messages": normalize_messages(messages),
        "temperature": temperature,
        "max_tokens": max_tokens,
    }


async def call_llm_async(
    *,
    api_key: str,
    model: str,
    provider: str,
    api_base: str,
    messages: list[dict[str, Any]],
    temperature: float = 0.7,
    max_tokens: int = 1200,
    timeout: float = 60.0,
) -> str:
    provider = normalize_provider(provider)
    endpoint = "responses" if provider_uses_responses(provider) else "chat/completions"
    payload_builder = build_responses_payload if provider_uses_responses(provider) else build_chat_completions_payload
    payload = payload_builder(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )

    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            build_llm_url(api_base, endpoint),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        response.raise_for_status()
        data = response.json()

    text = extract_text_from_llm_response(data)
    if not text:
        raise RuntimeError("LLM returned empty content")
    return text


def call_llm_sync(
    *,
    api_key: str,
    model: str,
    provider: str,
    api_base: str,
    messages: list[dict[str, Any]],
    temperature: float = 0.7,
    max_tokens: int = 1200,
    timeout: float = 60.0,
) -> str:
    provider = normalize_provider(provider)
    endpoint = "responses" if provider_uses_responses(provider) else "chat/completions"
    payload_builder = build_responses_payload if provider_uses_responses(provider) else build_chat_completions_payload
    payload = payload_builder(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )

    response = httpx.post(
        build_llm_url(api_base, endpoint),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=timeout,
    )
    response.raise_for_status()
    text = extract_text_from_llm_response(response.json())
    if not text:
        raise RuntimeError("LLM returned empty content")
    return text
