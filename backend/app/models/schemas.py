from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    history: list[dict[str, str]] = []


class CompanyResearchRequest(BaseModel):
    company_name: str = Field(..., min_length=1)
    role_interest: str = "Data Analyst Intern"


class JobDescriptionRequest(BaseModel):
    job_title: str = "Data Analyst Intern"
    job_description: str = Field(..., min_length=1)


class Profile(BaseModel):
    name: str = "Student User"
    target_role: str = "Data Analyst Intern"
    target_roles: str = "Data Analyst Intern, Business Analyst Intern"
    skills: list[str] = ["Excel", "SQL", "Python", "Power BI"]
    experience_level: str = "Fresher"
    location_preference: str = "Ho Chi Minh City or remote"
    availability: str = "Part-time internship, available immediately"
    cv_summary: str = "Entry-level analytics candidate with SQL, Excel, dashboarding, and business projects."
    interests: list[str] = ["analytics", "business insight", "dashboarding"]


class JobTrackerItem(BaseModel):
    company: str
    role: str
    status: str = "Saved"
    notes: str = ""
