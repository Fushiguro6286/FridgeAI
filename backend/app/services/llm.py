"""Thin wrapper over an OpenAI-compatible Chat Completions API (OpenRouter by default) with structured output."""

import logging
from functools import lru_cache
from typing import Any, TypeVar

import openai
from pydantic import BaseModel, ValidationError

from app.config import get_settings
from app.errors import AppError

log = logging.getLogger(__name__)
T = TypeVar("T", bound=BaseModel)


@lru_cache
def _client(api_key: str, base_url: str, timeout: float) -> openai.OpenAI:
    return openai.OpenAI(api_key=api_key, base_url=base_url, timeout=timeout, max_retries=1)


def ensure_configured() -> None:
    s = get_settings()
    if not s.ai_mock_mode and not s.ai_api_key:
        raise AppError(
            503,
            "ai_not_configured",
            "AI features are not configured on the server: set AI_API_KEY in backend/.env.",
        )


def parse_structured(instructions: str, content: list[dict[str, Any]], schema: type[T]) -> T:
    ensure_configured()
    s = get_settings()
    client = _client(s.ai_api_key, s.ai_base_url, s.ai_timeout_seconds)
    # OpenRouter: only route to providers that honour the JSON schema.
    extra_body: dict[str, Any] = {"provider": {"require_parameters": True}}
    if s.ai_disable_reasoning:
        extra_body["reasoning"] = {"enabled": False}
    try:
        completion = client.chat.completions.parse(
            model=s.ai_model,
            messages=[{"role": "system", "content": instructions}, {"role": "user", "content": content}],
            response_format=schema,
            max_tokens=16000,
            extra_body=extra_body,
        )
    except openai.APITimeoutError:
        raise AppError(504, "ai_timeout", "The AI service took too long to respond. Please try again.") from None
    except openai.RateLimitError:
        raise AppError(429, "ai_rate_limited", "The AI service is busy or its daily limit was reached. Please retry later.") from None
    except (openai.AuthenticationError, openai.PermissionDeniedError):
        log.error("AI provider rejected the API key")
        raise AppError(503, "ai_not_configured", "The server's AI API key was rejected.") from None
    except openai.NotFoundError:
        log.error("AI model %r not found or has no provider supporting structured output", s.ai_model)
        raise AppError(503, "ai_not_configured", "The configured AI model is not available.") from None
    except openai.BadRequestError as e:
        log.warning("AI bad request: %s", e.message)
        raise AppError(422, "ai_bad_request", "The AI service could not process this request.") from None
    except openai.APIConnectionError:
        raise AppError(503, "ai_unavailable", "Could not reach the AI service. Check the server's connection.") from None
    except (openai.LengthFinishReasonError, openai.ContentFilterFinishReasonError, ValidationError):
        raise AppError(502, "ai_bad_output", "The AI returned an incomplete answer. Please try again.") from None
    except openai.APIStatusError as e:
        if e.status_code == 402:  # OpenRouter: not enough credit for a paid model
            log.error("AI account has no credits for model %r", s.ai_model)
            raise AppError(503, "ai_no_credits", "The server's AI account is out of credits. Add credits or use a free model.") from None
        log.warning("AI API error status=%s", e.status_code)
        raise AppError(502, "ai_error", "The AI service returned an error. Please try again.") from None
    except TypeError:
        # OpenRouter can send HTTP 200 with an error body and no choices; the SDK's parser then fails.
        log.warning("AI provider returned an error inside a 200 response (model %r)", s.ai_model)
        raise AppError(502, "ai_error", "The AI service returned an error. Please try again.") from None

    if not completion.choices:
        raise AppError(502, "ai_error", "The AI service returned an error. Please try again.")
    message = completion.choices[0].message
    if message.refusal:
        raise AppError(422, "ai_refused", "The AI declined to process this request.")
    if message.parsed is None:
        raise AppError(502, "ai_bad_output", "The AI returned an unreadable answer. Please try again.")
    return message.parsed
