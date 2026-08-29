"""Pydantic schemas for /route endpoint.
Owner: CHARAN (Backend-B)
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class LatLonPoint(BaseModel):
    lat: float
    lon: float


class RouteRequest(BaseModel):
    start: LatLonPoint
    goal: LatLonPoint
    boat_class: Optional[str] = Field(default="small", description="Vessel class")


class RouteResponse(BaseModel):
    route: List[LatLonPoint]
    distance_nm: float
    avoided_zones: List[str] = Field(default_factory=list)
    pathfinder: str = "astar"
