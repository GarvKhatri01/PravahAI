/* ==========================================================================
   Civic Sentinel - Live Map & Dashboard Operations (dashboard.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Check if we are on the dashboard index page
    if (!document.getElementById('map-viewport')) return;

    // Simulated State
    const state = {
        metrics: {
            riskScore: 64,
            activeIncidents: 12,
            criticalIncidents: 3,
            officersOnDuty: 145,
            unmannedRisks: 4
        },
        markers: [
            { id: 1, label: 'Zero Mile Stone', type: 'critical', top: '40%', left: '45%', desc: 'Heavy Congestion - Velocity drop > 40%', icon: 'report' },
            { id: 2, label: 'Variety Square', type: 'elevated', top: '55%', left: '60%', desc: 'Accident reported. Eastbound lanes partially blocked.', icon: 'car_crash' },
            { id: 3, label: 'Sitabuldi Interchange', type: 'normal', top: '30%', left: '65%', desc: 'Officer Ramesh Kumar - Patroling Wardha Rd', icon: 'local_police' }
        ],
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

    // Init Page Elements
    renderMarkers();
    initControls();

    // Render Markers on Map
    function renderMarkers() {
        // Clear existing markers except background styles
        const existingPins = mapViewport.querySelectorAll('.map-marker, .marker-tooltip');
        existingPins.forEach(pin => pin.remove());

        state.markers.forEach(marker => {
            if (marker.type === 'normal' && !state.unitsActive) return;

            // Pin marker
            const pin = document.createElement('div');
            pin.className = `map-marker`;
            pin.style.top = marker.top;
            pin.style.left = marker.left;

            // Design color schemes based on risk profiles
            if (marker.type === 'critical') {
                pin.style.backgroundColor = 'var(--color-error)';
                pin.classList.add('marker-pulse');
            } else if (marker.type === 'elevated') {
                pin.style.backgroundColor = 'var(--color-on-tertiary-container)';
            } else {
                pin.style.backgroundColor = 'var(--color-primary)';
            }

            // Material Icon setup
            const iconSpan = document.createElement('span');
            iconSpan.className = 'material-symbols-outlined';
            iconSpan.style.fontSize = marker.type === 'normal' ? '12px' : '16px';
            iconSpan.textContent = marker.icon || 'location_on';
            pin.appendChild(iconSpan);

            // Tooltip card overlay
            const tooltip = document.createElement('div');
            tooltip.className = 'card marker-tooltip';
            tooltip.style.position = 'absolute';
            tooltip.style.display = 'none';
            tooltip.style.zIndex = '400';
            tooltip.style.top = `calc(${marker.top} + 28px)`;
            tooltip.style.left = `calc(${marker.left} - 60px)`;
            tooltip.style.width = '200px';
            tooltip.style.padding = '8px 12px';
            tooltip.innerHTML = `
                <div style="font-weight: 700; font-size: 12px; margin-bottom: 4px; color: var(--color-on-surface);">${marker.label}</div>
                <div style="font-size: 11px; color: var(--color-on-surface-variant); line-height: 1.3;">${marker.desc}</div>
            `;

            // Hover interactions
            pin.addEventListener('mouseenter', () => {
                tooltip.style.display = 'block';
                pin.style.transform = 'scale(1.25)';
            });

            pin.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
                pin.style.transform = 'scale(1)';
            });

            mapViewport.appendChild(pin);
            mapViewport.appendChild(tooltip);
        });
    }

    // Controls setup
    function initControls() {
        // Toggle Heatmap Layer
        if (toggleHeatmap) {
            toggleHeatmap.addEventListener('click', () => {
                state.heatmapActive = !state.heatmapActive;
                toggleHeatmap.classList.toggle('active', state.heatmapActive);
                
                if (state.heatmapActive) {
                    mapViewport.style.boxShadow = 'inset 0 0 100px rgba(186, 26, 26, 0.2)';
                    toggleHeatmap.style.backgroundColor = 'var(--color-surface-container-highest)';
                    window.dispatchSystemAlert('Map Layer updated', 'Heatmap overlay turned ON', 'info');
                } else {
                    mapViewport.style.boxShadow = 'none';
                    toggleHeatmap.style.backgroundColor = '';
                    window.dispatchSystemAlert('Map Layer updated', 'Heatmap overlay turned OFF', 'info');
                }
            });
        }

        // Toggle Units Layer
        if (toggleUnits) {
            toggleUnits.addEventListener('click', () => {
                state.unitsActive = !state.unitsActive;
                toggleUnits.classList.toggle('active', state.unitsActive);
                toggleUnits.style.backgroundColor = state.unitsActive ? 'var(--color-surface-container-highest)' : '';
                renderMarkers();
                window.dispatchSystemAlert('Map Layer updated', `Patrol units display ${state.unitsActive ? 'enabled' : 'hidden'}`, 'info');
            });
        }

        // Recenter Map
        if (btnRecenter) {
            btnRecenter.addEventListener('click', () => {
                mapViewport.style.transform = 'scale(1.05)';
                setTimeout(() => {
                    mapViewport.style.transform = 'scale(1)';
                }, 200);
                window.dispatchSystemAlert('Map Viewport reset', 'Recentered view on Nagpur Zero Mile Marker', 'info');
            });
        }

        // Simulate incident logic
        if (btnSimulate) {
            btnSimulate.addEventListener('click', () => {
                simulateRandomIncident();
            });
        }

        // Broadcast Alert dialog logic
        if (btnBroadcast) {
            btnBroadcast.addEventListener('click', () => {
                const alertMsg = prompt('Enter emergency text to broadcast city-wide:');
                if (alertMsg && alertMsg.trim() !== '') {
                    broadcastMessage(alertMsg.trim());
                }
            });
        }

        // Emergency Override Logic
        if (btnEmergency) {
            btnEmergency.addEventListener('click', () => {
                const confirmed = confirm('CRITICAL WARNING: Are you sure you want to trigger manual emergency override? All intersections will switch to flashing yellow.');
                if (confirmed) {
                    window.dispatchSystemAlert('Emergency Override Active', 'Manual override broadcasted. All traffic systems shifted to caution state.', 'critical');
                    btnEmergency.textContent = 'SYSTEM OVERRIDDEN';
                    btnEmergency.style.backgroundColor = 'var(--color-on-error-container)';
                    
                    // Increment Unmanned High-Risk since units are deployed in emergency mode
                    state.metrics.unmannedRisks += 2;
                    updateDashboardStats();
                }
            });
        }
    }

    // Dynamic Incident Simulator
    function simulateRandomIncident() {
        const locations = [
            { label: 'Kamptee Road Intersection', top: '22%', left: '50%', desc: 'Aggressive congestion pattern detected. Traffic speed drop > 50%.' },
            { label: 'Wardha Road Interchange', top: '75%', left: '42%', desc: 'Vehicle breakdown stalling left lane. Squad dispatch required.' },
            { label: 'Jhansi Rani Square', top: '50%', left: '30%', desc: 'Demonstration group blocking access points near Metro link.' },
            { label: 'Sadar Bazar Junction', top: '15%', left: '35%', desc: 'Signal controller communication breakdown. Manual dispatch suggested.' }
        ];

        const randomLoc = locations[Math.floor(Math.random() * locations.length)];
        
        // Add marker to list
        const newIncident = {
            id: Date.now(),
            label: randomLoc.label,
            type: 'critical',
            top: randomLoc.top,
            left: randomLoc.left,
            desc: randomLoc.desc,
            icon: 'report'
        };

        state.markers.push(newIncident);
        renderMarkers();

        // Increment incident metrics
        state.metrics.activeIncidents++;
        state.metrics.criticalIncidents++;
        state.metrics.riskScore = Math.min(100, state.metrics.riskScore + 3);
        updateDashboardStats();

        // Append to Comm Feed at the very top
        appendFeedItem(randomLoc.label, randomLoc.desc, 'High Risk', 'critical');

        // Broadcast Audio feedback
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
        // Add to Feed list
        appendFeedItem('Command Broadcast', message, 'Broadcast', 'elevated');

        // Stats update
        state.metrics.riskScore = Math.max(0, state.metrics.riskScore - 1); // Broadcast helps mitigate risk
        updateDashboardStats();

        window.dispatchSystemAlert('Broadcast Broadcasted', `Alert sent: ${message}`, 'elevated');
    }

    // Update the UI metrics cards dynamically
    function updateDashboardStats() {
        const riskScoreLabel = document.querySelector('.kpi-card:nth-child(1) .kpi-value-container span');
        const activeIncidentsLabel = document.querySelector('.kpi-card:nth-child(2) .kpi-value-container span');
        const activeIncidentsBadge = document.querySelector('.kpi-card:nth-child(2) .kpi-value-container .badge');
        const unmannedLabel = document.querySelector('.kpi-card:nth-child(4) .kpi-value-container span');

        if (riskScoreLabel) {
            riskScoreLabel.innerHTML = `${state.metrics.riskScore}<span class="text-headline-md" style="color: var(--color-outline);">/100</span>`;
        }
        if (activeIncidentsLabel) {
            activeIncidentsLabel.textContent = state.metrics.activeIncidents;
        }
        if (activeIncidentsBadge) {
            activeIncidentsBadge.textContent = `${state.metrics.criticalIncidents} Critical`;
        }
        if (unmannedLabel) {
            unmannedLabel.textContent = state.metrics.unmannedRisks;
        }
    }
});
