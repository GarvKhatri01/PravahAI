/* ==========================================================================
   Civic Sentinel - Risk Scoring Engine (riskEngine.js)
   
   A rule-based + weighted multi-factor risk model for Nagpur Traffic Ops.
   
   RISK SCORE (0–100) is composed of:
     1. Time-of-Day Factor       (20 pts)  — peak hours drive higher base risk
     2. Active Incidents Factor  (25 pts)  — number + severity of open incidents
     3. Deployment Coverage      (20 pts)  — unmanned high-risk zones penalize score
     4. Traffic Velocity Factor  (20 pts)  — speed drops signal congestion buildup
     5. Historical Pattern Factor(15 pts)  — zone-level historical hotspot weight

   Each factor is normalized to its max contribution, then summed for a final
   score clamped to [0, 100].
   ========================================================================== */

const RiskEngine = (() => {

    // ── 1. CONSTANTS & CONFIGURATION ────────────────────────────────────────

    const WEIGHTS = {
        timeOfDay:       0.20,
        incidents:       0.25,
        deployment:      0.20,
        trafficVelocity: 0.20,
        historicalZone:  0.15
    };

    // Nagpur peak-hour risk profile (hour 0–23 → raw risk 0–100)
    const HOURLY_RISK_PROFILE = {
        0: 10, 1: 8,  2: 6,  3: 5,  4: 5,  5: 10,
        6: 25, 7: 55, 8: 75, 9: 70, 10: 65, 11: 72,
        12: 80, 13: 75, 14: 65, 15: 60, 16: 68, 17: 82,
        18: 88, 19: 78, 20: 65, 21: 50, 22: 35, 23: 20
    };

    // Historical hotspot risk weights for known Nagpur zones (0–100)
    const ZONE_HISTORICAL_RISK = {
        'Zero Mile Stone':       88,
        'Variety Square':        72,
        'Sitabuldi Junction':    64,
        'Sadar Bazar Junction':  58,
        'Wardha Road Interchange': 54,
        'Kamptee Road':          50,
        'Jhansi Rani Square':    46,
        'Sitabuldi Interchange': 42,
        'Default':               40
    };

    // Severity multipliers for incident scoring
    const SEVERITY_WEIGHT = {
        Critical: 1.0,
        Warning:  0.5,
        Normal:   0.2
    };

    // ── 2. INTERNAL STATE ────────────────────────────────────────────────────

    let _state = {
        incidents: [],          // Array of { severity, status, location }
        officersOnDuty: 145,
        totalOfficers: 157,
        unmannedZones: 4,
        totalHighRiskZones: 8,
        avgTrafficVelocity: 32, // km/h
        freeFlowVelocity: 55,   // km/h baseline for Nagpur arterials
        activeZones: Object.keys(ZONE_HISTORICAL_RISK).filter(k => k !== 'Default')
    };

    // ── 3. FACTOR CALCULATORS ────────────────────────────────────────────────

    /**
     * Factor 1: Time-of-Day
     * Returns 0–100 based on current hour's congestion profile.
     */
    function calcTimeOfDayScore() {
        const hour = new Date().getHours();
        return HOURLY_RISK_PROFILE[hour] ?? 40;
    }

    /**
     * Factor 2: Active Incidents
     * Scores based on count and severity of non-resolved incidents.
     * Max contribution capped at 100 (3+ criticals = max).
     */
    function calcIncidentScore(incidents) {
        const active = incidents.filter(i => i.status !== 'Resolved');

        const raw = active.reduce((sum, inc) => {
            return sum + (SEVERITY_WEIGHT[inc.severity] ?? 0.2) * 33;
        }, 0);

        return Math.min(100, raw);
    }

    /**
     * Factor 3: Deployment Coverage
     * More unmanned high-risk zones = higher penalty.
     * Score = (unmannedZones / totalHighRiskZones) * 100
     */
    function calcDeploymentScore(unmannedZones, totalHighRiskZones) {
        if (totalHighRiskZones === 0) return 0;
        return Math.min(100, (unmannedZones / totalHighRiskZones) * 100);
    }

    /**
     * Factor 4: Traffic Velocity
     * Score = inverse of how close current speed is to free-flow speed.
     * 0 km/h → 100 risk. freeFlowVelocity km/h → 0 risk.
     */
    function calcVelocityScore(avgVelocity, freeFlowVelocity) {
        const velocity = Math.max(0, avgVelocity);
        const ratio = velocity / freeFlowVelocity;
        return Math.min(100, Math.max(0, (1 - ratio) * 100));
    }

    /**
     * Factor 5: Historical Zone Risk
     * Returns average of the top-3 historically riskiest currently-active zones.
     */
    function calcHistoricalScore(activeZones) {
        const scores = activeZones
            .map(z => ZONE_HISTORICAL_RISK[z] ?? ZONE_HISTORICAL_RISK['Default'])
            .sort((a, b) => b - a)
            .slice(0, 3);

        if (scores.length === 0) return ZONE_HISTORICAL_RISK['Default'];
        return scores.reduce((s, v) => s + v, 0) / scores.length;
    }

    // ── 4. CORE SCORING FUNCTION ─────────────────────────────────────────────

    /**
     * Computes the composite city-wide risk score (0–100).
     * Returns a detailed breakdown for transparency.
     */
    function computeRiskScore(state) {
        const s = { ..._state, ...state };

        const factors = {
            timeOfDay:       calcTimeOfDayScore(),
            incidents:       calcIncidentScore(s.incidents),
            deployment:      calcDeploymentScore(s.unmannedZones, s.totalHighRiskZones),
            trafficVelocity: calcVelocityScore(s.avgTrafficVelocity, s.freeFlowVelocity),
            historicalZone:  calcHistoricalScore(s.activeZones)
        };

        const weighted = Object.keys(WEIGHTS).reduce((sum, key) => {
            return sum + (factors[key] * WEIGHTS[key]);
        }, 0);

        const score = Math.round(Math.min(100, Math.max(0, weighted)));

        return {
            score,
            factors,
            weights: WEIGHTS,
            label: getRiskLabel(score),
            trend: computeTrend(score),
            timestamp: new Date().toISOString()
        };
    }

    // ── 5. RISK LABEL & TREND ─────────────────────────────────────────────────

    function getRiskLabel(score) {
        if (score >= 80) return { text: 'Critical',  badgeClass: 'badge-critical',  color: 'var(--color-error)' };
        if (score >= 60) return { text: 'Elevated',  badgeClass: 'badge-elevated',  color: 'var(--color-on-tertiary-container)' };
        if (score >= 40) return { text: 'Watch',     badgeClass: 'badge-watch',     color: '#facc15' };
        if (score >= 20) return { text: 'Guarded',   badgeClass: 'badge-system',    color: 'var(--color-secondary)' };
        return             { text: 'Clear',     badgeClass: 'badge-success',   color: 'var(--color-secondary)' };
    }

    // Simple trend: compare to last stored score
    let _lastScore = null;
    function computeTrend(score) {
        const delta = _lastScore !== null ? score - _lastScore : 0;
        _lastScore = score;
        return {
            delta,
            direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable',
            icon: delta > 0 ? 'arrow_upward' : delta < 0 ? 'arrow_downward' : 'remove'
        };
    }

    // ── 6. ZONE-LEVEL RISK SCORING ────────────────────────────────────────────

    /**
     * Returns per-zone risk scores for the map markers and hotspot list.
     * Blends historical base with live incident pressure.
     */
    function computeZoneRiskScores(incidents) {
        return Object.entries(ZONE_HISTORICAL_RISK)
            .filter(([zone]) => zone !== 'Default')
            .map(([zone, historicalBase]) => {
                // Find active incidents in this zone
                const zoneIncidents = incidents.filter(i =>
                    i.location?.toLowerCase().includes(zone.toLowerCase()) &&
                    i.status !== 'Resolved'
                );

                // Live pressure bonus
                const livePressure = zoneIncidents.reduce((sum, inc) => {
                    return sum + (SEVERITY_WEIGHT[inc.severity] ?? 0.2) * 20;
                }, 0);

                const score = Math.min(100, Math.round(historicalBase * 0.6 + livePressure * 0.4 + calcTimeOfDayScore() * 0.1));

                return {
                    zone,
                    score,
                    label: getRiskLabel(score),
                    incidents: zoneIncidents.length
                };
            })
            .sort((a, b) => b.score - a.score);
    }

    // ── 7. HOURLY FORECAST ────────────────────────────────────────────────────

    /**
     * Generates a 6-hour forward-looking risk forecast from current hour.
     * Blends time profile with current live state dampened over time.
     */
    function forecastRisk(hoursAhead = 6, currentScore) {
        const now = new Date();
        const forecast = [];

        for (let h = 0; h < hoursAhead; h++) {
            const futureHour = (now.getHours() + h) % 24;
            const timeScore = HOURLY_RISK_PROFILE[futureHour];

            // Decay the live incident/deployment pressure over time (half-life ~3h)
            const decayFactor = Math.pow(0.75, h);
            const liveComponent = (currentScore - timeScore) * decayFactor;

            const projected = Math.round(
                Math.min(100, Math.max(0, timeScore + liveComponent * 0.3))
            );

            forecast.push({
                hour: futureHour,
                label: `${String(futureHour).padStart(2, '0')}:00`,
                score: projected,
                riskLabel: getRiskLabel(projected)
            });
        }

        return forecast;
    }

    // ── 8. STATE UPDATE API ───────────────────────────────────────────────────

    function updateState(patch) {
        _state = { ..._state, ...patch };
    }

    function getState() {
        return { ..._state };
    }

    // ── 9. PUBLIC API ─────────────────────────────────────────────────────────

    return {
        compute:            (overrides = {}) => computeRiskScore(overrides),
        computeZoneScores:  (incidents)      => computeZoneRiskScores(incidents || _state.incidents),
        forecast:           (hours)          => forecastRisk(hours, computeRiskScore().score),
        updateState,
        getState,
        getRiskLabel,
        ZONE_HISTORICAL_RISK,
        HOURLY_RISK_PROFILE
    };

})();

// Make globally accessible
window.RiskEngine = RiskEngine;
