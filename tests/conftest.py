"""Test fixtures and configuration for API tests."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session as SQLModelSession
from sqlmodel import SQLModel, create_engine

# Import all models to ensure they're registered with SQLModel.metadata
from src.models import ArrowSetup, ArrowShaft, BowSetup, End, Session, Shot, TabSetup  # noqa: F401


@pytest.fixture(name="client")
def client_fixture():
    """Create a test client with in-memory database."""
    # Create a fresh in-memory engine per test
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(test_engine)

    from api.deps import get_db
    from api.main import app

    def get_db_override():
        with SQLModelSession(test_engine) as session:
            yield session

    app.dependency_overrides[get_db] = get_db_override

    with TestClient(app, raise_server_exceptions=True) as client:
        yield client

    app.dependency_overrides.clear()
