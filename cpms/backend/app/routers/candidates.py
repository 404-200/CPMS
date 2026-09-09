from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.candidate import Candidate
from app.models.stream import Stream
from app.models.user import UserRole
from app.schemas.candidate import CandidateCreate, CandidateOut, CandidateUpdate

router = APIRouter(prefix="/api/candidates", tags=["candidates"])


def _to_out(candidate: Candidate) -> CandidateOut:
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
    )


@router.get("", response_model=list[CandidateOut])
def list_candidates(
    stream_id: int | None = None,
    active_only: bool = False,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    query = db.query(Candidate).options(joinedload(Candidate.stream))
    if stream_id is not None:
        query = query.filter(Candidate.stream_id == stream_id)
    if active_only:
        query = query.filter(Candidate.active.is_(True))
    candidates = query.order_by(Candidate.candidate_code).all()
    return [_to_out(c) for c in candidates]


@router.post("", response_model=CandidateOut, status_code=status.HTTP_201_CREATED)
def create_candidate(
    payload: CandidateCreate,
    db: Session = Depends(get_db),
    _=Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    stream = db.get(Stream, payload.stream_id)
    if stream is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid stream_id")

    existing = db.query(Candidate).filter(Candidate.candidate_code == payload.candidate_code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Candidate code '{payload.candidate_code}' already exists",
        )

    candidate = Candidate(**payload.model_dump())
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return _to_out(candidate)


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
