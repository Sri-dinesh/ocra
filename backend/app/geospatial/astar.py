import heapq
import math
from typing import List, Tuple, Optional
from app.geospatial.cost_grid import CostGrid
from app.geospatial.geofence import check_route

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    # Basic distance heuristic
    R = 3440.065 # Earth radius in nautical miles
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) * math.sin(dlat / 2) +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) * math.sin(dlon / 2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def get_neighbors(lat: float, lon: float, resolution: float) -> List[Tuple[float, float]]:
    return [
        (lat + resolution, lon),
        (lat - resolution, lon),
        (lat, lon + resolution),
        (lat, lon - resolution),
        (lat + resolution, lon + resolution),
        (lat - resolution, lon - resolution),
        (lat + resolution, lon - resolution),
        (lat - resolution, lon + resolution),
    ]

def astar_route(start: Tuple[float, float], goal: Tuple[float, float], cost_grid: CostGrid) -> Optional[List[Tuple[float, float]]]:
    # Very simplified A* for MVP
    resolution = cost_grid.resolution
    
    # Snap start and goal to grid (or keep them real and just grid the path)
    start_snapped = (round(start[0], 2), round(start[1], 2))
    goal_snapped = (round(goal[0], 2), round(goal[1], 2))

    open_set = []
    heapq.heappush(open_set, (0, start_snapped))
    
    came_from = {}
    g_score = {start_snapped: 0}
    f_score = {start_snapped: haversine(*start_snapped, *goal_snapped)}
    
    while open_set:
        current = heapq.heappop(open_set)[1]
        
        # If we are within 1 resolution step of the goal, call it done
        if haversine(*current, *goal_snapped) <= resolution * 60: # Rough degree to nm conversion
            path = [goal]
            while current in came_from:
                path.append(current)
                current = came_from[current]
            path.append(start)
            path.reverse()
            
            # Final geofence check over the whole route
            if check_route(path):
                return None
            return path
            
        for neighbor in get_neighbors(*current, resolution):
            neighbor = (round(neighbor[0], 2), round(neighbor[1], 2))
            
            base_cost = cost_grid.get_cost(*neighbor)
            if base_cost == float('inf'):
                continue
                
            tentative_g_score = g_score[current] + (haversine(*current, *neighbor) * base_cost)
            
            if neighbor not in g_score or tentative_g_score < g_score[neighbor]:
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g_score
                f_score[neighbor] = tentative_g_score + haversine(*neighbor, *goal_snapped)
                heapq.heappush(open_set, (f_score[neighbor], neighbor))
                
    return None # No path found

def straight_line_route(start: Tuple[float, float], goal: Tuple[float, float]) -> List[Tuple[float, float]]:
    return [start, goal]
