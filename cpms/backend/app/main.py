"""
FastAPI application entrypoint.

Phase 1 scope: app instance, CORS, and a health check that confirms the
database connection works. Routers (auth, candidates, streams, uploads,
results, dashboard) are added in later phases as they're built.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine
from app.routers import auth, candidates, dashboard, periods, results, scores, streams, uploads

app = FastAPI(
    title="Candidate Performance Management System",
    description="API for uploading, processing, and reporting on candidate performance scores.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"service": "cpms-backend", "status": "running", "environment": settings.environment}


@app.get("/api/health")
def health_check():
    """Confirms the API is up and can reach PostgreSQL."""
    db_status = "unknown"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as exc:  # noqa: BLE001 - surfaced to caller for diagnostics
        db_status = f"error: {exc}"

    return {"api": "ok", "database": db_status}


app.include_router(auth.router)
app.include_router(streams.router)
app.include_router(candidates.router)
app.include_router(periods.router)
app.include_router(uploads.router)
app.include_router(scores.router)
app.include_router(results.router)
app.include_router(dashboard.router)
