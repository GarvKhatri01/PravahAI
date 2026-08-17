/* =============================================================
   js/risk-engine/constants.js
   ─────────────────────────────────────────────────────────────
   Centralised numeric thresholds for the risk engine.

   Keeping these here means ANY future strategy or test can
   import a single source of truth — no magic numbers scattered
   across the codebase.
   =============================================================*/

'use strict';

const RiskConstants = Object.freeze({

    /** Absolute minimum Risk Index for any area (never un-policed). */
    MIN_RISK_INDEX: 0,

    /** Absolute maximum Risk Index cap. */
    MAX_RISK_INDEX: 100,

    /**
     * CRITICAL INCIDENT FLOOR
     *
     * When a CRITICAL severity incident is approved, the resulting index
     * must be AT LEAST this value, regardless of where the area started.
     *
     * Rationale: An area sitting at index 5 (quiet overnight) that gets a
     * CRITICAL CRIMINAL_ACTIVITY report only reaches 5 + 45 = 50 via pure
     * math — not enough to trigger high-priority redeployment. This floor
     * guarantees the deployment engine classifies it as a priority zone.
     */
    MIN_CRITICAL_INDEX: 75,

    /**
     * Zones at or above this value are classified HIGH RISK by the
     * Deployment Engine. Provided here for reference; the adjustment
     * service does NOT enforce classification — that belongs upstream.
     */
    HIGH_RISK_THRESHOLD: 70,

});

/* ── Export compat ──────────────────────────────────────────── */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RiskConstants };
} else {
    window.PravahRiskEngine = window.PravahRiskEngine || {};
    window.PravahRiskEngine.RiskConstants = RiskConstants;
}
