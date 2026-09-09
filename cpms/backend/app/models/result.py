"""Calculated result model — TDC/Tech/Overall averages and ranking per candidate per period."""

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CalculatedResult(Base):
    __tablename__ = "calculated_results"
    __table_args__ = (
        UniqueConstraint("candidate_id", "period_id", name="uq_candidate_period_result"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidates.id"), nullable=False)
    period_id: Mapped[int] = mapped_column(ForeignKey("scoring_periods.id"), nullable=False)

    tdc_average: Mapped[float] = mapped_column(Float, nullable=False)
    tech_average: Mapped[float] = mapped_column(Float, nullable=False)
    overall_average: Mapped[float] = mapped_column(Float, nullable=False)
    ranking: Mapped[int] = mapped_column(Integer, nullable=False)

    calculated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
