from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.candidate import Candidate
from app.models.scoring_period import PeriodType, ScoringPeriod
from app.models.stream import Stream
from app.routers.results import _build_candidate_results, _build_ranking_summary, _build_stream_averages

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _latest_biweekly_period(db: Session) -> ScoringPeriod | None:
    return (
        db.query(ScoringPeriod)
        .filter(ScoringPeriod.period_type == PeriodType.BIWEEKLY)
        .order_by(ScoringPeriod.start_date.desc())
        .first()
    )


@router.get("")
def dashboard_summary(db: Session = Depends(get_db), _=Depends(get_current_user)):
    total_candidates = db.query(Candidate).filter(Candidate.active.is_(True)).count()
    total_streams = db.query(Stream).count()

    latest_period = _latest_biweekly_period(db)
    if latest_period is None:
        return {
            "total_candidates": total_candidates,
            "total_streams": total_streams,
            "current_period": None,
            "highest_performing": [],
            "median": [],
            "lowest_performing": [],
        }

    results = _build_candidate_results(db, latest_period.id)
    ranking_summary = _build_ranking_summary(results)

    return {
        "total_candidates": total_candidates,
        "total_streams": total_streams,
        "current_period": {
            "id": latest_period.id,
            "start_date": latest_period.start_date,
            "end_date": latest_period.end_date,
            "month": latest_period.month,
            "year": latest_period.year,
        },
        "highest_performing": ranking_summary.highest,
        "median": ranking_summary.median,
        "lowest_performing": ranking_summary.lowest,
    }


@router.get("/streams")
def dashboard_streams(db: Session = Depends(get_db), _=Depends(get_current_user)):
    latest_period = _latest_biweekly_period(db)
    if latest_period is None:
        return {"period_id": None, "stream_averages": []}

    results = _build_candidate_results(db, latest_period.id)
    return {"period_id": latest_period.id, "stream_averages": _build_stream_averages(results)}


@router.get("/rankings")
def dashboard_rankings(db: Session = Depends(get_db), _=Depends(get_current_user)):
    latest_period = _latest_biweekly_period(db)
    if latest_period is None:
        return {"period_id": None, "results": []}

    results = _build_candidate_results(db, latest_period.id)
    return {"period_id": latest_period.id, "results": results}
