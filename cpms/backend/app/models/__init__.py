"""
Importing this package registers every model on Base.metadata — needed by
Alembic autogenerate and by any code that calls Base.metadata.create_all().
"""

from app.models.candidate import Candidate  # noqa: F401
from app.models.result import CalculatedResult  # noqa: F401
from app.models.score import CandidateScore  # noqa: F401
from app.models.scoring_period import PeriodStatus, PeriodType, ScoringPeriod  # noqa: F401
from app.models.stream import Stream  # noqa: F401
from app.models.upload import ScoreSheetUpload, UploadStatus  # noqa: F401
from app.models.user import User, UserRole  # noqa: F401
