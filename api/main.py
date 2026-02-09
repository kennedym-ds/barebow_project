"""FastAPI main application for BareTrack."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.db import create_db_and_tables
from api.routers import bows, arrows, tabs, sessions, scoring, analysis, crawls, analytics


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler - runs on startup and shutdown."""
    # Startup
    create_db_and_tables()
    yield
    # Shutdown (nothing to do for SQLite)


app = FastAPI(
    title="BareTrack API",
    description="REST API for BareTrack archery management system",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite default
        "http://localhost:3000",  # Create React App default
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(bows.router, prefix="/api/bows", tags=["Bow Setups"])
app.include_router(arrows.router, prefix="/api/arrows", tags=["Arrow Setups"])
app.include_router(tabs.router, prefix="/api/tabs", tags=["Tab Setups"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessions"])
app.include_router(scoring.router, prefix="/api/scoring", tags=["Scoring"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(crawls.router, prefix="/api/crawls", tags=["Crawl Regression"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])


@app.get("/")
def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "BareTrack API"}
