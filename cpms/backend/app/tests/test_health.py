"""Smoke test for Phase 1: confirms the FastAPI app boots and responds."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["service"] == "cpms-backend"


def test_health_endpoint_reports_shape():
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert "api" in body
    assert "database" in body
