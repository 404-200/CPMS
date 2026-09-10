"""Scoring period model — biweekly and monthly reporting windows."""

import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Integer, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PeriodType(str, enum.Enum):
    BIWEEKLY = "BIWEEKLY"
    MONTHLY = "MONTHLY"


class PeriodStatus(str, enum.Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"


class ScoringPeriod(Base):
    __tablename__ = "scoring_periods"
    __table_args__ = (
        # A given biweekly slot (1 or 2) within a month/year can only exist once.
        UniqueConstraint("period_type", "start_date", "end_date", name="uq_period_window"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    period_type: Mapped[PeriodType] = mapped_column(SAEnum(PeriodType), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[PeriodStatus] = mapped_column(SAEnum(PeriodStatus), default=PeriodStatus.OPEN)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
