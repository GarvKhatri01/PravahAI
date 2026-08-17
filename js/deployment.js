/* ==========================================================================
   PravahAI - Deployments & Officers Directory (deployment.js)
   Integration: Admin reassignment writes to localStorage → officer portal reads it
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const deploymentTable = document.getElementById('deployment-table-body');
    if (!deploymentTable) return;

    /* ——————————————————————————————————————————
       POST LOCATIONS — matches allocationVisualizer.js hotspots
       —————————————————————————————————————————— */
    const POSTS_MAP = {
        LOC_01: 'Zero Mile Stone Junction',
        LOC_02: 'Variety Square Interchange',
        LOC_03: 'Sitabuldi Metro Interchange',
        LOC_04: 'Wardha Road Express Corridor',
        LOC_05: 'Dharampeth Commercial Market',
        LOC_06: 'Central Railway Station West Gate',
        LOC_07: 'Sadar Bazaar Promenade',
    };

    /* ——————————————————————————————————————————
       OFFICER ROSTER
       Login credentials:
         U-001 / pravah001 → LOC_01 (Zero Mile Stone Junction)
         U-002 / pravah002 → LOC_02 (Variety Square Interchange)
         U-003 / pravah003 → LOC_03 (Sitabuldi Metro Interchange)
         U-004 / pravah004 → LOC_04 (Wardha Road Express Corridor)
         U-005 / pravah005 → LOC_05 (Dharampeth Commercial Market)
         U-006 / pravah006 → LOC_06 (Central Railway Station West Gate)
         U-008 / pravah008 → LOC_07 (Sadar Bazaar Promenade)
       —————————————————————————————————————————— */
    let officers = [
        { id: 'U-001', name: 'Insp. Sanjay Patil',     contact: '+91 98700 10001', unit: 'Squad Alpha',   status: 'Active', postId: 'LOC_01' },
        { id: 'U-002', name: 'SI Ramesh Kumar',         contact: '+91 98700 10002', unit: 'Squad Beta',    status: 'Active', postId: 'LOC_02' },
        { id: 'U-003', name: 'Const. Priya Deshpande',  contact: '+91 98700 10003', unit: 'Squad Alpha',   status: 'Active', postId: 'LOC_03' },
        { id: 'U-004', name: 'Insp. Amit Thakur',       contact: '+91 98700 10004', unit: 'Squad Gamma',   status: 'Active', postId: 'LOC_04' },
        { id: 'U-005', name: 'SI Neha Joshi',           contact: '+91 98700 10005', unit: 'Squad Beta',    status: 'Active', postId: 'LOC_05' },
        { id: 'U-006', name: 'Const. Vikram Rao',       contact: '+91 98700 10006', unit: 'Squad Gamma',   status: 'Active', postId: 'LOC_06' },
        { id: 'U-008', name: 'Const. Sunita Borde',     contact: '+91 98700 10008', unit: 'Squad Alpha',   status: 'Active', postId: 'LOC_07' },
    ];

    // DOM elements
    const searchInput    = document.getElementById('officer-search');
    const statusFilter   = document.getElementById('status-filter');
    const reassignModal  = document.getElementById('reassign-modal');
    const reassignForm   = document.getElementById('reassign-form');
    const closeModalBtn  = document.getElementById('close-modal-btn');
    const cancelModalBtn = document.getElementById('cancel-modal-btn');

    let currentEditingOfficerId = null;

    renderTable();

    if (searchInput)    searchInput.addEventListener('input', renderTable);
    if (statusFilter)   statusFilter.addEventListener('change', renderTable);
    if (closeModalBtn)  closeModalBtn.addEventListener('click', hideModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', hideModal);
    if (reassignForm)   reassignForm.addEventListener('submit', (e) => { e.preventDefault(); saveReassignment(); });

    /* ——————————————————————————————————————————
       RENDER TABLE
       —————————————————————————————————————————— */
    function renderTable() {
        const query     = searchInput  ? searchInput.value.toLowerCase().trim() : '';
        const statusVal = statusFilter ? statusFilter.value : 'all';

        deploymentTable.innerHTML = '';

        const filtered = officers.filter(o => {
            const matchesQuery  = o.name.toLowerCase().includes(query) || o.id.toLowerCase().includes(query);
            const matchesStatus = statusVal === 'all' || o.status === statusVal;
            return matchesQuery && matchesStatus;
        });

        if (filtered.length === 0) {
            deploymentTable.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;color:var(--color-outline);padding:var(--spacing-gutter);">No officers matching filter criteria found.</td>
                </tr>`;
            return;
        }

        filtered.forEach(officer => {
            const tr = document.createElement('tr');

            const badgeClass = officer.status === 'Active' ? 'badge-success' : 'badge-system';
            const postName   = POSTS_MAP[officer.postId] || officer.postId;

            // Show "En Route" if admin reassignment is pending and officer hasn't arrived yet
            const pendingRaw  = localStorage.getItem(`pravah_reassign_${officer.id}`);
            const pendingPost = pendingRaw ? JSON.parse(pendingRaw) : null;

            const postDisplay = pendingPost
                ? `<div style="font-weight:700;color:var(--color-error);">${postName} <span style="font-size:10px;">(current)</span></div>
                   <div style="font-size:11px;color:var(--color-error);font-weight:600;">→ En route: ${POSTS_MAP[pendingPost.postId] || pendingPost.postId}</div>`
                : `<div style="font-weight:600;color:var(--color-primary);">${postName}</div>`;

            tr.innerHTML = `
                <td style="font-weight:700;">${officer.id}</td>
                <td>
                    <div style="font-weight:600;">${officer.name}</div>
                    <div style="font-size:11px;color:var(--color-on-surface-variant);">${officer.contact}</div>
                </td>
                <td>${postDisplay}</td>
                <td>${officer.unit}</td>
                <td><span class="badge ${badgeClass}">${officer.status}</span></td>
                <td>
                    <button class="btn btn-ghost reassign-btn" data-id="${officer.id}" style="padding:4px 10px;font-size:11px;">
                        <span class="material-symbols-outlined" style="font-size:14px;">edit_location</span>
                        Reassign
                    </button>
                    <a href="officer-portal/dashboard.html" target="_blank"
                       style="font-size:11px;color:var(--color-primary);text-decoration:none;font-weight:700;margin-left:8px;"
                       title="View officer's live dashboard">
                        <span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;">open_in_new</span>
                        View Portal
                    </a>
                </td>`;

            tr.querySelector('.reassign-btn').addEventListener('click', (e) => {
                showReassignModal(e.currentTarget.getAttribute('data-id'));
            });

            deploymentTable.appendChild(tr);
        });

        updateStatsSummary();
    }

    /* ——————————————————————————————————————————
       MODAL
       —————————————————————————————————————————— */
    function showReassignModal(officerId) {
        const officer = officers.find(o => o.id === officerId);
        if (!officer) return;
        currentEditingOfficerId = officerId;

        document.getElementById('reassign-officer-name').textContent = officer.name;

        const postSelect = document.getElementById('reassign-post');
        if (postSelect) postSelect.value = officer.postId;

        const unitSelect = document.getElementById('reassign-unit');
        if (unitSelect) unitSelect.value = officer.unit;

        const reasonInput = document.getElementById('reassign-reason');
        if (reasonInput) reasonInput.value = '';

        reassignModal.classList.add('active');
    }

    function hideModal() {
        reassignModal.classList.remove('active');
        currentEditingOfficerId = null;
    }

    /* ——————————————————————————————————————————
       SAVE REASSIGNMENT
       Writes to localStorage → officer portal reads it in real time
       —————————————————————————————————————————— */
    function saveReassignment() {
        const officer = officers.find(o => o.id === currentEditingOfficerId);
        if (!officer) return;

        const newPostId = document.getElementById('reassign-post').value;
        const newUnit   = document.getElementById('reassign-unit').value;
        const reason    = (document.getElementById('reassign-reason').value.trim())
                        || 'Emergency redeployment required by Command';

        officer.postId = newPostId;
        officer.unit   = newUnit;
        officer.status = 'Active';

        // Signal for the specific officer (individual poll)
        const signal = { officerId: officer.id, postId: newPostId, reason, timestamp: Date.now() };
        localStorage.setItem(`pravah_reassign_${officer.id}`, JSON.stringify(signal));

        // Broadcast channel (storage event for cross-tab)
        localStorage.setItem('pravah_latest_reassign', JSON.stringify(signal));

        renderTable();
        hideModal();

        if (typeof window.dispatchSystemAlert === 'function') {
            window.dispatchSystemAlert(
                'Officer Reassigned',
                `${officer.name} → ${POSTS_MAP[newPostId]} (${newUnit}). Reason: ${reason}`,
                'info'
            );
        }
    }

    /* ——————————————————————————————————————————
       KPI STATS SUMMARY
       —————————————————————————————————————————— */
    function updateStatsSummary() {
        const activeCount = officers.filter(o => o.status === 'Active').length;

        const countSpan = document.getElementById('active-officers-count');
        if (countSpan) countSpan.textContent = activeCount;

        const pctSpan = document.getElementById('active-deployment-pct');
        if (pctSpan) {
            const total = officers.filter(o => o.status !== 'Off-Duty').length;
            const pct   = total > 0 ? Math.round((activeCount / total) * 100) : 0;
            pctSpan.textContent = `${pct}% Deployment`;
        }
    }

    /* ——————————————————————————————————————————
       SECTION 6.4 PERSONNEL ALLOCATION INTEGRATION
       —————————————————————————————————————————— */
    initSection64Allocation();

    function initSection64Allocation() {
        const mapContainer = document.getElementById('allocation-map');
        if (!mapContainer || typeof L === 'undefined' || typeof AllocationVisualizer === 'undefined') return;

        const allocMap = L.map('allocation-map', { zoomControl: true }).setView([21.1458, 79.0882], 13);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19, attribution: '© OpenStreetMap © CARTO'
        }).addTo(allocMap);

        const strategySelect = document.getElementById('alloc-strategy');
        const strategyBtns   = document.querySelectorAll('.strategy-btn');
        const alphaSlider    = document.getElementById('alloc-alpha');
        const alphaLabel     = document.getElementById('alpha-val-label');
        const radiusSlider   = document.getElementById('alloc-radius-slider');
        const radiusLabel    = document.getElementById('radius-val-label');
        const radiusInput    = document.getElementById('alloc-radius');
        const lockSlider     = document.getElementById('alloc-lock-slider');
        const lockLabel      = document.getElementById('lock-val-label');
        const runBtn         = document.getElementById('btn-run-allocation');
        const summaryRisk    = document.getElementById('alloc-summary-risk');
        const summaryOff     = document.getElementById('alloc-summary-officers');
        const summarySpots   = document.getElementById('alloc-summary-hotspots');
        const summaryDist    = document.getElementById('alloc-summary-dist');
        const summaryLocked  = document.getElementById('alloc-summary-locked-cnt');
        const backendBadge   = document.getElementById('engine-backend-badge');
        const tableBody      = document.getElementById('allocation-table-body');

        if (strategyBtns.length > 0) {
            strategyBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    strategyBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    if (strategySelect) strategySelect.value = btn.getAttribute('data-value');
                    triggerAllocation();
                });
            });
        }

        if (alphaSlider && alphaLabel) {
            alphaSlider.addEventListener('input', () => {
                const val = parseFloat(alphaSlider.value);
                let text = `${val.toFixed(2)}`;
                if (val === 0.5) text += ' (Balanced)';
                else if (val > 0.5) text += ' (Risk Priority)';
                else text += ' (Dist Priority)';
                alphaLabel.textContent = text;
            });
        }
        if (radiusSlider && radiusLabel) {
            radiusSlider.addEventListener('input', () => {
                radiusLabel.textContent = `${radiusSlider.value} km`;
                if (radiusInput) radiusInput.value = radiusSlider.value;
            });
        }
        if (lockSlider && lockLabel) {
            lockSlider.addEventListener('input', () => {
                lockLabel.textContent = `${parseFloat(lockSlider.value).toFixed(1)} Risk`;
            });
        }

        async function triggerAllocation() {
            if (runBtn) {
                runBtn.disabled = true;
                runBtn.innerHTML = `<span class="material-symbols-outlined spin" style="font-size:18px;">sync</span> Calculating...`;
            }

            const strategy   = strategySelect ? strategySelect.value : 'dynamic_priority_6_5';
            const alpha      = alphaSlider    ? parseFloat(alphaSlider.value)  : 0.2;
            const maxRad     = radiusSlider   ? parseFloat(radiusSlider.value) : 15.0;
            const lockThresh = lockSlider     ? parseFloat(lockSlider.value)   : 70.0;

            const payload = {
                officers: AllocationVisualizer.DEFAULT_OFFICERS,
                locations: AllocationVisualizer.DEFAULT_HOTSPOTS,
                strategy, alpha,
                default_max_radius_km: maxRad,
                high_risk_threshold: lockThresh
            };

            const result = await AllocationVisualizer.requestAllocation(payload);

            if (runBtn) {
                runBtn.disabled = false;
                runBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px;">bolt</span> Run Allocation Optimizer`;
            }

            const lockedCount = result.assignments.filter(a => a.protection_status === 'locked_high_risk_post').length;

            if (summaryRisk)   summaryRisk.textContent   = result.summary.total_risk_covered;
            if (summaryOff)    summaryOff.textContent     = `${result.summary.assigned_officers} / ${result.summary.total_officers}`;
            if (summarySpots)  summarySpots.textContent   = `${result.summary.covered_locations} / ${result.summary.total_locations}`;
            if (summaryDist)   summaryDist.textContent    = `${result.summary.average_travel_distance_km} km`;
            if (summaryLocked) summaryLocked.textContent  = `${lockedCount} High-Risk Posts Locked`;

            if (backendBadge && result._backend) {
                backendBadge.textContent = result._backend;
                backendBadge.className   = result._backend.includes('Python') ? 'badge badge-success' : 'badge badge-warning';
            }

            const kpiCovered = document.getElementById('kpi-risk-covered');
            if (kpiCovered) kpiCovered.textContent = result.summary.total_risk_covered;

            AllocationVisualizer.renderMapVisualization(allocMap, result);

            if (tableBody) {
                tableBody.innerHTML = '';
                if (result.assignments.length === 0) {
                    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--color-outline);padding:20px;">No assignments satisfied distance threshold constraints.</td></tr>`;
                    return;
                }
                result.assignments.forEach(asgn => {
                    const tr = document.createElement('tr');
                    const isLocked   = asgn.protection_status === 'locked_high_risk_post';
                    const badgeHtml  = isLocked
                        ? `<span class="badge-locked"><span class="material-symbols-outlined" style="font-size:12px">lock</span> Locked High Risk Post</span>`
                        : `<span class="badge-dispatched"><span class="material-symbols-outlined" style="font-size:12px">bolt</span> Dynamic Dispatch</span>`;
                    tr.innerHTML = `
                        <td><strong style="color:var(--color-primary);">${asgn.officer_id}</strong><br/>
                            <span style="font-size:11px;color:var(--color-on-surface-variant);font-weight:500;">${asgn.officer_name}</span></td>
                        <td><code style="font-size:11px;background:var(--color-surface-container);padding:2px 4px;border-radius:4px;">${asgn.officer_start[0].toFixed(4)}, ${asgn.officer_start[1].toFixed(4)}</code></td>
                        <td><strong style="color:var(--color-on-surface);">${asgn.location_name}</strong><br/>
                            <span style="font-size:11px;color:var(--color-outline);">${asgn.location_id}</span></td>
                        <td><code style="font-size:11px;background:var(--color-surface-container);padding:2px 4px;border-radius:4px;">${asgn.location_coords[0].toFixed(4)}, ${asgn.location_coords[1].toFixed(4)}</code></td>
                        <td><span class="badge badge-success" style="font-weight:800;font-size:12px;">${asgn.risk_score}</span></td>
                        <td><strong style="font-size:13px;">${asgn.distance_km} km</strong></td>
                        <td>${badgeHtml}</td>`;
                    tableBody.appendChild(tr);
                });
            }
        }

        if (runBtn) runBtn.addEventListener('click', triggerAllocation);
        setTimeout(triggerAllocation, 300);
    }
});
