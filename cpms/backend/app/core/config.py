"""
Application configuration.

Loads settings from environment variables (and a local .env file in
development) using pydantic-settings. Import `settings` anywhere in the
app instead of calling os.environ directly.
"""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- PostgreSQL ---
    postgres_user: str = "cpms_user"
    postgres_password: str = "change_me"
    postgres_db: str = "cpms_db"
    postgres_host: str = "db"
    postgres_port: int = 5432
    database_url: str | None = None

    # --- Auth / JWT ---
    jwt_secret_key: str = "insecure-dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # --- App ---
    environment: str = "development"
    cors_origins: str = "http://localhost:5173"

    # --- Uploads ---
    max_upload_size_mb: int = 10
    upload_storage_dir: str = "./uploaded_files"

    # --- Optional bootstrap admin (used by app/scripts/seed.py) ---
    seed_admin_name: str = "System Admin"
    seed_admin_email: str | None = None
    seed_admin_password: str | None = None

    # --- Password reset email ---
    # If smtp_host is left unset, reset links are printed to the backend
    # console instead of emailed — handy for local dev without real SMTP
    # credentials. Set all smtp_* vars in production.
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str = "no-reply@candidateperformance.app"
    smtp_use_tls: bool = True
    frontend_base_url: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    @property
    def sqlalchemy_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance so the .env file is only parsed once."""
    return Settings()


settings = get_settings()
