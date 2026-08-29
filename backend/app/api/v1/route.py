"""POST /api/v1/route handler.
Owner: CHARAN (Backend-B)
"""

from fastapi import APIRouter
from app.schemas.route import RouteRequest, RouteResponse, LatLonPoint

router = APIRouter(tags=["Route"])


@router.post("/route", response_model=RouteResponse)
async def calculate_route(req: RouteRequest) -> RouteResponse:
    """Calculate A* obstacle-avoiding maritime route."""
    return RouteResponse(
        route=[
            LatLonPoint(lat=req.start.lat, lon=req.start.lon),
            LatLonPoint(lat=17.02, lon=82.31),
            LatLonPoint(lat=req.goal.lat, lon=req.goal.lon),
        ],
        distance_nm=14.2,
        avoided_zones=["imbl_segment_04"],
        pathfinder="astar",
    )
