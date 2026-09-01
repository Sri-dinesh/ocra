"""API v1 Router aggregation."""

from fastapi import APIRouter
from app.api.v1.query import router as query_router
from app.api.v1.evidence import router as evidence_router
from app.api.v1.conversations import router as conversations_router
from app.api.v1.route import router as route_router
from app.api.v1.oceanstate import router as oceanstate_router
from app.api.v1.watchdog import router as watchdog_router
from app.api.v1.voice import router as voice_router
from app.core.config import settings

api_v1_router = APIRouter(prefix="/api/v1")

@api_v1_router.get("/health", tags=["Health"])
def health_v1():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "service": "ORCA Marine Decision Support Platform",
    }

api_v1_router.include_router(query_router)
api_v1_router.include_router(evidence_router)
api_v1_router.include_router(conversations_router)
api_v1_router.include_router(route_router)
api_v1_router.include_router(oceanstate_router)
api_v1_router.include_router(watchdog_router)
api_v1_router.include_router(voice_router)
