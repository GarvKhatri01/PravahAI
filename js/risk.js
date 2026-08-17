/* ==========================================================================
   Civic Sentinel - Analytics & Charts Visuals (risk.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const chartContainer = document.querySelector('.chart-container');
    if (!chartContainer) return;

    // Seed engine with default state while API loads
    RiskEngine.updateState({
        incidents: [
            { severity: 'Critical', status: 'Logged',      location: 'Zero Mile Stone' },
            { severity: 'Critical', status: 'Dispatched',  location: 'Variety Square' },
            { severity: 'Warning',  status: 'Dispatched',  location: 'Wardha Road Interchange' },
            { severity: 'Warning',  status: 'Logged',      location: 'Sadar Bazar Junction' },
            { severity: 'Normal',   status: 'Resolved',    location: 'Sitabuldi Interchange' }
        ],
        unmannedZones: 4, totalHighRiskZones: 8,
        avgTrafficVelocity: 32, freeFlowVelocity: 55
    });

    // Initial render from local engine
    renderRiskPage(RiskEngine.compute(), RiskEngine.computeZoneScores(), RiskEngine.forecast(6));

    // Re-render when live API data arrives
    window.addEventListener('riskDataUpdated', (e) => {
        const data = e.detail;
        renderRiskPage(data, data.zoneScores, data.forecast);
    });

    // If API data is already available (page loaded after sync)
    if (window.__pravahRiskData) {
        const d = window.__pravahRiskData;
        renderRiskPage(d, d.zoneScores, d.forecast);
    }

    window.addEventListener('themechanged', (e) => adjustChartColorsForTheme(e.detail));
});

function renderRiskPage(result, zoneScores, forecast) {
    syncKpiCounters(result, zoneScores);
    animateBarCharts(forecast);
    animateLineChart(forecast);
    animateGauge();
    renderZoneRankings(zoneScores);
}

/**
 * Syncs KPI counter elements to model values.
 */
function syncKpiCounters(result, zoneScores) {
    const counters = document.querySelectorAll('[data-counter-target]');
    counters.forEach(counter => {
        const originalTarget = parseFloat(counter.getAttribute('data-counter-target'));
        let target = originalTarget;

        // Map counter targets to model values
        if (originalTarget === 64)   target = result.score;
        if (originalTarget === 4)    target = zoneScores.filter(z => z.label.text === 'Critical' || z.label.text === 'Elevated').length;
        if (originalTarget === 32)   target = RiskEngine.getState().avgTrafficVelocity;

        counter.setAttribute('data-counter-target', target);
        animateSingleCounter(counter, target);
    });

    // Also update the gauge's data-value
    const gaugeFill = document.querySelector('.gauge-fill');
    if (gaugeFill) gaugeFill.setAttribute('data-value', RiskEngine.getState().avgTrafficVelocity);

    // Update the risk badge label
    const riskBadge = document.querySelector('.kpi-card:nth-child(1) .badge');
    if (riskBadge) {
        riskBadge.className = `badge ${result.label.badgeClass}`;
        riskBadge.textContent = result.label.text + ' State';
    }
}

/**
 * Renders zone hotspot rankings driven by RiskEngine zone scores.
 */
function renderZoneRankings(zoneScores) {
    const rankingContainer = document.querySelector('.analytics-col-4 .card:last-child > div');
    if (!rankingContainer) return;

    const top5 = zoneScores.slice(0, 5);

    rankingContainer.innerHTML = top5.map((z, i) => `
        <div style="display: flex; justify-content: space-between; align-items: center;
                    padding-bottom: 8px; ${i < top5.length - 1 ? 'border-bottom: 1px solid var(--color-outline-variant);' : ''}">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: 800; color: var(--color-primary);">${i + 1}.</span>
                <span style="font-weight: 600;">${z.zone}</span>
                ${z.incidents > 0 ? `<span style="font-size:10px; color:var(--color-error);">(${z.incidents} active)</span>` : ''}
            </div>
            <span class="badge ${z.label.badgeClass}" style="font-size: 11px;">${z.score} Risk</span>
        </div>
    `).join('');
}

/**
 * Animates bar charts using model forecast data.
 */
function animateBarCharts(forecast) {
    const wrappers = document.querySelectorAll('.bar-chart-bar-wrapper');
    const bars     = document.querySelectorAll('.bar-chart-bar');

    // Update bar heights and labels from forecast
    forecast.forEach((point, i) => {
        if (bars[i]) {
            bars[i].setAttribute('data-height', point.score);
            bars[i].className = 'bar-chart-bar'; // reset

            if (point.score >= 75)      bars[i].classList.add('danger');
            else if (point.score >= 50) bars[i].classList.add('warning');

            const valueEl = bars[i].querySelector('.bar-chart-value');
            if (valueEl) valueEl.textContent = point.score;

            bars[i].style.height = '0%';
        }
        if (wrappers[i]) {
            const labelEl = wrappers[i].querySelector('.bar-chart-label');
            if (labelEl) labelEl.textContent = point.label;
        }
    });

    // Animate after brief delay
    setTimeout(() => {
        bars.forEach(bar => {
            const h = bar.getAttribute('data-height');
            bar.style.height = `${h}%`;
        });
    }, 150);
}

/**
 * Builds SVG line chart path points from forecast array.
 */
function animateLineChart(forecast) {
    const path  = document.querySelector('.chart-line');
    const area  = document.querySelector('.chart-area');
    const points = document.querySelectorAll('.chart-point');
    if (!path || !forecast || forecast.length === 0) return;

    // Map forecast scores to SVG coordinate space (viewBox: 600x280, y: 250=0 risk, 30=100 risk)
    const svgWidth  = 600;
    const svgBottom = 250;
    const svgTop    = 30;
    const xStep     = (svgWidth - 100) / (forecast.length - 1);

    const coords = forecast.map((p, i) => ({
        x: 50 + i * xStep,
        y: svgBottom - ((p.score / 100) * (svgBottom - svgTop))
    }));

    const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
    const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${svgBottom} L ${coords[0].x} ${svgBottom} Z`;

    path.setAttribute('d', linePath);
    area.setAttribute('d', areaPath);

    // Update data points
    points.forEach((pt, i) => {
        if (coords[i]) {
            pt.setAttribute('cx', coords[i].x);
            pt.setAttribute('cy', coords[i].y);
            pt.setAttribute('data-tooltip', `${forecast[i].label} — Risk ${forecast[i].score}`);
        }
    });

    // Stroke animation
    const pathLength = path.getTotalLength();
    path.style.strokeDasharray  = pathLength;
    path.style.strokeDashoffset = pathLength;

    setTimeout(() => {
        path.style.transition    = 'stroke-dashoffset 2s cubic-bezier(0.4, 0, 0.2, 1)';
        path.style.strokeDashoffset = '0';
    }, 200);

    points.forEach((point, index) => {
        point.setAttribute('r', '0');
        setTimeout(() => {
            point.style.transition = 'r 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
            point.setAttribute('r', '5');
        }, 800 + (index * 150));
    });
}

/**
 * Animate the gauge indicator values.
 */
function animateGauge() {
    const gaugeFill    = document.querySelector('.gauge-fill');
    const gaugeValueEl = document.querySelector('.gauge-value-text');
    if (!gaugeFill) return;

    const maxCircumference = 251.3;
    gaugeFill.style.strokeDasharray  = `${maxCircumference} ${maxCircumference}`;
    gaugeFill.style.strokeDashoffset = maxCircumference;

    const velocity    = RiskEngine.getState().avgTrafficVelocity;
    const maxVelocity = RiskEngine.getState().freeFlowVelocity;
    const ratio       = velocity / maxVelocity;
    const targetOffset = maxCircumference * (1 - ratio);

    // Color the gauge based on how close to free-flow
    const gaugeColor = ratio < 0.4 ? 'var(--color-error)'
                     : ratio < 0.7 ? 'var(--color-on-tertiary-container)'
                     : 'var(--color-secondary)';
    gaugeFill.setAttribute('stroke', gaugeColor);

    setTimeout(() => {
        gaugeFill.style.transition    = 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
        gaugeFill.style.strokeDashoffset = targetOffset;
    }, 300);

    if (gaugeValueEl) animateSingleCounter(gaugeValueEl, velocity, ' km/h');
}

/**
 * Generic single-element counter animation.
 */
function animateSingleCounter(el, target, suffix = '') {
    const prefix   = el.getAttribute('data-counter-prefix') || '';
    const duration = 1200;
    const steps    = 60;
    const stepTime = duration / steps;
    let current = 0;
    let count   = 0;
    const inc   = target / steps;

    const timer = setInterval(() => {
        current += inc;
        count++;
        if (count >= steps) {
            clearInterval(timer);
            el.innerHTML = `${prefix}${target}${suffix}`;
        } else {
            const formatted = Number.isInteger(target) ? Math.floor(current) : current.toFixed(1);
            el.innerHTML = `${prefix}${formatted}${suffix}`;
        }
    }, stepTime);
}

/**
 * Palette tuning for dark mode switching.
 */
function adjustChartColorsForTheme(theme) {
    const path   = document.querySelector('.chart-line');
    const points = document.querySelectorAll('.chart-point');
    if (!path) return;

    const color = theme === 'dark' ? '#38bdf8' : '#002046';
    path.style.stroke = color;
    points.forEach(p => p.style.stroke = color);
}
