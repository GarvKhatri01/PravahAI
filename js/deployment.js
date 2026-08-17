/* ==========================================================================
   PravahAI - Deployments & Officers Directory (deployment.js)
   Integration: Admin reassignment writes to localStorage → officer portal reads it
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const deploymentTable = document.getElementById('deployment-table-body');
    if (!deploymentTable) return;

    /* ——————————————————————————————————————————
       OFFICER DATABASE
       These 3 officers map directly to officer-portal login accounts.
       Login credentials:
         B-2247 / pravah2247  → posts at P01 (Zero Mile Stone Junction)
         B-1012 / officer1012 → posts at P02 (Variety Square)
         B-0033 / sentinel33  → posts at P03 (Sitabuldi Interchange)
       —————————————————————————————————————————— */
    const POSTS_MAP = {
        P01: 'Zero Mile Stone Junction',
        P02: 'Variety Square',
        P03: 'Sitabuldi Interchange',
    };

    let officers = [
        {
            id: 'B-2247',
            name: 'Constable R. Deshmukh',
            contact: '+91 98765 00010',
            unit: 'Squad Alpha',
            status: 'Active',
            postId: 'P01',
            // Officer portal login: B-2247 / pravah2247
        },
        {
            id: 'B-1012',
            name: 'SI A. Kulkarni',
            contact: '+91 98765 00011',
            unit: 'Squad Beta',
            status: 'Active',
            postId: 'P02',
            // Officer portal login: B-1012 / officer1012
        },
        {
            id: 'B-0033',
            name: 'Inspector V. Bendre',
            contact: '+91 98765 00012',
            unit: 'Squad Gamma',
            status: 'Active',
            postId: 'P03',
            // Officer portal login: B-0033 / sentinel33
        },
    ];

    // DOM
    const searchInput   = document.getElementById('officer-search');
    const statusFilter  = document.getElementById('status-filter');
    const reassignModal = document.getElementById('reassign-modal');
    const reassignForm  = document.getElementById('reassign-form');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelModalBtn = document.getElementById('cancel-modal-btn');

    let currentEditingOfficerId = null;

    // Initial render
    renderTable();

    // Listeners
    if (searchInput)   searchInput.addEventListener('input', renderTable);
    if (statusFilter)  statusFilter.addEventListener('change', renderTable);
    if (closeModalBtn) closeModalBtn.addEventListener('click', hideModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', hideModal);

    if (reassignForm) {
        reassignForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveReassignment();
        });
    }

    /* ——————————————————————————————————————————
       RENDER TABLE
       —————————————————————————————————————————— */
    function renderTable() {
        const query     = searchInput  ? searchInput.value.toLowerCase().trim() : '';
        const statusVal = statusFilter ? statusFilter.value : 'all';

        deploymentTable.innerHTML = '';

        const filtered = officers.filter(officer => {
            const matchesQuery  = officer.name.toLowerCase().includes(query) || officer.id.toLowerCase().includes(query);
            const matchesStatus = statusVal === 'all' || officer.status === statusVal;
            return matchesQuery && matchesStatus;
        });


        if (filtered.length === 0) {
            deploymentTable.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: var(--color-outline); padding: var(--spacing-gutter);">No officers matching filter criteria found.</td>
                </tr>`;
            return;
        }

        filtered.forEach(officer => {
            const tr = document.createElement('tr');

            let badgeClass = 'badge-system';
            if (officer.status === 'Active')   badgeClass = 'badge-success';
            else if (officer.status === 'Off-Duty') badgeClass = 'badge-system';

            const postName = POSTS_MAP[officer.postId] || officer.postId;

            // Check if there's a pending reassignment for this officer not yet arrived
            const pendingKey = `pravah_reassign_${officer.id}`;
            const pending    = localStorage.getItem(pendingKey);
            const pendingPost = pending ? JSON.parse(pending) : null;

            const postDisplay = pendingPost
                ? `<div style="font-weight:700; color:var(--color-error);">
                       ${postName} <span style="font-size:10px; font-weight:600;">(current)</span>
                   </div>
                   <div style="font-size:11px; color:var(--color-error); font-weight:600;">
                       → En route: ${POSTS_MAP[pendingPost.postId] || pendingPost.postId}
                   </div>`
                : `<div style="font-weight:600; color:var(--color-primary);">${postName}</div>`;

            tr.innerHTML = `
                <td style="font-weight: 700;">${officer.id}</td>
                <td>
                    <div style="font-weight: 600;">${officer.name}</div>
                    <div style="font-size: 11px; color: var(--color-on-surface-variant);">${officer.contact}</div>
                </td>
                <td>${postDisplay}</td>
                <td>${officer.unit}</td>
                <td><span class="badge ${badgeClass}">${officer.status}</span></td>
                <td>
                    <button class="btn btn-ghost reassign-btn" data-id="${officer.id}" style="padding: 4px 10px; font-size: 11px;">
                        <span class="material-symbols-outlined" style="font-size:14px;">edit_location</span>
                        Reassign
                    </button>
                    <a href="officer-portal/dashboard.html" target="_blank"
                       style="font-size:11px; color:var(--color-primary); text-decoration:none; font-weight:700; margin-left:8px;"
                       title="View officer's live dashboard">
                        <span class="material-symbols-outlined" style="font-size:14px; vertical-align:middle;">open_in_new</span>
                        View Portal
                    </a>
                </td>`;

            tr.querySelector('.reassign-btn').addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                showReassignModal(id);
            });

            deploymentTable.appendChild(tr);
        });

        updateStatsSummary();
    }

    /* ——————————————————————————————————————————
       MODAL — show
       —————————————————————————————————————————— */
    function showReassignModal(officerId) {
        const officer = officers.find(o => o.id === officerId);
        if (!officer) return;

        currentEditingOfficerId = officerId;

        document.getElementById('reassign-officer-name').textContent = officer.name;

        // Pre-select current post
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
       Writes to localStorage so the officer portal
       can react in real time (cross-tab communication).
       —————————————————————————————————————————— */
    function saveReassignment() {
        const officer = officers.find(o => o.id === currentEditingOfficerId);
        if (!officer) return;

        const newPostId = document.getElementById('reassign-post').value;
        const newUnit   = document.getElementById('reassign-unit').value;
        const reason    = document.getElementById('reassign-reason').value.trim()
                       || 'Emergency redeployment required by Command';

        const oldPostId = officer.postId;

        // Update admin state
        officer.postId = newPostId;
        officer.unit   = newUnit;
        officer.status = 'Active';

        // ← THE INTEGRATION POINT →
        // Write the reassignment signal to localStorage.
        // The officer portal dashboard.js polls this key and triggers the crisis modal.
        const signal = {
            officerId: officer.id,
            postId:    newPostId,
            reason:    reason,
            timestamp: Date.now(),
        };
        localStorage.setItem(`pravah_reassign_${officer.id}`, JSON.stringify(signal));

        // Also write to a generic channel so officer portal can listen via storage event
        localStorage.setItem('pravah_latest_reassign', JSON.stringify(signal));

        renderTable();
        hideModal();

        window.dispatchSystemAlert(
            'Officer Reassigned',
            `${officer.name} → ${POSTS_MAP[newPostId]} (${newUnit}). Reason: ${reason}`,
            'info'
        );
    }

    /* ——————————————————————————————————————————
       STATS SUMMARY
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

        // Initialize Leaflet Map for Section 6.4
        const allocMap = L.map('allocation-map', { zoomControl: true }).setView([21.1458, 79.0882], 13);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap © CARTO'
        }).addTo(allocMap);

        // Elements
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

        // Summary elements
        const summaryRisk    = document.getElementById('alloc-summary-risk');
        const summaryOff     = document.getElementById('alloc-summary-officers');
        const summarySpots   = document.getElementById('alloc-summary-hotspots');
        const summaryDist    = document.getElementById('alloc-summary-dist');
        const summaryLocked  = document.getElementById('alloc-summary-locked-cnt');
        const backendBadge   = document.getElementById('engine-backend-badge');
        const tableBody      = document.getElementById('allocation-table-body');

        // Strategy Button Segmented Control Handler
        if (strategyBtns.length > 0) {
            strategyBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    strategyBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    const val = btn.getAttribute('data-value');
                    if (strategySelect) strategySelect.value = val;
                    triggerAllocation();
                });
            });
        }

        if (alphaSlider && alphaLabel) {
            alphaSlider.addEventListener('input', () => {
                const val = parseFloat(alphaSlider.value);
                let text = `${val.toFixed(2)}`;
                if (val === 0.2) text += ' (Dist Priority)';
                else if (val === 0.5) text += ' (Balanced)';
                else if (val > 0.5) text += ' (Risk Priority)';
                else text += ' (Dist Priority)';
                alphaLabel.textContent = text;
            });
        }

        if (radiusSlider && radiusLabel) {
            radiusSlider.addEventListener('input', () => {
                const val = radiusSlider.value;
                radiusLabel.textContent = `${val} km`;
                if (radiusInput) radiusInput.value = val;
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
                runBtn.innerHTML = `<span class="material-symbols-outlined spin" style="font-size: 18px;">sync</span> Calculating...`;
            }

            const strategy = strategySelect ? strategySelect.value : 'dynamic_priority_6_5';
            const alpha    = alphaSlider ? parseFloat(alphaSlider.value) : 0.2;
            const maxRad   = radiusSlider ? parseFloat(radiusSlider.value) : 15.0;
            const lockThresh = lockSlider ? parseFloat(lockSlider.value) : 70.0;

            const payload = {
                officers: AllocationVisualizer.DEFAULT_OFFICERS,
                locations: AllocationVisualizer.DEFAULT_HOTSPOTS,
                strategy: strategy,
                alpha: alpha,
                default_max_radius_km: maxRad,
                high_risk_threshold: lockThresh
            };

            const result = await AllocationVisualizer.requestAllocation(payload);

            if (runBtn) {
                runBtn.disabled = false;
                runBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 18px;">bolt</span> Run Allocation Optimizer`;
            }

            // Count locked officers
            const lockedCount = result.assignments.filter(a => a.protection_status === 'locked_high_risk_post').length;

            // Update UI Badges & Summary
            if (summaryRisk)   summaryRisk.textContent = result.summary.total_risk_covered;
            if (summaryOff)    summaryOff.textContent = `${result.summary.assigned_officers} / ${result.summary.total_officers}`;
            if (summarySpots)  summarySpots.textContent = `${result.summary.covered_locations} / ${result.summary.total_locations}`;
            if (summaryDist)   summaryDist.textContent = `${result.summary.average_travel_distance_km} km`;
            if (summaryLocked) summaryLocked.textContent = `${lockedCount} High-Risk Posts Locked`;
            
            if (backendBadge && result._backend) {
                backendBadge.textContent = result._backend;
                backendBadge.className = result._backend.includes('Python') ? 'badge badge-success' : 'badge badge-warning';
            }

            // Update KPI top row card
            const kpiCovered = document.getElementById('kpi-risk-covered');
            if (kpiCovered) kpiCovered.textContent = result.summary.total_risk_covered;

            // Render Leaflet visualization
            AllocationVisualizer.renderMapVisualization(allocMap, result);

            // Render Table Rows
            if (tableBody) {
                tableBody.innerHTML = '';
                if (result.assignments.length === 0) {
                    tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--color-outline); padding: 20px;">No assignments satisfied distance threshold constraints.</td></tr>`;
                    return;
                }

                result.assignments.forEach(asgn => {
                    const tr = document.createElement('tr');
                    const isLocked = asgn.protection_status === 'locked_high_risk_post';
                    const badgeHtml = isLocked
                        ? `<span class="badge-locked"><span class="material-symbols-outlined" style="font-size:12px">lock</span> Locked High Risk Post</span>`
                        : `<span class="badge-dispatched"><span class="material-symbols-outlined" style="font-size:12px">bolt</span> Dynamic Dispatch</span>`;

                    tr.innerHTML = `
                        <td>
                            <strong style="color: var(--color-primary);">${asgn.officer_id}</strong><br/>
                            <span style="font-size: 11px; color: var(--color-on-surface-variant); font-weight: 500;">${asgn.officer_name}</span>
                        </td>
                        <td><code style="font-size: 11px; background: var(--color-surface-container); padding: 2px 4px; border-radius: 4px;">${asgn.officer_start[0].toFixed(4)}, ${asgn.officer_start[1].toFixed(4)}</code></td>
                        <td>
                            <strong style="color: var(--color-on-surface);">${asgn.location_name}</strong><br/>
                            <span style="font-size: 11px; color: var(--color-outline);">${asgn.location_id}</span>
                        </td>
                        <td><code style="font-size: 11px; background: var(--color-surface-container); padding: 2px 4px; border-radius: 4px;">${asgn.location_coords[0].toFixed(4)}, ${asgn.location_coords[1].toFixed(4)}</code></td>
                        <td><span class="badge badge-success" style="font-weight: 800; font-size: 12px;">${asgn.risk_score}</span></td>
                        <td><strong style="font-size: 13px;">${asgn.distance_km} km</strong></td>
                        <td>${badgeHtml}</td>
                    `;
                    tableBody.appendChild(tr);
                });
            }
        }

        // Attach run button event
        if (runBtn) runBtn.addEventListener('click', triggerAllocation);

        // Initial run
        setTimeout(triggerAllocation, 300);
    }
});

