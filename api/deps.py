"""Dependency injection for FastAPI routes."""
from sqlmodel import Session as SQLModelSession
from src.db import engine


def get_db():
    """Database session dependency for FastAPI routes."""
    with SQLModelSession(engine) as session:
        yield session
