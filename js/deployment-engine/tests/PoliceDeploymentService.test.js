/* =============================================================
   js/deployment-engine/tests/PoliceDeploymentService.test.js
   ─────────────────────────────────────────────────────────────
   Comprehensive unit test suite — vanilla Node.js.
   No npm, no Jest, no Mocha.

   Run with:
       node js/deployment-engine/tests/PoliceDeploymentService.test.js

   Exit code 0 = all pass.  Exit code 1 = failures exist.
   =============================================================*/

'use strict';

const assert = require('assert');
const { SystemConstants, createAreaState, createDeploymentPlan }   = require('../models');
const { IDeploymentEngine }                                        = require('../IDeploymentEngine');
const { ProportionalDeploymentAlgorithm }                          = require('../algorithms/ProportionalDeploymentAlgorithm');
const { PoliceDeploymentService }                                   = require('../PoliceDeploymentService');

/* ══════════════════════════════════════════════════════════════
   Minimal test harness (no dependencies)
   ══════════════════════════════════════════════════════════════*/
const results = { passed: 0, failed: 0, errors: [] };

function test(name, fn) {
    try {
        fn();
        console.log(`  ✅  ${name}`);
        results.passed++;
    } catch (err) {
        console.error(`  ❌  ${name}`);
        console.error(`       → ${err.message}`);
        results.failed++;
        results.errors.push({ name, message: err.message });
    }
}

function assertThrows(fn, expectedMsg = null) {
    let threw = false;
    try { fn(); } catch (e) {
        threw = true;
        if (expectedMsg && !e.message.includes(expectedMsg)) {
            throw new Error(
                `Expected error containing "${expectedMsg}", got: "${e.message}"`
            );
        }
    }
    if (!threw) throw new Error('Expected function to throw, but it did not.');
}

// Helper: sum an array
const sum = arr => arr.reduce((s, v) => s + v, 0);

// Service singleton reused across tests
const service   = new PoliceDeploymentService();
const algorithm = new ProportionalDeploymentAlgorithm();


/* ══════════════════════════════════════════════════════════════
   SECTION 1: Domain Models & Factories
   ══════════════════════════════════════════════════════════════*/
console.log('\n── Section 1: Domain Models & Factories ─────────────');

test('SystemConstants has correct MIN_OFFICERS_PER_AREA = 2', () => {
    assert.strictEqual(SystemConstants.MIN_OFFICERS_PER_AREA, 2);
});

test('SystemConstants has correct MOVEMENT_THRESHOLD = 10', () => {
    assert.strictEqual(SystemConstants.MOVEMENT_THRESHOLD, 10);
});

test('SystemConstants has HIGH_RISK_THRESHOLD = 70', () => {
    assert.strictEqual(SystemConstants.HIGH_RISK_THRESHOLD, 70);
});

test('SystemConstants has DONOR_RISK_THRESHOLD = 30', () => {
    assert.strictEqual(SystemConstants.DONOR_RISK_THRESHOLD, 30);
});

test('SystemConstants is immutable (deepFreeze)', () => {
    const before = SystemConstants.MIN_OFFICERS_PER_AREA;
    try { SystemConstants.MIN_OFFICERS_PER_AREA = 999; } catch(_) {}
    assert.strictEqual(SystemConstants.MIN_OFFICERS_PER_AREA, before,
        'MIN_OFFICERS_PER_AREA must not be mutatable');
});

test('createAreaState() returns valid frozen object', () => {
    const s = createAreaState('AREA-01', 65, 5);
    assert.strictEqual(s.areaId, 'AREA-01');
    assert.strictEqual(s.riskIndex, 65);
    assert.strictEqual(s.currentOfficers, 5);
    assert.ok(Object.isFrozen(s), 'AreaState must be frozen');
});

test('createAreaState() trims whitespace from areaId', () => {
    const s = createAreaState('  AREA-02  ', 40, 3);
    assert.strictEqual(s.areaId, 'AREA-02');
});

test('createAreaState() throws for empty areaId', () => {
    assertThrows(() => createAreaState('', 50, 3), 'areaId must be a non-empty string');
});

test('createAreaState() throws for riskIndex > 100', () => {
    assertThrows(() => createAreaState('A1', 101, 3), 'riskIndex must be an integer in [0, 100]');
});

test('createAreaState() throws for riskIndex < 0', () => {
    assertThrows(() => createAreaState('A1', -1, 3), 'riskIndex must be an integer in [0, 100]');
});

test('createAreaState() throws for negative currentOfficers', () => {
    assertThrows(() => createAreaState('A1', 50, -1), 'currentOfficers must be a non-negative integer');
});

test('createAreaState() throws for float riskIndex', () => {
    assertThrows(() => createAreaState('A1', 50.5, 3), 'riskIndex must be an integer in [0, 100]');
});

test('createDeploymentPlan() returns valid frozen object with correct delta', () => {
    const p = createDeploymentPlan('AREA-01', 7, 2);
    assert.strictEqual(p.areaId, 'AREA-01');
    assert.strictEqual(p.newOfficerCount, 7);
    assert.strictEqual(p.delta, 2);
    assert.ok(Object.isFrozen(p), 'DeploymentPlan must be frozen');
});

test('createDeploymentPlan() accepts negative delta', () => {
    const p = createDeploymentPlan('AREA-02', 3, -2);
    assert.strictEqual(p.delta, -2);
});


/* ══════════════════════════════════════════════════════════════
   SECTION 2: Interface Conformance
   ══════════════════════════════════════════════════════════════*/
console.log('\n── Section 2: IDeploymentEngine Interface ────────────');

test('Direct IDeploymentEngine instantiation throws on calculateDeployment()', () => {
    const iface = new IDeploymentEngine();
    assertThrows(() => iface.calculateDeployment([]), 'abstract');
});

test('IDeploymentEngine.assert() passes for ProportionalDeploymentAlgorithm', () => {
    assert.doesNotThrow(() => IDeploymentEngine.assert(new ProportionalDeploymentAlgorithm()));
});

test('IDeploymentEngine.assert() throws for plain object without method', () => {
    assertThrows(() => IDeploymentEngine.assert({ notAMethod: true }), 'does not implement');
});

test('IDeploymentEngine.assert() throws for null', () => {
    assertThrows(() => IDeploymentEngine.assert(null), 'does not implement');
});

test('PoliceDeploymentService throws when non-conformant algorithm is injected', () => {
    assertThrows(() => new PoliceDeploymentService({}), 'does not implement');
});

test('Custom algorithm injection honoured by PoliceDeploymentService (Strategy Pattern)', () => {
    // Stub: always returns MIN for every area (trivial stable plan)
    const stub = {
        calculateDeployment: (states) => states.map(s => ({
            areaId: s.areaId, newOfficerCount: s.currentOfficers, delta: 0
        }))
    };
    const s = new PoliceDeploymentService(stub);
    const result = s.deploy([createAreaState('A', 80, 5), createAreaState('B', 20, 5)]);
    assert.strictEqual(result[0].delta, 0);
    assert.strictEqual(result[1].delta, 0);
});


/* ══════════════════════════════════════════════════════════════
   SECTION 3: Standard Proportional Redeployment
   ══════════════════════════════════════════════════════════════*/
console.log('\n── Section 3: Standard Proportional Redeployment ────');

/**
 * Test scenario:
 *   Area 1: riskIndex=60, currentOfficers=5
 *   Area 2: riskIndex=30, currentOfficers=5
 *   Area 3: riskIndex=10, currentOfficers=5
 *
 * Total=15, baseline=6 (2×3), remainingPool=9, totalRisk=100
 *   Area1 ideal extra = (60/100)*9 = 5.4 → floor=5, rem=0.4
 *   Area2 ideal extra = (30/100)*9 = 2.7 → floor=2, rem=0.7
 *   Area3 ideal extra = (10/100)*9 = 0.9 → floor=0, rem=0.9
 *   Sum floored=7, leftover=2
 *   LRM: give +1 to Area3 (rem=0.9), Area2 (rem=0.7)
 *   Area1: 2+5=7, Area2: 2+2+1=5, Area3: 2+0+1=3. Total=15 ✓
 *
 * Stability check: avgRisk=33.3, maxDev=|60-33.3|=26.7 ≥ 10 → PROCEED
 */
const standardStates = [
    createAreaState('Zone-1', 60, 5),
    createAreaState('Zone-2', 30, 5),
    createAreaState('Zone-3', 10, 5),
];

test('[STANDARD] High-risk area (60) receives more officers than low-risk (10)', () => {
    const plan = service.deploy(standardStates);
    const z1 = plan.find(p => p.areaId === 'Zone-1');
    const z3 = plan.find(p => p.areaId === 'Zone-3');
    assert.ok(z1.newOfficerCount > z3.newOfficerCount,
        `Zone-1(${z1.newOfficerCount}) should get more than Zone-3(${z3.newOfficerCount})`);
});

test('[STANDARD] Zone-1 (risk=60) gets 7 officers via LRM', () => {
    const plan = service.deploy(standardStates);
    const z1 = plan.find(p => p.areaId === 'Zone-1');
    assert.strictEqual(z1.newOfficerCount, 7, `Expected 7, got ${z1.newOfficerCount}`);
});

test('[STANDARD] Zone-2 (risk=30) gets 5 officers via LRM', () => {
    const plan = service.deploy(standardStates);
    const z2 = plan.find(p => p.areaId === 'Zone-2');
    assert.strictEqual(z2.newOfficerCount, 5, `Expected 5, got ${z2.newOfficerCount}`);
});

test('[STANDARD] Zone-3 (risk=10) gets 3 officers via LRM', () => {
    const plan = service.deploy(standardStates);
    const z3 = plan.find(p => p.areaId === 'Zone-3');
    assert.strictEqual(z3.newOfficerCount, 3, `Expected 3, got ${z3.newOfficerCount}`);
});

test('[STANDARD] delta = newOfficerCount − currentOfficers for all areas', () => {
    const plan = service.deploy(standardStates);
    plan.forEach((p, i) => {
        const expectedDelta = p.newOfficerCount - standardStates[i].currentOfficers;
        assert.strictEqual(p.delta, expectedDelta,
            `${p.areaId}: delta should be ${expectedDelta}, got ${p.delta}`);
    });
});

test('[STANDARD] Output has one plan per input area (same order)', () => {
    const plan = service.deploy(standardStates);
    assert.strictEqual(plan.length, standardStates.length);
    plan.forEach((p, i) => assert.strictEqual(p.areaId, standardStates[i].areaId));
});


/* ══════════════════════════════════════════════════════════════
   SECTION 4: Baseline Edge Case
   Area with riskIndex = 0 MUST receive MIN_OFFICERS_PER_AREA
   ══════════════════════════════════════════════════════════════*/
console.log('\n── Section 4: Baseline Edge Case (riskIndex = 0) ────');

/**
 * Test scenario:
 *   Area A: riskIndex=100, currentOfficers=6
 *   Area B: riskIndex=0,   currentOfficers=6  ← zero risk
 *   Area C: riskIndex=50,  currentOfficers=6
 *
 * Total=18, baseline=6, remainingPool=12, totalRisk=150
 *   A extra=(100/150)*12=8, B extra=(0/150)*12=0, C extra=(50/150)*12=4
 *   No LRM leftover (all exact). A:10, B:2, C:6. Total=18 ✓
 *   Area B gets MIN_OFFICERS_PER_AREA=2 even with index=0 ✓
 */
const baselineStates = [
    createAreaState('Zone-A', 100, 6),
    createAreaState('Zone-B', 0,   6),   // zero risk
    createAreaState('Zone-C', 50,  6),
];

test('[BASELINE] Area with riskIndex=0 receives MIN_OFFICERS_PER_AREA (= 2)', () => {
    const plan = service.deploy(baselineStates);
    const zB   = plan.find(p => p.areaId === 'Zone-B');
    assert.strictEqual(zB.newOfficerCount, SystemConstants.MIN_OFFICERS_PER_AREA,
        `Zone-B should get exactly ${SystemConstants.MIN_OFFICERS_PER_AREA}, got ${zB.newOfficerCount}`);
});

test('[BASELINE] Area with riskIndex=0 never receives 0 officers', () => {
    const plan = service.deploy(baselineStates);
    const zB   = plan.find(p => p.areaId === 'Zone-B');
    assert.ok(zB.newOfficerCount > 0, `Zone-B must have at least 1 officer, got ${zB.newOfficerCount}`);
});

test('[BASELINE] All areas always receive ≥ MIN_OFFICERS_PER_AREA', () => {
    const states = [
        createAreaState('Z1', 95, 8),
        createAreaState('Z2', 0,  8),
        createAreaState('Z3', 0,  8),
        createAreaState('Z4', 5,  8),
    ];
    const plan = service.deploy(states);
    plan.forEach(p => {
        assert.ok(p.newOfficerCount >= SystemConstants.MIN_OFFICERS_PER_AREA,
            `${p.areaId}: got ${p.newOfficerCount} < MIN_OFFICERS_PER_AREA`);
    });
});

test('[BASELINE] All-zero risk → equal distribution (no area favoured)', () => {
    const states = [
        createAreaState('X1', 0, 6),
        createAreaState('X2', 0, 6),
        createAreaState('X3', 0, 6),
    ];
    // maxDeviation = 0 < MOVEMENT_THRESHOLD → stability → current allocation returned
    const plan = service.deploy(states);
    plan.forEach(p => assert.strictEqual(p.delta, 0,
        `All-zero-risk system should be stable (delta=0), got delta=${p.delta} for ${p.areaId}`));
});

test('[BASELINE] Zone-A (risk=100) correctly gets 10 officers', () => {
    const plan = service.deploy(baselineStates);
    const zA   = plan.find(p => p.areaId === 'Zone-A');
    assert.strictEqual(zA.newOfficerCount, 10, `Expected 10, got ${zA.newOfficerCount}`);
});


/* ══════════════════════════════════════════════════════════════
   SECTION 5: Rounding Edge Case — Largest Remainder Method
   Total force must be EXACTLY conserved despite fractional math
   ══════════════════════════════════════════════════════════════*/
console.log('\n── Section 5: Rounding Edge Case (LRM Conservation) ─');

/**
 * Scenario designed to produce awkward fractions:
 *   Area 1: riskIndex=70, currentOfficers=3
 *   Area 2: riskIndex=20, currentOfficers=4
 *   Area 3: riskIndex=10, currentOfficers=3
 *
 * Total=10, baseline=6, remainingPool=4, totalRisk=100
 *   A1 ideal extra = (70/100)*4 = 2.8 → floor=2, rem=0.8
 *   A2 ideal extra = (20/100)*4 = 0.8 → floor=0, rem=0.8
 *   A3 ideal extra = (10/100)*4 = 0.4 → floor=0, rem=0.4
 *   Sum floored=2, leftover=2
 *   LRM: give +1 to A1(rem=0.8), A2(rem=0.8) [tie → higher riskIndex wins: A1 then A2]
 *   A1: 2+2+1=5, A2: 2+0+1=3, A3: 2+0=2. Total=10 ✓
 */
const roundingStates = [
    createAreaState('Area-1', 70, 3),
    createAreaState('Area-2', 20, 4),
    createAreaState('Area-3', 10, 3),
];

test('[ROUNDING] Total officers exactly conserved (10 → 10) after LRM', () => {
    const plan       = service.deploy(roundingStates);
    const totalBefore = sum(roundingStates.map(s => s.currentOfficers));
    const totalAfter  = sum(plan.map(p => p.newOfficerCount));
    assert.strictEqual(totalAfter, totalBefore,
        `Conservation violated: before=${totalBefore}, after=${totalAfter}`);
});

test('[ROUNDING] All newOfficerCount values are integers (no fractions)', () => {
    const plan = service.deploy(roundingStates);
    plan.forEach(p => {
        assert.ok(Number.isInteger(p.newOfficerCount),
            `${p.areaId}.newOfficerCount = ${p.newOfficerCount} is not an integer`);
    });
});

test('[ROUNDING] Area-1 (risk=70) gets 5 officers (LRM gives +1 for highest remainder)', () => {
    const plan  = service.deploy(roundingStates);
    const area1 = plan.find(p => p.areaId === 'Area-1');
    assert.strictEqual(area1.newOfficerCount, 5, `Expected 5, got ${area1.newOfficerCount}`);
});

test('[ROUNDING] Area-2 (risk=20) gets 3 officers (LRM gives +1 for tied second-highest remainder)', () => {
    const plan  = service.deploy(roundingStates);
    const area2 = plan.find(p => p.areaId === 'Area-2');
    assert.strictEqual(area2.newOfficerCount, 3, `Expected 3, got ${area2.newOfficerCount}`);
});

test('[ROUNDING] Area-3 (risk=10) gets 2 officers (= MIN, LRM gives +0)', () => {
    const plan  = service.deploy(roundingStates);
    const area3 = plan.find(p => p.areaId === 'Area-3');
    assert.strictEqual(area3.newOfficerCount, 2, `Expected 2, got ${area3.newOfficerCount}`);
});

test('[ROUNDING] sum(deltas) === 0 — total movement is zero-sum', () => {
    const plan      = service.deploy(roundingStates);
    const deltaSum  = sum(plan.map(p => p.delta));
    assert.strictEqual(deltaSum, 0,
        `sum of deltas must be 0 (zero-sum system), got ${deltaSum}`);
});

test('[ROUNDING] Conservation holds for 5 areas with messy fractions', () => {
    const messy = [
        createAreaState('M1', 13, 5),
        createAreaState('M2', 27, 5),
        createAreaState('M3', 41, 5),
        createAreaState('M4', 7,  5),
        createAreaState('M5', 60, 5),
    ];
    const totalBefore = sum(messy.map(s => s.currentOfficers));
    const plan        = service.deploy(messy);
    const totalAfter  = sum(plan.map(p => p.newOfficerCount));
    assert.strictEqual(totalAfter, totalBefore,
        `Conservation violated: before=${totalBefore}, after=${totalAfter}`);
});

test('[ROUNDING] Conservation holds for arbitrary total officer counts', () => {
    const testCases = [
        [7, 3, 4],    // 7 officers, 3 areas
        [10, 2, 5],   // 10 officers, 2 areas
        [23, 4, 3],   // 23 officers, 4 areas
    ];
    testCases.forEach(([total, numAreas, baseRisk]) => {
        const perArea = Math.floor(total / numAreas);
        // Pad last area to make total exact
        const states = Array.from({ length: numAreas }, (_, i) => {
            const officers = i === numAreas - 1
                ? total - perArea * (numAreas - 1)
                : perArea;
            return createAreaState(`T${i}`, (baseRisk + i * 20) % 101, officers);
        });
        const plan       = service.deploy(states);
        const totalAfter = sum(plan.map(p => p.newOfficerCount));
        assert.strictEqual(totalAfter, total,
            `total=${total}, areas=${numAreas}: conservation violated (got ${totalAfter})`);
    });
});


/* ══════════════════════════════════════════════════════════════
   SECTION 6: Donor Extraction
   Area A (risk=90) pulls from Area B (risk=10), NOT from Area C (risk=70)
   ══════════════════════════════════════════════════════════════*/
console.log('\n── Section 6: Donor Extraction ───────────────────────');

/**
 * The KEY invariant this section proves:
 * Officers always flow FROM lowest-risk areas TO highest-risk areas.
 *
 * Scenario:
 *   Zone-A: riskIndex=90, currentOfficers=4  ← spike
 *   Zone-B: riskIndex=10, currentOfficers=4  ← expected donor
 *   Zone-C: riskIndex=70, currentOfficers=4  ← should NOT donate
 *
 * Total=12, baseline=6, remainingPool=6, totalRisk=170
 *   A ideal extra=(90/170)*6=3.176 → floor=3, rem=0.176
 *   B ideal extra=(10/170)*6=0.353 → floor=0, rem=0.353
 *   C ideal extra=(70/170)*6=2.471 → floor=2, rem=0.471
 *   Sum floored=5, leftover=1
 *   LRM: give +1 to C (rem=0.471, highest)
 *   A: 2+3=5(+1), B: 2+0=2(-2), C: 2+2+1=5(+1). Total=12 ✓
 *
 * Zone-B DONATES (-2). Zone-C RECEIVES (+1). ✓
 */
const donorStates = [
    createAreaState('Zone-A', 90, 4),   // critical spike
    createAreaState('Zone-B', 10, 4),   // low risk — DONOR
    createAreaState('Zone-C', 70, 4),   // high risk — NOT a donor
];

test('[DONOR] Zone-A (risk=90) gains officers after spike', () => {
    const plan = service.deploy(donorStates);
    const zA   = plan.find(p => p.areaId === 'Zone-A');
    assert.ok(zA.delta > 0, `Zone-A should gain officers (delta>0), got delta=${zA.delta}`);
});

test('[DONOR] Zone-B (risk=10) donates officers (negative delta)', () => {
    const plan = service.deploy(donorStates);
    const zB   = plan.find(p => p.areaId === 'Zone-B');
    assert.ok(zB.delta < 0,
        `Zone-B (low risk) should donate officers (delta<0), got delta=${zB.delta}`);
});

test('[DONOR] Zone-C (risk=70) does NOT donate — it receives officers', () => {
    const plan = service.deploy(donorStates);
    const zC   = plan.find(p => p.areaId === 'Zone-C');
    assert.ok(zC.delta >= 0,
        `Zone-C (high risk=70) should not donate (delta≥0), got delta=${zC.delta}`);
});

test('[DONOR] Magnitude: Zone-B donates exactly 2 officers', () => {
    const plan = service.deploy(donorStates);
    const zB   = plan.find(p => p.areaId === 'Zone-B');
    assert.strictEqual(zB.delta, -2, `Expected delta=-2, got ${zB.delta}`);
});

test('[DONOR] Zone-B ends at MIN_OFFICERS_PER_AREA (cannot go lower)', () => {
    const plan = service.deploy(donorStates);
    const zB   = plan.find(p => p.areaId === 'Zone-B');
    assert.strictEqual(zB.newOfficerCount, SystemConstants.MIN_OFFICERS_PER_AREA,
        `Zone-B should be at floor (${SystemConstants.MIN_OFFICERS_PER_AREA}), got ${zB.newOfficerCount}`);
});

test('[DONOR] Ordering invariant: lowest-risk area always has the most-negative delta', () => {
    const plan     = service.deploy(donorStates);
    const sorted   = [...donorStates].sort((a, b) => a.riskIndex - b.riskIndex);
    const lowestId = sorted[0].areaId;  // Zone-B (risk=10)
    const lowestPlan = plan.find(p => p.areaId === lowestId);
    const otherDeltas = plan.filter(p => p.areaId !== lowestId).map(p => p.delta);
    otherDeltas.forEach(d => {
        assert.ok(lowestPlan.delta <= d,
            `Lowest-risk area delta (${lowestPlan.delta}) should be ≤ all others, found ${d}`);
    });
});

test('[DONOR] Extended: with 4 areas, 2 low-risk donors pull before 1 medium-risk area', () => {
    const states = [
        createAreaState('High',   90, 3),
        createAreaState('Low-1',  10, 5),
        createAreaState('Low-2',  15, 5),
        createAreaState('Medium', 55, 5),
    ];
    // Total=18, baseline=8, remaining=10, totalRisk=170
    const plan = service.deploy(states);
    const high    = plan.find(p => p.areaId === 'High');
    const low1    = plan.find(p => p.areaId === 'Low-1');
    const low2    = plan.find(p => p.areaId === 'Low-2');
    const medium  = plan.find(p => p.areaId === 'Medium');

    // High-risk receives
    assert.ok(high.delta > 0, `High-risk area should receive officers, got delta=${high.delta}`);
    // Low-risk areas donate more than medium
    assert.ok(low1.delta <= medium.delta,
        `Low-1 delta (${low1.delta}) should be ≤ Medium delta (${medium.delta})`);
    assert.ok(low2.delta <= medium.delta,
        `Low-2 delta (${low2.delta}) should be ≤ Medium delta (${medium.delta})`);
});


/* ══════════════════════════════════════════════════════════════
   SECTION 7: Stability Threshold
   No movement when risk distribution is balanced
   ══════════════════════════════════════════════════════════════*/
console.log('\n── Section 7: Stability Threshold ────────────────────');

test('[STABILITY] Equal-risk areas → all deltas = 0 (no churn)', () => {
    const states = [
        createAreaState('S1', 50, 6),
        createAreaState('S2', 50, 6),
        createAreaState('S3', 50, 6),
    ];
    const plan = service.deploy(states);
    plan.forEach(p => assert.strictEqual(p.delta, 0,
        `Balanced areas should have delta=0, ${p.areaId} got ${p.delta}`));
});

test('[STABILITY] Near-equal risks (within MOVEMENT_THRESHOLD) → no movement', () => {
    const states = [
        createAreaState('N1', 40, 5),
        createAreaState('N2', 45, 5),
        createAreaState('N3', 42, 5),
    ];
    // avgRisk=42.3, maxDeviation=2.7 < 10 → stable
    const plan = service.deploy(states);
    plan.forEach(p => assert.strictEqual(p.delta, 0,
        `Near-equal areas (maxDev<10) should have delta=0, ${p.areaId} got ${p.delta}`));
});

test('[STABILITY] Exactly MOVEMENT_THRESHOLD deviation triggers redeployment', () => {
    // avg = 50, one area at 50+10=60 → deviation = 10 >= MOVEMENT_THRESHOLD
    const states = [
        createAreaState('T1', 60, 5),
        createAreaState('T2', 50, 5),
        createAreaState('T3', 40, 5),
    ];
    // avgRisk=50, maxDeviation=10 ≥ MOVEMENT_THRESHOLD=10 → PROCEED
    const plan  = service.deploy(states);
    const total = sum(plan.map(p => p.newOfficerCount));
    assert.strictEqual(total, 15, 'Total must be conserved');
    // At least one delta should be non-zero
    const anyMovement = plan.some(p => p.delta !== 0);
    assert.ok(anyMovement, 'Deviation at threshold should trigger movement');
});

test('[STABILITY] Custom MOVEMENT_THRESHOLD respected when overriding constants', () => {
    const states = [
        createAreaState('C1', 30, 5),
        createAreaState('C2', 70, 5),  // deviation from avg(50) = 20
    ];
    // With MOVEMENT_THRESHOLD=25, deviation=20 < 25 → stable (no movement)
    const strictConstants = { ...SystemConstants, MOVEMENT_THRESHOLD: 25 };
    const plan = algorithm.calculateDeployment(states, strictConstants);
    plan.forEach(p => assert.strictEqual(p.delta, 0,
        `With threshold=25, deviation=20 should be stable. ${p.areaId} got delta=${p.delta}`));
});


/* ══════════════════════════════════════════════════════════════
   SECTION 8: Input Validation & Error Handling
   ══════════════════════════════════════════════════════════════*/
console.log('\n── Section 8: Input Validation & Error Handling ──────');

test('deploy() throws for empty array', () => {
    assertThrows(() => service.deploy([]), 'non-empty array');
});

test('deploy() throws for non-array input', () => {
    assertThrows(() => service.deploy(null), 'non-empty array');
});

test('deploy() throws when total officers < required baseline', () => {
    // 2 areas need 2*2=4 officers minimum, but only 3 provided
    const states = [
        createAreaState('A1', 50, 2),
        createAreaState('A2', 50, 1),   // total=3 < baseline=4
    ];
    assertThrows(() => service.deploy(states), 'less than the required minimum');
});

test('deploy() throws for malformed area in array', () => {
    assertThrows(
        () => algorithm.calculateDeployment([{ areaId: 'X', riskIndex: 'bad' }]),
        'Invalid AreaState'
    );
});

test('createAreaState() throws for non-integer currentOfficers (float)', () => {
    assertThrows(() => createAreaState('A', 50, 3.5), 'non-negative integer');
});


/* ══════════════════════════════════════════════════════════════
   SECTION 9: Output Invariants — Comprehensive Coverage
   These are the FOUR guaranteed contracts of the engine.
   ══════════════════════════════════════════════════════════════*/
console.log('\n── Section 9: Output Invariants (All Combinations) ───');

const invariantTestCases = [
    {
        label: '3 areas, diverse risk',
        states: [createAreaState('A', 80, 5), createAreaState('B', 20, 5), createAreaState('C', 50, 5)]
    },
    {
        label: '2 areas, extreme contrast',
        states: [createAreaState('X', 100, 10), createAreaState('Y', 0, 10)]
    },
    {
        label: '5 areas, single spike',
        states: [
            createAreaState('P1', 90, 4), createAreaState('P2', 10, 4),
            createAreaState('P3', 15, 4), createAreaState('P4', 20, 4),
            createAreaState('P5', 12, 4),
        ]
    },
    {
        label: '4 areas, two equal highs',
        states: [
            createAreaState('Q1', 80, 6), createAreaState('Q2', 80, 6),
            createAreaState('Q3', 10, 6), createAreaState('Q4', 10, 6),
        ]
    },
];

invariantTestCases.forEach(({ label, states }) => {
    const totalOfficers = sum(states.map(s => s.currentOfficers));

    test(`[INVARIANT 1] Total force conserved — ${label}`, () => {
        const plan = service.deploy(states);
        const after = sum(plan.map(p => p.newOfficerCount));
        assert.strictEqual(after, totalOfficers,
            `Conservation violated: before=${totalOfficers}, after=${after}`);
    });

    test(`[INVARIANT 2] All areas ≥ MIN_OFFICERS_PER_AREA — ${label}`, () => {
        const plan = service.deploy(states);
        plan.forEach(p => assert.ok(
            p.newOfficerCount >= SystemConstants.MIN_OFFICERS_PER_AREA,
            `${p.areaId}: ${p.newOfficerCount} < ${SystemConstants.MIN_OFFICERS_PER_AREA}`
        ));
    });

    test(`[INVARIANT 3] All newOfficerCounts are integers — ${label}`, () => {
        const plan = service.deploy(states);
        plan.forEach(p => assert.ok(Number.isInteger(p.newOfficerCount),
            `${p.areaId}.newOfficerCount=${p.newOfficerCount} is not an integer`));
    });

    test(`[INVARIANT 4] plan.length === states.length, same order — ${label}`, () => {
        const plan = service.deploy(states);
        assert.strictEqual(plan.length, states.length);
        plan.forEach((p, i) => assert.strictEqual(p.areaId, states[i].areaId,
            `Order mismatch at index ${i}: expected ${states[i].areaId}, got ${p.areaId}`));
    });
});

test('[INVARIANT] Pure function: identical inputs always produce identical outputs', () => {
    const states = [
        createAreaState('F1', 75, 5),
        createAreaState('F2', 25, 5),
    ];
    const plan1 = service.deploy(states);
    const plan2 = service.deploy(states);
    plan1.forEach((p, i) => {
        assert.strictEqual(p.newOfficerCount, plan2[i].newOfficerCount,
            `Non-deterministic output for ${p.areaId}`);
        assert.strictEqual(p.delta, plan2[i].delta);
    });
});

test('[INVARIANT] PoliceDeploymentService.constants returns SystemConstants', () => {
    assert.strictEqual(PoliceDeploymentService.constants.MIN_OFFICERS_PER_AREA, 2);
    assert.strictEqual(PoliceDeploymentService.constants.MOVEMENT_THRESHOLD, 10);
});


/* ══════════════════════════════════════════════════════════════
   RESULTS SUMMARY
   ══════════════════════════════════════════════════════════════*/
const total = results.passed + results.failed;
console.log('\n══════════════════════════════════════════════════════');
console.log(`  Results: ${results.passed}/${total} tests passed`);
if (results.failed > 0) {
    console.error(`\n  Failed tests:`);
    results.errors.forEach(e => console.error(`    ✗ ${e.name}\n      ${e.message}`));
    console.log();
}
console.log('══════════════════════════════════════════════════════\n');

process.exit(results.failed > 0 ? 1 : 0);
