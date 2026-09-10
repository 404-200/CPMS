from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.candidate import Candidate
from app.models.result import CalculatedResult
from app.models.score import CandidateScore
from app.models.stream import Stream
from app.models.user import UserRole
from app.schemas.stream import StreamCreate, StreamOut

router = APIRouter(prefix="/api/streams", tags=["streams"])


@router.get("", response_model=list[StreamOut])
def list_streams(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Stream).order_by(Stream.name).all()


@router.post("", response_model=StreamOut, status_code=status.HTTP_201_CREATED)
def create_stream(
    payload: StreamCreate,
    db: Session = Depends(get_db),
    _=Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    name = payload.name.strip()
    existing = db.query(Stream).filter(Stream.name == name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Stream '{name}' already exists",
        )

    stream = Stream(name=name)
    db.add(stream)
    db.commit()
    db.refresh(stream)
    return stream


@router.delete("/{stream_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_stream(
    stream_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_roles(UserRole.ADMIN)),
):
    """
    Deletes a stream and cascades: removes every candidate in that stream,
    along with their candidate_scores and calculated_results rows first
    (to satisfy foreign key constraints), all in one transaction.
    """
    stream = db.get(Stream, stream_id)
    if stream is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stream not found")

    try:
        candidate_ids = [c.id for c in db.query(Candidate.id).filter(Candidate.stream_id == stream_id).all()]

        if candidate_ids:
            db.query(CalculatedResult).filter(CalculatedResult.candidate_id.in_(candidate_ids)).delete(
                synchronize_session=False
            )
            db.query(CandidateScore).filter(CandidateScore.candidate_id.in_(candidate_ids)).delete(
                synchronize_session=False
            )
            db.query(Candidate).filter(Candidate.stream_id == stream_id).delete(synchronize_session=False)

        db.delete(stream)
        db.commit()
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not delete stream: {exc}",
        ) from exc

    return None