import re

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.candidate import Candidate
from app.models.result import CalculatedResult
from app.models.score import CandidateScore
from app.models.scoring_period import ScoringPeriod
from app.models.stream import Stream
from app.models.user import UserRole
from app.schemas.candidate import (
    CandidateCreate,
    CandidateImportRowError,
    CandidateImportSummary,
    CandidateOut,
    CandidateUpdate,
)
from app.services.candidate_document_service import CandidateDocumentStructureError, validate_and_parse

router = APIRouter(prefix="/api/candidates", tags=["candidates"])

IMPORT_ALLOWED_EXTENSIONS = (".xlsx", ".csv", ".pdf")

CANDIDATE_CODE_PATTERN = re.compile(r"^CAND(\d+)$")
CANDIDATE_CODE_PREFIX = "CAND"
CANDIDATE_CODE_DIGITS = 4


def _generate_candidate_code(db: Session) -> str:
    """
    Auto-generate the next sequential candidate code (e.g. CAND0001, CAND0002, ...).
    Scans existing codes matching the CAND<digits> pattern and picks one past the
    current highest, so manually-imported codes with a different format don't
    interfere with the sequence.
    """
    existing_codes = [row[0] for row in db.query(Candidate.candidate_code).all()]
    max_num = 0
    for code in existing_codes:
        match = CANDIDATE_CODE_PATTERN.match(code or "")
        if match:
            max_num = max(max_num, int(match.group(1)))
    return f"{CANDIDATE_CODE_PREFIX}{max_num + 1:0{CANDIDATE_CODE_DIGITS}d}"


def _to_out(
    candidate: Candidate,
    score: CandidateScore | None = None,
    result: CalculatedResult | None = None,
) -> CandidateOut:
    return CandidateOut(
        id=candidate.id,
        candidate_code=candidate.candidate_code,
        first_name=candidate.first_name,
        last_name=candidate.last_name,
        email=candidate.email,
        stream_id=candidate.stream_id,
        stream_name=candidate.stream.name if candidate.stream else None,
        active=candidate.active,
        created_at=candidate.created_at,
        updated_at=candidate.updated_at,
        period_id=score.period_id if score else None,
        attendance=score.attendance if score else None,
        communication=score.communication if score else None,
        accountability=score.accountability if score else None,
        creativity=score.creativity if score else None,
        project_delivery=score.project_delivery if score else None,
        tech_skills=score.tech_skills if score else None,
        dev_group_name=score.dev_group_name if score else None,
        weekly_feedback=score.weekly_feedback if score else None,
        action_plan=score.action_plan if score else None,
        overall_average=result.overall_average if result else None,
        ranking=result.ranking if result else None,
    )


@router.get("", response_model=list[CandidateOut])
def list_candidates(
    stream_id: int | None = None,
    active_only: bool = False,
    period_id: int | None = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    query = db.query(Candidate).options(joinedload(Candidate.stream))
    if stream_id is not None:
        query = query.filter(Candidate.stream_id == stream_id)
    if active_only:
        query = query.filter(Candidate.active.is_(True))
    candidates = query.order_by(Candidate.candidate_code).all()

    # Default to the most recent scoring period when none is specified.
    resolved_period_id = period_id
    if resolved_period_id is None:
        latest_period = db.query(ScoringPeriod).order_by(ScoringPeriod.start_date.desc()).first()
        resolved_period_id = latest_period.id if latest_period else None

    scores_by_candidate: dict[int, CandidateScore] = {}
    results_by_candidate: dict[int, CalculatedResult] = {}
    if resolved_period_id is not None:
        scores = db.query(CandidateScore).filter(CandidateScore.period_id == resolved_period_id).all()
        scores_by_candidate = {s.candidate_id: s for s in scores}
        results = db.query(CalculatedResult).filter(CalculatedResult.period_id == resolved_period_id).all()
        results_by_candidate = {r.candidate_id: r for r in results}

    return [
        _to_out(c, scores_by_candidate.get(c.id), results_by_candidate.get(c.id))
        for c in candidates
    ]


@router.post("", response_model=CandidateOut, status_code=status.HTTP_201_CREATED)
def create_candidate(
    payload: CandidateCreate,
    db: Session = Depends(get_db),
    _=Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    stream = db.get(Stream, payload.stream_id)
    if stream is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid stream_id")

    candidate = Candidate(
        candidate_code=_generate_candidate_code(db),
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email,
        stream_id=payload.stream_id,
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return _to_out(candidate)


@router.post("/import", response_model=CandidateImportSummary, status_code=status.HTTP_201_CREATED)
def import_candidates(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _=Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Bulk-create candidates from a .xlsx, .csv, or .pdf file containing a
    table with columns: Candidate ID, First Name, Last Name, Stream
    (required), Email (optional). Any row error rejects the whole file —
    no partial saves.
    """
    from app.core.config import settings

    if not file.filename.lower().endswith(IMPORT_ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .xlsx, .csv, or .pdf files are accepted",
        )

    file_bytes = file.file.read()
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds the {settings.max_upload_size_mb}MB upload limit",
        )

    try:
        valid_rows, row_errors = validate_and_parse(file_bytes, file.filename, db)
    except CandidateDocumentStructureError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if row_errors:
        return CandidateImportSummary(
            filename=file.filename,
            rows_received=len(valid_rows) + len(row_errors),
            rows_created=0,
            created=[],
            errors=[CandidateImportRowError(**e) for e in row_errors],
        )

    created: list[Candidate] = []
    try:
        for row in valid_rows:
            candidate = Candidate(**row)
            db.add(candidate)
            created.append(candidate)
        db.commit()
        for candidate in created:
            db.refresh(candidate)
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Import failed and was rolled back: {exc}",
        ) from exc

    return CandidateImportSummary(
        filename=file.filename,
        rows_received=len(valid_rows),
        rows_created=len(created),
        created=[_to_out(c) for c in created],
        errors=[],
    )


@router.put("/{candidate_id}", response_model=CandidateOut)
def update_candidate(
    candidate_id: int,
    payload: CandidateUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    candidate = db.get(Candidate, candidate_id)
    if candidate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")

    if payload.stream_id is not None and db.get(Stream, payload.stream_id) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid stream_id")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(candidate, field, value)

    db.commit()
    db.refresh(candidate)
    return _to_out(candidate)


@router.delete("/{candidate_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_roles(UserRole.ADMIN)),
):
    """Soft delete: marks the candidate inactive rather than removing their score history."""
    candidate = db.get(Candidate, candidate_id)
    if candidate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")

    candidate.active = False
    db.commit()
    return None