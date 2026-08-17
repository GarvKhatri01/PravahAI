# PravahAI - Section 6.4 & 6.5 Personnel Allocation Engine

Standalone Python implementation of the PravahAI Personnel-Allocation algorithm integrated with Section 6.5 Dynamic Risk Engine.

## Files Included:
- `allocation.py`: Core allocation algorithm implementing:
  1. `dynamic_priority_6_5`: Priority hierarchy (Distance > 6.5 Risk) + High-Risk Officer Protection (retaining officers at posts with risk ≥ 70) + Shortage Avoidance.
  2. `scipy_linear_sum_assignment`: Bipartite matching optimization with scipy.
  3. `greedy`: Greedy high-risk priority strategy.
- `test_allocation.py`: Pytest suite (10 test cases passing).
- `allocation_server.py`: Flask REST API server (`POST /api/allocate`).

## Quick Start:
```bash
# Activate python virtual environment and run unit tests
pytest test_allocation.py -v

# Run CLI sanity check
python allocation.py

# Launch REST API server on port 5000
python allocation_server.py --port 5000
```
