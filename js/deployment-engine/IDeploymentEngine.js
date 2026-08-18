/* =============================================================
   js/deployment-engine/IDeploymentEngine.js
   ─────────────────────────────────────────────────────────────
   Interface contract for any deployment calculation strategy.

   Mirrors the pattern from IRiskIndexCalculator — provides:
     1. An abstract base class that throws at runtime if a
        subclass fails to override `calculateDeployment`.
     2. A static `assert()` factory guard for fail-fast injection
        checking in the PoliceDeploymentService constructor.

   The higher-level orchestrator/controller calls:
       engine.calculateDeployment(currentStates)
   and receives a List<DeploymentPlan>.

   The controller is then solely responsible for:
     - Writing newOfficerCount to the database
     - Triggering movement notifications to officers
     - Logging the delta for audit trails
   =============================================================*/

'use strict';

/**
 * @interface IDeploymentEngine
 *
 * @description
 * Contract that every deployment calculation algorithm must honour.
 * Implementations MUST be pure — no side effects, no I/O, no database.
 *
 * @example
 * const engine = new ProportionalDeploymentAlgorithm();
 * const plan   = engine.calculateDeployment(areaSnapshots);
 * // → DeploymentPlan[]  (one entry per area)
 */
class IDeploymentEngine {

    /**
     * Calculate the new officer allocation for every area.
     *
     * @param {import('./models').AreaState[]} currentStates
     *   Snapshot of all areas. Must be a non-empty array.
     *   The sum of currentOfficers defines the total deployable force.
     *
     * @param {import('./models').SystemConstantsType} [constants]
     *   Optional constant overrides (useful for testing).
     *   Defaults to SystemConstants.
     *
     * @returns {import('./models').DeploymentPlan[]}
     *   One DeploymentPlan per area, in the same order as `currentStates`.
     *   Guarantees:
     *     ✔  sum(newOfficerCount) === sum(currentOfficers)   [total force conservation]
     *     ✔  newOfficerCount >= MIN_OFFICERS_PER_AREA        [baseline rule]
     *     ✔  newOfficerCount is a non-negative integer       [no fractional officers]
     *
     * @pure   — No side effects. Same inputs always yield same output.
     * @throws {Error} If called directly on IDeploymentEngine (must subclass).
     * @throws {TypeError} If currentStates is not a non-empty array.
     */
    calculateDeployment(currentStates, constants) {  // eslint-disable-line
        throw new Error(
            `[IDeploymentEngine] calculateDeployment() is abstract. ` +
            `"${this.constructor.name}" must override it.`
        );
    }

    /**
     * Runtime conformance guard.
     * Call this in PoliceDeploymentService's constructor to catch mis-injections early.
     *
     *   IDeploymentEngine.assert(myAlgorithm);
     *
     * @param {*} instance
     * @throws {TypeError} If `instance` does not implement the interface.
     */
    static assert(instance) {
        if (!instance || typeof instance.calculateDeployment !== 'function') {
            throw new TypeError(
                `[IDeploymentEngine] Provided object "${
                    instance?.constructor?.name ?? typeof instance
                }" does not implement IDeploymentEngine.`
            );
        }
    }
}


/* ── Export compat ──────────────────────────────────────────── */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { IDeploymentEngine };
} else {
    window.PravahDeploymentEngine = window.PravahDeploymentEngine || {};
    window.PravahDeploymentEngine.IDeploymentEngine = IDeploymentEngine;
}
