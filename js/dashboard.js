/* ==========================================================================
   Civic Sentinel - Live Map & Dashboard Operations (dashboard.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Check if we are on the dashboard index page
    if (!document.getElementById('map-viewport')) return;

    // NOTE: RiskEngine local seed is minimal — actual values are overwritten immediately
    // by syncRiskEngineFromAPI() in main.js which fires on DOMContentLoaded.
    RiskEngine.updateState({
        incidents:           [],
        officersOnDuty:      0,
        totalOfficers:       0,
        unmannedZones:       0,
        totalHighRiskZones:  8,
        avgTrafficVelocity:  0,
        freeFlowVelocity:    55
    });

    // Strict Nagpur Geographical Bounding Box
    const NAGPUR_BOUNDS = [
        [20.95, 78.90], // South-West (Wardha Rd / Airport approach outer border)
        [21.30, 79.30]  // North-East (Kamptee / Kanhan approach outer border)
    ];

    // Initialize Leaflet Map strictly locked to Nagpur
    const map = L.map('map-viewport', {
        zoomControl: false,
        attributionControl: false,
        minZoom: 11,
        maxZoom: 18,
        maxBounds: NAGPUR_BOUNDS,
        maxBoundsViscosity: 1.0
    }).setView([21.1458, 79.0882], 12.5);

    window.map = map;

    // Dark/Light tile layers constrained to Nagpur bounds
    const tileLayers = {
        dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 18,
            minZoom: 11,
            bounds: NAGPUR_BOUNDS,
            subdomains: 'abcd'
        }),
        light: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 18,
            minZoom: 11,
            bounds: NAGPUR_BOUNDS,
            subdomains: 'abcd'
        })
    };

    // Set initial theme layer synced with DOM data-theme attribute
    const currentTheme = document.documentElement.getAttribute('data-theme') || localStorage.getItem('theme') || 'light';
    if (tileLayers[currentTheme]) {
        tileLayers[currentTheme].addTo(map);
    } else {
        tileLayers.light.addTo(map);
    }

    // Listen to theme changes to dynamically swap tiles
    window.addEventListener('themechanged', (e) => {
        const theme = e.detail;
        if (map.hasLayer(tileLayers.dark)) map.removeLayer(tileLayers.dark);
        if (map.hasLayer(tileLayers.light)) map.removeLayer(tileLayers.light);
        if (tileLayers[theme]) {
            tileLayers[theme].addTo(map);
        }
    });

    // Add zoom control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const markersGroup  = L.layerGroup().addTo(map);
    const corridorsGroup = L.layerGroup().addTo(map);
    const junctionGroup  = L.layerGroup().addTo(map); // L.circleMarker per junction
    const heatmapGroup   = L.layerGroup();            // leaflet.heat layer — toggled via toolbar

    // ── JUNCTION RISK ENGINE INTEGRATION ─────────────────────────────────────

    let _activeHeatLayer = null;
    let _currentHour     = new Date().getHours();

    /**
     * Renders 25 Nagpur junctions as L.circleMarkers.
     * Color & radius adapt to the 1–10 junction risk score.
     * Green (1-3), Yellow/Orange (4-7), Red (8-10).
     */
    function renderJunctionMarkers(hour) {
        junctionGroup.clearLayers();

        const scores = RiskEngine.computeJunctionScores(hour);

        scores.forEach(j => {
            // Severity color + radius
            let color, radius;
            if (j.score >= 8)       { color = '#dc2626'; radius = 14; }  // Critical — Red
            else if (j.score >= 4)  { color = '#f59e0b'; radius = 10; }  // Elevated — Yellow/Amber
            else                    { color = '#22c55e'; radius = 7;  }  // Clear — Green

            const circle = L.circleMarker([j.lat, j.lng], {
                radius,
                fillColor:   color,
                color:       '#fff',
                weight:      1.5,
                opacity:     1,
                fillOpacity: 0.82
            });

            // Rich popup — score breakdown
            const timeSuffix = hour !== undefined ? `${String(hour).padStart(2,'0')}:00` : 'Now';
            const peakNote   = (hour >= 8 && hour <= 10) ? '🔺 Morning Peak'
                             : (hour >= 18 && hour <= 21) ? '🔺 Evening Peak'
                             : '⬤ Off-Peak';

            circle.bindPopup(`
                <div style="width:240px; font-family: Inter, sans-serif; padding: 4px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid ${color}; padding-bottom:6px; margin-bottom:8px;">
                        <strong style="font-size:13px;">${j.name}</strong>
                        <span style="background:${color}; color:#fff; font-size:11px; font-weight:800; padding:2px 9px; border-radius:20px;">Risk ${j.score}/10</span>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap: 5px 10px; font-size:11px; color:#4b5563; margin-bottom:8px;">
                        <div><b>Road Type:</b> ${j.roadType}</div>
                        <div><b>Time:</b> ${timeSuffix} ${peakNote}</div>
                        <div><b>Accidents/yr:</b> ${j.historicalAccidents}</div>
                        <div><b>Daily Volume:</b> ${(j.dailyTrafficVolume/1000).toFixed(0)}k</div>
                        <div><b>Lighting:</b> ${Math.round(j.lightingQuality * 100)}%</div>
                        <div><b>Time Factor:</b> ×${j.timeFactor}</div>
                    </div>
                    <div style="font-size:10px; font-weight:700; text-transform:uppercase; color:#9ca3af; margin-bottom:4px;">Score Breakdown (1–10 scale)</div>
                    ${[
                        ['Accident History',  j.accidentNorm,    0.3],
                        ['Congestion Level',  j.congestionNorm,  0.3],
                        ['Lighting Penalty',  j.lightingPenalty, 0.2],
                        ['Time Factor',       j.timeNorm,        0.2]
                    ].map(([label, val, w]) => `
                        <div style="display:flex; align-items:center; gap:6px; margin-bottom:3px;">
                            <span style="font-size:10px; color:#6b7280; width:110px; flex-shrink:0;">${label} (w=${w})</span>
                            <div style="flex:1; background:#e5e7eb; border-radius:4px; height:5px; overflow:hidden;">
                                <div style="height:100%; width:${Math.round(val*100)}%; background:${color}; border-radius:4px;"></div>
                            </div>
                            <span style="font-size:10px; font-weight:700; color:#111; width:28px; text-align:right;">${Math.round(val*100)}%</span>
                        </div>
                    `).join('')}
                </div>
            `, { maxWidth: 270 });

            circle.addTo(junctionGroup);
        });
    }

    /**
     * Creates (or replaces) the leaflet.heat layer from current junction risk scores.
     * Intensity is mapped from score (1–10) → heatmap weight (0.1–1.0).
     */
    function initHeatLayer(hour) {
        // Remove old heat layer from map/group if it exists
        if (_activeHeatLayer) {
            heatmapGroup.removeLayer(_activeHeatLayer);
        }

        const scores   = RiskEngine.computeJunctionScores(hour);
        const heatData = scores.map(j => [j.lat, j.lng, j.score / 10]);

        _activeHeatLayer = L.heatLayer(heatData, {
            radius:   22,
            blur:     15,
            maxZoom:  17,
            gradient: { 0.4: 'blue', 0.65: 'lime', 0.85: 'orange', 1.0: 'red' }
        });

        heatmapGroup.addLayer(_activeHeatLayer);
    }

    /**
     * Initializes the time-slider and wires it to re-score all junctions live.
     */
    function initTimeSlider() {
        const slider    = document.getElementById('time-slider');
        const label     = document.getElementById('time-slider-label');
        if (!slider || !label) return;

        function formatHour(h) {
            const period = h >= 12 ? 'PM' : 'AM';
            const h12    = h === 0 ? 12 : h > 12 ? h - 12 : h;
            return `${String(h12).padStart(2,'0')}:00 ${period}`;
        }

        function applyHour(h) {
            _currentHour  = h;
            label.textContent = formatHour(h);

            // Highlight peak hours
            const isPeak = (h >= 8 && h <= 10) || (h >= 18 && h <= 21);
            label.style.color = isPeak ? '#ef4444' : 'var(--color-primary, #7c93ff)';

            // Re-render junction markers, heatmap, and sortable ranking table for this hour
            renderJunctionMarkers(h);
            initHeatLayer(h);
            renderJunctionTable(h);
        }

        // Set slider to current real hour
        slider.value = _currentHour;
        applyHour(_currentHour);

        slider.addEventListener('input', () => applyHour(parseInt(slider.value, 10)));
    }

    // ── SORTABLE JUNCTION RANKING TABLE & CSV EXPORT ──────────────────────────

    let _sortState = { col: 'score', asc: false };

    /**
     * Renders the sortable junction rankings side-panel table.
     */
    function renderJunctionTable(hour) {
        const tbody = document.getElementById('junction-rankings-tbody');
        if (!tbody) return;

        let junctions = RiskEngine.computeJunctionScores(hour !== undefined ? hour : _currentHour);

        // Pre-assign rank based on score descending
        const tempSorted = [...junctions].sort((a, b) => b.score - a.score);
        const rankMap = new Map();
        tempSorted.forEach((j, i) => rankMap.set(j.name, i + 1));
        junctions.forEach(j => j.rank = rankMap.get(j.name));

        // Sort by active column state
        junctions.sort((a, b) => {
            let valA = _sortState.col === 'volume' ? a.dailyTrafficVolume : a[_sortState.col];
            let valB = _sortState.col === 'volume' ? b.dailyTrafficVolume : b[_sortState.col];

            if (_sortState.col === 'trend') {
                valA = a.trend.text;
                valB = b.trend.text;
            }

            if (typeof valA === 'string') {
                return _sortState.asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return _sortState.asc ? valA - valB : valB - valA;
        });

        tbody.innerHTML = junctions.map(j => `
            <tr class="junction-row" data-lat="${j.lat}" data-lng="${j.lng}" style="border-bottom: 1px solid var(--color-outline-variant); cursor: pointer; transition: background 0.15s ease;">
                <td style="padding: 7px 10px; font-weight: 700; color: var(--color-on-surface-variant); width: 28px;">${j.rank}</td>
                <td style="padding: 7px 10px; font-weight: 600; color: var(--color-on-surface); max-width: 130px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${j.name}">
                    ${j.name}
                </td>
                <td style="padding: 7px 10px; font-weight: 800;">
                    <span style="background: ${j.label.color}22; color: ${j.label.color}; padding: 2px 7px; border-radius: 10px; border: 1px solid ${j.label.color}44; font-size: 10px;">
                        ${j.score}/10
                    </span>
                </td>
                <td style="padding: 7px 10px; font-weight: 600; color: ${j.trend.color}; display: flex; align-items: center; gap: 4px;">
                    <span class="material-symbols-outlined" style="font-size: 14px;">${j.trend.icon}</span>
                    <span>${j.trend.text}</span>
                </td>
                <td style="padding: 7px 10px; color: var(--color-on-surface-variant); text-transform: capitalize;">
                    ${j.roadType}
                </td>
            </tr>
        `).join('');

        // Row click event: Fly to junction location on map and open popup
        tbody.querySelectorAll('.junction-row').forEach(row => {
            row.addEventListener('click', () => {
                const lat = parseFloat(row.dataset.lat);
                const lng = parseFloat(row.dataset.lng);
                map.flyTo([lat, lng], 15, { duration: 1.0 });

                junctionGroup.eachLayer(layer => {
                    if (layer.getLatLng) {
                        const l = layer.getLatLng();
                        if (Math.abs(l.lat - lat) < 0.0001 && Math.abs(l.lng - lng) < 0.0001) {
                            layer.openPopup();
                        }
                    }
                });
            });
        });
    }

    /**
     * Initializes column sorting listeners on table headers.
     */
    function initTableSorting() {
        const tableHeader = document.querySelector('#junction-rankings-table thead');
        if (!tableHeader) return;

        tableHeader.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const col = th.dataset.sort;
                if (_sortState.col === col) {
                    _sortState.asc = !_sortState.asc;
                } else {
                    _sortState.col = col;
                    _sortState.asc = col === 'name' || col === 'roadType';
                }

                tableHeader.querySelectorAll('.sort-dir').forEach(span => span.textContent = '');
                const dirSpan = th.querySelector('.sort-dir');
                if (dirSpan) dirSpan.textContent = _sortState.asc ? '▲' : '▼';

                renderJunctionTable(_currentHour);
            });
        });
    }

    /**
     * Generates and downloads a client-side CSV briefing sheet of active junction risk rankings.
     */
    function exportBriefingCSV() {
        const junctions = RiskEngine.computeJunctionScores(_currentHour);
        junctions.sort((a, b) => b.score - a.score);

        const headers = [
            'Rank',
            'Junction Name',
            'Risk Score (1-10)',
            'Trend',
            'Risk Level',
            'Latitude',
            'Longitude',
            'Historical Accidents (Annual)',
            'Daily Traffic Volume',
            'Lighting Quality (%)',
            'Road Type',
            'Time Factor'
        ];

        const rows = junctions.map((j, i) => [
            i + 1,
            `"${j.name.replace(/"/g, '""')}"`,
            j.score,
            j.trend.text,
            j.label.text,
            j.lat,
            j.lng,
            j.historicalAccidents,
            j.dailyTrafficVolume,
            `${Math.round(j.lightingQuality * 100)}%`,
            j.roadType,
            j.timeFactor
        ]);

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const formattedHour = String(_currentHour).padStart(2, '0');
        const filename = `Nagpur_Traffic_Risk_Briefing_${formattedHour}00.csv`;

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        window.dispatchSystemAlert('Briefing Exported', `Downloaded ${filename} (${junctions.length} junctions)`, 'info');
    }

    // Initial render of junction markers, heat layer, time slider, and sortable table
    renderJunctionMarkers(_currentHour);
    initHeatLayer(_currentHour);
    renderJunctionTable(_currentHour);
    initTableSorting();
    initTimeSlider();

    // Wire CSV Export button listener
    const btnExportCSV = document.getElementById('btn-export-csv');
    if (btnExportCSV) {
        btnExportCSV.addEventListener('click', exportBriefingCSV);
    }

    // Map click event: Interactive click-to-log incident creation
    map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        
        const popupContent = `
            <div style="width: 250px; font-family: Inter, sans-serif; padding: 6px;">
                <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; border-bottom: 1px solid var(--color-outline-variant); padding-bottom: 4px; color: var(--color-on-surface);">Log Incident at Location</h4>
                <div style="font-size: 10px; color: var(--color-outline); margin-bottom: 8px;">Coords: ${lat.toFixed(4)}, ${lng.toFixed(4)}</div>
                
                <form id="map-incident-form" style="display:flex; flex-direction:column; gap:8px;">
                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <label style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: var(--color-on-surface-variant);">Category</label>
                        <select id="inc-category" style="padding: 4px; font-size:11px; border-radius: var(--rounded-sm); border:1px solid var(--color-outline-variant); background: var(--color-surface-container-lowest); color: var(--color-on-surface);">
                            <option value="Congestion">Congestion</option>
                            <option value="Accident">Accident</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="System">System</option>
                        </select>
                    </div>
                    
                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <label style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: var(--color-on-surface-variant);">Severity</label>
                        <select id="inc-severity" style="padding: 4px; font-size:11px; border-radius: var(--rounded-sm); border:1px solid var(--color-outline-variant); background: var(--color-surface-container-lowest); color: var(--color-on-surface);">
                            <option value="Critical">Critical</option>
                            <option value="Warning">Warning</option>
                            <option value="Normal">Normal</option>
                        </select>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <label style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: var(--color-on-surface-variant);">Location Name</label>
                        <input type="text" id="inc-loc-name" placeholder="e.g. Wardha Road" style="padding: 4px; font-size:11px; border-radius: var(--rounded-sm); border:1px solid var(--color-outline-variant); background: var(--color-surface-container-lowest); color: var(--color-on-surface);" required />
                    </div>

                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <label style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: var(--color-on-surface-variant);">Description</label>
                        <textarea id="inc-desc" rows="2" placeholder="Brief details..." style="padding: 4px; font-size:11px; border-radius: var(--rounded-sm); border:1px solid var(--color-outline-variant); background: var(--color-surface-container-lowest); color: var(--color-on-surface); font-family:inherit;"></textarea>
                    </div>

                    <button class="btn btn-primary" type="submit" style="font-size:11px; padding: 6px; margin-top:4px;">
                        Create Incident
                    </button>
                </form>
            </div>
        `;

        const popup = L.popup()
            .setLatLng(e.latlng)
            .setContent(popupContent)
            .openOn(map);

        setTimeout(() => {
            const form = document.getElementById('map-incident-form');
            if (form) {
                form.addEventListener('submit', async (submitEvent) => {
                    submitEvent.preventDefault();
                    
                    const category = document.getElementById('inc-category').value;
                    const severity = document.getElementById('inc-severity').value;
                    const location = document.getElementById('inc-loc-name').value;
                    const description = document.getElementById('inc-desc').value;

                    try {
                        const response = await fetch(`${PRAVAH_API}/api/incidents`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ location, category, severity, description })
                        });

                        if (!response.ok) throw new Error('Failed to create incident');
                        
                        map.closePopup();
                        window.dispatchSystemAlert('Incident Logged', `${category} at ${location}`, 'info');
                    } catch (err) {
                        alert(err.message);
                    }
                });
            }
        }, 100);
    });

    const ZONE_ICONS = {
        Critical: 'report',
        Elevated: 'warning',
        Watch:    'info',
        Guarded:  'local_police',
        Clear:    'local_police'
    };

    // App State
    const state = {
        metrics: {
            riskScore: 0,
            activeIncidents: 0,
            criticalIncidents: 0,
            officersOnDuty: 145,
            unmannedRisks: 4
        },
        markers: [],
        heatmapActive: false,
        unitsActive: true
    };

    // DOM References
    const mapViewport = document.getElementById('map-viewport');
    const commFeedList = document.getElementById('comm-feed-list');
    const btnSimulate = document.getElementById('btn-simulate');
    const btnBroadcast = document.getElementById('btn-broadcast');
    const btnEmergency = document.getElementById('btn-emergency-override');
    const toggleHeatmap = document.getElementById('toggle-heatmap');
    const toggleUnits = document.getElementById('toggle-units');
    const btnRecenter = document.getElementById('btn-recenter');

    // Load comm feed from real API on page load
    loadCommFeedFromAPI();

    // Check if main.js already fetched risk data before dashboard.js registered its listener
    let apiSyncReceived = false;
    if (window.__pravahRiskData && window.__pravahRiskData.zoneScores) {
        apiSyncReceived = true;
        refreshFromModel(window.__pravahRiskData);
        updateDataSourceBadge(window.__pravahRiskData.meta?.trafficSource || 'simulation');
    }

    const fallbackTimer = setTimeout(() => {
        if (!apiSyncReceived) refreshFromModel();
    }, 1000);

    // Init Controls
    initControls();

    // Auto-refresh corridors from traffic API
    fetchAndRenderCorridors();
    setInterval(fetchAndRenderCorridors, 5 * 60 * 1000);

    // Auto-refresh the model every 60 seconds to reflect time-of-day changes
    setInterval(refreshFromModel, 60_000);

    // Refresh immediately when the API sync fires (primary render path)
    window.addEventListener('riskDataUpdated', (e) => {
        const apiData = e.detail;
        if (apiData && apiData.zoneScores) {
            apiSyncReceived = true;
            clearTimeout(fallbackTimer);
            refreshFromModel(apiData);
            updateDataSourceBadge(apiData.meta?.trafficSource || 'simulation');
        }
    });

    // ── MODEL INTEGRATION ──────────────────────────────────────────────────

    /**
     * Re-runs the risk model and pushes results to the dashboard UI.
     * Accepts optional apiData from the live API to override engine output.
     */
    function refreshFromModel(apiData) {
        // Use API data if provided, otherwise fall back to local engine
        const result     = apiData || RiskEngine.compute();
        const zoneScores = apiData?.zoneScores || RiskEngine.computeZoneScores();
        const engineState = RiskEngine.getState();

        // Prefer API meta if available
        const meta = apiData?.meta || {
            officersOnDuty:    engineState.officersOnDuty,
            activeIncidents:   engineState.incidents.filter(i => i.status !== 'Resolved').length,
            criticalIncidents: engineState.incidents.filter(i => i.severity === 'Critical' && i.status !== 'Resolved').length,
            unmannedZones:     engineState.unmannedZones
        };

        state.metrics.riskScore         = result.score;
        state.metrics.activeIncidents   = meta.activeIncidents;
        state.metrics.criticalIncidents = meta.criticalIncidents;
        state.metrics.officersOnDuty    = meta.officersOnDuty;
        state.metrics.unmannedRisks     = meta.unmannedZones;

        // Build map markers from zone risk scores
        state.markers = zoneScores.map((z, idx) => ({
            id: idx + 1,
            label: z.zone,
            type: z.label.text.toLowerCase(),
            lat:  z.lat || 21.1458,
            lng:  z.lng || 79.0882,
            desc: buildZoneDescription(z, engineState.incidents),
            icon: ZONE_ICONS[z.label.text] || 'location_on',
            score: z.score,
            badgeClass: z.label.badgeClass
        }));

        updateDashboardStats(result);
        renderMarkers();
        renderCorridors(apiData);
        renderRiskFactorBar(result);
    }

    /**
     * Builds a human-readable description for a zone marker tooltip.
     */
    function buildZoneDescription(zone, incidents) {
        const zoneInc = incidents.filter(i =>
            i.location?.toLowerCase().includes(zone.zone.toLowerCase()) &&
            i.status !== 'Resolved'
        );
        if (zoneInc.length > 0) {
            const types = [...new Set(zoneInc.map(i => i.severity))].join(' / ');
            return `${zoneInc.length} active incident(s) — ${types}. Risk score: ${zone.score}`;
        }
        return `Historical hotspot. Current risk score: ${zone.score}/100`;
    }

    /**
     * Renders a compact risk factor breakdown bar in the Command Actions card.
     * If the breakdown element doesn't exist, creates it.
     */
    function renderRiskFactorBar(result) {
        const card = document.querySelector('.card');
        if (!card) return;

        let breakdownEl = document.getElementById('risk-factor-breakdown');
        if (!breakdownEl) {
            breakdownEl = document.createElement('div');
            breakdownEl.id = 'risk-factor-breakdown';
            breakdownEl.style.cssText = `
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px solid var(--color-outline-variant);
                display: flex;
                flex-direction: column;
                gap: 6px;
            `;
            card.appendChild(breakdownEl);
        }

        const factorLabels = {
            timeOfDay:       'Time of Day',
            incidents:       'Live Incidents',
            deployment:      'Deployment Gap',
            trafficVelocity: 'Traffic Velocity',
            historicalZone:  'Zone History'
        };

        breakdownEl.innerHTML = `
            <div style="font-size: 11px; font-weight: 700; color: var(--color-on-surface-variant); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
                Risk Score Breakdown — ${result.score}/100
            </div>
            ${Object.entries(result.factors).map(([key, val]) => `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 11px; color: var(--color-on-surface-variant); width: 110px; flex-shrink: 0;">${factorLabels[key]}</span>
                    <div style="flex: 1; background: var(--color-surface-container); border-radius: var(--rounded-full); height: 6px; overflow: hidden;">
                        <div style="
                            height: 100%;
                            width: ${val}%;
                            background: ${val >= 75 ? 'var(--color-error)' : val >= 50 ? 'var(--color-on-tertiary-container)' : 'var(--color-primary)'};
                            border-radius: var(--rounded-full);
                            transition: width 0.6s ease;
                        "></div>
                    </div>
                    <span style="font-size: 11px; font-weight: 700; color: var(--color-on-surface); width: 28px; text-align: right;">${Math.round(val)}</span>
                </div>
            `).join('')}
        `;
    }

    // Render Markers on Map (driven by RiskEngine zone scores)
    function renderMarkers() {
        markersGroup.clearLayers();
        heatmapGroup.clearLayers();

        state.markers.forEach(marker => {
            let color   = '#64748b';  // slate for guarded
            let isPulse = false;
            let size    = 16;

            if (marker.type === 'critical') {
                color = '#dc2626'; isPulse = true; size = 32;
            } else if (marker.type === 'elevated') {
                color = '#ea580c'; size = 26;
            } else if (marker.type === 'watch') {
                color = '#d97706'; size = 22;
            } else if (marker.type === 'clear') {
                color = '#16a34a'; size = 16;
            }

            const scoreLabel = `<span style="font-size:9px;font-weight:900;color:white;line-height:1;">${marker.score}</span>`;
            const iconHtml = `
                <div class="map-marker ${isPulse ? 'marker-pulse' : ''}" style="
                    background: ${color};
                    width: ${size}px; height: ${size}px;
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    border: 2.5px solid rgba(255,255,255,0.9);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.35), 0 0 0 3px ${color}33;
                    flex-direction: column; gap: 0;
                ">
                    <span class="material-symbols-outlined" style="font-size:${Math.round(size * 0.45)}px;color:white;line-height:1;">${marker.icon || 'location_on'}</span>
                    ${size >= 22 ? scoreLabel : ''}
                </div>`;

            const customIcon = L.divIcon({
                className: 'custom-leaflet-marker',
                html: iconHtml,
                iconSize:   [size, size],
                iconAnchor: [size / 2, size / 2]
            });

            // Build officers on duty line
            const officerLine = marker.officers !== undefined
                ? `<div style="margin-top:4px; font-size:10px; color:var(--color-on-surface-variant); display:flex; align-items:center; gap:4px;">
                       <span class="material-symbols-outlined" style="font-size:12px;">local_police</span>
                       ${marker.officers} officer${marker.officers !== 1 ? 's' : ''} assigned
                   </div>` : '';

            const popupContent = `
                <div style="width:230px; font-family:Inter,sans-serif;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; border-bottom:1px solid #e2e8f0; padding-bottom:6px;">
                        <span style="font-weight:700; font-size:13px;">${marker.label}</span>
                        <span style="background:${color}; color:white; font-size:10px; font-weight:800; padding:2px 8px; border-radius:12px;">Risk ${marker.score}</span>
                    </div>
                    <div style="font-size:11px; line-height:1.5; color:#475569;">${marker.desc}</div>
                    ${officerLine}
                </div>`;

            L.marker([marker.lat, marker.lng], { icon: customIcon })
                .bindPopup(popupContent, { maxWidth: 260 })
                .addTo(markersGroup);

            // Also add a heatmap circle for this zone (hidden by default)
            L.circleMarker([marker.lat, marker.lng], {
                radius: 40,
                color:  color,
                fillColor: color,
                fillOpacity: 0.15,
                weight: 0,
                opacity: 0.4
            }).addTo(heatmapGroup);
        });
    }

    /**
     * Fetches live traffic corridor data from the backend /api/traffic endpoint
     * and draws colored polylines on the map.
     * This runs independently from refreshFromModel() so corridors are ALWAYS drawn.
     */
    async function fetchAndRenderCorridors() {
        const CORRIDOR_COORDS = {
            'Zero Mile to Sitabuldi':   [[21.1458,79.0882], [21.1480,79.0860], [21.1508,79.0826]],
            'Wardha Road':              [[21.1102,79.0726], [21.1200,79.0760], [21.1300,79.0800]],
            'Kamptee Road':             [[21.1600,79.1100], [21.1540,79.1010], [21.1458,79.0882]],
            'Sadar to Variety Square':  [[21.1490,79.0950], [21.1505,79.0910], [21.1520,79.0870]],
            'Jhansi Rani to Sitabuldi':  [[21.1380,79.0760], [21.1440,79.0790], [21.1508,79.0826]]
        };

        try {
            const res  = await fetch(`${PRAVAH_API}/api/traffic`, { signal: AbortSignal.timeout(5000) });
            if (!res.ok) throw new Error(`Traffic API ${res.status}`);
            const data = await res.json();
            const corridors = data.corridors || [];

            corridorsGroup.clearLayers();

            corridors.forEach(c => {
                const points = CORRIDOR_COORDS[c.corridor];
                if (!points) return;

                const congPct = c.congestion || 0;
                const color   = congPct >= 50 ? '#dc2626' : congPct >= 20 ? '#d97706' : '#16a34a';
                const weight  = congPct >= 50 ? 7 : congPct >= 20 ? 6 : 5;

                L.polyline(points, {
                    color, weight, opacity: 0.85,
                    lineCap: 'round', lineJoin: 'round'
                })
                .bindTooltip(
                    `<strong>${c.corridor}</strong><br>` +
                    `🚗 Speed: <b>${c.speedKmh} km/h</b><br>` +
                    `🔴 Congestion: <b>${congPct}%</b>`,
                    { sticky: true, className: 'corridor-tooltip' }
                )
                .addTo(corridorsGroup);
            });

            console.log(`[PravahAI] Corridors rendered: ${corridors.length} roads`);
        } catch (err) {
            console.warn('[PravahAI] Traffic API unreachable for corridors:', err.message);
            // Draw placeholder grey corridors so map isn't blank
            corridorsGroup.clearLayers();
            Object.entries(CORRIDOR_COORDS).forEach(([name, points]) => {
                L.polyline(points, { color: '#94a3b8', weight: 4, opacity: 0.5 })
                 .bindTooltip(`<strong>${name}</strong><br>Traffic data unavailable`, { sticky: true })
                 .addTo(corridorsGroup);
            });
        }
    }

    // Legacy renderCorridors kept for compatibility (no-op now — fetchAndRenderCorridors() handles it)
    function renderCorridors() {}

    // Controls setup
    function initControls() {
        // Toggle Heatmap Layer (real Leaflet.heat layer per junction score)
        if (toggleHeatmap) {
            toggleHeatmap.addEventListener('click', () => {
                state.heatmapActive = !state.heatmapActive;
                toggleHeatmap.classList.toggle('active', state.heatmapActive);
                toggleHeatmap.style.backgroundColor = state.heatmapActive ? 'var(--color-surface-container-highest)' : '';

                if (state.heatmapActive) {
                    heatmapGroup.addTo(map);
                    window.dispatchSystemAlert('Map Layer', 'Heatmap overlay ON — showing junction risk intensities', 'info');
                } else {
                    map.removeLayer(heatmapGroup);
                    window.dispatchSystemAlert('Map Layer', 'Heatmap overlay OFF', 'info');
                }
            });
        }

        // Toggle Units Layer (show/hide guarded and clear zones)
        if (toggleUnits) {
            toggleUnits.addEventListener('click', () => {
                state.unitsActive = !state.unitsActive;
                toggleUnits.classList.toggle('active', state.unitsActive);
                toggleUnits.style.backgroundColor = state.unitsActive ? 'var(--color-surface-container-highest)' : '';
                renderMarkers();
                window.dispatchSystemAlert('Map Layer', `Patrol unit markers ${state.unitsActive ? 'shown' : 'hidden (watch+ only)'}`, 'info');
            });
        }

        // Recenter Map
        if (btnRecenter) {
            btnRecenter.addEventListener('click', () => {
                map.flyTo([21.1458, 79.0882], 13, { duration: 1.2 });
                window.dispatchSystemAlert('Map', 'Recentered on Nagpur Zero Mile', 'info');
            });
        }

        // Simulate incident logic
        if (btnSimulate) {
            btnSimulate.addEventListener('click', simulateRandomIncident);
        }

        // Broadcast Alert dialog logic
        if (btnBroadcast) {
            btnBroadcast.addEventListener('click', () => {
                const alertMsg = prompt('Enter emergency text to broadcast city-wide:');
                if (alertMsg && alertMsg.trim() !== '') broadcastMessage(alertMsg.trim());
            });
        }

        // Emergency Override Logic (fixed: use innerHTML not textContent to preserve icon)
        if (btnEmergency) {
            let overrideActive = false;
            btnEmergency.addEventListener('click', () => {
                if (overrideActive) {
                    // Second click cancels override
                    overrideActive = false;
                    btnEmergency.innerHTML = '<span class="material-symbols-outlined">warning</span> Emergency Override';
                    btnEmergency.style.backgroundColor = '';
                    window.dispatchSystemAlert('Override Cancelled', 'Traffic systems restored to normal control.', 'info');
                    return;
                }
                const confirmed = confirm('CRITICAL: Trigger manual emergency override? All intersections switch to flashing yellow mode.');
                if (confirmed) {
                    overrideActive = true;
                    btnEmergency.innerHTML = '<span class="material-symbols-outlined">emergency</span> OVERRIDE ACTIVE';
                    btnEmergency.style.backgroundColor = '#7f1d1d';
                    btnEmergency.style.animation = 'pulse-ring 1.5s infinite';
                    window.dispatchSystemAlert('🚨 Emergency Override Active', 'All traffic systems shifted to manual caution state. Click again to cancel.', 'critical');
                    appendFeedItem('Command Override', 'Manual emergency override activated. All intersections — flashing yellow mode.', '🚨 OVERRIDE', 'critical');

                    const s = RiskEngine.getState();
                    RiskEngine.updateState({ unmannedZones: Math.min(8, s.unmannedZones + 2) });
                    refreshFromModel();
                }
            });
        }
    }

    // Dynamic Incident Simulator — pushes into RiskEngine and re-scores
    function simulateRandomIncident() {
        const locations = [
            { label: 'Kamptee Road',             desc: 'Aggressive congestion pattern detected. Traffic speed drop > 50%.' },
            { label: 'Wardha Road Interchange',  desc: 'Vehicle breakdown stalling left lane. Squad dispatch required.' },
            { label: 'Jhansi Rani Square',       desc: 'Demonstration group blocking access points near Metro link.' },
            { label: 'Sadar Bazar Junction',     desc: 'Signal controller communication breakdown. Manual dispatch suggested.' }
        ];

        const randomLoc = locations[Math.floor(Math.random() * locations.length)];

        // Inject new incident into the engine's state
        const engineState = RiskEngine.getState();
        engineState.incidents.push({
            severity: 'Critical',
            status: 'Logged',
            location: randomLoc.label
        });
        RiskEngine.updateState({ incidents: engineState.incidents });

        // Increment unmanned zones (unit deployed = one less covered zone)
        RiskEngine.updateState({ unmannedZones: Math.min(8, engineState.unmannedZones + 1) });

        // Re-run model
        refreshFromModel();

        // Append to Comm Feed
        appendFeedItem(randomLoc.label, randomLoc.desc, 'High Risk', 'critical');
        window.dispatchSystemAlert('Traffic Alert', `${randomLoc.label}: ${randomLoc.desc}`, 'critical');
    }

    // Append alert item to DOM feed
    function appendFeedItem(location, desc, tag, level) {
        if (!commFeedList) return;

        const item = document.createElement('div');
        let borderClass = 'risk-system';
        let badgeClass = 'badge-system';
        
        if (level === 'critical') {
            borderClass = 'risk-high';
            badgeClass = 'badge-critical';
        } else if (level === 'elevated') {
            borderClass = 'risk-elevated';
            badgeClass = 'badge-elevated';
        }

        item.className = `comm-feed-item ${borderClass}`;
        item.innerHTML = `
            <div class="comm-feed-item-header">
                <div class="comm-feed-meta">
                    <span class="badge ${badgeClass}">${tag}</span>
                    <span class="comm-feed-time">Just now</span>
                </div>
                <button class="icon-btn" style="padding: 2px;"><span class="material-symbols-outlined" style="font-size: 16px;">more_vert</span></button>
            </div>
            <p class="text-body-md comm-feed-desc" style="font-weight: 500;">Incident reported at <strong>${location}</strong>.</p>
            <div class="comm-feed-details text-data-tabular">
                <span class="material-symbols-outlined" style="font-size: 14px;">speed</span>
                ${desc}
            </div>
        `;

        commFeedList.insertBefore(item, commFeedList.firstChild);
    }

    // Broadcast a custom manual alert message
    function broadcastMessage(message) {
        appendFeedItem('Command Broadcast', message, 'Broadcast', 'elevated');
        const s = RiskEngine.getState();
        RiskEngine.updateState({ avgTrafficVelocity: Math.min(s.freeFlowVelocity, s.avgTrafficVelocity + 2) });
        refreshFromModel();
        window.dispatchSystemAlert('Broadcast Sent', `Alert sent: ${message}`, 'elevated');
    }

    /**
     * Load real incidents from the DB API and populate the Comm Feed.
     * Replaces the static HTML placeholder items in index.html.
     */
    async function loadCommFeedFromAPI() {
        if (!commFeedList) return;
        try {
            const res  = await fetch(`${PRAVAH_API}/api/incidents?hours=24`, { signal: AbortSignal.timeout(4000) });
            if (!res.ok) throw new Error(`API ${res.status}`);
            const data = await res.json();
            const incidents = (data.incidents || []).slice(0, 8); // show latest 8

            if (!incidents.length) return; // keep static items if no DB incidents

            // Clear static HTML placeholders
            commFeedList.innerHTML = '';

            incidents.forEach(inc => {
                const level = inc.severity === 'Critical' ? 'critical'
                            : inc.severity === 'Warning'  ? 'elevated' : 'system';
                const time  = new Date(inc.reported_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

                const item = document.createElement('div');
                item.className = `comm-feed-item ${level === 'critical' ? 'risk-high' : level === 'elevated' ? 'risk-elevated' : 'risk-system'}`;
                item.innerHTML = `
                    <div class="comm-feed-item-header">
                        <div class="comm-feed-meta">
                            <span class="badge ${level === 'critical' ? 'badge-critical' : level === 'elevated' ? 'badge-elevated' : 'badge-system'}">${inc.category}</span>
                            <span class="comm-feed-time">${time}</span>
                        </div>
                        <span class="badge ${inc.status === 'Resolved' ? 'badge-success' : inc.status === 'Dispatched' ? 'badge-elevated' : 'badge-system'}" style="font-size:9px; padding:1px 5px;">${inc.status}</span>
                    </div>
                    <p class="text-body-md comm-feed-desc" style="font-weight: 500;">${inc.description || inc.category + ' at ' + inc.location}</p>
                    <div class="comm-feed-details text-data-tabular">
                        <span class="material-symbols-outlined" style="font-size: 14px;">location_on</span>
                        ${inc.location} &nbsp;·&nbsp; ${inc.incident_id}
                    </div>`;
                commFeedList.appendChild(item);
            });
        } catch (err) {
            console.warn('[PravahAI] Comm feed API unavailable — keeping static items.', err.message);
        }
    }

    /**
     * Updates the data source badge on the map toolbar.
     * Shows 🟢 TomTom Live or 🟡 Simulation.
     */
    function updateDataSourceBadge(source) {
        const badge = document.getElementById('data-source-badge');
        if (!badge) return;
        const isLive = source === 'tomtom';
        badge.textContent = isLive ? '🟢 TomTom Live' : '🟡 Simulation';
        badge.style.color = isLive ? '#16a34a' : '#d97706';
        badge.title = isLive
            ? 'Traffic data is live from TomTom Routing API'
            : 'Traffic data is time-based simulation (TomTom unavailable)';
    }

    // Update the UI metrics cards from model result
    function updateDashboardStats(result) {
        const r = result || RiskEngine.compute();
        const riskScoreEl   = document.querySelector('.kpi-card:nth-child(1) .kpi-value');
        const riskBadgeEl   = document.querySelector('.kpi-card:nth-child(1) .badge');
        const incCountEl    = document.querySelector('.kpi-card:nth-child(2) .kpi-value');
        const incBadgeEl    = document.querySelector('.kpi-card:nth-child(2) .badge');
        const officersEl    = document.querySelector('.kpi-card:nth-child(3) .kpi-value');
        const officersBadge = document.querySelector('.kpi-card:nth-child(3) .badge, .kpi-card:nth-child(3) .text-body-md');
        const unmannedEl    = document.querySelector('.kpi-card:nth-child(4) .kpi-value');
        const unmannedBadge = document.querySelector('.kpi-card:nth-child(4) .text-data-tabular');

        if (riskScoreEl) {
            riskScoreEl.innerHTML = `${r.score}<span class="text-headline-md" style="color: var(--color-outline);">/100</span>`;
        }
        if (riskBadgeEl) {
            riskBadgeEl.className = `badge ${r.label.badgeClass}`;
            riskBadgeEl.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px;">${r.trend.icon}</span> ${r.trend.delta > 0 ? '+' : ''}${r.trend.delta}`;
        }
        if (incCountEl)  incCountEl.textContent = state.metrics.activeIncidents;
        if (incBadgeEl)  incBadgeEl.textContent  = `${state.metrics.criticalIncidents} Critical`;

        // Officers KPI (card 3)
        if (officersEl) {
            const duty  = state.metrics.officersOnDuty;
            const total = RiskEngine.getState().totalOfficers || duty;
            officersEl.innerHTML = `${duty}<span class="text-headline-md" style="color:var(--color-outline);">/${total}</span>`;
        }
        if (officersBadge) {
            const duty  = state.metrics.officersOnDuty;
            const total = RiskEngine.getState().totalOfficers || duty;
            const pct   = total > 0 ? Math.round((duty / total) * 100) : 0;
            officersBadge.textContent = `${pct}% Deployment`;
            officersBadge.className = 'text-body-md';
            officersBadge.style.cssText = `color: var(--color-on-surface-variant); font-weight: 500;`;
        }

        // Unmanned zones (card 4)
        if (unmannedEl)  unmannedEl.textContent = state.metrics.unmannedRisks;
        if (unmannedBadge && state.metrics.unmannedRisks > 0) {
            unmannedBadge.innerHTML = `<span style="display:inline-block;width:8px;height:8px;background:var(--color-error);border-radius:50%;animation:pulse-ring 2s infinite;"></span> Action Req.`;
        }
    }
});
