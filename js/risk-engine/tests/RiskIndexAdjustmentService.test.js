/* =============================================================
   js/risk-engine/tests/RiskIndexAdjustmentService.test.js
   ─────────────────────────────────────────────────────────────
   Unit test suite — vanilla Node.js. No npm, no Jest, no Mocha.
   Run with:  node js/risk-engine/tests/RiskIndexAdjustmentService.test.js

   Each test calls assert.strictEqual (or a custom assertThrows).
   A summary is printed at the end: ✅ X passed / ❌ Y failed.
   Exit code 0 on all-pass, exit code 1 on any failure.
   =============================================================*/

'use strict';

const assert = require('assert');

/* ── Imports under test ─────────────────────────────────────── */
const { IncidentCategory, IncidentSeverity }   = require('../enums');
const { RiskConstants }                         = require('../constants');
const { IRiskIndexCalculator }                  = require('../IRiskIndexCalculator');
const { StandardCalculationStrategy }           = require('../strategies/StandardCalculationStrategy');
const { RiskIndexAdjustmentService }            = require('../RiskIndexAdjustmentService');

/* ── Minimal test harness ───────────────────────────────────── */
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

function assertThrows(fn, expectedMessage = null) {
    let threw = false;
    try { fn(); } catch (e) {
        threw = true;
        if (expectedMessage && !e.message.includes(expectedMessage)) {
            throw new Error(
                `Expected error containing "${expectedMessage}" but got: "${e.message}"`
            );
        }
    }
    if (!threw) throw new Error(`Expected function to throw, but it did not.`);
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 1: Enum Integrity
   ═══════════════════════════════════════════════════════════════*/
console.log('\n── Section 1: Enum Integrity ─────────────────────────');

test('IncidentCategory has all 6 required entries', () => {
    const keys = ['MAINTENANCE', 'CONGESTION', 'CROWD_CONTROL', 'SYSTEM_VIP', 'ACCIDENT', 'CRIMINAL_ACTIVITY'];
    keys.forEach(k => assert.ok(IncidentCategory[k], `Missing key: ${k}`));
});

test('IncidentSeverity has all 3 required entries', () => {
    const keys = ['NORMAL', 'WARNING', 'CRITICAL'];
    keys.forEach(k => assert.ok(IncidentSeverity[k], `Missing key: ${k}`));
});

test('All categories have integer baseImpact > 0', () => {
    Object.values(IncidentCategory).forEach(cat => {
        assert.ok(Number.isInteger(cat.baseImpact) && cat.baseImpact > 0,
            `${cat.key}.baseImpact should be a positive integer, got: ${cat.baseImpact}`);
    });
});

test('Category baseImpact ordering is correct (MAINTENANCE ≤ CONGESTION ≤ ... ≤ CRIMINAL_ACTIVITY)', () => {
    const order = ['MAINTENANCE', 'CONGESTION', 'CROWD_CONTROL', 'SYSTEM_VIP', 'ACCIDENT', 'CRIMINAL_ACTIVITY'];
    for (let i = 0; i < order.length - 1; i++) {
        const a = IncidentCategory[order[i]].baseImpact;
        const b = IncidentCategory[order[i + 1]].baseImpact;
        assert.ok(a <= b,
            `Expected ${order[i]}.baseImpact (${a}) ≤ ${order[i+1]}.baseImpact (${b})`);
    }
});

test('Severity multipliers: NORMAL(1.0) < WARNING(1.5) < CRITICAL(3.0)', () => {
    assert.strictEqual(IncidentSeverity.NORMAL.multiplier,   1.0);
    assert.strictEqual(IncidentSeverity.WARNING.multiplier,  1.5);
    assert.strictEqual(IncidentSeverity.CRITICAL.multiplier, 3.0);
});

test('Enums are frozen (immutable — deepFreeze enforced)', () => {
    // In strict mode, assigning to a frozen property throws TypeError.
    // We verify the assignment silently fails OR throws — either way the value must not change.
    const before = IncidentCategory.ACCIDENT.baseImpact;
    try { IncidentCategory.ACCIDENT.baseImpact = 999; } catch (_) { /* expected in strict mode */ }
    assert.strictEqual(IncidentCategory.ACCIDENT.baseImpact, before,
        `Expected baseImpact to remain ${before} after attempted mutation`);
});

/* ═══════════════════════════════════════════════════════════════
   SECTION 2: Constants
   ═══════════════════════════════════════════════════════════════*/
console.log('\n── Section 2: RiskConstants ──────────────────────────');

test('MIN_RISK_INDEX is 0', () => {
    assert.strictEqual(RiskConstants.MIN_RISK_INDEX, 0);
});

test('MAX_RISK_INDEX is 100', () => {
    assert.strictEqual(RiskConstants.MAX_RISK_INDEX, 100);
});

test('MIN_CRITICAL_INDEX is 75', () => {
    assert.strictEqual(RiskConstants.MIN_CRITICAL_INDEX, 75);
});

test('HIGH_RISK_THRESHOLD is below MIN_CRITICAL_INDEX (floor always triggers redeployment)', () => {
    assert.ok(RiskConstants.HIGH_RISK_THRESHOLD < RiskConstants.MIN_CRITICAL_INDEX,
        `HIGH_RISK_THRESHOLD (${RiskConstants.HIGH_RISK_THRESHOLD}) should be < MIN_CRITICAL_INDEX (${RiskConstants.MIN_CRITICAL_INDEX})`);
});

/* ═══════════════════════════════════════════════════════════════
   SECTION 3: IRiskIndexCalculator Interface
   ═══════════════════════════════════════════════════════════════*/
console.log('\n── Section 3: IRiskIndexCalculator Interface ─────────');

test('Direct instantiation of IRiskIndexCalculator throws on calculateNewIndex()', () => {
    const iface = new IRiskIndexCalculator();
    assertThrows(() => iface.calculateNewIndex(50, IncidentCategory.ACCIDENT, IncidentSeverity.NORMAL),
        'abstract');
});

test('IRiskIndexCalculator.assert() passes for a valid implementor', () => {
    const strategy = new StandardCalculationStrategy();
    assert.doesNotThrow(() => IRiskIndexCalculator.assert(strategy));
});

test('IRiskIndexCalculator.assert() throws for a non-conformant object', () => {
    assertThrows(() => IRiskIndexCalculator.assert({ notAMethod: true }), 'does not implement');
});

test('IRiskIndexCalculator.assert() throws for null', () => {
    assertThrows(() => IRiskIndexCalculator.assert(null), 'does not implement');
});

/* ═══════════════════════════════════════════════════════════════
   SECTION 4: StandardCalculationStrategy — Core Algorithm
   ═══════════════════════════════════════════════════════════════*/
console.log('\n── Section 4: StandardCalculationStrategy — Core ────');

const strategy = new StandardCalculationStrategy();

test('[NORMAL increase] Congestion + Normal on mid-tier area (current=50)', () => {
    // rawPoints = floor(7 × 1.0) = 7
    // calculated = 50 + 7 = 57
    // No CRITICAL override. Cap: min(57, 100) = 57. Floor: max(57, 0) = 57.
    const result = strategy.calculateNewIndex(50, IncidentCategory.CONGESTION, IncidentSeverity.NORMAL);
    assert.strictEqual(result, 57, `Expected 57, got ${result}`);
});

test('[NORMAL increase] Maintenance + Normal on a quiet area (current=20)', () => {
    // rawPoints = floor(5 × 1.0) = 5
    // calculated = 20 + 5 = 25
    const result = strategy.calculateNewIndex(20, IncidentCategory.MAINTENANCE, IncidentSeverity.NORMAL);
    assert.strictEqual(result, 25, `Expected 25, got ${result}`);
});

test('[WARNING increase] Accident + Warning on a moderate area (current=40)', () => {
    // rawPoints = floor(15 × 1.5) = floor(22.5) = 22
    // calculated = 40 + 22 = 62
    // No CRITICAL override (severity is WARNING). Cap: min(62, 100) = 62.
    const expected = 40 + Math.floor(IncidentCategory.ACCIDENT.baseImpact * IncidentSeverity.WARNING.multiplier);
    const result   = strategy.calculateNewIndex(40, IncidentCategory.ACCIDENT, IncidentSeverity.WARNING);
    assert.strictEqual(result, expected, `Expected ${expected}, got ${result}`);
});

test('[WARNING increase] Crowd Control + Warning (current=30)', () => {
    // rawPoints = floor(10 × 1.5) = 15
    // calculated = 30 + 15 = 45
    const result = strategy.calculateNewIndex(30, IncidentCategory.CROWD_CONTROL, IncidentSeverity.WARNING);
    assert.strictEqual(result, 45, `Expected 45, got ${result}`);
});

test('[CRITICAL increase] Congestion + Critical on a mid-tier area (current=50)', () => {
    // rawPoints = floor(7 × 3.0) = 21
    // calculated = 50 + 21 = 71
    // CRITICAL override: max(71, 75) = 75
    const result = strategy.calculateNewIndex(50, IncidentCategory.CONGESTION, IncidentSeverity.CRITICAL);
    assert.strictEqual(result, 75, `Expected 75 (CRITICAL floor applied), got ${result}`);
});

test('[CRITICAL increase] Accident + Critical already above floor (current=65)', () => {
    // rawPoints = floor(15 × 3.0) = 45
    // calculated = 65 + 45 = 110
    // CRITICAL override: max(110, 75) = 110 (already above floor)
    // Cap: min(110, 100) = 100
    const result = strategy.calculateNewIndex(65, IncidentCategory.ACCIDENT, IncidentSeverity.CRITICAL);
    assert.strictEqual(result, 100, `Expected 100 (capped), got ${result}`);
});

test('[SYSTEM_VIP + Normal] (current=35)', () => {
    // rawPoints = floor(12 × 1.0) = 12
    // calculated = 35 + 12 = 47
    const result = strategy.calculateNewIndex(35, IncidentCategory.SYSTEM_VIP, IncidentSeverity.NORMAL);
    assert.strictEqual(result, 47, `Expected 47, got ${result}`);
});

/* ═══════════════════════════════════════════════════════════════
   SECTION 5: MAX CAP Logic
   Ensures the index never exceeds 100 under any input.
   ═══════════════════════════════════════════════════════════════*/
console.log('\n── Section 5: Max Cap Logic ──────────────────────────');

test('[CAP] Accident + Critical from a high-index area (current=90) → 100', () => {
    // rawPoints = floor(15 × 3.0) = 45 → 90 + 45 = 135 → capped at 100
    const result = strategy.calculateNewIndex(90, IncidentCategory.ACCIDENT, IncidentSeverity.CRITICAL);
    assert.strictEqual(result, 100, `Expected 100, got ${result}`);
});

test('[CAP] Criminal Activity + Warning from current=95 → 100', () => {
    // rawPoints = floor(15 × 1.5) = 22 → 95 + 22 = 117 → capped at 100
    const result = strategy.calculateNewIndex(95, IncidentCategory.CRIMINAL_ACTIVITY, IncidentSeverity.WARNING);
    assert.strictEqual(result, 100, `Expected 100, got ${result}`);
});

test('[CAP] Any incident from current=100 stays at 100', () => {
    const result = strategy.calculateNewIndex(100, IncidentCategory.MAINTENANCE, IncidentSeverity.NORMAL);
    assert.strictEqual(result, 100, `Expected 100, got ${result}`);
});

test('[CAP] result is always ≤ 100 for all category × severity combinations', () => {
    for (const cat of Object.values(IncidentCategory)) {
        for (const sev of Object.values(IncidentSeverity)) {
            const result = strategy.calculateNewIndex(85, cat, sev);
            assert.ok(result <= 100,
                `${cat.key} + ${sev.key} from 85 produced ${result} — exceeds cap of 100`);
        }
    }
});

/* ═══════════════════════════════════════════════════════════════
   SECTION 6: CRITICAL EDGE CASE — The Key Requirement
   A low-index area receiving a CRITICAL incident must be elevated
   to MIN_CRITICAL_INDEX (75) regardless of pure math result.
   ═══════════════════════════════════════════════════════════════*/
console.log('\n── Section 6: CRITICAL Edge Case — Floor Elevation ──');

test('[EDGE CASE] Low area (10) + CRITICAL CRIMINAL_ACTIVITY → elevated to ≥ 75', () => {
    // rawPoints = floor(15 × 3.0) = 45 → 10 + 45 = 55
    // Pure math: 55 — NOT enough for high-priority redeployment
    // CRITICAL floor: max(55, 75) = 75
    const result = strategy.calculateNewIndex(10, IncidentCategory.CRIMINAL_ACTIVITY, IncidentSeverity.CRITICAL);
    assert.strictEqual(result, 75,
        `Expected 75 (CRITICAL floor override), pure math would give 55. Got: ${result}`);
    assert.ok(result >= RiskConstants.MIN_CRITICAL_INDEX,
        `Result ${result} must be ≥ MIN_CRITICAL_INDEX (${RiskConstants.MIN_CRITICAL_INDEX})`);
});

test('[EDGE CASE] Truly quiet area (5) + CRITICAL MAINTENANCE → still elevated to 75', () => {
    // rawPoints = floor(5 × 3.0) = 15 → 5 + 15 = 20
    // CRITICAL floor: max(20, 75) = 75
    const result = strategy.calculateNewIndex(5, IncidentCategory.MAINTENANCE, IncidentSeverity.CRITICAL);
    assert.strictEqual(result, 75, `Expected 75, got ${result}`);
});

test('[EDGE CASE] Zero-index area (0) + CRITICAL ACCIDENT → elevated to MIN_CRITICAL_INDEX', () => {
    // rawPoints = floor(15 × 3.0) = 45 → 0 + 45 = 45
    // CRITICAL floor: max(45, 75) = 75
    const result = strategy.calculateNewIndex(0, IncidentCategory.ACCIDENT, IncidentSeverity.CRITICAL);
    assert.strictEqual(result, RiskConstants.MIN_CRITICAL_INDEX, `Expected ${RiskConstants.MIN_CRITICAL_INDEX}, got ${result}`);
    assert.ok(result >= RiskConstants.MIN_CRITICAL_INDEX);
});

test('[EDGE CASE] All CRITICAL incidents produce result ≥ MIN_CRITICAL_INDEX for low-index areas', () => {
    for (const cat of Object.values(IncidentCategory)) {
        const result = strategy.calculateNewIndex(5, cat, IncidentSeverity.CRITICAL);
        assert.ok(result >= RiskConstants.MIN_CRITICAL_INDEX,
            `${cat.key} + CRITICAL from index 5 → ${result}, expected ≥ ${RiskConstants.MIN_CRITICAL_INDEX}`);
    }
});

/* ═══════════════════════════════════════════════════════════════
   SECTION 7: Input Validation & Error Handling
   ═══════════════════════════════════════════════════════════════*/
console.log('\n── Section 7: Input Validation ───────────────────────');

test('Throws TypeError for non-numeric currentIndex', () => {
    assertThrows(() => strategy.calculateNewIndex('fifty', IncidentCategory.ACCIDENT, IncidentSeverity.NORMAL),
        'currentIndex must be a finite number');
});

test('Throws TypeError for NaN currentIndex', () => {
    assertThrows(() => strategy.calculateNewIndex(NaN, IncidentCategory.ACCIDENT, IncidentSeverity.NORMAL),
        'currentIndex must be a finite number');
});

test('Throws TypeError for invalid category object', () => {
    assertThrows(() => strategy.calculateNewIndex(50, { key: 'FAKE' }, IncidentSeverity.NORMAL),
        'valid IncidentCategory');
});

test('Throws TypeError for invalid severity object', () => {
    assertThrows(() => strategy.calculateNewIndex(50, IncidentCategory.ACCIDENT, { key: 'EXTREME' }),
        'valid IncidentSeverity');
});

/* ═══════════════════════════════════════════════════════════════
   SECTION 8: RiskIndexAdjustmentService — Service Layer
   ═══════════════════════════════════════════════════════════════*/
console.log('\n── Section 8: RiskIndexAdjustmentService ─────────────');

const service = new RiskIndexAdjustmentService();

test('service.adjust() returns same result as strategy.calculateNewIndex() for same inputs', () => {
    const a = service.adjust(45, IncidentCategory.CROWD_CONTROL, IncidentSeverity.WARNING);
    const b = strategy.calculateNewIndex(45, IncidentCategory.CROWD_CONTROL, IncidentSeverity.WARNING);
    assert.strictEqual(a, b, `Service and Strategy gave different results: ${a} vs ${b}`);
});

test('service.adjust() — normal increase: Congestion + Normal (current=60) → 67', () => {
    // rawPoints = floor(7 × 1.0) = 7 → 60 + 7 = 67
    const result = service.adjust(60, IncidentCategory.CONGESTION, IncidentSeverity.NORMAL);
    assert.strictEqual(result, 67, `Expected 67, got ${result}`);
});

test('service.adjust() — max cap: Accident + Critical (current=90) → 100', () => {
    const result = service.adjust(90, IncidentCategory.ACCIDENT, IncidentSeverity.CRITICAL);
    assert.strictEqual(result, 100, `Expected 100, got ${result}`);
});

test('service.adjust() — CRITICAL edge case: (10) + Criminal Activity + CRITICAL → 75', () => {
    const result = service.adjust(10, IncidentCategory.CRIMINAL_ACTIVITY, IncidentSeverity.CRITICAL);
    assert.strictEqual(result, 75, `Expected 75, got ${result}`);
});

test('RiskIndexAdjustmentService.constants returns RiskConstants', () => {
    const c = RiskIndexAdjustmentService.constants;
    assert.strictEqual(c.MAX_RISK_INDEX,    100);
    assert.strictEqual(c.MIN_CRITICAL_INDEX, 75);
});

test('Custom strategy injection is honoured (Strategy Pattern)', () => {
    // Create a stub strategy that always returns 42
    const stubStrategy = {
        calculateNewIndex: (_ci, _cat, _sev) => 42
    };
    const serviceWithStub = new RiskIndexAdjustmentService(stubStrategy);
    const result = serviceWithStub.adjust(50, IncidentCategory.ACCIDENT, IncidentSeverity.NORMAL);
    assert.strictEqual(result, 42, `Expected stub to return 42, got ${result}`);
});

test('RiskIndexAdjustmentService throws if non-conformant strategy injected', () => {
    assertThrows(() => new RiskIndexAdjustmentService({ notAMethod: true }),
        'does not implement');
});

/* ═══════════════════════════════════════════════════════════════
   SECTION 9: Return value purity
   ═══════════════════════════════════════════════════════════════*/
console.log('\n── Section 9: Return Value Purity ────────────────────');

test('Always returns an integer (no floating point output)', () => {
    for (const cat of Object.values(IncidentCategory)) {
        for (const sev of Object.values(IncidentSeverity)) {
            const result = service.adjust(37, cat, sev);
            assert.ok(Number.isInteger(result),
                `${cat.key} + ${sev.key} → ${result} is not an integer`);
        }
    }
});

test('Result is always in range [0, 100] for all valid enum combinations', () => {
    const testIndexes = [0, 1, 10, 25, 50, 75, 99, 100];
    for (const idx of testIndexes) {
        for (const cat of Object.values(IncidentCategory)) {
            for (const sev of Object.values(IncidentSeverity)) {
                const result = service.adjust(idx, cat, sev);
                assert.ok(result >= 0 && result <= 100,
                    `adjust(${idx}, ${cat.key}, ${sev.key}) → ${result} out of [0,100]`);
            }
        }
    }
});

test('Pure function: same inputs always produce same output (idempotent)', () => {
    const args = [30, IncidentCategory.ACCIDENT, IncidentSeverity.WARNING];
    const first  = service.adjust(...args);
    const second = service.adjust(...args);
    const third  = service.adjust(...args);
    assert.strictEqual(first, second);
    assert.strictEqual(second, third);
});

/* ═══════════════════════════════════════════════════════════════
   RESULTS SUMMARY
   ═══════════════════════════════════════════════════════════════*/
const total = results.passed + results.failed;
console.log('\n══════════════════════════════════════════════════════');
console.log(`  Results: ${results.passed}/${total} tests passed`);
if (results.failed > 0) {
    console.error(`\n  Failed tests:`);
    results.errors.forEach(e => console.error(`    ✗ ${e.name}\n      ${e.message}`));
}
console.log('══════════════════════════════════════════════════════\n');

process.exit(results.failed > 0 ? 1 : 0);
