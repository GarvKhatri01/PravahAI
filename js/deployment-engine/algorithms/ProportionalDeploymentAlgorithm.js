/* =============================================================
   js/deployment-engine/algorithms/ProportionalDeploymentAlgorithm.js
   ─────────────────────────────────────────────────────────────
   Concrete implementation of IDeploymentEngine.

   ALGORITHM — 4 Phases (all pure, all stateless):
   ─────────────────────────────────────────────────
   Phase 1 ─ BASELINE
     Pre-allocate MIN_OFFICERS_PER_AREA to every area.
     This is an absolute priority guarantee — no area is ever unpoliced.

   Phase 2 ─ STABILITY CHECK
     Compute the deviation of each area's riskIndex from the system average.
     If the maximum deviation < MOVEMENT_THRESHOLD (default 10), no area has
     diverged enough to justify shuffling officers. Return current allocation.
     This prevents unnecessary churn in stable, balanced deployments.

   Phase 3 ─ PROPORTIONAL DISTRIBUTION (Largest Remainder Method)
     RemainingPool = TotalOfficers − (TotalAreas × MIN_OFFICERS_PER_AREA)
     Each area's share of RemainingPool is proportional to its riskIndex.
     To resolve the "fractional officer problem", the Largest Remainder Method
     is applied:
       a. Floor each area's fractional share to an integer.
       b. Rank areas by their fractional remainder (descending).
       c. Distribute any undistributed officers (one at a time) to the
          highest-remainder areas first.
     Result: exact integer conservation with optimal fairness.

   Phase 4 ─ DONOR ORDERING (Implicit via proportionality)
     By design, low-risk areas receive a proportionally smaller share of the
     remaining pool. Their final allocation is smaller than high-risk areas,
     so their delta is more negative — they are the natural "donors".
     The LRM does not need to explicitly select donors; the math guarantees it:
       Low riskIndex → small proportional share → more likely negative delta
       High riskIndex → large proportional share → more likely positive delta

   GUARANTEE (verified on every call):
     sum(newOfficerCount) === sum(currentOfficers)   [total force conservation]
   =============================================================*/

'use strict';

const { IDeploymentEngine }                    = require('../IDeploymentEngine');
const { SystemConstants, createDeploymentPlan } = require('../models');

class ProportionalDeploymentAlgorithm extends IDeploymentEngine {

    /**
     * @param {import('../models').AreaState[]} currentStates
     * @param {import('../models').SystemConstantsType} [constants]
     * @returns {import('../models').DeploymentPlan[]}
     */
    calculateDeployment(currentStates, constants = SystemConstants) {

        /* ── Input validation ─────────────────────────────────────── */
        if (!Array.isArray(currentStates) || currentStates.length === 0) {
            throw new TypeError(
                '[ProportionalDeploymentAlgorithm] currentStates must be a non-empty array of AreaState.'
            );
        }
        for (const s of currentStates) {
            if (!s || typeof s.areaId !== 'string' ||
                typeof s.riskIndex !== 'number' ||
                typeof s.currentOfficers !== 'number') {
                throw new TypeError(
                    `[ProportionalDeploymentAlgorithm] Invalid AreaState entry: ${JSON.stringify(s)}`
                );
            }
        }

        const { MIN_OFFICERS_PER_AREA, MOVEMENT_THRESHOLD } = constants;
        const totalOfficers  = currentStates.reduce((s, a) => s + a.currentOfficers, 0);
        const totalAreas     = currentStates.length;
        const baselineTotal  = totalAreas * MIN_OFFICERS_PER_AREA;

        /* ── Phase 1: Baseline sanity check ──────────────────────── */
        if (totalOfficers < baselineTotal) {
            throw new RangeError(
                `[ProportionalDeploymentAlgorithm] Total officers (${totalOfficers}) is less than ` +
                `the required minimum (${totalAreas} areas × ${MIN_OFFICERS_PER_AREA} = ${baselineTotal}). ` +
                `Cannot guarantee MIN_OFFICERS_PER_AREA for every area.`
            );
        }

        /* ── Phase 2: Stability check ─────────────────────────────
         *  If every area's riskIndex is within MOVEMENT_THRESHOLD of
         *  the system average, the deployment is already stable.
         *  No shuffling → no churn.
         ──────────────────────────────────────────────────────────── */
        const avgRisk = currentStates.reduce((s, a) => s + a.riskIndex, 0) / totalAreas;
        const maxDeviation = Math.max(
            ...currentStates.map(a => Math.abs(a.riskIndex - avgRisk))
        );

        if (maxDeviation < MOVEMENT_THRESHOLD) {
            // System is stable — return current allocation unchanged
            return currentStates.map(a =>
                createDeploymentPlan(a.areaId, a.currentOfficers, 0)
            );
        }

        /* ── Phase 3: Proportional distribution via LRM ───────────── */
        const remainingPool = totalOfficers - baselineTotal;
        const extras        = this._largestRemainderMethod(remainingPool, currentStates);
        const newCounts     = currentStates.map((a, i) => MIN_OFFICERS_PER_AREA + extras[i]);

        /* ── Conservation invariant (defensive check) ─────────────── */
        const newTotal = newCounts.reduce((s, c) => s + c, 0);
        if (newTotal !== totalOfficers) {
            // This should mathematically never occur; if it does, it's a bug
            throw new Error(
                `[ProportionalDeploymentAlgorithm] Conservation invariant violated: ` +
                `calculated total=${newTotal}, expected=${totalOfficers}. ` +
                `Please report this as a bug.`
            );
        }

        /* ── Build deployment plan ────────────────────────────────── */
        return currentStates.map((a, i) =>
            createDeploymentPlan(
                a.areaId,
                newCounts[i],
                newCounts[i] - a.currentOfficers   // delta
            )
        );
    }

    /* ── LARGEST REMAINDER METHOD ─────────────────────────────────
     *
     * Distributes `pool` integer officers across areas proportional
     * to each area's riskIndex, guaranteeing:
     *   1. Every result is a non-negative integer.
     *   2. The sum of all results === pool exactly.
     *   3. Each area's share is as close to the ideal fraction as possible.
     *
     * When all riskIndexes are 0 (edge case), distributes equally using
     * modulo arithmetic to handle the remainder.
     *
     * @param {number}   pool   - Integer pool to distribute
     * @param {AreaState[]} areas
     * @returns {number[]} Integer extras (parallel to areas array)
     ─────────────────────────────────────────────────────────────── */
    _largestRemainderMethod(pool, areas) {
        if (pool === 0) return areas.map(() => 0);

        const totalRisk = areas.reduce((s, a) => s + a.riskIndex, 0);

        if (totalRisk === 0) {
            // All areas have zero risk — distribute pool equally
            const base     = Math.floor(pool / areas.length);
            const leftover = pool % areas.length;
            // Give +1 to first `leftover` areas (stable — same order every call)
            return areas.map((_, i) => base + (i < leftover ? 1 : 0));
        }

        // ── Standard LRM ──
        const idealExtras  = areas.map(a => (a.riskIndex / totalRisk) * pool);
        const floored      = idealExtras.map(Math.floor);
        const remainders   = idealExtras.map((v, i) => v - floored[i]);

        let leftover = pool - floored.reduce((s, f) => s + f, 0);

        // Sort indices by remainder descending; tie-break by riskIndex descending
        // (higher-risk areas win ties — slight fairness bias toward need)
        const sortedIndices = areas
            .map((a, i) => i)
            .sort((a, b) => {
                const remDiff = remainders[b] - remainders[a];
                if (Math.abs(remDiff) > 1e-9) return remDiff;
                return areas[b].riskIndex - areas[a].riskIndex;  // tie-break
            });

        const extras = [...floored];
        for (let k = 0; k < leftover; k++) {
            extras[sortedIndices[k]]++;
        }

        return extras;
    }
}


/* ── Export compat ──────────────────────────────────────────── */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ProportionalDeploymentAlgorithm };
} else {
    window.PravahDeploymentEngine = window.PravahDeploymentEngine || {};
    window.PravahDeploymentEngine.ProportionalDeploymentAlgorithm = ProportionalDeploymentAlgorithm;
}
