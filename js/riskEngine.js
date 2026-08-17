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

    // ── 0. 25-JUNCTION NAGPUR DATASET ────────────────────────────────────────
    // Fields: lat, lng, name, historicalAccidents (annual), dailyTrafficVolume,
    //         lightingQuality (0=poor → 1=excellent), roadType
    const NAGPUR_JUNCTIONS = [
        { name: 'Sitabuldi Square',          lat: 21.1508, lng: 79.0826, historicalAccidents: 88,  dailyTrafficVolume: 95000, lightingQuality: 0.85, roadType: 'arterial'    },
        { name: 'Zero Mile Stone',           lat: 21.1458, lng: 79.0882, historicalAccidents: 82,  dailyTrafficVolume: 88000, lightingQuality: 0.90, roadType: 'arterial'    },
        { name: 'Variety Square',            lat: 21.1480, lng: 79.0980, historicalAccidents: 74,  dailyTrafficVolume: 82000, lightingQuality: 0.80, roadType: 'arterial'    },
        { name: 'LIC Square',                lat: 21.1550, lng: 79.0870, historicalAccidents: 61,  dailyTrafficVolume: 70000, lightingQuality: 0.75, roadType: 'arterial'    },
        { name: 'Sadar Bazar Junction',      lat: 21.1620, lng: 79.0910, historicalAccidents: 58,  dailyTrafficVolume: 65000, lightingQuality: 0.70, roadType: 'commercial'  },
        { name: 'Ajni Square',               lat: 21.1200, lng: 79.0750, historicalAccidents: 70,  dailyTrafficVolume: 78000, lightingQuality: 0.65, roadType: 'arterial'    },
        { name: 'Dharampeth Square',         lat: 21.1490, lng: 79.0670, historicalAccidents: 55,  dailyTrafficVolume: 60000, lightingQuality: 0.80, roadType: 'residential' },
        { name: 'Kamptee Road Junction',     lat: 21.1720, lng: 79.1050, historicalAccidents: 63,  dailyTrafficVolume: 72000, lightingQuality: 0.60, roadType: 'highway'     },
        { name: 'Wardha Road Airport',       lat: 21.0985, lng: 79.0472, historicalAccidents: 50,  dailyTrafficVolume: 55000, lightingQuality: 0.55, roadType: 'highway'     },
        { name: 'Central Avenue',            lat: 21.1530, lng: 79.0960, historicalAccidents: 45,  dailyTrafficVolume: 50000, lightingQuality: 0.85, roadType: 'arterial'    },
        { name: 'Hingna Road Junction',      lat: 21.1300, lng: 79.0400, historicalAccidents: 42,  dailyTrafficVolume: 48000, lightingQuality: 0.50, roadType: 'highway'     },
        { name: 'Jhansi Rani Square',        lat: 21.1380, lng: 79.0760, historicalAccidents: 60,  dailyTrafficVolume: 68000, lightingQuality: 0.70, roadType: 'arterial'    },
        { name: 'Chhatrapati Square',        lat: 21.1100, lng: 79.0650, historicalAccidents: 52,  dailyTrafficVolume: 58000, lightingQuality: 0.60, roadType: 'arterial'    },
        { name: 'Byramji Town Junction',     lat: 21.1650, lng: 79.0780, historicalAccidents: 38,  dailyTrafficVolume: 42000, lightingQuality: 0.75, roadType: 'residential' },
        { name: 'Gokulpeth Square',          lat: 21.1420, lng: 79.0600, historicalAccidents: 30,  dailyTrafficVolume: 35000, lightingQuality: 0.80, roadType: 'residential' },
        { name: 'Trimurti Nagar Junction',   lat: 21.1710, lng: 79.0650, historicalAccidents: 35,  dailyTrafficVolume: 38000, lightingQuality: 0.70, roadType: 'residential' },
        { name: 'Automotive Square',         lat: 21.1950, lng: 79.1100, historicalAccidents: 48,  dailyTrafficVolume: 52000, lightingQuality: 0.65, roadType: 'industrial'  },
        { name: 'Manewada Square',           lat: 21.1050, lng: 79.0950, historicalAccidents: 44,  dailyTrafficVolume: 49000, lightingQuality: 0.55, roadType: 'arterial'    },
        { name: 'Wadi Junction',             lat: 21.2200, lng: 79.1150, historicalAccidents: 36,  dailyTrafficVolume: 40000, lightingQuality: 0.50, roadType: 'highway'     },
        { name: 'Narendra Nagar Square',     lat: 21.1320, lng: 79.1100, historicalAccidents: 28,  dailyTrafficVolume: 32000, lightingQuality: 0.70, roadType: 'residential' },
        { name: 'Itwari Station Junction',   lat: 21.1590, lng: 79.1030, historicalAccidents: 56,  dailyTrafficVolume: 63000, lightingQuality: 0.65, roadType: 'commercial'  },
        { name: 'Congress Nagar Square',     lat: 21.1260, lng: 79.0820, historicalAccidents: 33,  dailyTrafficVolume: 37000, lightingQuality: 0.75, roadType: 'residential' },
        { name: 'Khamla Junction',           lat: 21.1380, lng: 79.0480, historicalAccidents: 40,  dailyTrafficVolume: 44000, lightingQuality: 0.60, roadType: 'arterial'    },
        { name: 'Nandanvan Square',          lat: 21.1150, lng: 79.0840, historicalAccidents: 31,  dailyTrafficVolume: 36000, lightingQuality: 0.65, roadType: 'residential' },
        { name: 'Pratap Nagar Junction',     lat: 21.1780, lng: 79.0870, historicalAccidents: 43,  dailyTrafficVolume: 47000, lightingQuality: 0.60, roadType: 'arterial'    }
    ];

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

    // ── 2b. JUNCTION-LEVEL SCORING ENGINE ───────────────────────────────────

    /**
     * Synthetic time-of-day multiplier (0.5 – 1.6)
     * Peaks: Morning 8–10 AM (1.6), Evening 18–21 (1.6), Night valley (0.5)
     */
    function getTimeFactor(hour) {
        const h = hour !== undefined ? hour : new Date().getHours();
        if (h >= 8  && h <= 10) return 1.6;  // Morning peak
        if (h >= 18 && h <= 21) return 1.6;  // Evening peak
        if (h >= 11 && h <= 14) return 1.2;  // Midday moderate
        if (h >= 6  && h <= 7)  return 1.1;  // Pre-morning ramp
        if (h >= 22 || h <= 4)  return 0.5;  // Deep night lull
        return 0.8;                           // Off-peak default
    }

    // Pre-compute max values for normalization
    const _maxAccidents = Math.max(...NAGPUR_JUNCTIONS.map(j => j.historicalAccidents));
    const _maxVolume    = Math.max(...NAGPUR_JUNCTIONS.map(j => j.dailyTrafficVolume));

    /**
     * Computes per-junction risk scores (1–10) and trends for a given hour.
     * Formula:
     *   Score = w1*AccidentNorm + w2*CongestionNorm + w3*(1-LightingNorm) + w4*TimeFactor
     *   Weights: w1=0.3, w2=0.3, w3=0.2, w4=0.2
     * Scaled to integer 1–10.
     */
    function computeJunctionScores(hour) {
        const h = hour !== undefined ? hour : new Date().getHours();
        const prevH = (h - 1 + 24) % 24;

        const w1 = 0.3, w2 = 0.3, w3 = 0.2, w4 = 0.2;
        const timeFactor = getTimeFactor(h);
        const prevTimeFactor = getTimeFactor(prevH);

        const timeNorm = (timeFactor - 0.5) / (1.6 - 0.5);
        const prevTimeNorm = (prevTimeFactor - 0.5) / (1.6 - 0.5);

        return NAGPUR_JUNCTIONS.map((j, idx) => {
            const accidentNorm   = j.historicalAccidents / _maxAccidents;
            const congestionNorm = j.dailyTrafficVolume  / _maxVolume;
            const lightingPenalty = 1 - j.lightingQuality;

            const raw = w1 * accidentNorm + w2 * congestionNorm + w3 * lightingPenalty + w4 * timeNorm;
            const prevRaw = w1 * accidentNorm + w2 * congestionNorm + w3 * lightingPenalty + w4 * prevTimeNorm;

            // Minor periodic wobble (sinusoidal offset to simulate live micro-variations)
            const wobble = Math.sin((idx + 1) * 2.5 + h) * 0.04;
            const diff = (raw + wobble) - prevRaw;

            const score = Math.min(10, Math.max(1, Math.round((raw + wobble / 2) * 9 + 1)));

            const label = score >= 8 ? { text: 'Critical', badgeClass: 'badge-critical', color: '#dc2626' }
                        : score >= 4 ? { text: 'Elevated',  badgeClass: 'badge-elevated', color: '#d97706' }
                        :              { text: 'Clear',      badgeClass: 'badge-success',  color: '#16a34a' };

            // Trend calculation
            let trend;
            if (diff > 0.03) {
                trend = { text: 'Rising', icon: 'trending_up', color: '#ef4444', deltaStr: '+Rising' };
            } else if (diff < -0.03) {
                trend = { text: 'Falling', icon: 'trending_down', color: '#22c55e', deltaStr: '-Falling' };
            } else {
                trend = { text: 'Stable', icon: 'trending_flat', color: '#9ca3af', deltaStr: 'Stable' };
            }

            return {
                ...j,
                score,
                label,
                trend,
                timeFactor,
                accidentNorm:    parseFloat(accidentNorm.toFixed(3)),
                congestionNorm:  parseFloat(congestionNorm.toFixed(3)),
                lightingPenalty: parseFloat(lightingPenalty.toFixed(3)),
                timeNorm:        parseFloat(timeNorm.toFixed(3))
            };
        });
    }

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
        compute:              (overrides = {}) => computeRiskScore(overrides),
        computeZoneScores:    (incidents)      => computeZoneRiskScores(incidents || _state.incidents),
        computeJunctionScores,
        getTimeFactor,
        forecast:             (hours)          => forecastRisk(hours, computeRiskScore().score),
        updateState,
        getState,
        getRiskLabel,
        ZONE_HISTORICAL_RISK,
        HOURLY_RISK_PROFILE,
        NAGPUR_JUNCTIONS
    };

})();

// Make globally accessible
window.RiskEngine = RiskEngine;
