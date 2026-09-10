"""Score sheet upload model — metadata + processing status for each Excel upload."""

import enum
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class UploadStatus(str, enum.Enum):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"


class ScoreSheetUpload(Base):
    __tablename__ = "score_sheet_uploads"

    id: Mapped[int] = mapped_column(primary_key=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    # File reference only — see notes in README about object storage for Phase-11-and-beyond.
    storage_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    period_id: Mapped[int] = mapped_column(ForeignKey("scoring_periods.id"), nullable=False)
    status: Mapped[UploadStatus] = mapped_column(SAEnum(UploadStatus), default=UploadStatus.PENDING)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
