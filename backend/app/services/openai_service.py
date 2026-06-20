import json

from openai import OpenAI

from app.core.config import settings

last_error: str = ""

SYSTEM_PROMPT = """
You are Hana, a friendly female AI career assistant for students and freshers.
You help users with practical career situations before, during, and after hiring:
role explanations, job search, probation, first day at work, workplace communication,
CVs, interviews, company research, job descriptions, projects, and skill planning.
Keep answers concise, practical, and structured.
Use simple language. Do not invent company facts. If data is mock or uncertain, say so.
Use previous turns to understand follow-up questions like "give me an example" or "what does that mean".
If a question is not directly about jobs but can affect career success, answer from a practical career perspective.
"""


def _has_api_key() -> bool:
    return bool(settings.openai_api_key.strip())


def get_last_error() -> str:
    return last_error


def _client() -> OpenAI:
    return OpenAI(api_key=settings.openai_api_key)


def _ask_hana(prompt: str, max_output_tokens: int = 450) -> str | None:
    global last_error
    last_error = ""

    if not _has_api_key():
        last_error = "OPENAI_API_KEY is missing from backend/.env."
        return None

    try:
        response = _client().responses.create(
            model=settings.openai_model,
            instructions=SYSTEM_PROMPT,
            input=prompt,
            max_output_tokens=max_output_tokens,
        )
        text = response.output_text.strip()
        if not text:
            last_error = "OpenAI returned an empty response."
            return None
        return text
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
Return a complete answer. Do not stop mid-sentence.
Do not use hardcoded categories. Infer the user's intent naturally from the message and conversation.
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
    return _parse_json(_ask_hana(prompt, max_output_tokens=700))


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
    return _parse_json(_ask_hana(prompt, max_output_tokens=650))
