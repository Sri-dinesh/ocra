"""Pydantic schemas for /route endpoint.
Owner: CHARAN / Backend-B (Hardened for Akash Mobile Integration)
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class Point(BaseModel):
    lat: float
    lon: float


class RouteRequest(BaseModel):
    start: Point = Field(..., description="Departure coordinates (lat, lon)")
    goal: Point = Field(..., description="Destination coordinates (lat, lon)")
    boat_class: Optional[str] = Field(
        default="medium", description="Vessel class: small, medium, large"
    )


class RouteResponse(BaseModel):
    route: List[Point] = Field(..., description="Ordered list of route waypoints")
    distance_nm: float = Field(..., description="Total nautical miles")
    avoided_zones: List[str] = Field(
        default_factory=list, description="Identifiers of avoided restricted zones/IMBL"
    )
    pathfinder: str = Field(default="astar", description="Pathfinding algorithm used")
