/* ==========================================================================
   Civic Sentinel - Incident Logs Manager (incidents.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const incidentTable = document.getElementById('incident-table-body');
    if (!incidentTable) return;

    // Simulated State Database
    let incidents = [
        { id: 'INC-7092', location: 'Zero Mile Stone', category: 'Congestion', severity: 'Critical', time: '10:42', status: 'Logged', desc: 'Average velocity dropped below 15 km/h. High spillover risk.' },
        { id: 'INC-6921', location: 'Variety Square', category: 'Accident', severity: 'Warning', time: '10:38', status: 'Dispatched', desc: 'Two vehicle collision. Eastbound lanes partially blocked. Unit 42 en-route.' },
        { id: 'INC-6810', location: 'Sadar Bazar Junction', category: 'System', severity: 'Normal', time: '10:15', status: 'Resolved', desc: 'Signal controller calibration mismatch fixed.' },
        { id: 'INC-6745', location: 'Wardha Road Interchange', category: 'Maintenance', severity: 'Normal', time: '09:30', status: 'Resolved', desc: 'Routine high-definition camera cleaning and diagnostic checks.' }
    ];

    // DOM Elements
    const searchInput = document.getElementById('incident-search');
    const categoryFilter = document.getElementById('category-filter');
    const severityFilter = document.getElementById('severity-filter');
    const logModal = document.getElementById('log-incident-modal');
    const btnOpenModal = document.getElementById('btn-open-log-modal');
    const logForm = document.getElementById('log-incident-form');
    const closeModalBtn = document.getElementById('close-log-modal-btn');
    const cancelModalBtn = document.getElementById('cancel-log-modal-btn');

    // Stats Labels
    const totalIncidentsCount = document.getElementById('total-incidents-count');
    const criticalIncidentsCount = document.getElementById('critical-incidents-count');

    // Initial render
    renderIncidents();

    // Attach listeners
    if (searchInput) searchInput.addEventListener('input', renderIncidents);
    if (categoryFilter) categoryFilter.addEventListener('change', renderIncidents);
    if (severityFilter) severityFilter.addEventListener('change', renderIncidents);
    
    if (btnOpenModal) btnOpenModal.addEventListener('click', () => logModal.classList.add('active'));
    if (closeModalBtn) closeModalBtn.addEventListener('click', hideModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', hideModal);

    if (logForm) {
        logForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveNewIncident();
        });
    }

    // Render Table Body
    function renderIncidents() {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const catVal = categoryFilter ? categoryFilter.value : 'all';
        const sevVal = severityFilter ? severityFilter.value : 'all';

        incidentTable.innerHTML = '';

        const filtered = incidents.filter(inc => {
            const matchesQuery = inc.location.toLowerCase().includes(query) || inc.id.toLowerCase().includes(query) || inc.desc.toLowerCase().includes(query);
            const matchesCategory = catVal === 'all' || inc.category === catVal;
            const matchesSeverity = sevVal === 'all' || inc.severity === sevVal;
            return matchesQuery && matchesCategory && matchesSeverity;
        });

        if (filtered.length === 0) {
            incidentTable.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: var(--color-outline); padding: var(--spacing-gutter);">No incidents logged for matching filters.</td>
                </tr>
            `;
            return;
        }

        filtered.forEach(inc => {
            const tr = document.createElement('tr');

            // Severity badge assignment
            let sevBadge = 'badge-system';
            if (inc.severity === 'Critical') sevBadge = 'badge-critical';
            else if (inc.severity === 'Warning') sevBadge = 'badge-elevated';
            else if (inc.severity === 'Normal') sevBadge = 'badge-watch';

            // Status badge assignment
            let statusBadge = 'badge-system';
            if (inc.status === 'Resolved') statusBadge = 'badge-success';
            else if (inc.status === 'Dispatched') statusBadge = 'badge-elevated';

            tr.innerHTML = `
                <td style="font-weight: 700;">${inc.id}</td>
                <td><strong style="color: var(--color-primary);">${inc.location}</strong></td>
                <td>${inc.category}</td>
                <td><span class="badge ${sevBadge}">${inc.severity}</span></td>
                <td class="text-data-tabular">${inc.time}</td>
                <td><span class="badge ${statusBadge}">${inc.status}</span></td>
                <td>
                    <div style="display: flex; gap: 6px;">
                        ${inc.status === 'Logged' ? `<button class="btn btn-primary action-dispatch" data-id="${inc.id}" style="padding: 4px 8px; font-size: 11px;">Dispatch</button>` : ''}
                        ${inc.status !== 'Resolved' ? `<button class="btn btn-secondary action-resolve" data-id="${inc.id}" style="padding: 4px 8px; font-size: 11px;">Resolve</button>` : ''}
                        ${inc.status === 'Logged' && inc.severity !== 'Critical' ? `<button class="btn btn-danger action-escalate" data-id="${inc.id}" style="padding: 4px 8px; font-size: 11px;">Escalate</button>` : ''}
                        ${inc.status === 'Resolved' ? `<span style="font-size: 11px; font-weight: 700; color: var(--color-secondary);">CLOSED</span>` : ''}
                    </div>
                </td>
            `;

            // Row Action Handlers
            const dispatchBtn = tr.querySelector('.action-dispatch');
            if (dispatchBtn) {
                dispatchBtn.addEventListener('click', (e) => {
                    const id = e.target.getAttribute('data-id');
                    updateIncidentStatus(id, 'Dispatched');
                });
            }

            const resolveBtn = tr.querySelector('.action-resolve');
            if (resolveBtn) {
                resolveBtn.addEventListener('click', (e) => {
                    const id = e.target.getAttribute('data-id');
                    updateIncidentStatus(id, 'Resolved');
                });
            }

            const escalateBtn = tr.querySelector('.action-escalate');
            if (escalateBtn) {
                escalateBtn.addEventListener('click', (e) => {
                    const id = e.target.getAttribute('data-id');
                    escalateIncidentSeverity(id);
                });
            }

            incidentTable.appendChild(tr);
        });

        // Update dashboard-wide incidents metrics
        updateMetricsLabel();
    }

    function hideModal() {
        logModal.classList.remove('active');
        logForm.reset();
    }

    function updateIncidentStatus(incId, status) {
        const inc = incidents.find(i => i.id === incId);
        if (!inc) return;

        inc.status = status;
        renderIncidents();

        // Dispatch alert system
        window.dispatchSystemAlert(
            `Incident ${status}`,
            `${inc.id} at ${inc.location} has been updated to ${status}.`,
            status === 'Resolved' ? 'info' : 'elevated'
        );
    }

    function escalateIncidentSeverity(incId) {
        const inc = incidents.find(i => i.id === incId);
        if (!inc) return;

        inc.severity = 'Critical';
        renderIncidents();

        // Dispatch alert system
        window.dispatchSystemAlert(
            'Incident Escalated',
            `Incident ${inc.id} at ${inc.location} escalated to CRITICAL severity!`,
            'critical'
        );
    }

    function saveNewIncident() {
        const locationVal = document.getElementById('incident-location').value;
        const categoryVal = document.getElementById('incident-category').value;
        const severityVal = document.getElementById('incident-severity').value;
        const descVal = document.getElementById('incident-desc').value;

        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const newIncId = `INC-${randomNum}`;

        const newInc = {
            id: newIncId,
            location: locationVal,
            category: categoryVal,
            severity: severityVal,
            time: timeStr,
            status: 'Logged',
            desc: descVal
        };

        // Prepend to array
        incidents.unshift(newInc);

        renderIncidents();
        hideModal();

        // Notify
        window.dispatchSystemAlert(
            'New Incident Logged',
            `Logged ${newIncId} (${categoryVal}) at ${locationVal}`,
            severityVal.toLowerCase()
        );
    }

    function updateMetricsLabel() {
        if (totalIncidentsCount) {
            totalIncidentsCount.textContent = incidents.filter(i => i.status !== 'Resolved').length;
        }
        if (criticalIncidentsCount) {
            criticalIncidentsCount.textContent = incidents.filter(i => i.severity === 'Critical' && i.status !== 'Resolved').length;
        }
    }
});
