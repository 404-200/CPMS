from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class CandidateCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr | None = None
    stream_id: int


class CandidateUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    stream_id: int | None = None
    active: bool | None = None


class CandidateOut(BaseModel):
    id: int
    candidate_code: str
    first_name: str
    last_name: str
    email: EmailStr | None
    stream_id: int
    stream_name: str | None = None
    active: bool
    period_id: int | None = None
    attendance: float | None = None
    communication: float | None = None
    accountability: float | None = None
    creativity: float | None = None
    project_delivery: float | None = None
    tech_skills: float | None = None
    dev_group_name: str | None = None
    weekly_feedback: str | None = None
    action_plan: str | None = None
    overall_average: float | None = None
    ranking: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CandidateImportRowError(BaseModel):
    row: int
    message: str


class CandidateImportSummary(BaseModel):
    filename: str
    rows_received: int
    rows_created: int
    created: list[CandidateOut]
    errors: list[CandidateImportRowError]