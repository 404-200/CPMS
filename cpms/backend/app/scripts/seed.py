"""
Idempotent seed script. Run after migrations:

    python -m app.scripts.seed

Creates the four default streams if they don't exist, and — if
SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD are set in the environment — an
initial Admin user so there's a way to log in on a fresh database.
"""

import os

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.stream import Stream
from app.models.user import User, UserRole

DEFAULT_STREAMS = ["IT Support", "Cloud Computing", "Cyber Security", "Software Development"]


def seed_streams(db) -> None:
    existing_names = {s.name for s in db.query(Stream).all()}
    for name in DEFAULT_STREAMS:
        if name not in existing_names:
            db.add(Stream(name=name))
    db.commit()


def seed_admin(db) -> None:
    email = os.getenv("SEED_ADMIN_EMAIL")
    password = os.getenv("SEED_ADMIN_PASSWORD")
    if not email or not password:
        return

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        return

    admin = User(
        full_name=os.getenv("SEED_ADMIN_NAME", "System Admin"),
        email=email,
        password_hash=hash_password(password),
        role=UserRole.ADMIN,
    )
    db.add(admin)
    db.commit()


def main() -> None:
    db = SessionLocal()
    try:
        seed_streams(db)
        seed_admin(db)
        print("Seed complete: streams ensured" + (
            ", admin user ensured" if os.getenv("SEED_ADMIN_EMAIL") else ""
        ))
    finally:
        db.close()


if __name__ == "__main__":
    main()
