from pydantic import BaseModel
from typing import List, Dict

class Point(BaseModel):
    lat: float
    lon: float

class RouteRequest(BaseModel):
    start: Point
    goal: Point
    boat_class: str

class RouteResponse(BaseModel):
    route: List[Point]
    distance_nm: float
    avoided_zones: List[str]
    pathfinder: str
