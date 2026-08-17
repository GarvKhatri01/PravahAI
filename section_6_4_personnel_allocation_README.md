# Section 6.4 Personnel-Allocation Algorithm Engine

A flexible, robust, production-ready Personnel-Allocation Module implemented in Python for police/emergency resource dispatch optimization.

---

## 1. Problem Formulation
- **Input Entities**:
  - **Officers $K$**: Each officer has `id`, `name`, `current_lat`, `current_lon`, `status` (`"available"` | `"busy"`), optional `max_radius_km`, and optional `assigned_location_id`.
  - **Hotspot Locations $N$**: Each location has `id`, `name`, `lat`, `lon`, and numerical `risk_score` (0–100).
- **Objective**: Maximize total covered risk while minimizing officer travel distance / response latency.
- **Constraints**:
  - 1-to-1 assignment (each officer assigned to at most 1 location; each location receives at most 1 officer).
  - Hard distance threshold (`max_radius_km`).

---

## 2. Strategies Implemented

### Method A: Section 6.5 Dynamic Priority (`strategy="dynamic_priority_6_5"`)
- **Priority Hierarchy**: Distance of police officer from risk area $>$ 6.5 Risk Factor.
- **High-Risk Officer Protection**: Officers assigned to high-risk areas ($\text{risk} \ge 70$) are locked to their post (`"locked_high_risk_post"`).
- **No High-Risk Left Open**: Mobilizes nearest available/low-risk officers to cover high-risk spikes.

### Method B: Optimal Bipartite Matching (`strategy="scipy_linear_sum_assignment"`)
- Cost Matrix: $\text{Cost}_{ij} = \alpha \cdot (1 - \text{NormalizedRisk}_j) + (1 - \alpha) \cdot \text{NormalizedDistance}_{ij}$.
- Infeasibility penalty ($10^6$) for $D_{ij} > \text{max\_radius\_km}$.
- Solves global optimum via `scipy.optimize.linear_sum_assignment`.

### Method C: Greedy Strategy (`strategy="greedy"`)
- Ranks candidate locations descending by risk score, assigning nearest available officer within permitted radius.

---

## 3. Quick Start Guide

### Installation
```bash
pip install -r requirements.txt
```

### Run Automated Unit Tests
```bash
pytest test_allocation.py -v
```

### Run Python Example Code
```bash
python example_usage.py
```

### Launch Flask REST API Server
```bash
python allocation_server.py --port 5000
```
- Endpoint: `POST http://localhost:5000/api/allocate`
- Payload Example:
```json
{
  "officers": [
    {"id": "OFF_01", "name": "Squad Alpha", "current_lat": 21.1458, "current_lon": 79.0882, "status": "available"}
  ],
  "locations": [
    {"id": "LOC_01", "name": "Zero Mile Stone", "lat": 21.1458, "lon": 79.0882, "risk_score": 95.5}
  ],
  "strategy": "dynamic_priority_6_5",
  "alpha": 0.2,
  "default_max_radius_km": 15.0,
  "high_risk_threshold": 70.0
}
```

---

## 4. Output JSON Schema

```json
{
  "summary": {
    "total_officers": 10,
    "assigned_officers": 8,
    "total_locations": 15,
    "covered_locations": 8,
    "total_risk_covered": 740.5,
    "average_travel_distance_km": 1.72
  },
  "assignments": [
    {
      "officer_id": "OFF_01",
      "officer_name": "Squad Alpha",
      "officer_start": [21.1458, 79.0882],
      "location_id": "LOC_01",
      "location_name": "Zero Mile Stone",
      "location_coords": [21.1458, 79.0882],
      "risk_score": 95.5,
      "distance_km": 0.0,
      "protection_status": "locked_high_risk_post"
    }
  ],
  "unassigned_officers": [],
  "uncovered_locations": []
}
```
