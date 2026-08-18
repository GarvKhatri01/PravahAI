/* =============================================================
   js/deployment-engine/PoliceDeploymentService.js
   ─────────────────────────────────────────────────────────────
   Public-facing service consumed by the Deploy button's controller.

   RESPONSIBILITIES (this service):
     ✔ Accept a snapshot of all area states
     ✔ Validate inputs via fail-fast factory guards
     ✔ Delegate math to an injected IDeploymentEngine strategy
     ✔ Return a List<DeploymentPlan> with guaranteed invariants

   RESPONSIBILITIES (NOT this service):
     ✗ Writing newOfficerCount to any database
     ✗ Sending movement orders/notifications to officers
     ✗ Triggering UI updates or system alerts
   → All of those belong to the calling controller/orchestrator.

   USAGE:
   ──────
       // Default (uses ProportionalDeploymentAlgorithm):
       const service = new PoliceDeploymentService();
       const plan = service.deploy(areaSnapshots);
       // → DeploymentPlan[]

       // Custom algorithm injection (testing / alternative strategies):
       const service = new PoliceDeploymentService(myCustomAlgorithm);

   OUTPUT INVARIANTS (guaranteed regardless of input):
     1. sum(plan[i].newOfficerCount) === sum(states[i].currentOfficers)
     2. plan[i].newOfficerCount >= SystemConstants.MIN_OFFICERS_PER_AREA
     3. plan[i].delta === plan[i].newOfficerCount − states[i].currentOfficers
     4. plan.length === states.length (one plan per area, same order)
   =============================================================*/

'use strict';

const { IDeploymentEngine }                         = require('./IDeploymentEngine');
const { ProportionalDeploymentAlgorithm }           = require('./algorithms/ProportionalDeploymentAlgorithm');
const { SystemConstants }                           = require('./models');

class PoliceDeploymentService {

    /**
     * @param {IDeploymentEngine} [algorithm]
     *   Calculation strategy to use. Defaults to ProportionalDeploymentAlgorithm.
     *   Inject a different algorithm for testing or future variants.
     *
     * @throws {TypeError} If algorithm does not implement IDeploymentEngine.
     */
    constructor(algorithm = new ProportionalDeploymentAlgorithm()) {
        IDeploymentEngine.assert(algorithm);
        this._algorithm = algorithm;
    }

    /**
     * Compute the optimal redeployment plan for the current area snapshot.
     *
     * This is the ONLY public API of this service.
     *
     * @param {import('./models').AreaState[]} currentStates
     *   Live snapshot of all areas. Must be a non-empty array.
     *   Each area must be created via `createAreaState()` or be a valid AreaState object.
     *
     * @param {import('./models').SystemConstantsType} [constants]
     *   Optional constant overrides. Defaults to SystemConstants.
     *   Useful for testing different threshold configurations.
     *
     * @returns {import('./models').DeploymentPlan[]}
     *   One plan per area (same order as input).
     *
     * @example
     *   // Scenario: Area 1 spikes to Critical — redeploy from quiet Area 3
     *   const states = [
     *     createAreaState('Zone-A', 90, 4),
     *     createAreaState('Zone-B', 10, 4),
     *     createAreaState('Zone-C', 70, 4),
     *   ];
     *   const plan = service.deploy(states);
     *   // Zone-B (low risk) donates officers to Zone-A (high risk)
     */
    deploy(currentStates, constants = SystemConstants) {
        return this._algorithm.calculateDeployment(currentStates, constants);
    }

    /**
     * Convenience accessor — expose SystemConstants so callers that import
     * only this service can still read thresholds without a separate import.
     *
     * @returns {typeof SystemConstants}
     */
    static get constants() {
        return SystemConstants;
    }
}


/* ── Export compat ──────────────────────────────────────────── */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PoliceDeploymentService };
} else {
    window.PravahDeploymentEngine = window.PravahDeploymentEngine || {};
    window.PravahDeploymentEngine.PoliceDeploymentService = PoliceDeploymentService;
}
