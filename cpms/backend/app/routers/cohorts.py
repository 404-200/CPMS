from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.candidate import Candidate
from app.models.cohort import Cohort
from app.models.user import UserRole
from app.schemas.cohort import CohortCreate, CohortOut

router = APIRouter(prefix="/api/cohorts", tags=["cohorts"])


@router.get("", response_model=list[CohortOut])
def list_cohorts(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Cohort).order_by(Cohort.name).all()


@router.post("", response_model=CohortOut, status_code=status.HTTP_201_CREATED)
def create_cohort(
    payload: CohortCreate,
    db: Session = Depends(get_db),
    _=Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    name = payload.name.strip()
    existing = db.query(Cohort).filter(Cohort.name == name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cohort '{name}' already exists",
        )

    cohort = Cohort(name=name)
    db.add(cohort)
    db.commit()
    db.refresh(cohort)
    return cohort


@router.delete("/{cohort_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cohort(
    cohort_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_roles(UserRole.ADMIN)),
):
    """
    Unlike Stream deletion, this does NOT cascade-delete candidates — a
    cohort spans the whole bootcamp and its candidates carry score history
    from before any stream existed, so accidentally deleting it should not
    be able to wipe that history. Deletion is refused while any candidate
    still belongs to this cohort.
    """
    cohort = db.get(Cohort, cohort_id)
    if cohort is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cohort not found")

    has_candidates = db.query(Candidate.id).filter(Candidate.cohort_id == cohort_id).first() is not None
    if has_candidates:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete a cohort that still has candidates in it. Reassign or remove them first.",
        )

    db.delete(cohort)
    db.commit()
    return None