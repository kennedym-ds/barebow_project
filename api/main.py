"""FastAPI main application for BareTrack."""
import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from src.db import create_db_and_tables
from api.routers import bows, arrows, tabs, sessions, scoring, analysis, crawls, analytics, rounds

logger = logging.getLogger("baretrack")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler - runs on startup and shutdown."""
    logger.info("BareTrack API starting up")
    create_db_and_tables()
    logger.info("Database initialised")
    yield
    logger.info("BareTrack API shutting down")


app = FastAPI(
    title="BareTrack API",
    description="REST API for BareTrack archery management system",
    version="1.0.2",
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


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log every request with timing."""
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    logger.info("%s %s → %s (%.0fms)", request.method, request.url.path, response.status_code, elapsed_ms)
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Catch-all for unhandled exceptions — log and return 500."""
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# Mount routers
app.include_router(bows.router, prefix="/api/bows", tags=["Bow Setups"])
app.include_router(arrows.router, prefix="/api/arrows", tags=["Arrow Setups"])
app.include_router(tabs.router, prefix="/api/tabs", tags=["Tab Setups"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessions"])
app.include_router(scoring.router, prefix="/api/scoring", tags=["Scoring"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(crawls.router, prefix="/api/crawls", tags=["Crawl Regression"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(rounds.router, prefix="/api/rounds", tags=["Rounds"])


@app.get("/api/health")
@app.get("/")
def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "BareTrack API"}
