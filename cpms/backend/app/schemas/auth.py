from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole


class InviteRequest(BaseModel):
    """Payload an admin submits to create a new account (see /invite in
    routers/auth.py). No password field — the invited user sets their
    own via the emailed reset link."""

    full_name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    role: UserRole = UserRole.VIEWER


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: UserRole
    created_at: datetime

    model_config = {"from_attributes": True}


class InviteOut(BaseModel):
    """Returned to the admin who invited the user, containing the
    set-password link in case email delivery fails or they want to
    forward it manually."""

    user: UserOut
    reset_token: str
    reset_url: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


class MessageResponse(BaseModel):
    message: str