"""
Section 6.4 Personnel-Allocation Module (PravahAI)
===================================================
Integrates Section 6.5 Dynamic Risk Engine output as input for officer allocation.

Features:
1. Method A: Greedy Strategy (strategy="greedy")
2. Method B: Optimal Bipartite Matching via SciPy (strategy="scipy_linear_sum_assignment")
3. Method C: 6.5 Dynamic Priority Allocation (strategy="dynamic_priority_6_5")
   - Priority Hierarchy: Distance of police officer to risk area > 6.5 Risk Score.
   - High-Risk Retention: Officers assigned to high-risk areas are protected from unnecessary reassignment.
   - Gap Avoidance: Ensures high-risk areas do not remain unallocated due to officer shortages.
"""

import math
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional, Tuple, Union
import numpy as np
from scipy.optimize import linear_sum_assignment


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes the geodesic distance in kilometers between two lat/lon coordinates
    using the Haversine formula.
    """
    R = 6371.0  # Earth's radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


@dataclass
class Officer:
    id: str
    name: str
    current_lat: float
    current_lon: float
    status: str = "available"  # "available" | "busy"
    max_radius_km: Optional[float] = None
    assigned_location_id: Optional[str] = None
    current_location_risk: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "current_lat": self.current_lat,
            "current_lon": self.current_lon,
            "status": self.status,
            "max_radius_km": self.max_radius_km,
            "assigned_location_id": self.assigned_location_id,
            "current_location_risk": self.current_location_risk
        }


@dataclass
class HotspotLocation:
    id: str
    name: str
    lat: float
    lon: float
    risk_score: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "lat": self.lat,
            "lon": self.lon,
            "risk_score": float(self.risk_score)
        }


def allocate_personnel(
    officers: List[Union[Officer, Dict[str, Any]]],
    locations: List[Union[HotspotLocation, Dict[str, Any]]],
    strategy: str = "dynamic_priority_6_5",
    alpha: float = 0.2,  # Default 0.2 means Distance weight (0.8) > Risk weight (0.2)
    default_max_radius_km: float = 50.0,
    high_risk_threshold: float = 70.0
) -> Dict[str, Any]:
    """
    Allocates available officers to hotspot locations taking Section 6.5 dynamic output as input.

    Priority hierarchy:
    - Distance of police from risk area > 6.5 Risk Factor.
    - Officers assigned to high-risk areas are protected from unnecessary shuffling.
    - High-risk spots are never left unallocated due to officer shortages.

    Args:
        officers: List of Officer objects or dicts (accepts 6.5 officer state)
        locations: List of HotspotLocation objects or dicts (6.5 dynamic risk output)
        strategy: "dynamic_priority_6_5" | "scipy_linear_sum_assignment" | "greedy"
        alpha: Weight parameter in [0, 1] balancing Risk Priority vs Distance
               (alpha=0.2 favors Distance priority > 6.5 Risk score)
        default_max_radius_km: Max travel radius in km
        high_risk_threshold: Score threshold above which a location is deemed high risk (default 70.0)

    Returns:
        Structured JSON response dictionary.
    """
    # 1. Parse entities into normalized objects
    parsed_officers: List[Officer] = []
    for o in officers:
        if isinstance(o, Officer):
            parsed_officers.append(o)
        else:
            parsed_officers.append(Officer(
                id=str(o["id"]),
                name=str(o.get("name", f"Officer {o['id']}")),
                current_lat=float(o["current_lat"]),
                current_lon=float(o["current_lon"]),
                status=str(o.get("status", "available")),
                max_radius_km=o.get("max_radius_km"),
                assigned_location_id=o.get("assigned_location_id"),
                current_location_risk=float(o.get("current_location_risk", 0.0))
            ))

    parsed_locations: List[HotspotLocation] = []
    for loc in locations:
        if isinstance(loc, HotspotLocation):
            parsed_locations.append(loc)
        else:
            parsed_locations.append(HotspotLocation(
                id=str(loc["id"]),
                name=str(loc.get("name", f"Location {loc['id']}")),
                lat=float(loc["lat"]),
                lon=float(loc["lon"]),
                risk_score=float(loc.get("risk_score", 0.0))
            ))

    total_officers_count = len(parsed_officers)
    total_locations_count = len(parsed_locations)

    # Filter available officers (excluding busy)
    available_officers = [o for o in parsed_officers if o.status == "available"]

    assignments = []
    assigned_officer_ids = set()
    covered_location_ids = set()

    if available_officers and parsed_locations:
        if strategy == "dynamic_priority_6_5":
            assignments = _allocate_dynamic_priority_6_5(
                available_officers, parsed_locations, default_max_radius_km, high_risk_threshold
            )
        elif strategy == "greedy":
            assignments = _allocate_greedy(
                available_officers, parsed_locations, default_max_radius_km
            )
        elif strategy == "scipy_linear_sum_assignment":
            assignments = _allocate_scipy(
                available_officers, parsed_locations, alpha, default_max_radius_km, high_risk_threshold
            )
        else:
            raise ValueError(f"Unknown strategy: '{strategy}'. Choose 'dynamic_priority_6_5', 'greedy', or 'scipy_linear_sum_assignment'.")

    # Collect assigned IDs
    for asgn in assignments:
        assigned_officer_ids.add(asgn["officer_id"])
        covered_location_ids.add(asgn["location_id"])

    # Determine unassigned officers & uncovered locations
    unassigned_officers = [
        o.to_dict() for o in parsed_officers if o.id not in assigned_officer_ids
    ]
    uncovered_locations = [
        loc.to_dict() for loc in parsed_locations if loc.id not in covered_location_ids
    ]

    total_risk_covered = round(sum(asgn["risk_score"] for asgn in assignments), 2)
    avg_travel_distance = round(
        sum(asgn["distance_km"] for asgn in assignments) / len(assignments), 2
    ) if assignments else 0.0

    return {
        "summary": {
            "total_officers": total_officers_count,
            "assigned_officers": len(assignments),
            "total_locations": total_locations_count,
            "covered_locations": len(assignments),
            "total_risk_covered": total_risk_covered,
            "average_travel_distance_km": avg_travel_distance
        },
        "assignments": assignments,
        "unassigned_officers": unassigned_officers,
        "uncovered_locations": uncovered_locations
    }


def _allocate_dynamic_priority_6_5(
    officers: List[Officer],
    locations: List[HotspotLocation],
    default_max_radius_km: float,
    high_risk_threshold: float
) -> List[Dict[str, Any]]:
    """
    Section 6.5 Output -> Section 6.4 Allocation Input Pipeline.

    Rules:
    1. Distance Priority > 6.5 Risk Factor.
    2. Protect High-Risk Officers: Officers assigned to high-risk zones (risk >= 70) are retained at their post.
    3. Shortage Protection: Unmanned high-risk spots take priority for dispatch, mobilizing nearest available or low-risk officers.
    """
    loc_map = {loc.id: loc for loc in locations}
    assignments = []
    assigned_officer_ids = set()
    covered_location_ids = set()

    # Step 1: Protect Officers Already Posted at High-Risk Zones (risk >= high_risk_threshold)
    for off in officers:
        if off.assigned_location_id and off.assigned_location_id in loc_map:
            loc = loc_map[off.assigned_location_id]
            if loc.risk_score >= high_risk_threshold:
                # Lock officer to their existing high-risk post
                dist = haversine_distance(off.current_lat, off.current_lon, loc.lat, loc.lon)
                assigned_officer_ids.add(off.id)
                covered_location_ids.add(loc.id)
                assignments.append({
                    "officer_id": off.id,
                    "officer_name": off.name,
                    "officer_start": [round(off.current_lat, 6), round(off.current_lon, 6)],
                    "location_id": loc.id,
                    "location_name": loc.name,
                    "location_coords": [round(loc.lat, 6), round(loc.lon, 6)],
                    "risk_score": round(loc.risk_score, 2),
                    "distance_km": round(dist, 2),
                    "protection_status": "locked_high_risk_post"
                })

    # Step 2: Uncovered Locations sorted by 6.5 Risk Score descending
    uncovered_locations = [loc for loc in locations if loc.id not in covered_location_ids]
    uncovered_locations.sort(key=lambda l: l.risk_score, reverse=True)

    # Step 3: Dispatch unassigned officers prioritizing Distance over 6.5 Risk Factor
    # For each high-risk location, pick nearest unassigned officer
    for loc in uncovered_locations:
        candidate_officers = [off for off in officers if off.id not in assigned_officer_ids]
        if not candidate_officers:
            break

        best_officer = None
        min_dist = float("inf")

        for off in candidate_officers:
            radius_limit = off.max_radius_km if off.max_radius_km is not None else default_max_radius_km
            dist = haversine_distance(off.current_lat, off.current_lon, loc.lat, loc.lon)

            # Primary Priority: Distance of police officer from risk area
            if dist <= radius_limit and dist < min_dist:
                min_dist = dist
                best_officer = off

        if best_officer:
            assigned_officer_ids.add(best_officer.id)
            covered_location_ids.add(loc.id)
            assignments.append({
                "officer_id": best_officer.id,
                "officer_name": best_officer.name,
                "officer_start": [round(best_officer.current_lat, 6), round(best_officer.current_lon, 6)],
                "location_id": loc.id,
                "location_name": loc.name,
                "location_coords": [round(loc.lat, 6), round(loc.lon, 6)],
                "risk_score": round(loc.risk_score, 2),
                "distance_km": round(min_dist, 2),
                "protection_status": "dynamically_dispatched"
            })

    return assignments


def _allocate_greedy(
    officers: List[Officer],
    locations: List[HotspotLocation],
    default_max_radius_km: float
) -> List[Dict[str, Any]]:
    """
    Greedy Strategy:
    Sorts locations by risk_score, assigns nearest available officer.
    """
    sorted_locations = sorted(locations, key=lambda l: l.risk_score, reverse=True)
    assigned_officer_ids = set()
    assignments = []

    for loc in sorted_locations:
        best_officer = None
        best_dist = float("inf")

        for off in officers:
            if off.id in assigned_officer_ids:
                continue
            
            radius_limit = off.max_radius_km if off.max_radius_km is not None else default_max_radius_km
            dist = haversine_distance(off.current_lat, off.current_lon, loc.lat, loc.lon)

            if dist <= radius_limit and dist < best_dist:
                best_dist = dist
                best_officer = off

        if best_officer:
            assigned_officer_ids.add(best_officer.id)
            assignments.append({
                "officer_id": best_officer.id,
                "officer_name": best_officer.name,
                "officer_start": [round(best_officer.current_lat, 6), round(best_officer.current_lon, 6)],
                "location_id": loc.id,
                "location_name": loc.name,
                "location_coords": [round(loc.lat, 6), round(loc.lon, 6)],
                "risk_score": round(loc.risk_score, 2),
                "distance_km": round(best_dist, 2)
            })

    return assignments


def _allocate_scipy(
    officers: List[Officer],
    locations: List[HotspotLocation],
    alpha: float,
    default_max_radius_km: float,
    high_risk_threshold: float = 70.0
) -> List[Dict[str, Any]]:
    """
    Optimal Bipartite Matching:
    Cost = alpha * (1 - NormalizedRisk) + (1 - alpha) * NormalizedDistance
    Retention Bonus for High Risk: subtracts retention bonus if officer is already covering high-risk spot.
    """
    K = len(officers)
    N = len(locations)

    D = np.zeros((K, N), dtype=float)
    for i, off in enumerate(officers):
        for j, loc in enumerate(locations):
            D[i, j] = haversine_distance(off.current_lat, off.current_lon, loc.lat, loc.lon)

    risks = np.array([loc.risk_score for loc in locations], dtype=float)
    min_risk, max_risk = np.min(risks), np.max(risks)
    if max_risk > min_risk:
        norm_risk = (risks - min_risk) / (max_risk - min_risk)
    else:
        norm_risk = np.ones(N, dtype=float) if max_risk > 0 else np.zeros(N, dtype=float)

    min_dist, max_dist = np.min(D), np.max(D)
    if max_dist > min_dist:
        norm_dist = (D - min_dist) / (max_dist - min_dist)
    else:
        norm_dist = np.zeros((K, N), dtype=float)

    alpha = max(0.0, min(1.0, float(alpha)))
    cost_matrix = np.zeros((K, N), dtype=float)
    INFEASIBLE_PENALTY = 1e6

    for i, off in enumerate(officers):
        radius_limit = off.max_radius_km if off.max_radius_km is not None else default_max_radius_km
        for j in range(N):
            loc = locations[j]
            if D[i, j] > radius_limit:
                cost_matrix[i, j] = INFEASIBLE_PENALTY
            else:
                cost_ij = alpha * (1.0 - norm_risk[j]) + (1.0 - alpha) * norm_dist[i, j]
                # High Risk Protection Retention Bonus:
                if off.assigned_location_id == loc.id and loc.risk_score >= high_risk_threshold:
                    cost_ij -= 0.5  # Heavy retention bonus to prevent moving high-risk officers
                cost_matrix[i, j] = cost_ij

    row_ind, col_ind = linear_sum_assignment(cost_matrix)

    assignments = []
    for i, j in zip(row_ind, col_ind):
        if cost_matrix[i, j] >= INFEASIBLE_PENALTY / 2.0:
            continue
        
        off = officers[i]
        loc = locations[j]
        dist = D[i, j]

        assignments.append({
            "officer_id": off.id,
            "officer_name": off.name,
            "officer_start": [round(off.current_lat, 6), round(off.current_lon, 6)],
            "location_id": loc.id,
            "location_name": loc.name,
            "location_coords": [round(loc.lat, 6), round(loc.lon, 6)],
            "risk_score": round(loc.risk_score, 2),
            "distance_km": round(dist, 2)
        })

    return assignments


if __name__ == "__main__":
    import json
    # Sanity check with 6.5 high risk output & pre-assigned officers
    sample_officers = [
        {"id": "OFF_01", "name": "Squad Alpha (Insp. Patil)", "current_lat": 21.1458, "current_lon": 79.0882, "status": "available", "assigned_location_id": "LOC_01"},
        {"id": "OFF_02", "name": "Squad Beta (SI Kulkarni)", "current_lat": 21.1430, "current_lon": 79.0820, "status": "available", "assigned_location_id": "LOC_02"},
        {"id": "OFF_03", "name": "Squad Gamma (Constable Deshmukh)", "current_lat": 21.1550, "current_lon": 79.0750, "status": "available"},
        {"id": "OFF_04", "name": "Patrol Delta (SI Bendre)", "current_lat": 21.1350, "current_lon": 79.0980, "status": "available"},
    ]
    sample_locations = [
        {"id": "LOC_01", "name": "Zero Mile Stone Junction", "lat": 21.1458, "lon": 79.0882, "risk_score": 95.5},  # High risk - OFF_01 protected
        {"id": "LOC_02", "name": "Variety Square Interchange", "lat": 21.1430, "lon": 79.0820, "risk_score": 88.5},  # High risk - OFF_02 protected
        {"id": "LOC_03", "name": "Sitabuldi Metro Interchange (Spiked by 6.5)", "lat": 21.1480, "lon": 79.0850, "risk_score": 99.0}, # Newly spiked high risk
        {"id": "LOC_04", "name": "Dharampeth Market", "lat": 21.1530, "lon": 79.0650, "risk_score": 45.0},
    ]

    res = allocate_personnel(sample_officers, sample_locations, strategy="dynamic_priority_6_5")
    print(json.dumps(res, indent=2))
