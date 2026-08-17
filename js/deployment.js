/* ==========================================================================
   PravahAI - Deployments & Officers Directory (deployment.js)
   Integration: Dynamic Hungarian Distance Optimization + Real-time Officer Arrival Sync
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const deploymentTable = document.getElementById('deployment-table-body');
    if (!deploymentTable) return;

    /* ——————————————————————————————————————————
       POST LOCATIONS MAP — names for display
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
       POST DESTINATION COORDINATES & RISK DATA
       Matching metropolitan hotspots around Nagpur
       —————————————————————————————————————————— */
    const POST_LOCATIONS = {
        LOC_01: { name: 'Zero Mile Stone Junction',          lat: 21.1458, lon: 79.0882, riskScore: 96 },
        LOC_02: { name: 'Variety Square Interchange',        lat: 21.1430, lon: 79.0820, riskScore: 89 },
        LOC_03: { name: 'Sitabuldi Metro Interchange',       lat: 21.1480, lon: 79.0850, riskScore: 92 },
        LOC_04: { name: 'Wardha Road Express Corridor',      lat: 21.1250, lon: 79.0680, riskScore: 76 },
        LOC_05: { name: 'Dharampeth Commercial Market',      lat: 21.1530, lon: 79.0650, riskScore: 64 },
        LOC_06: { name: 'Central Railway Station West Gate', lat: 21.1520, lon: 79.0980, riskScore: 81 },
        LOC_07: { name: 'Sadar Bazaar Promenade',            lat: 21.1650, lon: 79.0820, riskScore: 58 },
        LOC_08: { name: 'Mihan IT Park Flyover',             lat: 21.0750, lon: 79.0350, riskScore: 89 },
        LOC_09: { name: 'Automotive Square Kanhan Road',     lat: 21.1950, lon: 79.0950, riskScore: 85 },
        LOC_10: { name: 'Kalamna Grain Market Junction',     lat: 21.1600, lon: 79.1350, riskScore: 71 },
        LOC_11: { name: 'Medical College Hospital Square',   lat: 21.1310, lon: 79.0920, riskScore: 94 },
        LOC_12: { name: 'Nagpur International Airport Gate', lat: 21.0900, lon: 79.0480, riskScore: 69 },
        LOC_13: { name: 'Manewada Ring Road Square',         lat: 21.1100, lon: 79.1050, riskScore: 78 },
        LOC_14: { name: 'Mankapur Sports Complex Crossing',  lat: 21.1800, lon: 79.0700, riskScore: 55 },
        LOC_15: { name: 'Amravati Road Bypass Junction',     lat: 21.1550, lon: 79.0300, riskScore: 83 },
    };

    /* ——————————————————————————————————————————
       OFFICER ROSTER & LIVE GPS POSITIONS
       —————————————————————————————————————————— */
    let officers = [
        { id: 'OFF_01', name: 'Squad Alpha (Insp. Patil)',              lat: 21.1415, lon: 79.0840, unit: 'Squad Alpha',    status: 'Active', postId: null, contact: '+91 98700 00101' },
        { id: 'OFF_02', name: 'Squad Beta (SI Kulkarni)',                lat: 21.1395, lon: 79.0780, unit: 'Squad Beta',     status: 'Active', postId: null, contact: '+91 98700 00102' },
        { id: 'OFF_03', name: 'Squad Gamma (Const. Deshmukh)',           lat: 21.1550, lon: 79.0750, unit: 'Squad Gamma',    status: 'Active', postId: null, contact: '+91 98700 00103' },
        { id: 'OFF_04', name: 'Patrol Delta (SI Bendre)',                lat: 21.1350, lon: 79.0980, unit: 'Patrol Delta',   status: 'Active', postId: null, contact: '+91 98700 00104' },
        { id: 'OFF_05', name: 'Tactical Echo (Insp. Joshi)',             lat: 21.1620, lon: 79.0920, unit: 'Tactical Echo',  status: 'Active', postId: null, contact: '+91 98700 00105' },
        { id: 'OFF_06', name: 'Reserve Foxtrot (Const. Rao)',            lat: 21.1280, lon: 79.0700, unit: 'Reserve',        status: 'Active', postId: null, contact: '+91 98700 00106' },
        { id: 'OFF_07', name: 'Highway Mobile 1 (SI Shinde)',            lat: 21.1020, lon: 79.0480, unit: 'Highway Unit',   status: 'Active', postId: null, contact: '+91 98700 00107' },
        { id: 'OFF_08', name: 'North Sector QRT (Insp. Wagh)',           lat: 21.1820, lon: 79.0850, unit: 'QRT North',      status: 'Active', postId: null, contact: '+91 98700 00108' },
        { id: 'OFF_09', name: 'East Precinct Squad (SI Jadhav)',         lat: 21.1480, lon: 79.1250, unit: 'East Precinct',  status: 'Active', postId: null, contact: '+91 98700 00109' },
        { id: 'OFF_10', name: 'South Patrol Unit (Const. Chavan)',       lat: 21.0950, lon: 79.0620, unit: 'South Patrol',   status: 'Active', postId: null, contact: '+91 98700 00110' },
        { id: 'OFF_11', name: 'Traffic Control Alpha (Insp. More)',      lat: 21.1390, lon: 79.0550, unit: 'Traffic Alpha',  status: 'Active', postId: null, contact: '+91 98700 00111' },
        { id: 'OFF_12', name: 'Metro Security Unit (SI Pawar)',          lat: 21.1500, lon: 79.0880, unit: 'Metro Sec',      status: 'Active', postId: null, contact: '+91 98700 00112' },
        { id: 'OFF_13', name: 'Airport Rapid Response (Insp. Sawant)',   lat: 21.0920, lon: 79.0500, unit: 'Airport RR',     status: 'Active', postId: null, contact: '+91 98700 00113' },
        { id: 'OFF_14', name: 'West Suburb Patrol (SI Kadam)',           lat: 21.1680, lon: 79.0400, unit: 'West Suburb',    status: 'Active', postId: null, contact: '+91 98700 00114' },
        { id: 'OFF_15', name: 'Central Reserve Squad (Const. Gaikwad)',  lat: 21.1410, lon: 79.0800, unit: 'Central Res',    status: 'Active', postId: null, contact: '+91 98700 00115' },
    ];

    // DOM elements
    const searchInput    = document.getElementById('officer-search');
    const statusFilter   = document.getElementById('status-filter');
    const reassignModal  = document.getElementById('reassign-modal');
    const reassignForm   = document.getElementById('reassign-form');
    const closeModalBtn  = document.getElementById('close-modal-btn');
    const cancelModalBtn = document.getElementById('cancel-modal-btn');

    let currentEditingOfficerId = null;
    let deployMap = null;
    let mapLayerGroup = null;

    // Run dynamic distance optimization
    applyOptimalAssignments();
    renderTable();
    initDeploymentMap();
    initArrivalListener();

    if (searchInput)    searchInput.addEventListener('input', renderTable);
    if (statusFilter)   statusFilter.addEventListener('change', renderTable);
    if (closeModalBtn)  closeModalBtn.addEventListener('click', hideModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', hideModal);
    if (reassignForm)   reassignForm.addEventListener('submit', (e) => { e.preventDefault(); saveReassignment(); });

    // Sync cross-tab reassignment updates
    window.addEventListener('storage', (e) => {
        if (e.key && (e.key.startsWith('pravah_reassign_') || e.key === 'pravah_latest_reassign')) {
            renderTable();
            renderDeploymentMap();
        }
    });

    /* —INDEX HUNGARIAN DISTANCE OPTIMIZER —————————— */
    function solveLinearSumAssignment(costMatrix) {
        const rows = costMatrix.length;
        if (rows === 0) return { rowInd: [], colInd: [] };
        const cols = costMatrix[0].length;
        if (cols === 0) return { rowInd: [], colInd: [] };

        const transposed = rows > cols;
        let C = costMatrix;
        let nR = rows, nC = cols;
        if (transposed) {
            C = Array.from({ length: cols }, (_, c) =>
                Array.from({ length: rows }, (_, r) => costMatrix[r][c])
            );
            nR = cols;
            nC = rows;
        }

        const u = new Float64Array(nR + 1);
        const v = new Float64Array(nC + 1);
        const p = new Int32Array(nC + 1);
        const way = new Int32Array(nC + 1);

        for (let i = 1; i <= nR; i++) {
            p[0] = i;
            let j0 = 0;
            const minv = new Float64Array(nC + 1).fill(Infinity);
            const used = new Uint8Array(nC + 1);

            do {
                used[j0] = 1;
                const i0 = p[j0];
                let delta = Infinity;
                let j1 = 0;

                for (let j = 1; j <= nC; j++) {
                    if (!used[j]) {
                        const cur = C[i0 - 1][j - 1] - u[i0] - v[j];
                        if (cur < minv[j]) {
                            minv[j] = cur;
                            way[j] = j0;
                        }
                        if (minv[j] < delta) {
                            delta = minv[j];
                            j1 = j;
                        }
                    }
                }

                for (let j = 0; j <= nC; j++) {
                    if (used[j]) {
                        u[p[j]] += delta;
                        v[j] -= delta;
                    } else {
                        minv[j] -= delta;
                    }
                }
                j0 = j1;
            } while (p[j0] !== 0);

            do {
                const j1 = way[j0];
                p[j0] = p[j1];
                j0 = j1;
            } while (j0 !== 0);
        }

        const rowInd = [];
        const colInd = [];

        for (let j = 1; j <= nC; j++) {
            if (p[j] !== 0) {
                const r = p[j] - 1;
                const c = j - 1;
                if (transposed) {
                    rowInd.push(c);
                    colInd.push(r);
                } else {
                    rowInd.push(r);
                    colInd.push(c);
                }
            }
        }

        return { rowInd, colInd };
    }

    function haversineDistNum(lat1, lon1, lat2, lon2) {
        const R = 6371.0;
        const dlat = (lat2 - lat1) * Math.PI / 180;
        const dlon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dlat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dlon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function haversineDistKm(lat1, lon1, lat2, lon2) {
        return haversineDistNum(lat1, lon1, lat2, lon2).toFixed(2);
    }

    function applyOptimalAssignments() {
        const locKeys = Object.keys(POST_LOCATIONS);
        const locList = locKeys.map(k => ({ id: k, ...POST_LOCATIONS[k] }));

        if (officers.length === 0 || locList.length === 0) return;

        const K = officers.length;
        const N = locList.length;
        const costMatrix = Array.from({ length: K }, () => new Float64Array(N));

        for (let i = 0; i < K; i++) {
            for (let j = 0; j < N; j++) {
                costMatrix[i][j] = haversineDistNum(
                    officers[i].lat, officers[i].lon,
                    locList[j].lat, locList[j].lon
                );
            }
        }

        const { rowInd, colInd } = solveLinearSumAssignment(costMatrix);

        for (let idx = 0; idx < rowInd.length; idx++) {
            const offIdx = rowInd[idx];
            const locIdx = colInd[idx];
            if (officers[offIdx] && locList[locIdx]) {
                officers[offIdx].postId = locList[locIdx].id;
            }
        }
    }

    /* ——————————————————————————————————————————
       ARRIVAL LISTENER (OFFICER PORTAL SYNC)
       —————————————————————————————————————————— */
    let _lastArrivedTimestamp = 0;

    function initArrivalListener() {
        function checkArrival() {
            const raw = localStorage.getItem('pravah_arrived');
            if (!raw) return;
            let signal;
            try { signal = JSON.parse(raw); } catch { return; }

            if (!signal || signal.timestamp <= _lastArrivedTimestamp) return;
            _lastArrivedTimestamp = signal.timestamp;

            const officer = officers.find(o => o.id === signal.officerId);
            if (!officer) return;

            officer.postId         = signal.postId;
            officer._pendingPostId = null;

            localStorage.removeItem(`pravah_reassign_${officer.id}`);

            renderTable();
            renderDeploymentMap();

            showAdminToast(`✅ ${officer.name} arrived at ${POSTS_MAP[signal.postId] || signal.postId}`);
        }

        setInterval(checkArrival, 3000);
        window.addEventListener('storage', (e) => {
            if (e.key === 'pravah_arrived') checkArrival();
        });
    }

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
        if (postSelect) postSelect.value = officer._pendingPostId || officer.postId;

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
       —————————————————————————————————————————— */
    function saveReassignment() {
        const officer = officers.find(o => o.id === currentEditingOfficerId);
        if (!officer) return;

        const newPostId = document.getElementById('reassign-post').value;
        const newUnit   = document.getElementById('reassign-unit').value;
        const reason    = (document.getElementById('reassign-reason').value.trim())
                        || 'Emergency redeployment required by Command';

        officer._pendingPostId = newPostId;
        officer.unit   = newUnit;
        officer.status = 'Active';

        const signal = { officerId: officer.id, postId: newPostId, reason, timestamp: Date.now() };
        localStorage.setItem(`pravah_reassign_${officer.id}`, JSON.stringify(signal));
        localStorage.setItem('pravah_latest_reassign', JSON.stringify(signal));

        renderTable();
        renderDeploymentMap();
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
       DEPLOYMENT MAP — Plots officers, suggested destinations, & thin dotted vectors
       —————————————————————————————————————————— */
    function initDeploymentMap() {
        const mapEl = document.getElementById('deployment-map');
        if (!mapEl || typeof L === 'undefined') return;

        deployMap = L.map('deployment-map', { zoomControl: true })
            .setView([21.1458, 79.0882], 13);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        }).addTo(deployMap);

        mapLayerGroup = L.layerGroup().addTo(deployMap);

        // Global handle for map popups
        deployMap.on('popupopen', (e) => {
            const popupEl = e.popup.getElement();
            if (!popupEl) return;
            const reassignBtns = popupEl.querySelectorAll('.map-reassign-btn');
            reassignBtns.forEach(btn => {
                btn.addEventListener('click', (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    const officerId = ev.currentTarget.getAttribute('data-id');
                    if (officerId) {
                        showReassignModal(officerId);
                        deployMap.closePopup();
                    }
                });
            });
        });

        renderDeploymentMap();
    }

    function renderDeploymentMap() {
        if (!deployMap || !mapLayerGroup) return;

        mapLayerGroup.clearLayers();

        const officerIcon = (status) => {
            const bg = status === 'Active' ? '#002046' : '#74777f';
            return L.divIcon({
                className: 'custom-officer-pin',
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

        const destIcon = (tagLabel, isEnRoute) => {
            const bg = isEnRoute ? '#dc2626' : '#d97706';
            return L.divIcon({
                className: 'custom-dest-pin',
                html: `<div style="
                    background: ${bg};
                    color: white;
                    border: 2.5px solid white;
                    border-radius: 12px;
                    padding: 2px 7px;
                    font-size: 10px;
                    font-weight: 800;
                    box-shadow: 0 3px 8px rgba(0,0,0,0.35);
                    display: flex;
                    align-items: center;
                    gap: 3px;
                    white-space: nowrap;
                    font-family: 'Inter', sans-serif;
                    letter-spacing: 0.4px;
                ">
                    <span class="material-symbols-outlined" style="font-size: 13px;">flag</span>
                    <span>${tagLabel}</span>
                </div>`,
                iconSize: [75, 22],
                iconAnchor: [37, 11],
                popupAnchor: [0, -12]
            });
        };

        const bounds = [];
        const addedDestinations = new Set();

        officers.forEach(officer => {
            const officerStart = [officer.lat, officer.lon];
            bounds.push(officerStart);

            const pendingPostId = officer._pendingPostId || null;
            const targetPostId  = pendingPostId || officer.postId;
            const targetLoc     = POST_LOCATIONS[targetPostId];

            const badgeColor = officer.status === 'Active' ? '#1b6d24' : '#74777f';
            const postName   = POSTS_MAP[officer.postId] || officer.postId;

            // Render Officer Marker
            const marker = L.marker(officerStart, {
                icon: officerIcon(officer.status),
                title: officer.name
            });

            let popupHtml = `
                <div style="font-family: Inter, sans-serif; padding: 6px 2px; min-width: 210px;">
                    <div style="font-weight: 800; font-size: 13px; color: #002046; margin-bottom: 6px;">
                        ${officer.name}
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 3px; font-size: 11px; color: #444;">
                        <div><strong>Unit ID:</strong> ${officer.id}</div>
                        <div><strong>Assigned Post:</strong> ${postName}</div>
                        ${pendingPostId ? `<div style="color:#dc2626; font-weight:700;">→ En Route: ${POSTS_MAP[pendingPostId] || pendingPostId}</div>` : ''}
                        <div><strong>Squad:</strong> ${officer.unit}</div>
                        <div><strong>Contact:</strong> ${officer.contact}</div>
                        <div><strong>Coords:</strong> ${officer.lat.toFixed(4)}, ${officer.lon.toFixed(4)}</div>
                        <div style="margin-top: 4px;">
                            <span style="background:${badgeColor}; color:#fff; font-weight:700; padding:2px 8px; border-radius:4px; font-size:10px;">${officer.status}</span>
                        </div>
                    </div>
                    <button class="map-reassign-btn" data-id="${officer.id}" style="width: 100%; margin-top: 10px; background: #002046; color: white; border: none; border-radius: 6px; padding: 6px 10px; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
                        <span class="material-symbols-outlined" style="font-size: 14px;">edit_location</span> Reassign Officer
                    </button>
                </div>
            `;
            marker.bindPopup(popupHtml, { maxWidth: 260 });
            mapLayerGroup.addLayer(marker);

            // Render Destination Marker & Dotted Line Vector
            if (targetLoc) {
                const destCoords = [targetLoc.lat, targetLoc.lon];
                bounds.push(destCoords);

                const distKm = haversineDistKm(officer.lat, officer.lon, targetLoc.lat, targetLoc.lon);

                const destKey = `${targetPostId}_${pendingPostId ? 'reassigned' : 'normal'}`;
                if (!addedDestinations.has(destKey)) {
                    addedDestinations.add(destKey);

                    const destMarker = L.marker(destCoords, {
                        icon: destIcon(targetPostId, Boolean(pendingPostId)),
                        title: `Suggested Destination: ${targetLoc.name} (${targetPostId})`
                    });

                    destMarker.bindPopup(`
                        <div style="font-family: Inter, sans-serif; padding: 4px; min-width: 190px;">
                            <div style="font-weight: 800; font-size: 12px; color: ${pendingPostId ? '#dc2626' : '#d97706'}; margin-bottom: 4px;">
                                <span class="material-symbols-outlined" style="font-size:14px; vertical-align:middle;">flag</span>
                                ${pendingPostId ? 'En-Route Destination' : 'Suggested Destination'}
                            </div>
                            <div style="font-weight: 700; font-size: 13px; color: #002046;">${targetLoc.name}</div>
                            <div style="font-size: 11px; color: #555; margin-top: 4px;">
                                <div><strong>Location ID:</strong> ${targetPostId}</div>
                                <div><strong>Hotspot Risk Score:</strong> <span style="font-weight:700; color:#dc2626;">${targetLoc.riskScore}/100</span></div>
                                <div><strong>Target Unit:</strong> ${officer.name}</div>
                            </div>
                            <button class="map-reassign-btn" data-id="${officer.id}" style="width: 100%; margin-top: 10px; background: ${pendingPostId ? '#dc2626' : '#d97706'}; color: white; border: none; border-radius: 6px; padding: 6px 10px; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
                                <span class="material-symbols-outlined" style="font-size: 14px;">edit_location</span> Reassign Unit
                            </button>
                        </div>
                    `);
                    mapLayerGroup.addLayer(destMarker);
                }

                const isDottedReassigned = Boolean(pendingPostId);
                const line = L.polyline([officerStart, destCoords], {
                    color: isDottedReassigned ? '#dc2626' : '#0284c7',
                    weight: 2,
                    opacity: 0.85,
                    dashArray: '4, 6'
                });

                line.bindPopup(`
                    <div style="font-family: Inter, sans-serif; padding: 4px;">
                        <div style="font-weight: 700; font-size: 12px; color: ${isDottedReassigned ? '#dc2626' : '#0284c7'}; margin-bottom: 4px;">
                            ${isDottedReassigned ? '⚡ En-Route Reassignment Vector' : '📍 Suggested Deployment Vector'}
                        </div>
                        <div style="font-size: 11px;"><strong>Unit:</strong> ${officer.name}</div>
                        <div style="font-size: 11px;"><strong>Target Post:</strong> ${targetLoc.name}</div>
                        <div style="font-size: 11px;"><strong>Distance:</strong> ${distKm} km</div>
                        <button class="map-reassign-btn" data-id="${officer.id}" style="width: 100%; margin-top: 8px; background: #0284c7; color: white; border: none; border-radius: 6px; padding: 5px 8px; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
                            <span class="material-symbols-outlined" style="font-size: 14px;">edit_location</span> Reassign Unit
                        </button>
                    </div>
                `);

                mapLayerGroup.addLayer(line);
            }
        });

        if (bounds.length > 0) {
            deployMap.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 14 });
        }
    }
});
