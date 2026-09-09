from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class CandidateCreate(BaseModel):
    candidate_code: str = Field(min_length=1, max_length=50)
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
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
