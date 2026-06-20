import logging
import re

from app.models.schemas import (
    ChatRequest,
    CompanyResearchRequest,
    JobDescriptionRequest,
    JobTrackerItem,
    Profile,
)
from app.services import ai_provider
from app.services.scoring_service import calculate_job_fit

logger = logging.getLogger(__name__)

mock_profile = Profile()

mock_tracker_items = [
    JobTrackerItem(
        company="Acme Analytics",
        role="Data Analyst Intern",
        status="Applied",
        notes="Follow up next week.",
    )
]


def _contains_any(text: str, keywords: list[str]) -> bool:
    return any(keyword in text for keyword in keywords)


def _clean_role(raw_role: str) -> str:
    role = raw_role.strip(" ?.!").replace(" ds ", " data science ")
    role = re.sub(r"\b(internship|intern|job|role|position)\b", "", role)
    role = re.sub(r"\s+", " ", role).strip()

    role_aliases = {
        "ds": "data science",
        "da": "data analyst",
        "ba": "business analyst",
    }

    return role_aliases.get(role, role)


def _detect_role(text: str) -> str | None:
    patterns = [
        r"prepare for (?:a |an |the )?(.+?)(?: internship| intern| job| role| position)?$",
        r"apply for (?:a |an |the )?(.+?)(?: internship| intern| job| role| position)?$",
        r"become (?:a |an |the )?(.+?)(?: intern| analyst| teacher| developer| designer)?$",
        r"what is (?:a |an |the )?(.+?)$",
        r"what does (?:a |an |the )?(.+?) do",
    ]

    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return _clean_role(match.group(1))

    if _contains_any(text, ["teacher", "teaching"]):
        return "teacher"

    if _contains_any(text, ["data science", "ds internship", "ds intern"]):
        return "data science"

    if _contains_any(text, ["data scientist"]):
        return "data scientist"

    if _contains_any(text, ["software", "developer", "frontend", "backend"]):
        return "software developer"

    if _contains_any(text, ["marketing"]):
        return "marketing"

    return None


def _build_role_reply(role: str) -> str:
    role_text = role.lower()

    if _contains_any(role_text, ["teacher", "teaching"]):
        return (
            "For a teacher internship, prepare three things: a short teaching demo, basic "
            "classroom management examples, and one lesson plan. On your CV, highlight tutoring, "
            "presentation, mentoring, communication, and any volunteer teaching experience."
        )

    if _contains_any(role_text, ["data science", "machine learning", "ai"]):
        return (
            "For a data science internship, build one end-to-end project: clean data, explore it, "
            "train a simple model, evaluate results, and explain the business meaning. Review Python, "
            "pandas, statistics, SQL, and model metrics like accuracy, precision, recall, and RMSE."
        )

    if _contains_any(role_text, ["data analyst", "business analyst", "analyst"]):
        return (
            "For an analyst internship, prepare SQL, Excel, dashboarding, and business storytelling. "
            "Your CV should show one project where you cleaned data, found insights, and recommended "
            "a practical business action."
        )

    if _contains_any(role_text, ["software", "developer", "frontend", "backend"]):
        return (
            "For a software internship, prepare one clean project, basic data structures, Git, and "
            "clear explanations of your code. Your CV should link to GitHub and describe what you "
            "built, the tech stack, and the problem it solves."
        )

    if _contains_any(role_text, ["marketing", "social media", "content"]):
        return (
            "For a marketing internship, prepare examples of content, campaign ideas, customer "
            "research, and simple metrics. Your CV should show writing, creativity, audience analysis, "
            "and any results such as engagement, clicks, or reach."
        )

    return (
        f"For a {role} opportunity, start by reading 3 job descriptions and listing repeated skills. "
        "Then prepare one proof for each skill: a project, class assignment, volunteer task, or short "
        "case study. Your CV should connect your experience directly to the role instead of staying generic."
    )


def _last_user_topic(history: list[dict[str, str]]) -> str:
    for item in reversed(history):
        if item.get("sender") == "user" and item.get("text"):
            return item["text"]
    return ""


def _build_example_reply(topic: str) -> str:
    text = topic.lower()

    if _contains_any(text, ["interview", "data analyst", "analyst"]):
        return (
            "Example interview question: 'Tell me about a time you used data to solve a problem.' "
            "A strong answer: 'In my sales dashboard project, I cleaned Excel data, grouped sales by "
            "region, found that one region had lower conversion, and recommended focusing follow-up "
            "campaigns there.'"
        )

    if _contains_any(text, ["cv", "resume"]):
        return (
            "Example CV bullet: 'Cleaned 5,000 sales records in Excel and SQL, built a Power BI "
            "dashboard, and identified the top 3 products contributing to monthly revenue growth.'"
        )

    return (
        "Example: describe the situation, explain your action, and show the result. For instance, "
        "'I noticed a repeated problem, used a simple tool or process to solve it, and explained the "
        "outcome clearly to the team.'"
    )


def _build_role_explanation(role: str) -> str:
    role_text = role.lower()

    if _contains_any(role_text, ["data scientist", "data science"]):
        return (
            "A data scientist uses data to build predictions and insights. Daily work can include "
            "cleaning data, exploring patterns, training models, evaluating accuracy, and explaining "
            "results to business teams. Prepare Python, statistics, SQL, pandas, and one simple ML project."
        )

    if _contains_any(role_text, ["data analyst", "analyst"]):
        return (
            "A data analyst turns raw data into business answers. Daily work often includes cleaning data, "
            "writing SQL queries, making Excel or BI dashboards, tracking KPIs, and explaining insights. "
            "Prepare SQL, Excel, dashboarding, and communication examples."
        )

    if _contains_any(role_text, ["teacher", "teaching"]):
        return (
            "A teacher plans lessons, explains concepts, manages the classroom, checks student progress, "
            "and communicates with students or parents. Prepare a short demo lesson, lesson plan, and "
            "examples of tutoring or presentation experience."
        )

    return (
        f"A {role} role usually means understanding the team's goals, doing the core daily tasks, "
        "communicating progress, and learning the tools used by that profession. Start by reading "
        "3 job descriptions and listing repeated responsibilities."
    )


def _build_chat_reply(message: str, history: list[dict[str, str]] | None = None) -> str:
    text = message.lower()
    history = history or []
    previous_topic = _last_user_topic(history)

    if _contains_any(text, ["example", "sample", "for me"]):
        return _build_example_reply(previous_topic or message)

    if _contains_any(text, ["first day", "probation", "onboarding", "new job"]):
        return (
            "On your first day of probation, focus on learning and reliability: arrive early, take notes, "
            "ask what success looks like in the first month, confirm your tasks, learn team tools, and "
            "send a short end-of-day update if appropriate. Do not try to prove everything on day one."
        )

    if _contains_any(text, ["what exactly", "what does", "what is", "entail", "daily tasks", "responsibilities"]):
        role = _detect_role(text)
        if not role and previous_topic:
            role = _detect_role(previous_topic.lower())
        if role:
            return _build_role_explanation(role)

    if _contains_any(text, ["cv", "resume"]):
        return (
            "For your CV, lead with a short analytics summary, then show projects with tools "
            "and results. Use bullets like: cleaned sales data with SQL, built a Power BI "
            "dashboard, and found one business recommendation."
        )

    if _contains_any(text, ["interview", "introduce myself", "tell me about yourself"]):
        return (
            "For interviews, prepare a 45-second intro: who you are, your target analyst role, "
            "one relevant project, and why the company interests you. Then practice explaining "
            "your project problem, data, tools, and result."
        )

    if _contains_any(text, ["sql", "query", "database"]):
        return (
            "For SQL practice, focus on SELECT, WHERE, GROUP BY, joins, CASE WHEN, and basic "
            "window functions. Build one project where you answer business questions from a "
            "small dataset instead of only writing isolated queries."
        )

    if _contains_any(text, ["excel", "spreadsheet"]):
        return (
            "For Excel, make sure you can use pivot tables, lookup formulas, IF logic, charts, "
            "and basic cleaning. A good CV angle is showing how you turned raw rows into a "
            "clear summary table or dashboard."
        )

    if _contains_any(text, ["power bi", "tableau", "dashboard", "visualization"]):
        return (
            "For dashboards, do not only show charts. Explain the business question, the main "
            "KPIs, the filters, and the decision someone can make from the dashboard."
        )

    if _contains_any(text, ["jd", "job description", "requirement", "requirements"]):
        return (
            "For a JD, separate must-have skills from nice-to-have skills. Match your CV to the "
            "must-haves first, then add one project bullet that proves you can do similar work."
        )

    if _contains_any(text, ["company", "research", "about them"]):
        return (
            "For company research, learn what the company sells, who its customers are, recent "
            "news, and how data might support their business. Use that to write a more specific "
            "application reason."
        )

    if _contains_any(text, ["track", "tracker", "application", "applied"]):
        return (
            "For job tracking, keep company, role, status, deadline, fit score, and next action. "
            "Review it twice a week so you know where to follow up or customize your CV."
        )

    if _contains_any(text, ["salary", "pay", "stipend"]):
        return (
            "For internship pay, research the local market first and stay flexible. In interviews, "
            "you can say you are open to the company range and most focused on learning analytics work."
        )

    if _contains_any(text, ["project", "portfolio"]):
        return (
            "A strong beginner analytics project has one clear question, a real or realistic "
            "dataset, cleaning steps, analysis, dashboard or charts, and three business insights."
        )

    role = _detect_role(text)
    if role:
        return _build_role_reply(role)

    return (
        "I can help with CV improvement, company research, JD analysis, interview practice, "
        "SQL preparation, and job tracking. Tell me the role or paste the question you are working on."
    )


def _build_mock_mode_reply(message: str = "", history: list[dict[str, str]] | None = None) -> str:
    error = ai_provider.get_last_error()
    if error:
        logger.warning("Live AI provider failed; using mock fallback. Error: %s", error)
        return _build_chat_reply(message, history)

    return (
        _build_chat_reply(message, history)
        if message
        else "Live AI is not configured yet, so Hana is using the local mock career coach."
    )


def get_chat_response(request: ChatRequest):
    ai_reply = ai_provider.get_chat_reply(
        request.message,
        request.history,
        mock_profile.model_dump(),
    )
    cooldown_status = ai_provider.get_cooldown_status()
    is_live_fallback = not ai_reply and bool(ai_provider.get_last_error())

    return {
        "reply": ai_reply or _build_mock_mode_reply(request.message, request.history),
        "heard": request.message,
        "voice": "female_hana" if ai_reply else "female_mock",
        "source": ai_provider.get_last_provider() if ai_reply else "mock",
        "ai_error": "" if ai_reply else "live_ai_temporarily_unavailable",
        "ai_notice": ""
        if ai_reply or not is_live_fallback
        else "Live AI is temporarily unavailable, so Hana is using local career coaching for now.",
        "provider_cooldowns": cooldown_status,
    }


def get_company_research(request: CompanyResearchRequest):
    company = request.company_name.strip()
    role = request.role_interest
    company_text = (
        f"{company} {role} technology digital products data analytics dashboard SQL Excel "
        "reporting business insight remote hybrid project communication"
    )
    fit = calculate_job_fit(mock_profile, company_text, role)
    profile_data = mock_profile.model_dump()
    ai_research = ai_provider.get_company_research(company, role, profile_data, fit)

    return {
        "company": company,
        "role_interest": role,
        "industry": "Technology, digital products, and data-driven operations",
        "what_they_do": (
            f"{company} likely uses product, customer, sales, and operations data to understand "
            "performance, improve decisions, and report business results. Treat this as a mock "
            "research brief until real web research is connected."
        ),
        "fit_score": fit["total_score"],
        "total_score": fit["total_score"],
        "job_fit": fit,
        "breakdown": fit["breakdown"],
        "matched_skills": fit["matched_skills"],
        "missing_skills": fit["missing_skills"],
        "recommendation_level": fit["recommendation_level"],
        "summary": (
            f"{company} is a {fit['recommendation_level'].lower()} for {role} based on your "
            "mock profile, skills, projects, and work preferences."
        ),
        **(ai_research or {}),
        "source": ai_provider.get_last_provider() if ai_research else "mock",
        "likely_data_work": [
            "Build weekly KPI reports for product, marketing, sales, or operations teams.",
            "Clean raw spreadsheet or database exports before analysis.",
            "Create dashboards that explain trends, conversion, retention, or process performance.",
            "Turn business questions into metrics and simple recommendations.",
        ]
        if not ai_research
        else ai_research.get("likely_data_work", []),
        "strengths": [
            "Good place to connect analytics projects with real business decisions.",
            "Entry-level candidates can stand out by showing clear SQL and dashboard examples.",
            "Strong fit if you can explain insights in simple business language.",
        ]
        if not ai_research
        else ai_research.get("strengths", []),
        "risks": [
            "May expect strong communication, not only technical tools.",
            "Could ask for evidence of real projects, internships, or case-study thinking.",
            "Some teams may prefer Power BI, Tableau, or statistics experience.",
        ]
        if not ai_research
        else ai_research.get("risks", []),
        "cv_keywords": [
            "SQL",
            "Excel",
            "Dashboard",
            "KPI reporting",
            "Data cleaning",
            "Business insight",
            "Stakeholder communication",
        ]
        if not ai_research
        else ai_research.get("cv_keywords", []),
        "suggested_cv_angle": (
            "Position yourself as a beginner analyst who can clean data, build a useful dashboard, "
            "and explain what action the business should take next."
        )
        if not ai_research
        else ai_research.get("suggested_cv_angle", ""),
        "what_to_learn": [
            f"What {company} sells and who its main users or customers are.",
            "The most important KPIs for that business model.",
            "Recent company news, product launches, or market challenges.",
            "Analytics tools mentioned in their job descriptions.",
        ]
        if not ai_research
        else ai_research.get("what_to_learn", []),
        "interview_tips": [
            f"Prepare one specific reason you want to join {company}.",
            "Explain one project with problem, data, tool, result, and recommendation.",
            "Review SQL joins, GROUP BY, and dashboard storytelling.",
            "Prepare one question about how the team uses data in daily decisions.",
        ]
        if not ai_research
        else ai_research.get("interview_tips", []),
        "application_plan": [
            "Study the company website and note three business areas where data matters.",
            "Pick one CV project that matches those business areas.",
            "Rewrite two CV bullets using metrics, tools, and business outcomes.",
            "Prepare a 30-second pitch connecting your project to the company.",
        ]
        if not ai_research
        else ai_research.get("application_plan", []),
    }


def analyze_job_description(request: JobDescriptionRequest):
    fit = calculate_job_fit(mock_profile, request.job_description, request.job_title)
    profile_data = mock_profile.model_dump()
    ai_analysis = ai_provider.get_jd_analysis(
        request.job_title,
        request.job_description,
        profile_data,
        fit,
    )

    return {
        "job_title": request.job_title,
        "fit_score": fit["total_score"],
        "total_score": fit["total_score"],
        "breakdown": fit["breakdown"],
        "matched_skills": fit["matched_skills"],
        "missing_skills": fit["missing_skills"],
        "recommendation_level": fit["recommendation_level"],
        "summary": (
            f"This JD is a {fit['recommendation_level'].lower()}. The score is based on skill, "
            "role, project, location/work mode, and interest matches."
        )
        if not ai_analysis
        else ai_analysis.get("summary", ""),
        "source": ai_provider.get_last_provider() if ai_analysis else "mock",
        "must_have_skills": ai_analysis.get("must_have_skills", fit["matched_skills"]) if ai_analysis else fit["matched_skills"],
        "nice_to_have_skills": ai_analysis.get("nice_to_have_skills", fit["missing_skills"]) if ai_analysis else fit["missing_skills"],
        "cv_suggestions": ai_analysis.get("cv_suggestions", []) if ai_analysis else [],
        "interview_focus": ai_analysis.get("interview_focus", []) if ai_analysis else [],
        "next_steps": [
            "Customize your resume summary for this role.",
            "Add metrics to your project bullet points.",
            "Practice explaining one dashboard project clearly.",
        ]
        if not ai_analysis
        else ai_analysis.get("cv_suggestions", []),
    }


def get_profile():
    return mock_profile


def save_profile(profile: Profile):
    global mock_profile
    mock_profile = profile
    return {"message": "Profile saved in mock memory.", "profile": mock_profile}


def get_tracker_items():
    return {"items": mock_tracker_items}


def add_tracker_item(item: JobTrackerItem):
    mock_tracker_items.append(item)
    return {"message": "Tracker item added in mock memory.", "item": item}
