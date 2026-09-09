"""Raw candidate score model — one row per candidate per scoring period."""

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class CandidateScore(Base):
    __tablename__ = "candidate_scores"
    __table_args__ = (
        UniqueConstraint("candidate_id", "period_id", name="uq_candidate_period_score"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidates.id"), nullable=False)
    period_id: Mapped[int] = mapped_column(ForeignKey("scoring_periods.id"), nullable=False)
    upload_id: Mapped[int] = mapped_column(ForeignKey("score_sheet_uploads.id"), nullable=False)

    communication: Mapped[float] = mapped_column(Float, nullable=False)
    attendance: Mapped[float] = mapped_column(Float, nullable=False)
    accountability: Mapped[float] = mapped_column(Float, nullable=False)
    project_delivery: Mapped[float] = mapped_column(Float, nullable=False)
    tech_skills: Mapped[float] = mapped_column(Float, nullable=False)
    creativity: Mapped[float] = mapped_column(Float, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    candidate: Mapped["Candidate"] = relationship(back_populates="scores")
