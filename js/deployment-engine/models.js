/* =============================================================
   js/deployment-engine/models.js
   ─────────────────────────────────────────────────────────────
   Domain models, validation factories, and system constants
   for the Police Deployment Engine.

   DESIGN NOTES:
   ─────────────
   • All factory functions validate on construction — fail-fast
     principle prevents malformed data flowing through the engine.
   • SystemConstants is deeply frozen so no runtime mutation
     can silently corrupt thresholds.
   • Models are plain objects (no classes) for maximum
     serializability — easy to persist to DB or send over API.
   =============================================================*/

'use strict';

/* ─────────────────────────────────────────────────────────────
   SYSTEM CONSTANTS
   ───────────────────────────────────────────────────────────── */

/**
 * @typedef {Object} SystemConstantsType
 * @property {number} MIN_OFFICERS_PER_AREA
 *   Absolute minimum officers any area can hold. No area is ever left unpoliced.
 * @property {number} MOVEMENT_THRESHOLD
 *   Minimum deviation (in index points) from average risk required to trigger
 *   officer redeployment. Prevents unnecessary daily churn in stable systems.
 * @property {number} HIGH_RISK_THRESHOLD
 *   Areas at or above this index are classified "High Need" — priority receivers.
 * @property {number} DONOR_RISK_THRESHOLD
 *   Areas at or below this index are classified "Donor" — eligible to give up
 *   surplus officers to high-need areas first.
 */
function deepFreeze(obj) {
    Object.getOwnPropertyNames(obj).forEach(name => {
        const val = obj[name];
        if (val && typeof val === 'object') deepFreeze(val);
    });
    return Object.freeze(obj);
}

const SystemConstants = deepFreeze({
    MIN_OFFICERS_PER_AREA: 2,
    MOVEMENT_THRESHOLD:   10,
    HIGH_RISK_THRESHOLD:  70,
    DONOR_RISK_THRESHOLD: 30,
});


/* ─────────────────────────────────────────────────────────────
   AREA STATE
   Input snapshot for one area at the time of deployment calc.
   ───────────────────────────────────────────────────────────── */

/**
 * @typedef {Object} AreaState
 * @property {string} areaId          - Unique identifier (any non-empty string / UUID)
 * @property {number} riskIndex       - Current risk score [0, 100]
 * @property {number} currentOfficers - Officers currently assigned (integer ≥ 0)
 */

/**
 * Factory — creates and validates an AreaState.
 *
 * @param {string} areaId
 * @param {number} riskIndex       - Must be integer [0, 100]
 * @param {number} currentOfficers - Must be non-negative integer
 * @returns {AreaState}
 * @throws {TypeError} on invalid input
 */
function createAreaState(areaId, riskIndex, currentOfficers) {
    if (!areaId || typeof areaId !== 'string' || areaId.trim() === '') {
        throw new TypeError(`[AreaState] areaId must be a non-empty string. Got: "${areaId}"`);
    }
    if (!Number.isInteger(riskIndex) || riskIndex < 0 || riskIndex > 100) {
        throw new TypeError(
            `[AreaState] riskIndex must be an integer in [0, 100]. Got: ${riskIndex}`
        );
    }
    if (!Number.isInteger(currentOfficers) || currentOfficers < 0) {
        throw new TypeError(
            `[AreaState] currentOfficers must be a non-negative integer. Got: ${currentOfficers}`
        );
    }
    return Object.freeze({ areaId: areaId.trim(), riskIndex, currentOfficers });
}


/* ─────────────────────────────────────────────────────────────
   DEPLOYMENT PLAN
   Output for one area — what the engine prescribes.
   ───────────────────────────────────────────────────────────── */

/**
 * @typedef {Object} DeploymentPlan
 * @property {string} areaId          - Matches the corresponding AreaState.areaId
 * @property {number} newOfficerCount - Officers to be stationed after redeployment
 * @property {number} delta
 *   Change in officer count: positive = officers arriving, negative = officers leaving.
 *   delta = newOfficerCount − currentOfficers.
 */

/**
 * Factory — creates and validates a DeploymentPlan.
 *
 * @param {string} areaId
 * @param {number} newOfficerCount - Must be non-negative integer
 * @param {number} delta           - Must be an integer (positive, negative, or zero)
 * @returns {DeploymentPlan}
 * @throws {TypeError} on invalid input
 */
function createDeploymentPlan(areaId, newOfficerCount, delta) {
    if (!areaId || typeof areaId !== 'string' || areaId.trim() === '') {
        throw new TypeError(`[DeploymentPlan] areaId must be a non-empty string. Got: "${areaId}"`);
    }
    if (!Number.isInteger(newOfficerCount) || newOfficerCount < 0) {
        throw new TypeError(
            `[DeploymentPlan] newOfficerCount must be a non-negative integer. Got: ${newOfficerCount}`
        );
    }
    if (!Number.isInteger(delta)) {
        throw new TypeError(`[DeploymentPlan] delta must be an integer. Got: ${delta}`);
    }
    return Object.freeze({ areaId: areaId.trim(), newOfficerCount, delta });
}


/* ── Export compat ──────────────────────────────────────────── */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SystemConstants, createAreaState, createDeploymentPlan };
} else {
    window.PravahDeploymentEngine = window.PravahDeploymentEngine || {};
    Object.assign(window.PravahDeploymentEngine, { SystemConstants, createAreaState, createDeploymentPlan });
}
