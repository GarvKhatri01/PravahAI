"""
Flask REST API Server for Section 6.4 Personnel Allocation (allocation_server.py)
Exposes POST /api/allocate and GET /api/health endpoints.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from allocation import allocate_personnel

app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing for frontend fetch calls


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "PravahAI Personnel Allocation Engine",
        "version": "1.0.0"
    })


@app.route("/api/allocate", methods=["POST"])
def allocate_endpoint():
    """
    Accepts JSON body:
    {
        "officers": [...],
        "locations": [...],
        "strategy": "scipy_linear_sum_assignment" | "greedy",
        "alpha": 0.5,
        "default_max_radius_km": 50.0
    }
    """
    try:
        data = request.get_json(force=True) or {}
        officers = data.get("officers", [])
        locations = data.get("locations", [])
        strategy = data.get("strategy", "dynamic_priority_6_5")
        alpha = float(data.get("alpha", 0.2))
        default_max_radius = float(data.get("default_max_radius_km", 50.0))
        high_risk_thresh = float(data.get("high_risk_threshold", 70.0))

        result = allocate_personnel(
            officers=officers,
            locations=locations,
            strategy=strategy,
            alpha=alpha,
            default_max_radius_km=default_max_radius,
            high_risk_threshold=high_risk_thresh
        )
        return jsonify(result), 200

    except Exception as e:
        return jsonify({
            "error": str(e),
            "message": "Allocation calculation failed"
        }), 400


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="PravahAI Allocation Server")
    parser.add_argument("--port", type=int, default=5000, help="Port to run server on")
    args = parser.parse_args()

    print(f"Starting PravahAI Personnel Allocation REST Server on port {args.port}...")
    app.run(host="0.0.0.0", port=args.port, debug=True)
