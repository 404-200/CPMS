"""Authentication routes: register, login (JWT), /me, and password reset."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import (
    RESET_TOKEN_EXPIRE_MINUTES,
    create_access_token,
    generate_reset_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserOut,
)
from app.services.email_service import send_password_reset_email

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


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
    from app.core.config import settings

    user = db.query(User).filter(User.email == payload.email).first()
    if user is not None:
        token = generate_reset_token()
        user.reset_token = token
        user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=RESET_TOKEN_EXPIRE_MINUTES
        )
        db.commit()

        reset_link = f"{settings.frontend_base_url}/reset-password?token={token}"
        send_password_reset_email(user.email, reset_link)

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