from datetime import datetime

from pydantic import BaseModel, Field

from app.models.score import CommitmentType

MIN_SCORE = 0
MAX_SCORE = 100


class ManualScoreCreate(BaseModel):
    candidate_id: int
    period_id: int

    attendance: float = Field(ge=MIN_SCORE, le=MAX_SCORE)
    communication: float = Field(ge=MIN_SCORE, le=MAX_SCORE)
    accountability: float = Field(ge=MIN_SCORE, le=MAX_SCORE)
    creativity: float = Field(ge=MIN_SCORE, le=MAX_SCORE, description="Creativity & Ownership")
    project_delivery: float = Field(ge=MIN_SCORE, le=MAX_SCORE, description="Subject Deliverables")
    tech_skills: float = Field(ge=MIN_SCORE, le=MAX_SCORE)

    dev_group_name: str | None = Field(default=None, max_length=120)
    weekly_feedback: str | None = None
    action_plan: str | None = None
    commitment_type: CommitmentType | None = None


class ScoreOut(BaseModel):
    id: int
    candidate_id: int
    period_id: int
    attendance: float
    communication: float
    accountability: float
    creativity: float
    project_delivery: float
    tech_skills: float
    dev_group_name: str | None
    weekly_feedback: str | None
    action_plan: str | None
    commitment_type: CommitmentType | None
    updated_at: datetime

    model_config = {"from_attributes": True}


class ManualScoreResult(BaseModel):
    score: ScoreOut
    tdc_average: float
    tech_average: float
    overall_average: float
    ranking: int
