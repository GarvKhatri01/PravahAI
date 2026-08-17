/* ==========================================================================
   Civic Sentinel - Incident Logs Manager (incidents.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const incidentTable = document.getElementById('incident-table-body');
    if (!incidentTable) return;

    const API = typeof PRAVAH_API !== 'undefined' ? PRAVAH_API : 'http://localhost:3000';

    // Local fallback state (used when API is unavailable)
    let incidents = [
        { incident_id: 'INC-7092', location: 'Zero Mile Stone',        category: 'Congestion',  severity: 'Critical', reported_at: new Date().toISOString(), status: 'Logged',     description: 'Average velocity dropped below 15 km/h. High spillover risk.' },
        { incident_id: 'INC-6921', location: 'Variety Square',          category: 'Accident',    severity: 'Warning',  reported_at: new Date().toISOString(), status: 'Dispatched', description: 'Two vehicle collision. Eastbound lanes partially blocked. Unit 42 en-route.' },
        { incident_id: 'INC-6810', location: 'Sadar Bazar Junction',    category: 'System',      severity: 'Normal',   reported_at: new Date().toISOString(), status: 'Resolved',   description: 'Signal controller calibration mismatch fixed.' },
        { incident_id: 'INC-6745', location: 'Wardha Road Interchange', category: 'Maintenance', severity: 'Normal',   reported_at: new Date().toISOString(), status: 'Resolved',   description: 'Routine camera cleaning and diagnostic checks.' }
    ];
    let usingAPI = false;

    // DOM Elements
    const searchInput    = document.getElementById('incident-search');
    const categoryFilter = document.getElementById('category-filter');
    const severityFilter = document.getElementById('severity-filter');
    const logModal       = document.getElementById('log-incident-modal');
    const btnOpenModal   = document.getElementById('btn-open-log-modal');
    const logForm        = document.getElementById('log-incident-form');
    const closeModalBtn  = document.getElementById('close-log-modal-btn');
    const cancelModalBtn = document.getElementById('cancel-log-modal-btn');
    const totalCount     = document.getElementById('total-incidents-count');
    const criticalCount  = document.getElementById('critical-incidents-count');

    // ── Load from API ──────────────────────────────────────────────────────
    async function loadIncidents() {
        try {
            const res  = await fetch(`${API}/api/incidents?hours=24`, { signal: AbortSignal.timeout(4000) });
            if (!res.ok) throw new Error(`API ${res.status}`);
            const data = await res.json();
            incidents  = data.incidents;
            usingAPI   = true;
        } catch {
            usingAPI = false; // silently fall back to local data
        }
        renderIncidents();
    }

    loadIncidents();

    // Attach listeners
    if (searchInput)    searchInput.addEventListener('input',    renderIncidents);
    if (categoryFilter) categoryFilter.addEventListener('change', renderIncidents);
    if (severityFilter) severityFilter.addEventListener('change', renderIncidents);

    if (btnOpenModal)   btnOpenModal.addEventListener('click',  () => logModal.classList.add('active'));
    if (closeModalBtn)  closeModalBtn.addEventListener('click',  hideModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', hideModal);

    if (logForm) {
        logForm.addEventListener('submit', (e) => { e.preventDefault(); saveNewIncident(); });
    }

    // ── Render Table ───────────────────────────────────────────────────────
    function renderIncidents() {
        const query  = searchInput    ? searchInput.value.toLowerCase().trim() : '';
        const catVal = categoryFilter ? categoryFilter.value : 'all';
        const sevVal = severityFilter ? severityFilter.value : 'all';

        incidentTable.innerHTML = '';

        const filtered = incidents.filter(inc => {
            const matchesQuery    = inc.location.toLowerCase().includes(query)
                                 || inc.incident_id.toLowerCase().includes(query)
                                 || (inc.description || '').toLowerCase().includes(query);
            const matchesCategory = catVal === 'all' || inc.category === catVal;
            const matchesSeverity = sevVal === 'all' || inc.severity === sevVal;
            return matchesQuery && matchesCategory && matchesSeverity;
        });

        if (!filtered.length) {
            incidentTable.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--color-outline); padding:var(--spacing-gutter);">No incidents found.</td></tr>`;
            updateMetrics();
            return;
        }

        filtered.forEach(inc => {
            const tr = document.createElement('tr');

            const sevBadge    = inc.severity === 'Critical' ? 'badge-critical'
                              : inc.severity === 'Warning'  ? 'badge-elevated' : 'badge-watch';
            const statusBadge = inc.status   === 'Resolved'   ? 'badge-success'
                              : inc.status   === 'Dispatched' ? 'badge-elevated' : 'badge-system';

            const time = new Date(inc.reported_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

            tr.innerHTML = `
                <td style="font-weight:700;">${inc.incident_id}</td>
                <td><strong style="color:var(--color-primary);">${inc.location}</strong></td>
                <td>${inc.category}</td>
                <td><span class="badge ${sevBadge}">${inc.severity}</span></td>
                <td class="text-data-tabular">${time}</td>
                <td><span class="badge ${statusBadge}">${inc.status}</span></td>
                <td>
                    <div style="display:flex; gap:6px;">
                        ${inc.status === 'Logged'
                            ? `<button class="btn btn-primary action-dispatch" data-id="${inc.incident_id}" style="padding:4px 8px; font-size:11px;">Dispatch</button>`
                            : ''}
                        ${inc.status !== 'Resolved'
                            ? `<button class="btn btn-secondary action-resolve" data-id="${inc.incident_id}" style="padding:4px 8px; font-size:11px;">Resolve</button>`
                            : ''}
                        ${inc.status === 'Logged' && inc.severity !== 'Critical'
                            ? `<button class="btn btn-danger action-escalate" data-id="${inc.incident_id}" style="padding:4px 8px; font-size:11px;">Escalate</button>`
                            : ''}
                        ${inc.status === 'Resolved'
                            ? `<span style="font-size:11px; font-weight:700; color:var(--color-secondary);">CLOSED</span>`
                            : ''}
                    </div>
                </td>
            `;

            tr.querySelector('.action-dispatch')?.addEventListener('click', e => updateStatus(e.target.dataset.id, 'Dispatched'));
            tr.querySelector('.action-resolve')?.addEventListener('click',  e => updateStatus(e.target.dataset.id, 'Resolved'));
            tr.querySelector('.action-escalate')?.addEventListener('click', e => escalate(e.target.dataset.id));

            incidentTable.appendChild(tr);
        });

        updateMetrics();
    }

    // ── API actions ────────────────────────────────────────────────────────
    async function updateStatus(incId, status) {
        // Optimistic local update
        const inc = incidents.find(i => i.incident_id === incId);
        if (!inc) return;
        inc.status = status;
        renderIncidents();

        if (usingAPI) {
            try {
                await fetch(`${API}/api/incidents/${incId}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                });
            } catch { /* already updated locally */ }
        }

        window.dispatchSystemAlert(`Incident ${status}`, `${incId} at ${inc.location} → ${status}`, status === 'Resolved' ? 'info' : 'elevated');
    }

    async function escalate(incId) {
        const inc = incidents.find(i => i.incident_id === incId);
        if (!inc) return;
        inc.severity = 'Critical';
        renderIncidents();

        if (usingAPI) {
            try {
                await fetch(`${API}/api/incidents/${incId}/severity`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ severity: 'Critical' })
                });
            } catch { /* already updated locally */ }
        }

        window.dispatchSystemAlert('Incident Escalated', `${incId} at ${inc.location} → CRITICAL`, 'critical');
    }

    async function saveNewIncident() {
        const location    = document.getElementById('incident-location').value;
        const category    = document.getElementById('incident-category').value;
        const severity    = document.getElementById('incident-severity').value;
        const description = document.getElementById('incident-desc').value;

        const newInc = {
            incident_id: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
            location, category, severity, description,
            status:      'Logged',
            reported_at: new Date().toISOString()
        };

        if (usingAPI) {
            try {
                const res  = await fetch(`${API}/api/incidents`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ location, category, severity, description })
                });
                const saved = await res.json();
                incidents.unshift(saved);
            } catch {
                incidents.unshift(newInc); // fallback
            }
        } else {
            incidents.unshift(newInc);
        }

        renderIncidents();
        hideModal();
        window.dispatchSystemAlert('Incident Logged', `${newInc.incident_id} (${category}) at ${location}`, severity.toLowerCase());
    }

    function hideModal() {
        logModal.classList.remove('active');
        logForm.reset();
    }

    function updateMetrics() {
        const active   = incidents.filter(i => i.status !== 'Resolved');
        const critical = active.filter(i => i.severity === 'Critical');
        if (totalCount)    totalCount.textContent    = active.length;
        if (criticalCount) criticalCount.textContent = critical.length;
    }
});


