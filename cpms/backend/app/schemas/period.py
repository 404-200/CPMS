from datetime import date, datetime

from pydantic import BaseModel, Field, model_validator

from app.models.scoring_period import PeriodStatus, PeriodType


class PeriodCreate(BaseModel):
    period_type: PeriodType
    start_date: date
    end_date: date
    month: int = Field(ge=1, le=12)
    year: int = Field(ge=2000, le=2100)

    @model_validator(mode="after")
    def check_dates(self):
        if self.end_date <= self.start_date:
            raise ValueError("end_date must be after start_date")
        return self


class PeriodOut(BaseModel):
    id: int
    period_type: PeriodType
    start_date: date
    end_date: date
    month: int
    year: int
    status: PeriodStatus
    created_at: datetime

    model_config = {"from_attributes": True}
