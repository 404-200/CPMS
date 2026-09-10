"""
Score sheet upload endpoint.

Pipeline: validate file type/size -> check for an existing sheet on this
period (reject unless the caller explicitly requests a new version) ->
parse + validate the Excel contents -> if there are any row errors, fail
the whole upload with no partial writes -> otherwise persist raw scores,
compute TDC/Tech/Overall averages, rank candidates, and store calculated
results, all inside one DB transaction.
"""

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.candidate import Candidate
from app.models.result import CalculatedResult
from app.models.score import CandidateScore
from app.models.scoring_period import ScoringPeriod
from app.models.upload import ScoreSheetUpload, UploadStatus
from app.models.user import User, UserRole
from app.schemas.upload import RowError, UploadSummary
from app.services.calculation_service import calculate_all
from app.services.excel_service import ExcelStructureError, validate_and_parse
from app.services.ranking_service import assign_rankings

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

ALLOWED_EXTENSIONS = (".xlsx",)


@router.post("/scores", response_model=UploadSummary, status_code=status.HTTP_201_CREATED)
def upload_scores(
    period_id: int = Form(...),
    create_new_version: bool = Form(False),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    from app.core.config import settings

    if not file.filename.lower().endswith(ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .xlsx files are accepted",
        )

    period = db.get(ScoringPeriod, period_id)
    if period is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scoring period not found")

    file_bytes = file.file.read()
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds the {settings.max_upload_size_mb}MB upload limit",
        )

    existing_scores = db.query(CandidateScore).filter(CandidateScore.period_id == period_id).first()
    previous_upload = (
        db.query(ScoreSheetUpload)
        .filter(ScoreSheetUpload.period_id == period_id)
        .order_by(ScoreSheetUpload.version.desc())
        .first()
    )
    next_version = (previous_upload.version + 1) if previous_upload else 1

    if existing_scores and not create_new_version:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "A score sheet already exists for this period. Resubmit with "
                "create_new_version=true to replace it with a new version, or choose a "
                "different period."
            ),
        )

    if existing_scores and create_new_version and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only an Admin can create a new version of an existing score sheet.",
        )

    # Parse + validate structure/content before touching the database.
    try:
        valid_rows, row_errors = validate_and_parse(file_bytes, db)
    except ExcelStructureError as exc:
        upload = ScoreSheetUpload(
            filename=file.filename,
            uploaded_by=current_user.id,
            period_id=period_id,
            status=UploadStatus.FAILED,
            version=next_version,
            error_message=str(exc),
        )
        db.add(upload)
        db.commit()
        db.refresh(upload)
        return UploadSummary(
            upload_id=upload.id,
            filename=upload.filename,
            status=upload.status,
            period_id=period_id,
            version=upload.version,
            rows_received=0,
            rows_processed=0,
            errors=[RowError(row=0, message=str(exc))],
        )

    if row_errors:
        upload = ScoreSheetUpload(
            filename=file.filename,
            uploaded_by=current_user.id,
            period_id=period_id,
            status=UploadStatus.FAILED,
            version=next_version,
            error_message=f"{len(row_errors)} row(s) failed validation; no records were saved.",
        )
        db.add(upload)
        db.commit()
        db.refresh(upload)
        return UploadSummary(
            upload_id=upload.id,
            filename=upload.filename,
            status=upload.status,
            period_id=period_id,
            version=upload.version,
            rows_received=len(valid_rows) + len(row_errors),
            rows_processed=0,
            errors=[RowError(**e) for e in row_errors],
        )

    # All rows are clean — persist everything in one transaction.
    try:
        upload = ScoreSheetUpload(
            filename=file.filename,
            uploaded_by=current_user.id,
            period_id=period_id,
            status=UploadStatus.PENDING,
            version=next_version,
        )
        db.add(upload)
        db.flush()  # get upload.id without committing

        if existing_scores:
            # New version replaces prior raw scores + calculated results for this period.
            db.query(CandidateScore).filter(CandidateScore.period_id == period_id).delete()
            db.query(CalculatedResult).filter(CalculatedResult.period_id == period_id).delete()

        for row in valid_rows:
            db.add(
                CandidateScore(
                    candidate_id=row["candidate_id"],
                    period_id=period_id,
                    upload_id=upload.id,
                    communication=row["communication"],
                    attendance=row["attendance"],
                    accountability=row["accountability"],
                    project_delivery=row["project_delivery"],
                    tech_skills=row["tech_skills"],
                    creativity=row["creativity"],
                    dev_group_name=row.get("dev_group_name"),
                    weekly_feedback=row.get("weekly_feedback"),
                    action_plan=row.get("action_plan"),
                )
            )

        # Calculate + rank, then persist CalculatedResult rows.
        computed = []
        for row in valid_rows:
            averages = calculate_all(
                row["communication"],
                row["attendance"],
                row["accountability"],
                row["project_delivery"],
                row["tech_skills"],
                row["creativity"],
            )
            computed.append({"candidate_id": row["candidate_id"], **averages})

        ranked = assign_rankings(computed)
        for entry in ranked:
            db.add(
                CalculatedResult(
                    candidate_id=entry["candidate_id"],
                    period_id=period_id,
                    tdc_average=entry["tdc_average"],
                    tech_average=entry["tech_average"],
                    overall_average=entry["overall_average"],
                    ranking=entry["ranking"],
                )
            )

        upload.status = UploadStatus.SUCCESS
        db.commit()
        db.refresh(upload)
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed and was rolled back: {exc}",
        ) from exc

    return UploadSummary(
        upload_id=upload.id,
        filename=upload.filename,
        status=upload.status,
        period_id=period_id,
        version=upload.version,
        rows_received=len(valid_rows),
        rows_processed=len(valid_rows),
        errors=[],
    )
