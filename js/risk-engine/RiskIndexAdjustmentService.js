/* =============================================================
   js/risk-engine/RiskIndexAdjustmentService.js
   ─────────────────────────────────────────────────────────────
   The public-facing service consumed by controllers / orchestrators
   when an admin APPROVES an incident report.

   RESPONSIBILITIES (this service):
     ✔ Accept a validated incident (category + severity)
     ✔ Delegate the math to an injected IRiskIndexCalculator strategy
     ✔ Return the new integer index [0-100]

   RESPONSIBILITIES (NOT this service):
     ✗ Persisting the new index to any database
     ✗ Triggering police redeployment logic
     ✗ Emitting UI events or notifications
   → All of those belong to the calling orchestrator/controller.

   USAGE:
   ─────
       const service = new RiskIndexAdjustmentService();
       const newIndex = service.adjust(currentIndex, category, severity);
       // → integer [0-100]

       // With a custom strategy (e.g. for testing or future expansion):
       const service = new RiskIndexAdjustmentService(myCustomStrategy);
   =============================================================*/

'use strict';

const { IRiskIndexCalculator }       = require('./IRiskIndexCalculator');
const { StandardCalculationStrategy } = require('./strategies/StandardCalculationStrategy');
const { RiskConstants }               = require('./constants');

class RiskIndexAdjustmentService {

    /**
     * @param {IRiskIndexCalculator} [calculator]
     *   Strategy to use for the calculation.
     *   Defaults to StandardCalculationStrategy.
     *   Inject a different strategy for testing or future algorithm variants.
     */
    constructor(calculator = new StandardCalculationStrategy()) {
        // Runtime guard — fail fast if someone injects a broken strategy
        IRiskIndexCalculator.assert(calculator);
        this._calculator = calculator;
    }

    /**
     * Compute and return the new Risk Index after an incident is approved.
     *
     * This method is the ONLY public API of this service.
     * Callers receive a clean integer — nothing else.
     *
     * @param {number} currentIndex
     *   The area's current risk score. Expected range: [0, 100].
     *   Out-of-range values are accepted but will be clamped internally.
     *
     * @param {import('./enums').IncidentCategoryEntry} category
     *   A member of the `IncidentCategory` enum.
     *
     * @param {import('./enums').IncidentSeverityEntry} severity
     *   A member of the `IncidentSeverity` enum.
     *
     * @returns {number}
     *   Updated risk index — guaranteed integer in [0, 100].
     *
     * @example
     *   // Low-index area hit by a critical criminal incident
     *   service.adjust(10, IncidentCategory.CRIMINAL_ACTIVITY, IncidentSeverity.CRITICAL);
     *   // → 75  (elevated to MIN_CRITICAL_INDEX floor)
     *
     * @example
     *   // High-index area — further increase hits the cap
     *   service.adjust(90, IncidentCategory.ACCIDENT, IncidentSeverity.CRITICAL);
     *   // → 100  (capped at MAX_RISK_INDEX)
     */
    adjust(currentIndex, category, severity) {
        return this._calculator.calculateNewIndex(currentIndex, category, severity);
    }

    /**
     * Convenience: returns the RiskConstants so callers that import only
     * this service can still read thresholds without a separate import.
     *
     * @returns {typeof RiskConstants}
     */
    static get constants() {
        return RiskConstants;
    }
}

/* ── Export compat ──────────────────────────────────────────── */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RiskIndexAdjustmentService };
} else {
    window.PravahRiskEngine = window.PravahRiskEngine || {};
    window.PravahRiskEngine.RiskIndexAdjustmentService = RiskIndexAdjustmentService;
}
