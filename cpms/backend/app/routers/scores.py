"""
Manual score entry.

Lets a Manager/Admin key in one candidate's weekly scores, dev group,
feedback, and action plan directly (as an alternative to a bulk .xlsx
upload). Each submission upserts that candidate's CandidateScore row for
the period, then recalculates + re-ranks CalculatedResult for every
candidate scored in that period, so rankings stay consistent regardless
of whether scores arrived manually or via file upload.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.candidate import Candidate
from app.models.result import CalculatedResult
from app.models.score import CandidateScore
from app.models.scoring_period import ScoringPeriod
from app.models.user import User, UserRole
from app.schemas.score import ManualScoreCreate, ManualScoreResult, ScoreOut
from app.services.calculation_service import calculate_all
from app.services.ranking_service import assign_rankings

router = APIRouter(prefix="/api/scores", tags=["scores"])


@router.get("/one", response_model=ScoreOut | None)
def get_score(
    candidate_id: int,
    period_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Fetch an existing score row for editing (or None if not yet entered)."""
    return (
        db.query(CandidateScore)
        .filter(CandidateScore.candidate_id == candidate_id, CandidateScore.period_id == period_id)
        .first()
    )


@router.post("/manual", response_model=ManualScoreResult, status_code=status.HTTP_201_CREATED)
def submit_manual_score(
    payload: ManualScoreCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    candidate = db.get(Candidate, payload.candidate_id)
    if candidate is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid candidate_id")

    period = db.get(ScoringPeriod, payload.period_id)
    if period is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid period_id")

    existing = (
        db.query(CandidateScore)
        .filter(
            CandidateScore.candidate_id == payload.candidate_id,
            CandidateScore.period_id == payload.period_id,
        )
        .first()
    )

    fields = payload.model_dump(exclude={"candidate_id", "period_id"})

    try:
        if existing:
            for field, value in fields.items():
                setattr(existing, field, value)
            score_row = existing
        else:
            score_row = CandidateScore(
                candidate_id=payload.candidate_id,
                period_id=payload.period_id,
                upload_id=None,
                **fields,
            )
            db.add(score_row)
        db.flush()

        # Recompute + re-rank every candidate scored in this period.
        period_scores = db.query(CandidateScore).filter(CandidateScore.period_id == payload.period_id).all()
        computed = []
        for s in period_scores:
            averages = calculate_all(
                s.communication, s.attendance, s.accountability, s.project_delivery, s.tech_skills, s.creativity
            )
            computed.append({"candidate_id": s.candidate_id, **averages})
        ranked = assign_rankings(computed)

        db.query(CalculatedResult).filter(CalculatedResult.period_id == payload.period_id).delete()
        for entry in ranked:
            db.add(
                CalculatedResult(
                    candidate_id=entry["candidate_id"],
                    period_id=payload.period_id,
                    tdc_average=entry["tdc_average"],
                    tech_average=entry["tech_average"],
                    overall_average=entry["overall_average"],
                    ranking=entry["ranking"],
                )
            )

        db.commit()
        db.refresh(score_row)
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not save score: {exc}",
        ) from exc

    this_result = (
        db.query(CalculatedResult)
        .filter(
            CalculatedResult.candidate_id == payload.candidate_id,
            CalculatedResult.period_id == payload.period_id,
        )
        .first()
    )

    return ManualScoreResult(
        score=score_row,
        tdc_average=this_result.tdc_average,
        tech_average=this_result.tech_average,
        overall_average=this_result.overall_average,
        ranking=this_result.ranking,
    )
