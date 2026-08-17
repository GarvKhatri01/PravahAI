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
    const sectorFilter  = document.getElementById('sector-filter');
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
    if (sectorFilter)  sectorFilter.addEventListener('change', renderTable);
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
});
