"""Raw candidate score model — one row per candidate per scoring period."""

import enum
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class CommitmentType(str, enum.Enum):
    INDIVIDUAL = "INDIVIDUAL"
    GROUP = "GROUP"


class CandidateScore(Base):
    __tablename__ = "candidate_scores"
    __table_args__ = (
        UniqueConstraint("candidate_id", "period_id", name="uq_candidate_period_score"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidates.id"), nullable=False)
    period_id: Mapped[int] = mapped_column(ForeignKey("scoring_periods.id"), nullable=False)
    # Nullable: manually-entered scores aren't tied to a file upload.
    upload_id: Mapped[int | None] = mapped_column(ForeignKey("score_sheet_uploads.id"), nullable=True)

    communication: Mapped[float] = mapped_column(Float, nullable=False)
    attendance: Mapped[float] = mapped_column(Float, nullable=False)
    accountability: Mapped[float] = mapped_column(Float, nullable=False)
    project_delivery: Mapped[float] = mapped_column(Float, nullable=False)
    tech_skills: Mapped[float] = mapped_column(Float, nullable=False)
    creativity: Mapped[float] = mapped_column(Float, nullable=False)

    # Weekly notes captured alongside the scores — added for manual score entry.
    dev_group_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    weekly_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    action_plan: Mapped[str | None] = mapped_column(Text, nullable=True)
    commitment_type: Mapped[CommitmentType | None] = mapped_column(SAEnum(CommitmentType), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    candidate: Mapped["Candidate"] = relationship(back_populates="scores")
