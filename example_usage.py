"""
Example Usage Script for Section 6.4 Personnel-Allocation Algorithm
====================================================================
Demonstrates how to run Section 6.4 allocation programmatically in Python.
"""

import json
from allocation import allocate_personnel

# Sample Input Data: Officers and Hotspot Locations
sample_officers = [
    {
        "id": "OFF_01",
        "name": "Squad Alpha (Insp. Patil)",
        "current_lat": 21.1458,
        "current_lon": 79.0882,
        "status": "available",
        "max_radius_km": 15.0,
        "assigned_location_id": "LOC_01"  # Currently assigned to high-risk post
    },
    {
        "id": "OFF_02",
        "name": "Squad Beta (SI Kulkarni)",
        "current_lat": 21.1430,
        "current_lon": 79.0820,
        "status": "available",
        "max_radius_km": 10.0,
        "assigned_location_id": "LOC_02"
    },
    {
        "id": "OFF_03",
        "name": "Squad Gamma (Constable Deshmukh)",
        "current_lat": 21.1550,
        "current_lon": 79.0750,
        "status": "available",
        "max_radius_km": 12.0
    },
    {
        "id": "OFF_04",
        "name": "Patrol Delta (SI Bendre)",
        "current_lat": 21.1350,
        "current_lon": 79.0980,
        "status": "available",
        "max_radius_km": 20.0
    },
    {
        "id": "OFF_05",
        "name": "Reserve Unit (Busy)",
        "current_lat": 21.1280,
        "current_lon": 79.0700,
        "status": "busy",
        "max_radius_km": 8.0
    }
]

sample_locations = [
    {"id": "LOC_01", "name": "Zero Mile Stone Junction", "lat": 21.1458, "lon": 79.0882, "risk_score": 95.5},
    {"id": "LOC_02", "name": "Variety Square Interchange", "lat": 21.1430, "lon": 79.0820, "risk_score": 88.5},
    {"id": "LOC_03", "name": "Sitabuldi Metro Interchange (Spiked)", "lat": 21.1480, "lon": 79.0850, "risk_score": 99.0},
    {"id": "LOC_04", "name": "Wardha Road Express Corridor", "lat": 21.1250, "lon": 79.0680, "risk_score": 76.4},
    {"id": "LOC_05", "name": "Dharampeth Commercial Market", "lat": 21.1530, "lon": 79.0650, "risk_score": 45.0}
]

if __name__ == "__main__":
    print("--- 1. Running Section 6.5 Dynamic Priority Allocation (Distance > Risk) ---")
    result_priority = allocate_personnel(
        sample_officers,
        sample_locations,
        strategy="dynamic_priority_6_5",
        alpha=0.2,
        high_risk_threshold=70.0
    )
    print(json.dumps(result_priority, indent=2))

    print("\n--- 2. Running SciPy Bipartite Matching (strategy='scipy_linear_sum_assignment') ---")
    result_scipy = allocate_personnel(
        sample_officers,
        sample_locations,
        strategy="scipy_linear_sum_assignment",
        alpha=0.5
    )
    print(json.dumps(result_scipy, indent=2))
