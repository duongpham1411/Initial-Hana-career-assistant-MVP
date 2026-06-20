from fastapi import APIRouter

from app.models.schemas import (
    ChatRequest,
    CompanyResearchRequest,
    JobDescriptionRequest,
    JobTrackerItem,
    Profile,
)
from app.services import mock_service

router = APIRouter()


@router.post("/chat")
def chat(request: ChatRequest):
    return mock_service.get_chat_response(request)


@router.post("/company/research")
def research_company(request: CompanyResearchRequest):
    return mock_service.get_company_research(request)


@router.post("/jd/analyze")
def analyze_job_description(request: JobDescriptionRequest):
    return mock_service.analyze_job_description(request)


@router.get("/profile")
def get_profile():
    return mock_service.get_profile()


@router.post("/profile")
def save_profile(profile: Profile):
    return mock_service.save_profile(profile)


@router.get("/tracker")
def get_tracker():
    return mock_service.get_tracker_items()


@router.post("/tracker")
def add_tracker_item(item: JobTrackerItem):
    return mock_service.add_tracker_item(item)

