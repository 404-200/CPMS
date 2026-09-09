"""
Monthly report assembly: combines the two biweekly CalculatedResult rows
for a given month/year into monthly TDC/Tech/Overall averages, then
re-ranks candidates on the monthly overall average.
"""

from sqlalchemy.orm import Session

from app.models.candidate import Candidate
from app.models.result import CalculatedResult
from app.models.scoring_period import PeriodStatus, PeriodType, ScoringPeriod
from app.services.calculation_service import calculate_monthly_average
from app.services.ranking_service import assign_rankings


def get_monthly_results(db: Session, month: int, year: int) -> dict:
    biweekly_periods = (
        db.query(ScoringPeriod)
        .filter(
            ScoringPeriod.period_type == PeriodType.BIWEEKLY,
            ScoringPeriod.month == month,
            ScoringPeriod.year == year,
        )
        .order_by(ScoringPeriod.start_date)
        .all()
    )

    biweekly_period_ids = [p.id for p in biweekly_periods]

    if len(biweekly_periods) < 2:
        return {
            "month": month,
            "year": year,
            "complete": False,
            "message": (
                "Monthly result is incomplete: only "
                f"{len(biweekly_periods)} of 2 biweekly score sheets have been uploaded for this month."
            ),
            "biweekly_period_ids": biweekly_period_ids,
            "results": [],
        }

    period_1, period_2 = biweekly_periods[0], biweekly_periods[1]

    results_1 = {r.candidate_id: r for r in db.query(CalculatedResult).filter_by(period_id=period_1.id)}
    results_2 = {r.candidate_id: r for r in db.query(CalculatedResult).filter_by(period_id=period_2.id)}

    common_candidate_ids = set(results_1) & set(results_2)
    if not common_candidate_ids:
        return {
            "month": month,
            "year": year,
            "complete": False,
            "message": "Monthly result is incomplete: no candidates have results in both biweekly periods.",
            "biweekly_period_ids": biweekly_period_ids,
            "results": [],
        }

    candidates = {c.id: c for c in db.query(Candidate).filter(Candidate.id.in_(common_candidate_ids))}

    combined = []
    for candidate_id in common_candidate_ids:
        r1, r2 = results_1[candidate_id], results_2[candidate_id]
        candidate = candidates.get(candidate_id)
        if candidate is None:
            continue

        monthly_tdc = calculate_monthly_average(r1.tdc_average, r2.tdc_average)
        monthly_tech = calculate_monthly_average(r1.tech_average, r2.tech_average)
        monthly_overall = calculate_monthly_average(r1.overall_average, r2.overall_average)

        combined.append(
            {
                "candidate_id": candidate.id,
                "candidate_code": candidate.candidate_code,
                "candidate_name": candidate.full_name,
                "stream_id": candidate.stream_id,
                "stream_name": candidate.stream.name if candidate.stream else "",
                "overall_average": monthly_overall,
                "monthly_tdc_average": monthly_tdc,
                "monthly_tech_average": monthly_tech,
                "monthly_overall_average": monthly_overall,
            }
        )

    ranked = assign_rankings(combined)

    return {
        "month": month,
        "year": year,
        "complete": True,
        "message": None,
        "biweekly_period_ids": biweekly_period_ids,
        "results": ranked,
    }
