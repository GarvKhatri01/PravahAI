/* =============================================================
   js/risk-engine/IRiskIndexCalculator.js
   ─────────────────────────────────────────────────────────────
   Interface contract for any Risk Index calculation strategy.

   JavaScript has no native `interface` keyword. This module
   provides:
     1. A JSDoc typedef that IDEs (VS Code, WebStorm) enforce
        via IntelliSense type-checking.
     2. An abstract base class that throws at runtime if a
        concrete subclass fails to override `calculateNewIndex`.
     3. A static factory guard `IRiskIndexCalculator.assert()`
        that any orchestrator can use to validate that an
        injected calculator is conformant.

   The Deployment Engine will call:
       calculator.calculateNewIndex(currentIndex, category, severity)
   and receive a guaranteed integer in [0, 100].
   =============================================================*/

'use strict';

/**
 * @interface IRiskIndexCalculator
 *
 * @description
 * Contract that every Risk Index calculation strategy must honour.
 * Implementations MUST be pure — no side effects, no I/O, no database.
 *
 * @example
 * // Correct usage by an orchestrator / controller:
 * const calc = new StandardCalculationStrategy();
 * const newIndex = calc.calculateNewIndex(45, IncidentCategory.ACCIDENT, IncidentSeverity.CRITICAL);
 * // → 100 (capped)
 */
class IRiskIndexCalculator {

    /**
     * Calculate the updated Risk Index after an incident is approved.
     *
     * @param {number} currentIndex
     *   The area's current risk index. Must be an integer in [0, 100].
     *
     * @param {import('./enums').IncidentCategoryEntry} category
     *   A member of the `IncidentCategory` enum.
     *
     * @param {import('./enums').IncidentSeverityEntry} severity
     *   A member of the `IncidentSeverity` enum.
     *
     * @returns {number}
     *   New risk index — a guaranteed integer clamped to [0, 100].
     *   The caller does NOT need to clamp or validate this return value.
     *
     * @pure   — No side effects. Identical inputs always yield identical output.
     * @throws {Error} If called directly on IRiskIndexCalculator (must subclass).
     */
    calculateNewIndex(currentIndex, category, severity) {  // eslint-disable-line
        throw new Error(
            `[IRiskIndexCalculator] calculateNewIndex() is abstract. ` +
            `"${this.constructor.name}" must override it.`
        );
    }

    /**
     * Runtime conformance guard.
     *
     * Orchestrators call this in their constructor to catch mis-injections
     * early (fail-fast principle):
     *
     *   IRiskIndexCalculator.assert(myStrategy);
     *
     * @param {*} instance - The object to validate.
     * @throws {TypeError} If `instance` does not implement the interface.
     */
    static assert(instance) {
        if (!instance || typeof instance.calculateNewIndex !== 'function') {
            throw new TypeError(
                `[IRiskIndexCalculator] Provided object "${
                    instance?.constructor?.name ?? typeof instance
                }" does not implement IRiskIndexCalculator.`
            );
        }
    }
}

/* ── Export compat ──────────────────────────────────────────── */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { IRiskIndexCalculator };
} else {
    window.PravahRiskEngine = window.PravahRiskEngine || {};
    window.PravahRiskEngine.IRiskIndexCalculator = IRiskIndexCalculator;
}
