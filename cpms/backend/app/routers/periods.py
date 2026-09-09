from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.scoring_period import PeriodType, ScoringPeriod
from app.models.user import UserRole
from app.schemas.period import PeriodCreate, PeriodOut

router = APIRouter(prefix="/api/periods", tags=["periods"])


@router.get("", response_model=list[PeriodOut])
def list_periods(
    period_type: PeriodType | None = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    query = db.query(ScoringPeriod)
    if period_type is not None:
        query = query.filter(ScoringPeriod.period_type == period_type)
    return query.order_by(ScoringPeriod.start_date).all()


@router.post("", response_model=PeriodOut, status_code=status.HTTP_201_CREATED)
def create_period(
    payload: PeriodCreate,
    db: Session = Depends(get_db),
    _=Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    if payload.period_type == PeriodType.BIWEEKLY:
        # Overlap check: any existing biweekly period whose window intersects this one.
        overlapping = (
            db.query(ScoringPeriod)
            .filter(
                ScoringPeriod.period_type == PeriodType.BIWEEKLY,
                or_(
                    and_(
                        ScoringPeriod.start_date <= payload.start_date,
                        ScoringPeriod.end_date >= payload.start_date,
                    ),
                    and_(
                        ScoringPeriod.start_date <= payload.end_date,
                        ScoringPeriod.end_date >= payload.end_date,
                    ),
                    and_(
                        ScoringPeriod.start_date >= payload.start_date,
                        ScoringPeriod.end_date <= payload.end_date,
                    ),
                ),
            )
            .first()
        )
        if overlapping:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Biweekly period overlaps an existing period "
                    f"({overlapping.start_date} to {overlapping.end_date})"
                ),
            )

    # Two biweekly periods in the same month/year is expected (that's the whole point);
    # but a duplicate MONTHLY period for the same month/year is not.
    if payload.period_type == PeriodType.MONTHLY:
        existing_monthly = (
            db.query(ScoringPeriod)
            .filter(
                ScoringPeriod.period_type == PeriodType.MONTHLY,
                ScoringPeriod.month == payload.month,
                ScoringPeriod.year == payload.year,
            )
            .first()
        )
        if existing_monthly:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A monthly period for {payload.month}/{payload.year} already exists",
            )

    period = ScoringPeriod(**payload.model_dump())
    db.add(period)
    db.commit()
    db.refresh(period)
    return period
