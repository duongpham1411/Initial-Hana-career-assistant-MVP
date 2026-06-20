import time

from app.core.config import settings
from app.services import gemini_service, openai_service

last_provider: str = "mock"
last_error: str = ""
PROVIDER_COOLDOWN_SECONDS = 300
provider_cooldowns: dict[str, float] = {}


def _is_quota_or_rate_limit_error(error: str) -> bool:
    normalized = error.lower()
    return any(
        marker in normalized
        for marker in [
            "429",
            "quota",
            "rate limit",
            "rate_limit",
            "insufficient_quota",
            "resource_exhausted",
        ]
    )


def _cooldown_remaining(provider: str) -> int:
    remaining = int(provider_cooldowns.get(provider, 0) - time.time())
    return max(remaining, 0)


def _start_cooldown(provider: str):
    provider_cooldowns[provider] = time.time() + PROVIDER_COOLDOWN_SECONDS


def _provider_order() -> list[str]:
    provider = settings.ai_provider.strip().lower()

    if provider == "gemini":
        return ["gemini"]
    if provider == "openai":
        return ["openai"]
    if provider == "mock":
        return []

    return ["gemini", "openai"]


def get_last_provider() -> str:
    return last_provider


def get_last_error() -> str:
    return last_error


def get_cooldown_status() -> dict[str, int]:
    return {
        provider: remaining
        for provider in ["gemini", "openai"]
        if (remaining := _cooldown_remaining(provider)) > 0
    }


def _set_result(provider: str, error: str = ""):
    global last_provider, last_error
    last_provider = provider
    last_error = error


def _call_provider(provider: str, method_name: str, *args):
    remaining = _cooldown_remaining(provider)
    if remaining > 0:
        _set_result("mock", f"{provider}: temporarily unavailable due to quota cooldown ({remaining}s remaining)")
        return None

    service = gemini_service if provider == "gemini" else openai_service
    method = getattr(service, method_name)
    result = method(*args)

    if result:
        _set_result(provider)
        return result

    provider_error = service.get_last_error()
    if _is_quota_or_rate_limit_error(provider_error):
        _start_cooldown(provider)

    _set_result("mock", f"{provider}: {provider_error}")
    return None


def _try_providers(method_name: str, *args):
    errors = []

    for provider in _provider_order():
        result = _call_provider(provider, method_name, *args)
        if result:
            return result
        if last_error:
            errors.append(last_error)

    _set_result("mock", " | ".join(errors))
    return None


def get_chat_reply(message: str, history: list[dict[str, str]] | None, profile: dict | None):
    return _try_providers("get_chat_reply", message, history, profile)


def get_company_research(company: str, role: str, profile: dict, fit: dict):
    return _try_providers("get_company_research", company, role, profile, fit)


def get_jd_analysis(job_title: str, job_description: str, profile: dict, fit: dict):
    return _try_providers("get_jd_analysis", job_title, job_description, profile, fit)
