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



/* ==========================================================================
   Backup & Auto-Assignment Log — controller view
   Loads from GET /api/backup and renders in the backup-requests section.
   Listens for WebSocket backup_auto_assigned events to auto-refresh.
   ========================================================================== */
(function initBackupLog() {
    const tbody      = document.getElementById('backup-requests-table-body');
    const badge      = document.getElementById('backup-count-badge');
    const refreshBtn = document.getElementById('btn-refresh-backup');
    if (!tbody) return;

    const API = typeof PRAVAH_API !== 'undefined' ? PRAVAH_API : 'http://localhost:3000';

    async function loadBackupRequests() {
        try {
            const res = await fetch(API + '/api/backup?hours=24', { signal: AbortSignal.timeout(5000) });
            if (!res.ok) throw new Error('API ' + res.status);
            const data = await res.json();
            renderBackupTable(data.requests || [], data.summary);
        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--color-outline);padding:24px;">Unable to load backup requests — API may be offline.</td></tr>';
            if (badge) { badge.textContent = 'Offline'; }
        }
    }

    function renderBackupTable(requests, summary) {
        if (badge && summary) {
            badge.textContent = summary.dispatched + ' dispatched · ' + summary.acknowledged + ' ack · ' + summary.resolved + ' resolved';
        }

        if (!requests.length) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--color-outline);padding:24px;">No backup requests in the last 24 hours.</td></tr>';
            return;
        }

        tbody.innerHTML = requests.map(function(req) {
            var typeIcon    = req.request_type === 'backup' ? 'support_agent' : 'emergency';
            var typeColor   = req.request_type === 'backup' ? '#1d4ed8' : '#dc2626';
            var sevClass    = req.severity === 'Critical' ? 'badge-critical' : req.severity === 'Warning' ? 'badge-elevated' : 'badge-success';
            var statusClass = req.status === 'Dispatched' ? 'badge-elevated' : req.status === 'Acknowledged' ? 'badge-system' : 'badge-success';

            var assignedList = (req.assigned_units || '').split(',').map(function(u) { return u.trim(); }).filter(Boolean);
            var officerTags  = assignedList.map(function(u) {
                var detail = (req.officer_details || []).find(function(o) { return o.unit_id === u; });
                var label  = detail ? (detail.name + ' (' + u + ')') : u;
                return '<span style="display:inline-block;background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.3);border-radius:5px;padding:2px 7px;font-size:11px;margin:1px;">' + label + '</span>';
            }).join('');

            var reportedTime = new Date(req.requested_at).toLocaleTimeString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

            var actionBtn = req.status === 'Dispatched'
                ? '<button class="btn-small" onclick="ackBackupRow(\'' + req.request_id + '\', this);" style="font-size:11px;padding:3px 9px;border-radius:5px;border:1px solid var(--color-outline);background:transparent;cursor:pointer;color:inherit;">Acknowledge</button>'
                : req.status === 'Acknowledged'
                    ? '<button class="btn-small" onclick="resolveBackupRow(\'' + req.request_id + '\', this);" style="font-size:11px;padding:3px 9px;border-radius:5px;border:1px solid var(--color-outline);background:transparent;cursor:pointer;color:inherit;">Resolve</button>'
                    : '<span style="font-size:11px;color:var(--color-outline);">—</span>';

            return '<tr>' +
                '<td><span class="text-mono" style="font-size:12px;">' + req.request_id + '</span></td>' +
                '<td>' +
                    '<span style="display:inline-flex;align-items:center;gap:4px;">' +
                    '<span class="material-symbols-outlined" style="font-size:14px;color:' + typeColor + ';">' + typeIcon + '</span>' +
                    '<span style="font-size:12px;text-transform:capitalize;">' + req.request_type + '</span>' +
                    '</span>' +
                '</td>' +
                '<td><span class="text-mono" style="font-size:12px;">' + (req.requesting_unit || '—') + '</span></td>' +
                '<td style="max-width:150px;font-size:12px;">' + (req.location || '—') + '</td>' +
                '<td><span class="badge ' + sevClass + '" style="font-size:11px;">' + req.severity + '</span></td>' +
                '<td style="max-width:220px;">' + (officerTags || '<span style="font-size:11px;color:var(--color-outline);">None</span>') + '</td>' +
                '<td style="font-size:11px;white-space:nowrap;">' + reportedTime + '</td>' +
                '<td><span class="badge ' + statusClass + '" style="font-size:11px;">' + req.status + '</span></td>' +
                '<td>' + actionBtn + '</td>' +
                '</tr>';
        }).join('');
    }

    // Status update helpers (called from table action buttons)
    window.ackBackupRow = async function(requestId, btn) {
        await updateBackupStatus(requestId, 'Acknowledged', btn);
    };
    window.resolveBackupRow = async function(requestId, btn) {
        await updateBackupStatus(requestId, 'Resolved', btn);
    };

    async function updateBackupStatus(requestId, status, btn) {
        btn.disabled    = true;
        btn.textContent = '…';
        try {
            var res = await fetch(API + '/api/backup/' + requestId + '/status', {
                method:  'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ status: status }),
                signal:  AbortSignal.timeout(5000)
            });
            if (res.ok) { loadBackupRequests(); }
            else        { btn.disabled = false; btn.textContent = status === 'Acknowledged' ? 'Acknowledge' : 'Resolve'; }
        } catch (_) {
            btn.disabled    = false;
            btn.textContent = status === 'Acknowledged' ? 'Acknowledge' : 'Resolve';
        }
    }

    // Manual refresh button
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() { loadBackupRequests(); });
    }

    // Auto-refresh on WebSocket backup events
    window.addEventListener('backup_auto_assigned_event', loadBackupRequests);

    // Initial load
    loadBackupRequests();

    // Poll every 30 seconds to catch new requests
    setInterval(loadBackupRequests, 30000);
})();
