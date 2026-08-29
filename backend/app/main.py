"""FastAPI application entrypoint for ORCA.
Owner: SRIDINESH (Lead)
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import logger
from app.api.v1 import api_v1_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting ORCA API Backend on port {settings.PORT} ({settings.ENVIRONMENT})")
    # Startup tasks
    yield
    # Shutdown tasks
    logger.info("Shutting down ORCA API Backend...")


app = FastAPI(
    title="ORCA — Marine Ecosystem Reasoning with Collaborative Agents",
    description="Agentic AI-powered conversational marine decision-support platform (SIH26176)",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
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
    """Root redirect / information endpoint."""
    return {
        "name": "ORCA Marine Intelligence API",
        "docs": "/docs",
        "health": "/health",
        "version": "1.0.0",
    }
