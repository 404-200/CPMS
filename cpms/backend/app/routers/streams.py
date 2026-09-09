from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.stream import Stream
from app.schemas.stream import StreamOut

router = APIRouter(prefix="/api/streams", tags=["streams"])


@router.get("", response_model=list[StreamOut])
def list_streams(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Stream).order_by(Stream.name).all()
