"""Production-Grade A* Nautical Pathfinding Route Endpoint.
Computes safe marine navigation paths avoiding real MPAs and restricted zones.
Owner: CHARAN / Backend-B (Hardened for Real Data Integration)
"""

import logging
from fastapi import APIRouter, HTTPException, status
from app.schemas.route import RouteRequest, RouteResponse, Point
from app.geospatial.cost_grid import get_real_cost_grid
from app.geospatial.astar import astar_route, haversine

router = APIRouter(tags=["Routing"])
logger = logging.getLogger(__name__)


@router.post(
    "/route",
    response_model=RouteResponse,
    status_code=status.HTTP_200_OK,
    summary="Compute A* Nautical Route",
)
def get_route(req: RouteRequest) -> RouteResponse:
    """Calculate safe maritime path avoiding real spatial boundaries (MPAs, IMBL, hazards)."""
    start = (req.start.lat, req.start.lon)
    goal = (req.goal.lat, req.goal.lon)

    cost_grid = get_real_cost_grid(start, goal)
    path = astar_route(start, goal, cost_grid)

    if not path:
        logger.warning(f"No valid marine path found between {start} and {goal}.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No safe maritime route exists (path completely blocked by restricted conservation zones or land).",
        )

    # Calculate total nautical miles
    dist_nm = 0.0
    for i in range(len(path) - 1):
        dist_nm += haversine(path[i][0], path[i][1], path[i + 1][0], path[i + 1][1])

    # Dynamic calculation of avoided real zones
    avoided_zones = cost_grid.get_avoided_zones(path)

    return RouteResponse(
        route=[Point(lat=p[0], lon=p[1]) for p in path],
        distance_nm=round(dist_nm, 1),
        avoided_zones=avoided_zones,
        pathfinder="astar",
    )
