/* =============================================================
   js/risk-engine/enums.js
   ─────────────────────────────────────────────────────────────
   Enum definitions for IncidentCategory and IncidentSeverity.

   Each category carries its BASE IMPACT POINTS (integer).
   Each severity carries its MULTIPLIER (float).

   These are plain frozen objects — no external library required.
   They are safe to use in both browser and Node.js environments.
   =============================================================*/

'use strict';

/**
 * Recursively freezes an object and all its nested properties.
 * Object.freeze() is shallow — this ensures nested entry objects
 * (e.g. { baseImpact: 15 }) are also truly immutable.
 *
 * @template T
 * @param {T} obj
 * @returns {Readonly<T>}
 */
function deepFreeze(obj) {
    Object.getOwnPropertyNames(obj).forEach(name => {
        const value = obj[name];
        if (value && typeof value === 'object') deepFreeze(value);
    });
    return Object.freeze(obj);
}

/**
 * @enum {IncidentCategoryEntry}
 * @typedef {{ key: string, label: string, baseImpact: number }} IncidentCategoryEntry
 *
 * baseImpact scale rationale:
 *   - MAINTENANCE       5  → Planned/predictable, low street disruption
 *   - CONGESTION        7  → Organic slowdown, no violence
 *   - CROWD_CONTROL    10  → Potential escalation, needs proactive presence
 *   - SYSTEM_VIP       12  → Protocol-driven; VIP movements carry state risk
 *   - ACCIDENT         15  → Unplanned, blocks lanes, danger to civilians
 *   - CRIMINAL_ACTIVITY 15 → Highest public-safety risk, demands immediate response
 */
const IncidentCategory = deepFreeze({
    MAINTENANCE:       { key: 'MAINTENANCE',       label: 'Maintenance',       baseImpact:  5 },
    CONGESTION:        { key: 'CONGESTION',         label: 'Congestion',        baseImpact:  7 },
    CROWD_CONTROL:     { key: 'CROWD_CONTROL',      label: 'Crowd Control',     baseImpact: 10 },
    SYSTEM_VIP:        { key: 'SYSTEM_VIP',         label: 'System / VIP',      baseImpact: 12 },
    ACCIDENT:          { key: 'ACCIDENT',           label: 'Accident',          baseImpact: 15 },
    CRIMINAL_ACTIVITY: { key: 'CRIMINAL_ACTIVITY',  label: 'Criminal Activity', baseImpact: 15 },
});

/**
 * @enum {IncidentSeverityEntry}
 * @typedef {{ key: string, label: string, multiplier: number }} IncidentSeverityEntry
 *
 * Multiplier rationale:
 *   - NORMAL   1.0 → Routine; base impact only
 *   - WARNING  1.5 → Escalating; 50% amplification
 *   - CRITICAL 3.0 → Acute; 3× amplification + guaranteed floor elevation
 */
const IncidentSeverity = deepFreeze({
    NORMAL:   { key: 'NORMAL',   label: 'Normal',   multiplier: 1.0 },
    WARNING:  { key: 'WARNING',  label: 'Warning',  multiplier: 1.5 },
    CRITICAL: { key: 'CRITICAL', label: 'Critical', multiplier: 3.0 },
});

/* ── Browser and Node.js export compat ─────────────────────── */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { IncidentCategory, IncidentSeverity };
} else {
    window.PravahRiskEngine = window.PravahRiskEngine || {};
    window.PravahRiskEngine.IncidentCategory = IncidentCategory;
    window.PravahRiskEngine.IncidentSeverity = IncidentSeverity;
}
