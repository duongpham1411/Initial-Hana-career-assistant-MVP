import json

import requests

from app.core.config import settings
from app.services.openai_service import SYSTEM_PROMPT

last_error: str = ""
MAX_RETRY_TOKENS = 1200


def _has_api_key() -> bool:
    return bool(settings.gemini_api_key.strip())


def get_last_error() -> str:
    return last_error


def _extract_text_and_finish_reason(data: dict) -> tuple[str, str]:
    candidate = data["candidates"][0]
    parts = candidate.get("content", {}).get("parts", [])
    text = "".join(part.get("text", "") for part in parts).strip()
    finish_reason = candidate.get("finishReason", "")
    return text, finish_reason


def _request_gemini(full_prompt: str, max_output_tokens: int) -> tuple[str, str]:
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.gemini_model}:generateContent"
    )
    response = requests.post(
        url,
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": settings.gemini_api_key,
        },
        json={
            "contents": [{"parts": [{"text": full_prompt}]}],
            "generationConfig": {
                "maxOutputTokens": max_output_tokens,
                "temperature": 0.7,
            },
        },
        timeout=30,
    )
    response.raise_for_status()
    return _extract_text_and_finish_reason(response.json())


def _ask_hana(prompt: str, max_output_tokens: int = 700) -> str | None:
    global last_error
    last_error = ""

    if not _has_api_key():
        last_error = "GEMINI_API_KEY is missing from backend/.env."
        return None

    try:
        full_prompt = f"""
{SYSTEM_PROMPT.strip()}

Important response rule:
Return a complete answer. Do not stop mid-sentence. Prefer 4-6 short bullets.

{prompt.strip()}
"""
        text, finish_reason = _request_gemini(full_prompt, max_output_tokens)

        if finish_reason == "MAX_TOKENS":
            retry_prompt = f"""
{full_prompt}

Your previous answer was cut off. Rewrite the answer from the beginning as a complete, concise response.
Use fewer words if needed, but finish every sentence.
"""
            retry_tokens = max(max_output_tokens * 2, MAX_RETRY_TOKENS)
            text, finish_reason = _request_gemini(retry_prompt, retry_tokens)

        if finish_reason == "MAX_TOKENS":
            last_error = "Gemini response was cut off by max output tokens."
            return None

        if not text:
            last_error = "Gemini returned an empty response."
            return None
        return text
    except requests.HTTPError as exc:
        detail = exc.response.text[:300] if exc.response is not None else str(exc)
        last_error = f"HTTPError: {detail}"
        return None
    except requests.RequestException as exc:
        last_error = f"RequestException: {str(exc)[:300]}"
        return None
    except Exception as exc:
        last_error = f"{type(exc).__name__}: {str(exc)[:300]}"
        return None


def _parse_json(text: str | None) -> dict | None:
    if not text:
        return None

    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        cleaned = cleaned.removeprefix("json").strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return None


def _format_history(history: list[dict[str, str]]) -> str:
    recent_messages = history[-8:]
    lines = []
    for item in recent_messages:
        sender = item.get("sender", "user")
        text = item.get("text", "")
        if text:
            lines.append(f"{sender}: {text}")
    return "\n".join(lines)


def get_chat_reply(
    message: str,
    history: list[dict[str, str]] | None = None,
    profile: dict | None = None,
) -> str | None:
    prompt = f"""
User profile:
{json.dumps(profile or {})}

Recent conversation:
{_format_history(history or [])}

User message:
{message}

Reply as Hana in 3-6 concise bullets or one short paragraph.
Infer the user's intent naturally from the message and conversation.
If the user asks for an example, create a concrete example based on the previous topic.
If the user asks what a role entails, explain daily tasks, skills, and what a fresher should prepare.
If the user asks about probation or first-day work, give practical workplace guidance.
If the user asks a follow-up, connect it to the previous turn.
"""
    return _ask_hana(prompt, max_output_tokens=900)


def get_company_research(company: str, role: str, profile: dict, fit: dict) -> dict | None:
    prompt = f"""
Create a concise company research brief for a fresher.

Company: {company}
Target role: {role}
User profile: {json.dumps(profile)}
Job fit score: {json.dumps(fit)}

Return ONLY valid JSON with these keys:
industry, what_they_do, summary, likely_data_work, strengths, risks,
cv_keywords, suggested_cv_angle, what_to_learn, interview_tips, application_plan.

Use arrays for list fields. Do not invent recent facts. Mark uncertain company details as general guidance.
"""
    return _parse_json(_ask_hana(prompt, max_output_tokens=1400))


def get_jd_analysis(job_title: str, job_description: str, profile: dict, fit: dict) -> dict | None:
    prompt = f"""
Analyze this job description for a fresher.

Job title: {job_title}
Job description: {job_description}
User profile: {json.dumps(profile)}
Job fit score: {json.dumps(fit)}

Return ONLY valid JSON with these keys:
summary, must_have_skills, nice_to_have_skills, cv_suggestions, interview_focus.

Use arrays for skill and suggestion fields. Keep it concise and explainable.
"""
    return _parse_json(_ask_hana(prompt, max_output_tokens=1200))
