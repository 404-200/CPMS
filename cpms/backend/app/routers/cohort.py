from datetime import datetime

from pydantic import BaseModel, Field


class CohortCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class CohortOut(BaseModel):
    id: int
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}