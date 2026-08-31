"""FastAPI Application Entrypoint for ORCA.
Provides:
- Multi-agent marine reasoning APIs (/api/v1/query, /api/v1/evidence).
- Fused geospatial and environmental endpoints (/api/v1/oceanstate, /api/v1/sync/payload).
- A* Collision-free Maritime Navigation (/api/v1/route).
- Proactive hazard & geofence watchdog (/api/v1/watchdog).
Owner: SRIDINESH (Lead) & CHARAN (Backend-B)
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import logger
from app.api.v1 import api_v1_router
from app.db.init_db import init_db
from app.db.seed_zones import main as seed_zones


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup & shutdown lifecycle."""
    logger.info(f"Initializing ORCA Backend on port {settings.PORT} (env={settings.ENVIRONMENT})...")
    
    # 1. Initialize DB tables & PostGIS metadata
    try:
        init_db()
        logger.info("Database schema initialized.")
    except Exception as e:
        logger.warning(f"Database schema init warning: {e}")

    # 2. Seed initial demo boundaries (IMBL & MPAs)
    try:
        seed_zones()
        logger.info("Geofence boundary seed completed.")
    except Exception as e:
        logger.warning(f"Geofence seed warning: {e}")

    yield

    logger.info("Shutting down ORCA API Backend...")


app = FastAPI(
    title="ORCA — Marine Ecosystem Reasoning with Collaborative Agents",
    description="Agentic AI-powered conversational marine decision-support platform (SIH26176)",
    version="1.0.0",
    lifespan=lifespan,
)

# Robust CORS configuration for Expo Web, iOS/Android Simulators, and LAN IPs
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global unhandled exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal marine decision engine error. Please try again."},
    )

# Mount aggregated v1 router
app.include_router(api_v1_router)


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "app": "ORCA Backend",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
    }


@app.get("/", tags=["Root"])
async def root():
    """Root metadata endpoint."""
    return {
        "name": "ORCA Marine Intelligence API",
        "docs": "/docs",
        "health": "/health",
        "version": "1.0.0",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)

