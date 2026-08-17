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
        LOC_08: 'Mihan IT Park Flyover',
        LOC_09: 'Automotive Square Kanhan Road',
        LOC_10: 'Kalamna Grain Market Junction',
        LOC_11: 'Medical College Hospital Square',
        LOC_12: 'Nagpur International Airport Gate',
        LOC_13: 'Manewada Ring Road Square',
        LOC_14: 'Mankapur Sports Complex Crossing',
        LOC_15: 'Amravati Road Bypass Junction',
        LOC_16: 'Reshimbagh Ground Area',
        LOC_17: 'Lakadganj Industrial Corridor',
        LOC_18: 'Ramdaspeth Multi-Specialty Belt',
        LOC_19: 'VNIT Engineering Campus Gate',
        LOC_20: 'Koradi Temple Pilgrimage Route',
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
        { id: 'OFF_01', name: 'Squad Alpha (Insp. Patil)',              lat: 21.1458, lon: 79.0882, unit: 'Squad Alpha',    status: 'Active', postId: 'LOC_01', contact: '+91 98700 00101' },
        { id: 'OFF_02', name: 'Squad Beta (SI Kulkarni)',                lat: 21.1430, lon: 79.0820, unit: 'Squad Beta',     status: 'Active', postId: 'LOC_02', contact: '+91 98700 00102' },
        { id: 'OFF_03', name: 'Squad Gamma (Const. Deshmukh)',           lat: 21.1550, lon: 79.0750, unit: 'Squad Gamma',    status: 'Active', postId: 'LOC_03', contact: '+91 98700 00103' },
        { id: 'OFF_04', name: 'Patrol Delta (SI Bendre)',                lat: 21.1350, lon: 79.0980, unit: 'Patrol Delta',   status: 'Active', postId: 'LOC_04', contact: '+91 98700 00104' },
        { id: 'OFF_05', name: 'Tactical Echo (Insp. Joshi)',             lat: 21.1620, lon: 79.0920, unit: 'Tactical Echo',  status: 'Active', postId: 'LOC_05', contact: '+91 98700 00105' },
        { id: 'OFF_06', name: 'Reserve Foxtrot (Const. Rao)',            lat: 21.1280, lon: 79.0700, unit: 'Reserve',        status: 'Active', postId: 'LOC_06', contact: '+91 98700 00106' },
        { id: 'OFF_07', name: 'Highway Mobile 1 (SI Shinde)',            lat: 21.1020, lon: 79.0480, unit: 'Highway Unit',   status: 'Active', postId: 'LOC_07', contact: '+91 98700 00107' },
        { id: 'OFF_08', name: 'North Sector QRT (Insp. Wagh)',           lat: 21.1820, lon: 79.0850, unit: 'QRT North',      status: 'Active', postId: 'LOC_08', contact: '+91 98700 00108' },
        { id: 'OFF_09', name: 'East Precinct Squad (SI Jadhav)',         lat: 21.1480, lon: 79.1250, unit: 'East Precinct',  status: 'Active', postId: 'LOC_09', contact: '+91 98700 00109' },
        { id: 'OFF_10', name: 'South Patrol Unit (Const. Chavan)',       lat: 21.0950, lon: 79.0620, unit: 'South Patrol',   status: 'Active', postId: 'LOC_10', contact: '+91 98700 00110' },
        { id: 'OFF_11', name: 'Traffic Control Alpha (Insp. More)',      lat: 21.1390, lon: 79.0550, unit: 'Traffic Alpha',  status: 'Active', postId: 'LOC_11', contact: '+91 98700 00111' },
        { id: 'OFF_12', name: 'Metro Security Unit (SI Pawar)',          lat: 21.1500, lon: 79.0880, unit: 'Metro Sec',      status: 'Active', postId: 'LOC_12', contact: '+91 98700 00112' },
        { id: 'OFF_13', name: 'Airport Rapid Response (Insp. Sawant)',   lat: 21.0920, lon: 79.0500, unit: 'Airport RR',     status: 'Active', postId: 'LOC_13', contact: '+91 98700 00113' },
        { id: 'OFF_14', name: 'West Suburb Patrol (SI Kadam)',           lat: 21.1680, lon: 79.0400, unit: 'West Suburb',    status: 'Active', postId: 'LOC_14', contact: '+91 98700 00114' },
        { id: 'OFF_15', name: 'Central Reserve Squad (Const. Gaikwad)',  lat: 21.1410, lon: 79.0800, unit: 'Central Res',    status: 'Active', postId: 'LOC_15', contact: '+91 98700 00115' },
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
            const pendingPostId = officer._pendingPostId || null;
            const postDisplay = pendingPostId
                ? `<div style="font-weight:700;color:var(--color-error);">${postName} <span style="font-size:10px;">(current)</span></div>
                   <div style="font-size:11px;color:var(--color-error);font-weight:600;display:flex;align-items:center;gap:4px;">
                       <span class="material-symbols-outlined" style="font-size:13px;">directions_car</span>
                       En route &rarr; ${POSTS_MAP[pendingPostId] || pendingPostId}
                   </div>`
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

        // Store the pending post ID separately — don't update officer.postId yet.
        // Admin table shows "En Route" until officer confirms arrival.
        officer._pendingPostId = newPostId;
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
       ARRIVAL LISTENER
       Polls localStorage for pravah_arrived written by officer portal
       when officer clicks "Mark Arrived" on dashboard.
       Updates officer's postId to the confirmed new location.
       —————————————————————————————————————————— */
    let _lastArrivedTimestamp = 0;

    function initArrivalListener() {
        function checkArrival() {
            const raw = localStorage.getItem('pravah_arrived');
            if (!raw) return;
            let signal;
            try { signal = JSON.parse(raw); } catch { return; }

            // Only process signals newer than last seen
            if (!signal || signal.timestamp <= _lastArrivedTimestamp) return;
            _lastArrivedTimestamp = signal.timestamp;

            const officer = officers.find(o => o.id === signal.officerId);
            if (!officer) return;

            // Confirm the new post
            officer.postId         = signal.postId;
            officer._pendingPostId = null;

            // Clear the pending reassign signal
            localStorage.removeItem(`pravah_reassign_${officer.id}`);

            // Re-render table to show new confirmed post
            renderTable();

            // Update map marker label if map is running
            if (window._deployMap && window._deployMarkers) {
                const marker  = window._deployMarkers[officer.id];
                const postName = POSTS_MAP[signal.postId] || signal.postId;
                if (marker) {
                    marker.setPopupContent(
                        buildPopupHTML(officer, postName)
                    );
                }
            }

            // Show a toast in admin portal
            showAdminToast(`✅ ${officer.name} has arrived at ${POSTS_MAP[signal.postId] || signal.postId}`);
        }

        // Poll every 3 seconds
        setInterval(checkArrival, 3000);

        // Also react instantly to cross-tab storage events
        window.addEventListener('storage', (e) => {
            if (e.key === 'pravah_arrived') checkArrival();
        });
    }

    initArrivalListener();

    /* Simple toast for admin portal */
    function showAdminToast(msg) {
        let toast = document.getElementById('admin-arrival-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'admin-arrival-toast';
            toast.style.cssText = `
                position: fixed; bottom: 24px; right: 24px; z-index: 9999;
                background: #002046; color: #fff;
                padding: 12px 20px; border-radius: 10px;
                font-size: 13px; font-weight: 600;
                box-shadow: 0 6px 24px rgba(0,0,0,0.22);
                display: flex; align-items: center; gap: 10px;
                transition: opacity 0.4s ease, transform 0.4s ease;
                opacity: 0; transform: translateY(12px);
            `;
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(12px)';
        }, 4000);
    }

    /* Helper: build Leaflet popup HTML for a given officer + postName */
    function buildPopupHTML(officer, postName) {
        const badgeColor = officer.status === 'Active' ? '#1b6d24' : '#74777f';
        return `
            <div style="font-family: Inter, sans-serif; padding: 6px 2px; min-width: 200px;">
                <div style="font-weight: 800; font-size: 13px; color: #002046; margin-bottom: 6px;">${officer.name}</div>
                <div style="display: flex; flex-direction: column; gap: 3px; font-size: 11px; color: #444;">
                    <div><strong>Unit ID:</strong> ${officer.id}</div>
                    <div><strong>Post:</strong> ${postName}</div>
                    <div><strong>Squad:</strong> ${officer.unit}</div>
                    <div><strong>Contact:</strong> ${officer.contact}</div>
                    <div><strong>Coords:</strong> ${officer.lat.toFixed(4)}, ${officer.lon.toFixed(4)}</div>
                    <div style="margin-top: 4px;">
                        <span style="background:${badgeColor}; color:#fff; font-weight:700; padding:2px 8px; border-radius:4px; font-size:10px;">${officer.status}</span>
                    </div>
                </div>
            </div>`;
    }


       DEPLOYMENT MAP — plots all officer coords
       —————————————————————————————————————————— */
    initDeploymentMap();

    function initDeploymentMap() {
        const mapEl = document.getElementById('deployment-map');
        if (!mapEl || typeof L === 'undefined') return;

        // Centre on Nagpur
        const deployMap = L.map('deployment-map', { zoomControl: true })
            .setView([21.1458, 79.0882], 13);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        }).addTo(deployMap);

        const officerIcon = (status) => {
            const bg = status === 'Active' ? '#002046' : '#74777f';
            return L.divIcon({
                className: '',
                html: `<div style="
                    background: ${bg};
                    color: white;
                    border: 2.5px solid white;
                    border-radius: 50%;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 3px 10px rgba(0,0,0,0.35);
                    font-family: 'Material Symbols Outlined', sans-serif;
                    font-size: 17px;
                ">local_police</div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                popupAnchor: [0, -18]
            });
        };

        // Expose for arrival listener
        window._deployMap     = deployMap;
        window._deployMarkers = {};

        const bounds = [];

        officers.forEach(officer => {
            const postName = POSTS_MAP[officer.postId] || officer.postId;

            const marker = L.marker([officer.lat, officer.lon], {
                icon: officerIcon(officer.status),
                title: officer.name
            });

            marker.bindPopup(buildPopupHTML(officer, postName), { maxWidth: 260 });
            marker.addTo(deployMap);

            // Register for live updates
            window._deployMarkers[officer.id] = marker;
            bounds.push([officer.lat, officer.lon]);
        });

        if (bounds.length > 0) {
            deployMap.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 14 });
        }
    }
});
