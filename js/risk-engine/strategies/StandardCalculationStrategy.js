/* =============================================================
   js/risk-engine/strategies/StandardCalculationStrategy.js
   ─────────────────────────────────────────────────────────────
   The default (and currently only) concrete implementation of
   IRiskIndexCalculator.

   This is a PURE STRATEGY — it:
     ✔ Contains zero side effects
     ✔ Never reads from or writes to the DOM, database, or network
     ✔ Returns a deterministic result for any given set of inputs
     ✔ Is fully unit-testable with simple value assertions

   ALGORITHM (step-by-step):
   ─────────────────────────
   Step 1 → rawPoints   = floor(category.baseImpact × severity.multiplier)
   Step 2 → calculated  = currentIndex + rawPoints
   Step 3 → If severity is CRITICAL:
                calculated = max(calculated, MIN_CRITICAL_INDEX)
             (edge-case override — ensures low-index areas spike appropriately)
   Step 4 → result = min(calculated, MAX_RISK_INDEX)     ← hard cap at 100
   Step 5 → result = max(result,     MIN_RISK_INDEX)     ← safety floor at 0

   Future strategies (e.g. time-weighted decay, geo-radius spread) should
   live alongside this file and be injected into RiskIndexAdjustmentService
   at construction time.
   =============================================================*/

'use strict';

const { IRiskIndexCalculator } = require('../IRiskIndexCalculator');
const { RiskConstants }        = require('../constants');
const { IncidentSeverity }     = require('../enums');

const { MIN_RISK_INDEX, MAX_RISK_INDEX, MIN_CRITICAL_INDEX } = RiskConstants;

class StandardCalculationStrategy extends IRiskIndexCalculator {

    /**
     * @param {number} currentIndex - Area's current risk score [0-100]
     * @param {import('../enums').IncidentCategoryEntry} category
     * @param {import('../enums').IncidentSeverityEntry} severity
     * @returns {number} New clamped risk index [0-100]
     */
    calculateNewIndex(currentIndex, category, severity) {

        /* ── Input Validation ─────────────────────────────────────── */
        if (typeof currentIndex !== 'number' || !isFinite(currentIndex)) {
            throw new TypeError(
                `[StandardCalculationStrategy] currentIndex must be a finite number. ` +
                `Received: ${currentIndex}`
            );
        }
        if (!category || typeof category.baseImpact !== 'number') {
            throw new TypeError(
                `[StandardCalculationStrategy] category must be a valid IncidentCategory entry.`
            );
        }
        if (!severity || typeof severity.multiplier !== 'number') {
            throw new TypeError(
                `[StandardCalculationStrategy] severity must be a valid IncidentSeverity entry.`
            );
        }

        /* ── Step 1: Raw impact points ─────────────────────────────── */
        // floor() → index stays an integer at all times
        const rawPoints = Math.floor(category.baseImpact * severity.multiplier);

        /* ── Step 2: Additive increase ─────────────────────────────── */
        let calculated = currentIndex + rawPoints;

        /* ── Step 3: CRITICAL OVERRIDE (edge-case handling) ─────────── */
        // A CRITICAL incident on a quiet area (e.g. index 5) may only add
        // e.g. 15 pts → 20. That's not enough to trigger redeployment.
        // We guarantee CRITICAL incidents always push the index to at least
        // MIN_CRITICAL_INDEX (75) so the Deployment Engine registers them
        // as a priority zone.
        if (severity.key === IncidentSeverity.CRITICAL.key) {
            calculated = Math.max(calculated, MIN_CRITICAL_INDEX);
        }

        /* ── Step 4: Hard cap ─────────────────────────────────────── */
        calculated = Math.min(calculated, MAX_RISK_INDEX);

        /* ── Step 5: Safety floor ─────────────────────────────────── */
        calculated = Math.max(calculated, MIN_RISK_INDEX);

        return calculated;
    }
}

/* ── Export compat ──────────────────────────────────────────── */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StandardCalculationStrategy };
} else {
    window.PravahRiskEngine = window.PravahRiskEngine || {};
    window.PravahRiskEngine.StandardCalculationStrategy = StandardCalculationStrategy;
}
