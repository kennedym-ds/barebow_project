"""Analytics aggregation endpoints — split into logical sub-modules."""
from fastapi import APIRouter

from .goals import router as goals_router
from .precision import router as precision_router
from .summary import router as summary_router
from .trends import router as trends_router

router = APIRouter()
router.include_router(summary_router)
router.include_router(precision_router)
router.include_router(trends_router)
router.include_router(goals_router)
