"""
Authentication routes: admin-only invite, login (JWT), /me, and
password reset.

There is deliberately no public self-registration endpoint — this is an
admin-only system, so accounts are created by an existing admin via
/invite, and the invited user sets their own password via the same
token-based flow as /forgot-password + /reset-password.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.core.security import (
    RESET_TOKEN_EXPIRE_MINUTES,
    create_access_token,
    generate_reset_token,
    hash_password,
    verify_password,
)
from app.core.config import settings
from app.models.user import User, UserRole
from app.schemas.auth import (
    ForgotPasswordRequest,
    InviteOut,
    InviteRequest,
    LoginRequest,
    MessageResponse,
    ResetPasswordRequest,
    TokenResponse,
    UserOut,
)
from app.services.email_service import send_invite_email, send_password_reset_email

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _issue_reset_token(db: Session, user: User) -> str:
    token = generate_reset_token()
    user.reset_token = token
    user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=RESET_TOKEN_EXPIRE_MINUTES
    )
    db.commit()
    return token


@router.post("/invite", response_model=InviteOut, status_code=status.HTTP_201_CREATED)
def invite_user(
    payload: InviteRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    """Admin-only: create an account with no usable password, email the
    new user a link to set one, and also return that link (useful if
    SMTP isn't configured, or you want to forward it manually)."""
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    import secrets

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        password_hash=hash_password(secrets.token_urlsafe(32)),  # unusable placeholder
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = _issue_reset_token(db, user)
    reset_link = f"{settings.frontend_base_url}/reset-password?token={token}"

    try:
        send_invite_email(user.email, reset_link)
    except Exception as exc:
        print(f"[invite] Failed to send invite email to {user.email}: {exc}")

    return InviteOut(user=user, reset_token=token, reset_url=reset_link)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return TokenResponse(access_token=token, user=user)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Always returns the same generic message whether or not the email exists,
    so this endpoint can't be used to check which emails are registered.
    """
    user = db.query(User).filter(User.email == payload.email).first()
    if user is not None:
        token = _issue_reset_token(db, user)
        reset_link = f"{settings.frontend_base_url}/reset-password?token={token}"
        try:
            send_password_reset_email(user.email, reset_link)
        except Exception as exc:
            print(f"[forgot-password] Failed to send email to {user.email}: {exc}")

    return MessageResponse(
        message="If an account with that email exists, a password reset link has been sent."
    )


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.reset_token == payload.token).first()

    if user is None or user.reset_token_expires_at is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link")

    expires_at = user.reset_token_expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link")

    user.password_hash = hash_password(payload.new_password)
    user.reset_token = None
    user.reset_token_expires_at = None
    db.commit()

    return MessageResponse(message="Password reset successfully. You can now sign in with your new password.")