# PravahAI — Algorithm & Formula Reference

A complete technical reference for every algorithm, formula, and scoring model used across the system.

---

## Table of Contents

1. [Haversine Distance](#1-haversine-distance)
2. [City-Wide Composite Risk Score](#2-city-wide-composite-risk-score)
   - 2.1 Factor 1 — Time of Day
   - 2.2 Factor 2 — Active Incidents
   - 2.3 Factor 3 — Deployment Coverage
   - 2.4 Factor 4 — Traffic Velocity
   - 2.5 Factor 5 — Historical Zone Risk
   - 2.6 Weighted Aggregation
3. [Per-Junction Risk Score (1–10)](#3-per-junction-risk-score-110)
4. [Per-Zone Risk Score (Map Markers)](#4-per-zone-risk-score-map-markers)
5. [6-Hour Risk Forecast](#5-6-hour-risk-forecast)
6. [Traffic Congestion Ratio](#6-traffic-congestion-ratio)
7. [Time-of-Day Speed Simulation (Fallback)](#7-time-of-day-speed-simulation-fallback)
8. [Backup Auto-Assignment Algorithm](#8-backup-auto-assignment-algorithm)
9. [Personnel Allocation — Three Strategies](#9-personnel-allocation--three-strategies)
   - 9.1 Strategy A — Greedy
   - 9.2 Strategy B — Optimal Bipartite Matching (scipy)
   - 9.3 Strategy C — Dynamic Priority 6.5 (default)
10. [Risk Label Thresholds](#10-risk-label-thresholds)

---

## 1. Haversine Distance

**Used in:** `backupService.js`, `allocation.py`

**Why:** Officers and incident locations are identified by GPS coordinates (latitude/longitude). Straight-line Euclidean distance is wrong on a sphere — the Haversine formula gives accurate great-circle distance on Earth's surface without needing a full mapping SDK.

**Formula:**

```
a = sin²(Δlat/2) + cos(lat1) · cos(lat2) · sin²(Δlon/2)
c = 2 · atan2(√a, √(1−a))
d = R · c
```

Where:
- `R = 6371 km` (Earth's mean radius)
- `Δlat = lat2 − lat1` (in radians)
- `Δlon = lon2 − lon1` (in radians)
- `d` = distance in kilometres

**Example (Zero Mile → Sitabuldi):**
```
lat1=21.1458, lon1=79.0882
lat2=21.1508, lon2=79.0826
→ d ≈ 0.73 km
```

**Implementation (JS):**
```js
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat/2)**2 +
              Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) *
              Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
```

---

## 2. City-Wide Composite Risk Score

**Used in:** `riskService.js` (server), `riskEngine.js` (client)  
**Output range:** 0–100  
**Refreshed:** Every API call (server) / every 5 minutes (client via cron)

The score is a **weighted linear combination** of 5 independent factors, each normalised to [0, 100] before combining. This design allows each factor to contribute proportionally and makes individual factor contributions transparent.

```
RiskScore = Σ (factor_i × weight_i)   clamped to [0, 100]
```

| Factor | Weight | Max pts | What it captures |
|---|---|---|---|
| Time of Day | 0.20 | 20 | Peak-hour baseline |
| Active Incidents | 0.25 | 25 | Live severity pressure |
| Deployment Coverage | 0.20 | 20 | Unmanned high-risk zones |
| Traffic Velocity | 0.20 | 20 | Congestion from speed data |
| Historical Zone | 0.15 | 15 | Long-term hotspot patterns |
| **Total** | **1.00** | **100** | |

Weights were chosen so that real-time signals (incidents 25% + traffic 20%) dominate over structural patterns (historical 15%), while time-of-day (20%) and deployment (20%) reflect controllable/predictable factors.

---

### 2.1 Factor 1 — Time of Day

**Formula:** Direct lookup from a handcrafted hourly profile table.

```
timeScore = HOURLY_RISK_PROFILE[currentHour]
```

The profile encodes Nagpur's observed traffic rhythm:

| Period | Hours | Score | Reason |
|---|---|---|---|
| Deep night | 00–04 | 5–10 | Near-zero traffic volume |
| Pre-peak ramp | 05–07 | 10–55 | Traffic building |
| Morning peak | 08–09 | 75–88 | School + office rush |
| Midday | 10–14 | 65–80 | Lunch + commercial activity |
| Afternoon | 15–17 | 60–82 | School dismissal + early commute |
| Evening peak | 18 | 88 | Highest observed score |
| Post-peak decay | 19–23 | 78→20 | Tapering toward night |

**Why a lookup table instead of a mathematical curve?** Nagpur traffic doesn't follow a clean sine wave — it has two distinct peaks (morning + evening) and a midday shoulder. A lookup table captures this accurately without over-engineering.

---

### 2.2 Factor 2 — Active Incidents

**Formula:**

```
incidentScore = min(100,  Σ severity_weight(i) × 33 )
                          for all non-Resolved incidents i
```

| Severity | Weight | Score per incident |
|---|---|---|
| Critical | 1.0 | 33 pts |
| Warning | 0.5 | 16.5 pts |
| Normal | 0.2 | 6.6 pts |

**Why 33?** Three Critical incidents fully saturate the factor (3 × 1.0 × 33 = 99 ≈ 100). This means a single Critical incident contributes 33 pts, a meaningful signal without overwhelming the composite score.

**Examples:**
- 1 Critical → 33 pts
- 2 Warning → 33 pts  
- 3 Critical → 99 pts (capped at 100)
- 1 Critical + 1 Warning → 49.5 pts

---

### 2.3 Factor 3 — Deployment Coverage

**Formula:**

```
deploymentScore = (unmannedHighRiskZones / totalHighRiskZones) × 100
```

**Why:** If 4 of the 6 high-risk zones have no active officer, the deployment factor is 4/6 × 100 = 67. This directly penalises coverage gaps. If all high-risk zones are staffed, the factor is 0 (no penalty).

**Example:**
- 6 high-risk zones, 0 unmanned → score = 0 (no risk from deployment)
- 6 high-risk zones, 3 unmanned → score = 50
- 6 high-risk zones, all unmanned → score = 100 (maximum deployment risk)

---

### 2.4 Factor 4 — Traffic Velocity

**Formula:**

```
velocityScore = (1 − avgVelocity / freeFlowVelocity) × 100
               clamped to [0, 100]
```

Where `freeFlowVelocity = 55 km/h` (baseline for Nagpur arterial roads at off-peak).

**Why:** Speed drop is the most direct observable proxy for congestion. At free-flow speed the factor is 0. At gridlock (near 0 km/h) it approaches 100.

**Examples:**
- 55 km/h (free flow) → (1 − 1.0) × 100 = **0** (no congestion risk)
- 32 km/h (moderate) → (1 − 0.58) × 100 = **42**
- 18 km/h (heavy)    → (1 − 0.33) × 100 = **67**
- 8 km/h (gridlock)  → (1 − 0.15) × 100 = **85**

---

### 2.5 Factor 5 — Historical Zone Risk

**Formula:**

```
historicalScore = mean( top_3_highest_risk_active_zones )
```

Each zone has a pre-assigned `historical_risk` value (0–100) derived from long-term accident data, traffic volumes, and road type. Only the top 3 worst zones are averaged to avoid the score being diluted by many low-risk zones.

**Zone historical risk values (seeded):**

| Zone | Historical Risk |
|---|---|
| Zero Mile Stone | 88 |
| Variety Square | 72 |
| Sitabuldi Junction | 64 |
| Sadar Bazar Junction | 58 |
| Wardha Road Interchange | 54 |
| Kamptee Road | 50 |
| Jhansi Rani Square | 46 |
| Sitabuldi Interchange | 42 |

**Example (top 3):**  
(88 + 72 + 64) / 3 = **74.7**

---

### 2.6 Weighted Aggregation

```
RiskScore = round(
    timeScore       × 0.20 +
    incidentScore   × 0.25 +
    deploymentScore × 0.20 +
    velocityScore   × 0.20 +
    historicalScore × 0.15
)
```

**Example calculation (evening peak, 1 Critical incident, 2 unmanned zones):**

| Factor | Raw Score | × Weight | Contribution |
|---|---|---|---|
| Time (18:00) | 88 | × 0.20 | 17.6 |
| Incidents (1 Critical) | 33 | × 0.25 | 8.25 |
| Deployment (2/6 unmanned) | 33 | × 0.20 | 6.6 |
| Velocity (28 km/h) | 49 | × 0.20 | 9.8 |
| Historical (avg top 3) | 75 | × 0.15 | 11.25 |
| **Total** | | | **53.5 → 54** |
| **Label** | | | **Watch** |

---

## 3. Per-Junction Risk Score (1–10)

**Used in:** `riskEngine.js → computeJunctionScores()`  
**Output:** Integer 1–10 per junction, plus trend (Rising / Stable / Falling)  
**Applied to:** 25 Nagpur junctions shown on the live map

**Formula:**

```
raw = 0.3 × accidentNorm
    + 0.3 × congestionNorm
    + 0.2 × lightingPenalty
    + 0.2 × timeNorm

score = round( raw × 9 + 1 )   clamped to [1, 10]
```

Where:
```
accidentNorm   = historicalAccidents / max(historicalAccidents across all junctions)
congestionNorm = dailyTrafficVolume  / max(dailyTrafficVolume across all junctions)
lightingPenalty = 1 − lightingQuality          (0=poor lighting → penalty=1, 1=excellent → penalty=0)
timeNorm       = (timeFactor − 0.5) / (1.6 − 0.5)
```

**Why these inputs?**
- `accidentNorm` — past accident count is the strongest predictor of future accidents
- `congestionNorm` — higher daily volume = higher exposure
- `lightingPenalty` — poor lighting significantly increases night-time accident rates
- `timeNorm` — amplifies or dampens based on current hour's peak multiplier

**Time factor multipliers:**

| Period | Multiplier |
|---|---|
| Morning peak 08–10 | 1.6 |
| Evening peak 18–21 | 1.6 |
| Midday 11–14 | 1.2 |
| Pre-morning 06–07 | 1.1 |
| Off-peak default | 0.8 |
| Deep night 22–04 | 0.5 |

**Sinusoidal micro-wobble (live feel):**
```
wobble = sin((junctionIndex + 1) × 2.5 + currentHour) × 0.04
```
This adds ±4% variation per junction so scores don't look frozen between refreshes.

**Trend detection:**
```
diff = currentRaw − previousHourRaw
trend = "Rising"  if diff > 0.03
trend = "Falling" if diff < −0.03
trend = "Stable"  otherwise
```

---

## 4. Per-Zone Risk Score (Map Markers)

**Used in:** `riskService.js`, `riskEngine.js → computeZoneRiskScores()`

A simpler blended score used to colour the map zone markers, combining structural and live pressure:

**Formula:**

```
zoneScore = round(
    historicalRisk × 0.60 +
    livePressure   × 0.40 +
    timeScore      × 0.10
)   clamped to [0, 100]
```

Where:
```
livePressure = Σ severity_weight(i) × 20
               for all non-Resolved incidents in that zone
```

**Why different from the city-wide score?**  
The city-wide score answers "how risky is the city right now?" — it's a macro signal. The zone score answers "which specific area is hottest on the map?" — it's a micro label. The 60/40/10 blend was chosen so that a zone's structural danger (historical) stays visible even during quiet periods, while live incidents can still push a normally-quiet zone up quickly.

**Example (Zero Mile Stone, 1 Critical incident at 18:00):**
```
historicalRisk = 88
livePressure   = 1.0 × 20 = 20
timeScore      = 88

zoneScore = round(88×0.6 + 20×0.4 + 88×0.1)
          = round(52.8 + 8.0 + 8.8)
          = round(69.6) = 70  → Elevated
```

---

## 5. 6-Hour Risk Forecast

**Used in:** `riskService.js`, `riskEngine.js → forecastRisk()`

Generates a projected score for each of the next 6 hours by blending the structural time-of-day profile with the current live state, decayed exponentially as uncertainty increases.

**Formula (for hour `h` ahead):**

```
decayFactor  = 0.75^h
liveOverhang = currentScore − timeScore(futureHour)
projected    = timeScore(futureHour) + liveOverhang × decayFactor × 0.3
```

**Why exponential decay?** Incidents get resolved, traffic clears — the current live pressure is unlikely to persist for 6 hours unchanged. `0.75^h` gives a half-life of roughly 3 hours, meaning by hour 3 only ~42% of the current live overhang remains, and by hour 6 only ~18%.

**Example (current score = 75, time base at h+3 = 60):**
```
h=0: 88 + (75−88)×1.00×0.3    = 88 − 3.9  = 84
h=1: 75 + (75−75)×0.75×0.3    = 75
h=2: 65 + (75−65)×0.5625×0.3  = 65 + 1.7  = 67
h=3: 60 + (75−60)×0.4219×0.3  = 60 + 1.9  = 62
```

The 0.3 dampening factor prevents the live overhang from dominating the forecast — future hours should trend toward the structural baseline, not stay elevated.

---

## 6. Traffic Congestion Ratio

**Used in:** `trafficService.js` (for each corridor)

When live speed data is fetched from TomTom or HERE, congestion is computed per corridor as:

**Formula:**

```
speedKmh   = distanceKm / (travelTimeHours)
congestion = round((1 − min(speedKmh, freeFlowSpeed) / freeFlowSpeed) × 100)
```

Where `freeFlowSpeed` is a per-corridor baseline from Nagpur road surveys:

| Corridor | Free-flow Speed |
|---|---|
| Zero Mile to Sitabuldi | 48 km/h |
| Wardha Road | 55 km/h |
| Kamptee Road | 52 km/h |
| Sadar to Variety Square | 40 km/h |
| Jhansi Rani to Sitabuldi | 45 km/h |

The average velocity across all corridors feeds into Factor 4 of the city-wide risk score.

---

## 7. Time-of-Day Speed Simulation (Fallback)

**Used in:** `trafficService.js → getFallbackVelocity()`  
**Triggered when:** No API key configured, or both TomTom and HERE are unreachable

**Formula:**

```
base     = HOUR_SPEED_PROFILE[currentHour]   // lookup table, km/h
jitter   = (random() − 0.5) × 6             // ±3 km/h random variance
avgSpeed = clamp(base + jitter, 8, 60)
```

Per-corridor speed:
```
corridorSpeed = clamp(avgSpeed + (random() − 0.5) × 8, 5, 60)
```

**Hourly speed profile (Nagpur arterials):**

| Hour | Speed | Period |
|---|---|---|
| 00–04 | 50–55 km/h | Clear night |
| 05 | 48 km/h | Early morning |
| 06–07 | 28–38 km/h | Pre-peak |
| 08 | 22 km/h | Peak congestion |
| 09–11 | 25–30 km/h | Post-peak recovery |
| 12 | 24 km/h | Lunch peak |
| 13–14 | 28–32 km/h | Early afternoon |
| 15–16 | 26–30 km/h | School dismissal |
| 17 | 20 km/h | Pre-evening peak |
| 18 | 18 km/h | Worst evening congestion |
| 19–21 | 24–38 km/h | Evening tapering |
| 22–23 | 44–50 km/h | Clear late night |

The ±3 km/h jitter and ±4 km/h per-corridor variance prevent the UI from appearing frozen when running on simulation data.

---

## 8. Backup Auto-Assignment Algorithm

**Used in:** `backupService.js`  
**Triggered by:** Officer tapping "Request Backup", "SOS", or "Report Incident" in the portal

### Step-by-step

**Step 1 — Fetch candidates**  
Query all `Active` or `Standby` officers excluding the requesting officer, joined with their zone's risk score from `zone_config`.

**Step 2 — Filter by zone risk (eligibility gate)**  
```
eligible = officers where zone_risk < LOW_RISK_THRESHOLD (60)
```
Officers at high-risk zones are excluded — pulling them would create a new gap at an already dangerous location. If no officer passes the threshold (all are at high-risk zones), the fallback takes the N officers with the lowest available zone risk.

**Step 3 — Compute haversine distance**  
For each eligible officer, compute distance from their zone centroid (`zone_config.lat/lng`) to the incident location.

**Step 4 — Partition by radius**  
```
within_radius  = officers where distance_km ≤ MAX_DISPATCH_RADIUS_KM (15)
outside_radius = officers where distance_km > 15
```

**Step 5 — Sort and pick**  
```
Primary sort:   distance_km ASC   (closest first)
Secondary sort: zone_risk ASC     (least critical zone first, tiebreak)

candidates = [within_radius sorted] + [outside_radius sorted]
dispatched = candidates[:count]     (count = 2 for backup, 3 for SOS/Critical)
```

**Why proximity over risk for sorting?** Response time is the primary variable in emergency dispatch. A nearby officer at a medium-risk zone (risk=55) will arrive faster and create less gap than a far officer at a low-risk zone (risk=30). The eligibility gate (step 2) already ensures the officer's original post is not critically dangerous.

**Step 6 — Persist, update, notify**  
- Insert row into `backup_requests` table
- If linked to an incident, update its status to `Dispatched`
- Broadcast `backup_auto_assigned` WebSocket event to all controller clients

---

## 9. Personnel Allocation — Three Strategies

**Used in:** `allocation.py`  
**Input:** List of officers (with lat/lon, status, max radius) + list of hotspot locations (with risk scores)  
**Output:** One-to-one officer ↔ location assignment with distance and risk metadata

All three strategies share the Haversine distance matrix as their spatial foundation.

---

### 9.1 Strategy A — Greedy

The simplest strategy. Sorts locations by risk descending, then applies the Hungarian algorithm to minimise total travel distance for those top-N locations.

**Steps:**
1. Sort locations by `risk_score` descending → take top N (N = number of available officers)
2. Build cost matrix: `cost[i][j] = haversine(officer_i, location_j)` (infeasible = 1e6 + dist if outside radius)
3. Apply `scipy.optimize.linear_sum_assignment` to get the optimal assignment

**When to use:** Fast, predictable. Good for routine daily deployment where you simply want the highest-risk zones covered and officers to travel the least.

---

### 9.2 Strategy B — Optimal Bipartite Matching (scipy)

Balances distance and risk in a single cost function controlled by the `alpha` parameter.

**Cost formula:**

```
cost(i, j) = (1 − α) × distance_km(i, j) + α × (100 − risk_score_j) / 10
```

- `α = 0` → pure distance minimisation (same as greedy without risk sorting)
- `α = 1` → pure risk maximisation (send every officer to the highest-risk location regardless of distance)
- `α = 0.2` (default) → 80% distance priority, 20% risk priority

**High-risk retention bonus:**
```
if officer_i is already assigned to location_j AND risk_score_j ≥ 70:
    cost(i, j) -= 50   // Retention bonus — strongly favours keeping them there
```

This prevents the optimiser from unnecessarily shuffling officers away from critical posts they're already manning.

**Apply Hungarian algorithm** → globally optimal assignment minimising total cost.

**When to use:** When you want fine control over the distance vs. risk trade-off, especially during resource-constrained situations where not every zone can be covered.

---

### 9.3 Strategy C — Dynamic Priority 6.5 (default)

The most sophisticated strategy, designed for real-time dynamic conditions where some officers are already posted and some zones have suddenly spiked in risk.

**Two-phase algorithm:**

**Phase 1 — Lock high-risk posts**
```
for each officer with an existing assignment:
    if assigned_location.risk_score >= HIGH_RISK_THRESHOLD (70):
        lock officer to that post → add to assignments
        mark officer and location as "taken"
```
Officers at critical posts are never reassigned mid-operation.

**Phase 2 — Dispatch free officers to uncovered locations**
```
uncovered_locations = all locations not covered by Phase 1
sort uncovered_locations by risk_score DESC   (highest risk first)
take top N locations where N = remaining available officers

build cost_matrix[K × N]:
    cost[i][j] = haversine(officer_i, location_j)   if within radius
               = 1e6 + dist                          if outside radius (infeasible)

run linear_sum_assignment(cost_matrix)
→ picks officer-location pairs that minimise total travel distance
```

**Why this is better than greedy:**  
Greedy assigns each officer independently (locally optimal). The Hungarian algorithm finds the globally optimal assignment — it prevents two officers from crossing paths (e.g., Officer A going to Location B while Officer B goes to Location A when swapping would be shorter for both).

**Example:**
```
Officer A at (21.14, 79.08)   Location 1 at (21.15, 79.09)
Officer B at (21.15, 79.09)   Location 2 at (21.14, 79.08)

Greedy might assign: A→1 (dist 1.2km), B→2 (dist 1.2km) — total 2.4km
Hungarian assigns:   A→2 (dist 0.0km), B→1 (dist 0.0km) — total 0.0km
```

---

## 10. Risk Label Thresholds

Applied consistently across city-wide score, zone scores, and junction scores:

| Score Range | Label | Colour |
|---|---|---|
| 80–100 | Critical | Red `#dc2626` |
| 60–79 | Elevated | Amber `#d97706` |
| 40–59 | Watch | Yellow `#facc15` |
| 20–39 | Guarded | Blue (secondary) |
| 0–19 | Clear | Green `#16a34a` |

For junction scores (1–10 scale):

| Score | Label |
|---|---|
| 8–10 | Critical |
| 4–7 | Elevated |
| 1–3 | Clear |

---

## Summary Table

| Algorithm | Location | Input | Output | Complexity |
|---|---|---|---|---|
| Haversine | `backupService.js`, `allocation.py` | Two lat/lon pairs | Distance km | O(1) |
| Composite Risk Score | `riskService.js`, `riskEngine.js` | 5 live factors | Score 0–100 | O(n) incidents |
| Junction Score | `riskEngine.js` | 25-junction dataset + hour | Scores 1–10 + trend | O(25) |
| Zone Score | `riskService.js`, `riskEngine.js` | Historical + incidents + time | Score 0–100 per zone | O(zones × incidents) |
| 6-Hour Forecast | `riskService.js`, `riskEngine.js` | Current score + hour profile | 6 projected scores | O(6) |
| Congestion Ratio | `trafficService.js` | Live travel time + distance | % congestion per corridor | O(corridors) |
| Speed Simulation | `trafficService.js` | Current hour | Simulated avg speed km/h | O(1) |
| Backup Assignment | `backupService.js` | Officers + incident location | Top-N officers sorted | O(n log n) |
| Greedy Allocation | `allocation.py` | Officers + locations | Assignments | O(K·N) + Hungarian |
| Bipartite Matching | `allocation.py` | Officers + locations + α | Globally optimal assignments | O(K³) Hungarian |
| Dynamic Priority 6.5 | `allocation.py` | Officers + locations (with existing posts) | Phase-1 locked + Phase-2 optimal | O(K·N) + O(K³) |
