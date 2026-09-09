"""
Security helpers: password hashing (bcrypt) and JWT creation/verification.

Full auth wiring (login/register routes, dependencies for the current
user, role-based access control) is implemented in Phase 3. This module
is scaffolded now so config/database are exercised end-to-end in Phase 1.
"""

from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

# Using the bcrypt library directly rather than passlib's bcrypt wrapper:
# passlib 1.7.x's backend-detection probes bcrypt internals that were
# removed in bcrypt>=4.1, causing spurious failures. bcrypt truncates at
# 72 bytes itself; we pre-truncate so long passwords fail closed rather
# than raising.
_MAX_PASSWORD_BYTES = 72


def hash_password(plain_password: str) -> str:
    truncated = plain_password.encode("utf-8")[:_MAX_PASSWORD_BYTES]
    return bcrypt.hashpw(truncated, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    truncated = plain_password.encode("utf-8")[:_MAX_PASSWORD_BYTES]
    try:
        return bcrypt.checkpw(truncated, hashed_password.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None
