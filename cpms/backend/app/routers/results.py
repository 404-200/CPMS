from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.candidate import Candidate
from app.models.result import CalculatedResult
from app.models.scoring_period import ScoringPeriod
from app.schemas.result import (
    BiweeklyResultsOut,
    CandidateResultOut,
    MonthlyResultsOut,
    RankingSummary,
    StreamAverageOut,
)
from app.services.ranking_service import find_highest, find_lowest, find_median
from app.services.report_service import get_monthly_results

router = APIRouter(prefix="/api/results", tags=["results"])


def _build_candidate_results(db: Session, period_id: int) -> list[CandidateResultOut]:
    rows = db.query(CalculatedResult).filter(CalculatedResult.period_id == period_id).all()
    candidate_ids = [r.candidate_id for r in rows]
    candidates = {
        c.id: c
        for c in db.query(Candidate)
        .options(joinedload(Candidate.stream))
        .filter(Candidate.id.in_(candidate_ids))
    }

    out = []
    for r in rows:
        candidate = candidates.get(r.candidate_id)
        if candidate is None:
            continue
        out.append(
            CandidateResultOut(
                candidate_id=candidate.id,
                candidate_code=candidate.candidate_code,
                candidate_name=candidate.full_name,
                stream_id=candidate.stream_id,
                stream_name=candidate.stream.name if candidate.stream else "",
                tdc_average=r.tdc_average,
                tech_average=r.tech_average,
                overall_average=r.overall_average,
                ranking=r.ranking,
            )
        )
    out.sort(key=lambda c: c.ranking)
    return out


def _build_stream_averages(results: list[CandidateResultOut]) -> list[StreamAverageOut]:
    by_stream: dict[int, list[CandidateResultOut]] = {}
    for r in results:
        by_stream.setdefault(r.stream_id, []).append(r)

    averages = []
    for stream_id, rows in by_stream.items():
        count = len(rows)
        averages.append(
            StreamAverageOut(
                stream_id=stream_id,
                stream_name=rows[0].stream_name,
                tdc_average=round(sum(r.tdc_average for r in rows) / count, 2),
                tech_average=round(sum(r.tech_average for r in rows) / count, 2),
                overall_average=round(sum(r.overall_average for r in rows) / count, 2),
                candidate_count=count,
            )
        )
    averages.sort(key=lambda s: s.stream_name)
    return averages


def _build_ranking_summary(results: list[CandidateResultOut]) -> RankingSummary:
    as_dicts = [r.model_dump() for r in results]
    highest = find_highest(as_dicts)
    lowest = find_lowest(as_dicts)
    median_candidates, median_value = find_median(as_dicts)

    return RankingSummary(
        highest=[CandidateResultOut(**c) for c in highest],
        lowest=[CandidateResultOut(**c) for c in lowest],
        median=[CandidateResultOut(**c) for c in median_candidates],
        median_value=median_value,
    )


@router.get("/biweekly/{period_id}", response_model=BiweeklyResultsOut)
def biweekly_results(
    period_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    period = db.get(ScoringPeriod, period_id)
    if period is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scoring period not found")

    results = _build_candidate_results(db, period_id)
    stream_averages = _build_stream_averages(results)
    ranking_summary = _build_ranking_summary(results)

    return BiweeklyResultsOut(
        period_id=period_id,
        results=results,
        stream_averages=stream_averages,
        ranking_summary=ranking_summary,
    )


@router.get("/monthly/{period_id}", response_model=MonthlyResultsOut)
def monthly_results(
    period_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    period = db.get(ScoringPeriod, period_id)
    if period is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scoring period not found")

    data = get_monthly_results(db, period.month, period.year)
    return MonthlyResultsOut(**data)
