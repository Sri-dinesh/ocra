"""A* Marine Pathfinder over Navigable Cost Grid.
Owner: CHARAN (Backend-B)
"""

from typing import List, Tuple, Optional, Dict, Any


def astar_route(
    start: Tuple[float, float],
    goal: Tuple[float, float],
    boat_class: str = "small",
) -> Optional[List[Tuple[float, float]]]:
    """Find obstacle-avoiding maritime route using A*."""
    # TODO (CHARAN): Implement A* algorithm over cost grid in Phase 4
    return [
        start,
        ((start[0] + goal[0]) / 2 + 0.03, (start[1] + goal[1]) / 2 + 0.06),
        goal,
    ]
