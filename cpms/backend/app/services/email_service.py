"""
Minimal email sending for password resets.

If SMTP settings aren't configured (smtp_host is None), the reset link is
printed to the backend's console instead of emailed, so local development
works without real SMTP credentials. In production, set the smtp_* env
vars and real emails will be sent instead.
"""

import smtplib
from email.mime.text import MIMEText

from app.core.config import settings


def send_password_reset_email(to_email: str, reset_link: str) -> None:
    subject = "Reset your Candidate Performance Management password"
    body = (
        f"Hello,\n\n"
        f"A password reset was requested for your account. Click the link below to "
        f"choose a new password. This link expires in 30 minutes.\n\n"
        f"{reset_link}\n\n"
        f"If you didn't request this, you can safely ignore this email."
    )

    if not settings.smtp_host:
        print(f"\n[password reset] No SMTP configured — reset link for {to_email}:\n{reset_link}\n")
        return

    message = MIMEText(body)
    message["Subject"] = subject
    message["From"] = settings.smtp_from_email
    message["To"] = to_email

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        if settings.smtp_use_tls:
            server.starttls()
        if settings.smtp_user and settings.smtp_password:
            server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_from_email, [to_email], message.as_string())