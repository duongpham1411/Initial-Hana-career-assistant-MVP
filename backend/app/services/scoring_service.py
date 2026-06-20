import re

from app.models.schemas import Profile

COMMON_SKILLS = [
    "excel",
    "sql",
    "python",
    "power bi",
    "tableau",
    "statistics",
    "dashboard",
    "data cleaning",
    "communication",
    "reporting",
    "machine learning",
    "pandas",
    "teaching",
    "presentation",
    "marketing",
    "git",
]

PROJECT_KEYWORDS = [
    "project",
    "portfolio",
    "dashboard",
    "case study",
    "analysis",
    "report",
    "internship",
    "experience",
    "built",
    "created",
]

WORK_MODE_KEYWORDS = ["remote", "hybrid", "onsite", "office", "ho chi minh", "hcm", "part-time", "full-time"]


def _normalize(text: str) -> str:
    return text.lower().strip()


def _contains_any(text: str, keywords: list[str]) -> bool:
    return any(keyword in text for keyword in keywords)


def _has_keyword(text: str, keyword: str) -> bool:
    if " " in keyword:
        return keyword in text
    return re.search(rf"\b{re.escape(keyword)}\b", text) is not None


def _recommendation_level(score: int) -> str:
    if score >= 80:
        return "Strong Fit"
    if score >= 65:
        return "Good Fit"
    if score >= 50:
        return "Possible Fit"
    return "Weak Fit"


def _score_skill_match(profile: Profile, text: str) -> tuple[int, list[str], list[str]]:
    profile_skills = [_normalize(skill) for skill in profile.skills]
    required_skills = [skill for skill in COMMON_SKILLS if _has_keyword(text, skill)]

    if not required_skills:
        required_skills = profile_skills[:]

    matched_skills = [skill for skill in profile_skills if skill in required_skills or _has_keyword(text, skill)]
    missing_skills = [skill for skill in required_skills if skill not in matched_skills]

    if not required_skills:
        return 0, matched_skills, missing_skills

    score = round((len(matched_skills) / len(required_skills)) * 40)
    return min(score, 40), matched_skills, missing_skills


def _score_role_match(profile: Profile, text: str, target_role: str) -> int:
    target = _normalize(target_role)
    profile_roles = f"{profile.target_role} {profile.target_roles}".lower()

    target_words = [word for word in target.replace("/", " ").split() if len(word) > 2]
    matched_profile_words = [word for word in target_words if word in profile_roles]
    matched_text_words = [word for word in target_words if word in text]

    if target and target in profile_roles:
        return 25
    if target_words:
        profile_score = round((len(matched_profile_words) / len(target_words)) * 25)
        text_support_score = min(8, round((len(matched_text_words) / len(target_words)) * 8))
        return max(profile_score, text_support_score)
    return 0


def _score_project_match(profile: Profile, text: str) -> int:
    profile_text = f"{profile.experience_level} {profile.cv_summary}".lower()
    combined = f"{text} {profile_text}"
    matched_count = sum(1 for keyword in PROJECT_KEYWORDS if keyword in combined)

    if "fresher" in profile_text and matched_count > 0:
        return min(20, 8 + matched_count * 3)
    return min(20, matched_count * 4)


def _score_location_match(profile: Profile, text: str) -> int:
    preference = _normalize(f"{profile.location_preference} {profile.availability}")
    matched_modes = [keyword for keyword in WORK_MODE_KEYWORDS if keyword in preference and keyword in text]

    if matched_modes:
        return 10
    if _contains_any(text, ["remote", "hybrid", "onsite", "office"]):
        return 5
    return 7


def _score_interest_match(profile: Profile, text: str) -> int:
    interest_text = " ".join(profile.interests).lower()
    matched_interests = [interest for interest in profile.interests if _normalize(interest) in text]

    if matched_interests:
        return 5
    if interest_text and _contains_any(text, interest_text.split()):
        return 3
    return 0


def calculate_job_fit(profile: Profile, comparison_text: str, target_role: str) -> dict:
    text = _normalize(comparison_text)

    skill_score, matched_skills, missing_skills = _score_skill_match(profile, text)
    role_score = _score_role_match(profile, text, target_role)
    project_score = _score_project_match(profile, text)
    location_score = _score_location_match(profile, text)
    interest_score = _score_interest_match(profile, text)

    total_score = skill_score + role_score + project_score + location_score + interest_score

    return {
        "total_score": total_score,
        "breakdown": {
            "skill_match": skill_score,
            "role_match": role_score,
            "experience_project_match": project_score,
            "location_work_mode_match": location_score,
            "interest_match": interest_score,
        },
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "recommendation_level": _recommendation_level(total_score),
    }
