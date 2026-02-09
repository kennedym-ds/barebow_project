"""Test fixtures and configuration for API tests."""
import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, create_engine, Session as SQLModelSession
from sqlalchemy.pool import StaticPool

# Import all models to ensure they're registered with SQLModel.metadata
from src.models import BowSetup, ArrowSetup, ArrowShaft, TabSetup, Session as SessionModel, End, Shot


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

    from api.main import app
    from api.deps import get_db

    def get_db_override():
        with SQLModelSession(test_engine) as session:
            yield session

    app.dependency_overrides[get_db] = get_db_override

    with TestClient(app, raise_server_exceptions=True) as client:
        yield client

    app.dependency_overrides.clear()
