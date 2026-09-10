import os

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.models.candidate import Candidate
from app.models.stream import Stream


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = Session()

    stream = Stream(name="Software Development")
    session.add(stream)
    session.commit()
    session.refresh(stream)

    candidate = Candidate(
        candidate_code="C001",
        first_name="Jane",
        last_name="Doe",
        stream_id=stream.id,
    )
    session.add(candidate)
    session.commit()

    try:
        yield session
    finally:
        session.close()
        engine.dispose()
