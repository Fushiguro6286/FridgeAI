import os

os.environ.update(
    ENVIRONMENT="test",
    DATABASE_URL="sqlite://",
    SECRET_KEY="test-secret-key-that-is-long-enough-123456",
    AI_API_KEY="",
    AI_MOCK_MODE="false",
)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.config import get_settings  # noqa: E402
from app.db import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.ratelimit import limiter  # noqa: E402

engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestSession = sessionmaker(engine, expire_on_commit=False)


def _get_db():
    with TestSession() as s:
        yield s


app.dependency_overrides[get_db] = _get_db


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    limiter.reset()
    yield


@pytest.fixture
def settings(monkeypatch):
    s = get_settings()
    yield s


@pytest.fixture
def mock_ai(monkeypatch):
    monkeypatch.setattr(get_settings(), "ai_mock_mode", True)


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def make_user(client: TestClient, email: str = "asha@example.com") -> dict:
    r = client.post("/api/auth/register", json={"email": email, "password": "correct horse 1", "display_name": "Asha"})
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def auth(client):
    return make_user(client)
