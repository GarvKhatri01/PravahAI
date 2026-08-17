"""
Unit Tests for Section 6.4 Personnel-Allocation Algorithm (test_allocation.py)
"""

import pytest
from allocation import (
    Officer,
    HotspotLocation,
    allocate_personnel,
    haversine_distance
)


def test_haversine_distance():
    # Distance between Zero Mile Stone Nagpur (21.1458, 79.0882) and Variety Square (21.1430, 79.0820)
    dist = haversine_distance(21.1458, 79.0882, 21.1430, 79.0820)
    assert 0.5 < dist < 1.0  # Approx ~0.7 km


def test_one_to_one_constraint():
    officers = [
        {"id": f"OFF_{i:02d}", "name": f"Officer {i}", "current_lat": 21.14 + i*0.01, "current_lon": 79.08, "status": "available"}
        for i in range(5)
    ]
    locations = [
        {"id": f"LOC_{j:02d}", "name": f"Hotspot {j}", "lat": 21.145 + j*0.01, "lon": 79.085, "risk_score": 50 + j*10}
        for j in range(3)
    ]

    res = allocate_personnel(officers, locations, strategy="scipy_linear_sum_assignment")
    assignments = res["assignments"]

    officer_ids = [a["officer_id"] for a in assignments]
    location_ids = [a["location_id"] for a in assignments]

    # Check 1-to-1 uniqueness
    assert len(officer_ids) == len(set(officer_ids))
    assert len(location_ids) == len(set(location_ids))
    assert res["summary"]["assigned_officers"] == 3
    assert res["summary"]["covered_locations"] == 3


def test_greedy_strategy():
    officers = [
        {"id": "OFF_01", "name": "Officer Far", "current_lat": 21.200, "current_lon": 79.100, "status": "available"},
        {"id": "OFF_02", "name": "Officer Near", "current_lat": 21.146, "current_lon": 79.089, "status": "available"},
    ]
    locations = [
        {"id": "LOC_HIGH", "name": "High Risk", "lat": 21.145, "lon": 79.088, "risk_score": 95.0},
        {"id": "LOC_LOW", "name": "Low Risk", "lat": 21.199, "lon": 79.099, "risk_score": 10.0},
    ]

    res = allocate_personnel(officers, locations, strategy="greedy")

    assert res["summary"]["assigned_officers"] == 2
    # Greedy sorts by risk first: High Risk location gets nearest available officer (OFF_02)
    high_risk_asgn = next(a for a in res["assignments"] if a["location_id"] == "LOC_HIGH")
    assert high_risk_asgn["officer_id"] == "OFF_02"


def test_scipy_strategy_alpha_weighting():
    # Officer 1: Very close to Low Risk location
    # Officer 2: Slightly farther from High Risk location
    officers = [
        {"id": "OFF_01", "name": "Unit 1", "current_lat": 21.1450, "current_lon": 79.0880, "status": "available"},
        {"id": "OFF_02", "name": "Unit 2", "current_lat": 21.1500, "current_lon": 79.0950, "status": "available"},
    ]
    locations = [
        {"id": "LOC_HIGH", "name": "High Risk", "lat": 21.1451, "lon": 79.0881, "risk_score": 100.0},
        {"id": "LOC_LOW", "name": "Low Risk", "lat": 21.1501, "lon": 79.0951, "risk_score": 10.0},
    ]

    # With alpha=1.0 (pure risk priority), highest risk gets best match
    res_risk = allocate_personnel(officers, locations, strategy="scipy_linear_sum_assignment", alpha=1.0)
    high_asgn_risk = next(a for a in res_risk["assignments"] if a["location_id"] == "LOC_HIGH")
    assert high_asgn_risk["officer_id"] == "OFF_01"

    # With alpha=0.0 (pure distance priority)
    res_dist = allocate_personnel(officers, locations, strategy="scipy_linear_sum_assignment", alpha=0.0)
    assert res_dist["summary"]["assigned_officers"] == 2


def test_max_radius_threshold():
    officers = [
        {"id": "OFF_CLOSE", "name": "Close Unit", "current_lat": 21.145, "current_lon": 79.088, "status": "available", "max_radius_km": 5.0},
        {"id": "OFF_FAR", "name": "Far Unit", "current_lat": 22.000, "current_lon": 80.000, "status": "available", "max_radius_km": 10.0},
    ]
    locations = [
        {"id": "LOC_01", "name": "Downtown", "lat": 21.146, "lon": 79.089, "risk_score": 80.0}
    ]

    res = allocate_personnel(officers, locations, strategy="scipy_linear_sum_assignment")
    
    # Far unit is ~130 km away (> 10 km max radius), so only Close Unit can be assigned
    assert res["summary"]["assigned_officers"] == 1
    assert res["assignments"][0]["officer_id"] == "OFF_CLOSE"
    assert len(res["unassigned_officers"]) == 1
    assert res["unassigned_officers"][0]["id"] == "OFF_FAR"


def test_busy_officers_excluded():
    officers = [
        {"id": "OFF_BUSY", "name": "Busy Unit", "current_lat": 21.145, "current_lon": 79.088, "status": "busy"},
        {"id": "OFF_AVAIL", "name": "Available Unit", "current_lat": 21.146, "current_lon": 79.089, "status": "available"},
    ]
    locations = [
        {"id": "LOC_01", "name": "Spot 1", "lat": 21.147, "lon": 79.090, "risk_score": 60.0}
    ]

    res = allocate_personnel(officers, locations, strategy="scipy_linear_sum_assignment")
    assert res["summary"]["assigned_officers"] == 1
    assert res["assignments"][0]["officer_id"] == "OFF_AVAIL"


def test_no_available_officers():
    officers = [
        {"id": "OFF_01", "name": "Busy 1", "current_lat": 21.145, "current_lon": 79.088, "status": "busy"}
    ]
    locations = [
        {"id": "LOC_01", "name": "Spot 1", "lat": 21.147, "lon": 79.090, "risk_score": 60.0}
    ]

    res = allocate_personnel(officers, locations)
    assert res["summary"]["assigned_officers"] == 0
    assert len(res["unassigned_officers"]) == 1
    assert len(res["uncovered_locations"]) == 1


def test_more_locations_than_officers():
    officers = [
        {"id": "OFF_01", "name": "Unit 1", "current_lat": 21.145, "current_lon": 79.088, "status": "available"}
    ]
    locations = [
        {"id": "LOC_01", "name": "Spot 1", "lat": 21.146, "lon": 79.090, "risk_score": 90.0},
        {"id": "LOC_02", "name": "Spot 2", "lat": 21.147, "lon": 79.090, "risk_score": 40.0},
    ]

    res = allocate_personnel(officers, locations)
    assert res["summary"]["assigned_officers"] == 1
    assert len(res["uncovered_locations"]) == 1


def test_dynamic_priority_6_5_protection():
    officers = [
        {"id": "OFF_HIGH_RISK", "name": "Officer at High Risk", "current_lat": 21.145, "current_lon": 79.088, "status": "available", "assigned_location_id": "LOC_HIGH_1"},
        {"id": "OFF_FREE", "name": "Free Officer", "current_lat": 21.148, "current_lon": 79.085, "status": "available"},
    ]
    locations = [
        {"id": "LOC_HIGH_1", "name": "High Risk Existing", "lat": 21.145, "lon": 79.088, "risk_score": 85.0},
        {"id": "LOC_SPIKED_6_5", "name": "6.5 Spiked Emergency", "lat": 21.149, "lon": 79.086, "risk_score": 98.0},
    ]

    res = allocate_personnel(officers, locations, strategy="dynamic_priority_6_5")
    
    # OFF_HIGH_RISK must be locked to LOC_HIGH_1 (protection status)
    asgn_high = next(a for a in res["assignments"] if a["officer_id"] == "OFF_HIGH_RISK")
    assert asgn_high["location_id"] == "LOC_HIGH_1"
    assert asgn_high["protection_status"] == "locked_high_risk_post"

    # OFF_FREE must be dispatched to LOC_SPIKED_6_5
    asgn_spiked = next(a for a in res["assignments"] if a["officer_id"] == "OFF_FREE")
    assert asgn_spiked["location_id"] == "LOC_SPIKED_6_5"


def test_dynamic_priority_distance_over_risk():
    # Two available officers: OFF_NEAR (0.1 km) and OFF_FAR (5.0 km)
    officers = [
        {"id": "OFF_NEAR", "name": "Near Officer", "current_lat": 21.145, "current_lon": 79.088, "status": "available"},
        {"id": "OFF_FAR", "name": "Far Officer", "current_lat": 21.200, "current_lon": 79.150, "status": "available"},
    ]
    locations = [
        {"id": "LOC_1", "name": "Risk Area", "lat": 21.146, "lon": 79.089, "risk_score": 80.0}
    ]

    res = allocate_personnel(officers, locations, strategy="dynamic_priority_6_5")
    assert res["summary"]["assigned_officers"] == 1
    # Distance priority > Risk: Nearest officer must be assigned
    assert res["assignments"][0]["officer_id"] == "OFF_NEAR"


def test_global_distance_optimization_swaps_suboptimal_pairs():
    # Scenario: OFF_EAST is close to LOC_71 (Kalamna, East), OFF_SOUTH is close to LOC_78 (Manewada, South).
    # LOC_78 has higher risk (78.0) than LOC_71 (71.0).
    # Sequential greedy would let LOC_78 claim OFF_EAST first, forcing LOC_71 to take OFF_SOUTH (15+ km total).
    # Global bipartite optimization swaps the pairings so OFF_EAST -> LOC_71 and OFF_SOUTH -> LOC_78 (< 7 km total).
    officers = [
        {"id": "OFF_EAST", "name": "East Squad", "current_lat": 21.148, "current_lon": 79.125, "status": "available"},
        {"id": "OFF_SOUTH", "name": "South Squad", "current_lat": 21.095, "current_lon": 79.062, "status": "available"}
    ]
    locations = [
        {"id": "LOC_78", "name": "Manewada Ring Road", "lat": 21.110, "lon": 79.105, "risk_score": 78.0},
        {"id": "LOC_71", "name": "Kalamna Market", "lat": 21.160, "lon": 79.135, "risk_score": 71.0}
    ]

    res = allocate_personnel(officers, locations, strategy="dynamic_priority_6_5")
    assert res["summary"]["assigned_officers"] == 2

    asgn_east = next(a for a in res["assignments"] if a["officer_id"] == "OFF_EAST")
    asgn_south = next(a for a in res["assignments"] if a["officer_id"] == "OFF_SOUTH")

    # OFF_EAST must go to LOC_71 (1.69 km instead of 4.71 km)
    assert asgn_east["location_id"] == "LOC_71"
    # OFF_SOUTH must go to LOC_78 (4.76 km instead of 10.47 km)
    assert asgn_south["location_id"] == "LOC_78"
    # Total distance is under 7 km (down from > 15 km)
    total_dist = asgn_east["distance_km"] + asgn_south["distance_km"]
    assert total_dist < 7.0


