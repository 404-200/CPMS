from datetime import datetime

from pydantic import BaseModel

from app.models.upload import UploadStatus


class RowError(BaseModel):
    row: int
    message: str


class UploadSummary(BaseModel):
    upload_id: int
    filename: str
    status: UploadStatus
    period_id: int
    version: int
    rows_received: int
    rows_processed: int
    errors: list[RowError] = []


class UploadOut(BaseModel):
    id: int
    filename: str
    uploaded_by: int
    uploaded_at: datetime
    period_id: int
    status: UploadStatus
    version: int
    error_message: str | None

    model_config = {"from_attributes": True}
