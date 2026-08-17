/* ==========================================================================
   PravahAI Officer Portal — Dashboard Logic (dashboard.js)
   ========================================================================== */

const PRAVAH_API = 'http://localhost:3000';

/* ——————————————————————————————————————————
   STATIC DATA — used as fallback when API is offline
   (Vercel deployment has no backend server)
   —————————————————————————————————————————— */

const OFFICERS_DB = {
    'B-2247': { id: 'B-2247', name: 'Constable R. Deshmukh', rank: 'Police Constable',  postId: 'P01' },
    'B-1012': { id: 'B-1012', name: 'SI A. Kulkarni',         rank: 'Sub-Inspector',      postId: 'P02' },
    'B-0033': { id: 'B-0033', name: 'Inspector V. Bendre',    rank: 'Inspector',           postId: 'P03' },
};

const POSTS_DB = [
    {
        id: 'P01', name: 'Zero Mile Stone Junction',
        zone: 'Zone A — Central', sector: 'Sector 3',
        riskScore: 78, riskLevel: 'high', congestionStatus: 'Heavy', activeIncidents: 3,
        description: 'Critical 6-way intersection. High footfall & vehicle volume throughout the day. VIP convoy routes pass through. Stay vigilant.',
        instructions: 'Maintain lane discipline at all approaches. Coordinate with Unit 42 on the western arm. Report any obstruction immediately.',
        incidents: [
            { id: 'I1', type: 'accident',    title: 'Multi-vehicle Accident',  desc: 'Near eastern approach — lanes blocked', time: '2 min ago',  icon: 'car_crash',      color: '#dc2626' },
            { id: 'I2', type: 'traffic_jam', title: 'Severe Traffic Jam',      desc: 'Northbound backup > 500m',             time: '8 min ago',  icon: 'traffic',        color: '#d97706' },
            { id: 'I3', type: 'vip',         title: 'VIP Convoy Movement',     desc: 'Route clearance required 14:30–15:00', time: '15 min ago', icon: 'directions_car', color: '#1d4ed8' },
        ],
    },
    {
        id: 'P02', name: 'Variety Square',
        zone: 'Zone B — East', sector: 'Sector 7',
        riskScore: 52, riskLevel: 'medium', congestionStatus: 'Moderate', activeIncidents: 1,
        description: 'Commercial area. Moderate congestion during peak hours. Market days (Tue/Fri) see elevated pedestrian flow.',
        instructions: 'Monitor vendor encroachments on east side. Alert HQ if rally spillover reaches the square.',
        incidents: [
            { id: 'I4', type: 'protest', title: 'Protest Gathering', desc: 'Approx 200 civilians — peaceful but monitored', time: '5 min ago', icon: 'group', color: '#7c3aed' },
        ],
    },
    {
        id: 'P03', name: 'Sitabuldi Interchange',
        zone: 'Zone A — Central', sector: 'Sector 1',
        riskScore: 31, riskLevel: 'low', congestionStatus: 'Clear', activeIncidents: 0,
        description: 'Elevated flyover interchange. Cameras operational. Low incident history. Routine patrol sufficient.',
        instructions: 'Standard patrol cycle. Check under-bridge area every 90 minutes.',
        incidents: [],
    },
];

const ALERTS_BY_POST = {
    P01: [
        { id: 'A1', type: 'critical', title: 'Accident — Lanes Blocked',  desc: 'Multi-vehicle collision near eastern approach. Ambulance dispatched.', time: '2 min ago',  votes: 0, totalOfficers: 4, resolved: false },
        { id: 'A2', type: 'warning',  title: 'Signal Failure',             desc: 'Traffic light unit #3 offline. Manual control required.',              time: '11 min ago', votes: 0, totalOfficers: 4, resolved: false },
    ],
    P02: [
        { id: 'A4', type: 'warning',  title: 'Protest Crowd',             desc: 'Approx 200 civilians gathering — remain vigilant.',                    time: '5 min ago',  votes: 0, totalOfficers: 3, resolved: false },
    ],
    P03: [],
};

/* ——————————————————————————————————————————
   STATE
   —————————————————————————————————————————— */
let liveOfficerData     = null;  // officer row from DB (null if offline)
let currentPost         = null;  // normalised post object for rendering
let liveIncidents       = [];    // raw incidents from DB for this zone
let onDuty              = true;
let pendingReassignment = null;  // new post after crisis modal acknowledged
let myVotes             = {};    // alertId → true if already voted

// Derived officer info — resolved from sessionStorage unit_id
let OFFICER_DATA        = null;

/* ——————————————————————————————————————————
   LIVE API SYNC — with static fallback
   —————————————————————————————————————————— */

/**
 * Tries to fetch live data from the API.
 * If the API is unreachable (Vercel, no backend), falls back to
 * the static OFFICERS_DB and POSTS_DB for the 3 hardcoded officers.
 */
async function syncWithCommandCenter() {
    const unitId = sessionStorage.getItem('officer_unit_id');
    if (!unitId) return;

    // Resolve OFFICER_DATA from static map or create a generic entry
    OFFICER_DATA = OFFICERS_DB[unitId] || { id: unitId, name: unitId, rank: 'Field Officer', postId: null };

    // Determine which post to use: session-stored postId takes priority
    const savedPostId = sessionStorage.getItem('officer_post') || OFFICER_DATA.postId;

    try {
        // 1. Attempt live API call
        const [deployRes, riskRes] = await Promise.all([
            fetch(`${PRAVAH_API}/api/deployment/officer/${unitId}`, { signal: AbortSignal.timeout(4000) }),
            fetch(`${PRAVAH_API}/api/risk/score`,                   { signal: AbortSignal.timeout(4000) })
        ]);

        if (!deployRes.ok) throw new Error('Deployment API error');
        const deployData = await deployRes.json();
        const riskData   = riskRes.ok ? await riskRes.json() : null;

        liveOfficerData = deployData.officer;
        liveIncidents   = deployData.incidents || [];
        const zone      = deployData.zone || {};

        let zoneScore = 0, zoneCongestion = 'Unknown';
        if (riskData && riskData.zoneScores) {
            const matchedZone = riskData.zoneScores.find(z =>
                z.zone.toLowerCase().includes(zone.zone_name?.toLowerCase() || '')
            );
            if (matchedZone) zoneScore = matchedZone.score;
        }
        if (riskData && riskData.meta) {
            const avgV = riskData.meta.avgVelocity || 0;
            zoneCongestion = avgV >= 40 ? 'Clear' : avgV >= 25 ? 'Moderate' : avgV >= 15 ? 'Heavy' : 'Gridlock';
        }

        const riskLevel = zoneScore >= 65 ? 'high' : zoneScore >= 35 ? 'medium' : 'low';
        currentPost = {
            id: liveOfficerData.unit_id,
            name: zone.zone_name || liveOfficerData.sector,
            zone: liveOfficerData.squad || 'Field Unit',
            sector: liveOfficerData.sector,
            riskScore: zoneScore, riskLevel,
            congestionStatus: zoneCongestion,
            activeIncidents: liveIncidents.length,
            description: zone.is_high_risk
                ? 'High-risk designated zone. Stay vigilant and maintain frequent contact with HQ.'
                : 'Routine monitoring zone. Report any unusual activity immediately.',
            instructions: `Historical risk index: ${zone.historical_risk ?? 'N/A'}. Active incidents in zone: ${liveIncidents.length}.`,
            incidents: liveIncidents
        };
        updateSyncBadge(true);

    } catch (err) {
        // ── STATIC FALLBACK ──
        // API is offline (normal on Vercel). Use hardcoded post data.
        console.warn('[Officer Portal] API unreachable — using static data:', err.message);
        updateSyncBadge(false);

        if (!currentPost) {
            const staticPost = POSTS_DB.find(p => p.id === savedPostId) || POSTS_DB[0];
            currentPost = { ...staticPost };
            liveIncidents = staticPost.incidents || [];
        }
    }
}



/** Shows a small live/offline badge in the header */
function updateSyncBadge(isLive) {
    const badge = document.getElementById('sync-badge');
    if (!badge) return;
    badge.textContent = isLive ? '🟢 Live' : '🟡 Offline';
    badge.title       = isLive
        ? 'Connected to PravahAI Command Center'
        : 'Cannot reach API — showing last known data';
}

/* ——————————————————————————————————————————
   INIT
   —————————————————————————————————————————— */
document.addEventListener('DOMContentLoaded', async () => {
    // Guard — redirect to login if not authenticated
    const loggedIn = sessionStorage.getItem('officer_logged_in');
    if (!loggedIn) {
        window.location.href = 'login.html';
        return;
    }

    // Show loading skeleton while fetching live data
    showLoadingSkeleton();

    // Fetch live data from command center
    await syncWithCommandCenter();

    // Render everything from live data
    renderOfficerProfile();
    renderPostInfo(currentPost);
    renderAlerts(getAlertsForPost());
    renderNotificationDropdown(currentPost);
    initNotifBadge(currentPost);
    initNotifDropdownToggle();
    initQuickActions();
    initDutyButton();
    initLogout();
    initCrisisModal();
    initReassignBanner();

    // Listen for real admin-triggered reassignment via localStorage
    initAdminReassignmentListener();

    // Poll for live updates every 30 seconds
    setInterval(async () => {
        await syncWithCommandCenter();
        renderPostInfo(currentPost);
        renderAlerts(getAlertsForPost());
    }, 30000);
});

function showLoadingSkeleton() {
    setTextById('officer-name',   'Loading…');
    setTextById('post-name',      'Connecting to Command Center…');
    setTextById('post-risk-score','—');
}

/* ——————————————————————————————————————————
   OFFICER PROFILE
   —————————————————————————————————————————— */
function renderOfficerProfile() {
    if (liveOfficerData) {
        // Live API data available
        setTextById('officer-name', liveOfficerData.name);
        setTextById('officer-rank', liveOfficerData.squad || 'Field Officer');
        setTextById('officer-id',   liveOfficerData.unit_id);
    } else if (OFFICER_DATA) {
        // Static fallback for hardcoded officers (Vercel / offline)
        setTextById('officer-name', OFFICER_DATA.name);
        setTextById('officer-rank', OFFICER_DATA.rank);
        setTextById('officer-id',   OFFICER_DATA.id);
    }
}

/* ——————————————————————————————————————————
   POST INFO
   —————————————————————————————————————————— */
function renderPostInfo(post) {
    if (!post) return;
    setTextById('post-name',         post.name);
    setTextById('post-zone',         post.zone);
    setTextById('post-sector',       post.sector);
    setTextById('post-congestion',   post.congestionStatus);
    setTextById('post-incidents',    `${post.activeIncidents} active incident${post.activeIncidents !== 1 ? 's' : ''}`);
    setTextById('post-risk-score',   post.riskScore);
    setTextById('post-description',  post.description);
    setTextById('post-instructions', post.instructions);
    setTextById('map-label',         `📍 ${post.name}`);

    const riskBadgeEl = document.getElementById('post-risk-badge');
    if (riskBadgeEl) {
        const labels = { high: '🔴 High Risk', medium: '🟠 Medium Risk', low: '🟢 Low Risk' };
        riskBadgeEl.textContent = labels[post.riskLevel] || post.riskLevel;
        riskBadgeEl.className   = `risk-badge-lg risk-${post.riskLevel}`;
    }

    setTextById('info-active-incidents', post.activeIncidents);
    setTextById('info-congestion',       post.congestionStatus);
    setTextById('info-zone',             post.zone);
    setTextById('info-sector',           post.sector);
}

/* ——————————————————————————————————————————
   ALERTS — built from live DB incidents
   —————————————————————————————————————————— */
function getAlertsForPost(postId) {
    // If we have a postId (static mode), use ALERTS_BY_POST
    const pid = postId || currentPost?.id;
    if (!liveOfficerData && pid && ALERTS_BY_POST[pid]) {
        return ALERTS_BY_POST[pid];
    }
    // Convert live DB incidents to the alert format used by renderAlerts
    return liveIncidents.map((inc, i) => ({
        id:           `live-${inc.id || i}`,
        type:         inc.severity === 'Critical' ? 'critical' : 'warning',
        title:        inc.type ? `${inc.type} — ${inc.location || ''}` : (inc.description || 'Incident'),
        desc:         inc.description || '',
        time:         inc.reported_at
            ? timeAgo(new Date(inc.reported_at))
            : 'Recently',
        votes:        0,
        totalOfficers:4,
        resolved:     inc.status === 'Resolved'
    }));
}

function timeAgo(date) {
    const mins = Math.round((Date.now() - date.getTime()) / 60000);
    if (mins < 1)  return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    return `${Math.round(mins / 60)} hr ago`;
}

function renderAlerts(alerts) {
    const listEl = document.getElementById('alert-list');
    if (!listEl) return;

    if (!alerts || alerts.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">check_circle</span>
                <p>No active alerts for your post</p>
            </div>`;
        return;
    }

    listEl.innerHTML = alerts.map(alert => buildAlertHTML(alert)).join('');

    // Attach vote button listeners
    alerts.forEach(alert => {
        const voteBtn = document.getElementById(`vote-btn-${alert.id}`);
        if (voteBtn) {
            voteBtn.addEventListener('click', () => handleVote(alert));
        }
    });
}

function buildAlertHTML(alert) {
    const iconMap  = { critical: 'warning', warning: 'report_problem', info: 'info' };
    const classMap = { critical: 'alert-critical', warning: 'alert-warning', info: '' };
    const iconCls  = { critical: 'icon-critical',  warning: 'icon-warning',  info: 'icon-info' };

    const alreadyVoted = !!myVotes[alert.id];
    const votePercent  = Math.round((alert.votes / alert.totalOfficers) * 100);
    const majority     = alert.votes >= Math.ceil(alert.totalOfficers / 2);

    if (alert.resolved) {
        return `
        <div class="alert-item" style="border-left-color:var(--color-secondary); opacity:0.65;" id="alert-item-${alert.id}">
            <div class="alert-icon" style="background:var(--color-secondary-container); color:var(--color-on-secondary-container);">
                <span class="material-symbols-outlined">task_alt</span>
            </div>
            <div class="alert-body">
                <div class="alert-body-title" style="text-decoration:line-through;">${alert.title}</div>
                <div class="alert-body-desc" style="color:var(--color-secondary);">✅ Resolved — majority vote confirmed</div>
            </div>
            <span class="alert-time">${alert.time}</span>
        </div>`;
    }

    return `
    <div class="alert-item ${classMap[alert.type] || ''}" id="alert-item-${alert.id}">
        <div class="alert-icon ${iconCls[alert.type] || 'icon-info'}">
            <span class="material-symbols-outlined">${iconMap[alert.type] || 'info'}</span>
        </div>
        <div class="alert-body" style="flex:1;">
            <div class="alert-body-title">${alert.title}</div>
            <div class="alert-body-desc">${alert.desc}</div>
            <!-- Vote bar -->
            <div class="vote-row" style="margin-top:8px;">
                <button
                    class="vote-btn ${alreadyVoted ? 'voted' : ''}"
                    id="vote-btn-${alert.id}"
                    ${alreadyVoted ? 'disabled' : ''}
                >
                    <span class="material-symbols-outlined" style="font-size:14px;">how_to_vote</span>
                    ${alreadyVoted ? 'Voted' : 'Task Complete'}
                </button>
                <div class="vote-progress-wrap">
                    <div class="vote-progress-bar" style="width:${votePercent}%; background:${majority ? 'var(--color-secondary)' : 'var(--color-primary)'};"></div>
                </div>
                <span class="vote-count-label">${alert.votes}/${alert.totalOfficers}</span>
            </div>
        </div>
        <span class="alert-time">${alert.time}</span>
    </div>`;
}

function handleVote(alert) {
    if (myVotes[alert.id] || alert.resolved) return;

    myVotes[alert.id] = true;
    alert.votes += 1;

    const majority = alert.votes >= Math.ceil(alert.totalOfficers / 2);

    if (majority) {
        alert.resolved = true;
        // Simulate notifying admin (in real app: API call)
        console.log(`[PravahAI] Majority vote — alert ${alert.id} marked resolved. Admin notified.`);
        showToast(`✅ Majority vote confirmed — "${alert.title}" marked resolved. Admin notified.`, 'success');
        window.playUIBeep && window.playUIBeep('low');
    } else {
        showToast(`🗳️ Vote recorded (${alert.votes}/${alert.totalOfficers}). Waiting for majority.`, 'info');
    }

    // Re-render just this alert item
    const itemEl = document.getElementById(`alert-item-${alert.id}`);
    if (itemEl) {
        itemEl.outerHTML = buildAlertHTML(alert);
        // Re-attach listener for updated element
        const newBtn = document.getElementById(`vote-btn-${alert.id}`);
        if (newBtn && !alert.resolved) {
            newBtn.addEventListener('click', () => handleVote(alert));
        }
    }
}

/* ——————————————————————————————————————————
   NOTIFICATION DROPDOWN
   Shows actual incidents at the officer's current post
   —————————————————————————————————————————— */
function renderNotificationDropdown(post) {
    const listEl  = document.getElementById('notif-dropdown-list');
    const countEl = document.getElementById('notif-count');
    if (!listEl) return;

    const incidents = post.incidents || [];
    if (countEl) countEl.textContent = incidents.length;

    if (incidents.length === 0) {
        listEl.innerHTML = `
            <div style="padding:16px; text-align:center; color:var(--color-outline); font-size:12px;">
                No active incidents at your post
            </div>`;
        return;
    }

    listEl.innerHTML = incidents.map(inc => `
        <div class="notif-incident-item">
            <div class="notif-incident-icon" style="background:${inc.color}22; color:${inc.color};">
                <span class="material-symbols-outlined" style="font-size:16px;">${inc.icon}</span>
            </div>
            <div class="notif-incident-body">
                <div class="notif-incident-title">${inc.title}</div>
                <div class="notif-incident-desc">${inc.desc}</div>
            </div>
            <span class="notif-incident-time">${inc.time}</span>
        </div>
    `).join('');
}

function initNotifBadge(post) {
    const badge = document.getElementById('header-notif-badge');
    if (badge && post.incidents && post.incidents.length > 0) {
        badge.style.display = 'block';
        badge.textContent   = post.incidents.length > 9 ? '9+' : post.incidents.length;
    }
}

function initNotifDropdownToggle() {
    const btn      = document.getElementById('btn-header-notif');
    const dropdown = document.getElementById('notif-dropdown');
    if (!btn || !dropdown) return;

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!document.getElementById('notif-wrapper')?.contains(e.target)) {
            dropdown.classList.remove('open');
        }
    });
}

/* ——————————————————————————————————————————
   DUTY BUTTON (bottom of page)
   Red "Go Off Duty" / Green "Go On Duty"
   —————————————————————————————————————————— */
function initDutyButton() {
    const btn      = document.getElementById('btn-duty-toggle');
    const icon     = document.getElementById('duty-btn-icon');
    const label    = document.getElementById('duty-btn-label');
    const dotTop   = document.getElementById('duty-dot');
    const lblTop   = document.getElementById('duty-label');
    const dotBot   = document.getElementById('duty-dot-bottom');
    const lblBot   = document.getElementById('duty-label-bottom');

    if (!btn) return;

    const updateUI = () => {
        if (onDuty) {
            // On duty → show red "Go Off Duty"
            btn.className   = 'btn btn-danger';
            btn.style.minWidth = '160px';
            if (icon)  icon.textContent  = 'do_not_disturb_on';
            if (label) label.textContent = 'Go Off Duty';
            if (dotTop)  dotTop.className  = 'pulse-dot green';
            if (dotBot)  dotBot.className  = 'pulse-dot green';
            if (lblTop)  lblTop.textContent = 'On Duty';
            if (lblBot)  lblBot.textContent = 'Currently On Duty';
        } else {
            // Off duty → show green "Go On Duty"
            btn.className   = 'btn btn-success';
            btn.style.minWidth = '160px';
            if (icon)  icon.textContent  = 'check_circle';
            if (label) label.textContent = 'Go On Duty';
            if (dotTop)  dotTop.className  = 'pulse-dot orange';
            if (dotBot)  dotBot.className  = 'pulse-dot orange';
            if (lblTop)  lblTop.textContent = 'Off Duty';
            if (lblBot)  lblBot.textContent = 'Currently Off Duty';
        }
    };

    updateUI();

    btn.addEventListener('click', () => {
        onDuty = !onDuty;
        updateUI();
        window.playUIBeep && window.playUIBeep('low');
        showToast(
            onDuty ? '✅ You are now On Duty. Command notified.' : '🔴 You are now Off Duty.',
            onDuty ? 'success' : 'warning'
        );
    });
}

/* ——————————————————————————————————————————
   QUICK ACTIONS
   —————————————————————————————————————————— */
function initQuickActions() {
    const incidentBtn = document.getElementById('btn-report-incident');
    if (incidentBtn) {
        incidentBtn.addEventListener('click', () => {
            showToast('🚨 Incident report sent to Command Center.', 'warning');
            window.playUIBeep && window.playUIBeep('medium');
        });
    }

    const backupBtn = document.getElementById('btn-backup');
    if (backupBtn) {
        backupBtn.addEventListener('click', () => {
            showToast('📡 Backup requested. ETA 8 min.', 'warning');
            window.playUIBeep && window.playUIBeep('medium');
        });
    }

    const mapBtn = document.getElementById('btn-view-map');
    if (mapBtn) {
        mapBtn.addEventListener('click', () => {
            showToast('🗺️ Full map view — coming soon.', 'info');
        });
    }

    const sosBtn = document.getElementById('btn-sos');
    if (sosBtn) {
        sosBtn.addEventListener('click', () => {
            showToast('🆘 SOS signal sent to Command Center!', 'error');
            window.playUIBeep && window.playUIBeep('high');
        });
    }
}

/* ——————————————————————————————————————————
   LOGOUT
   —————————————————————————————————————————— */
function initLogout() {
    const logoutBtn = document.getElementById('btn-logout');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('officer_logged_in');
        sessionStorage.removeItem('officer_post');
        window.location.href = 'login.html';
    });
}

/* ══════════════════════════════════════════════
   CRISIS REASSIGNMENT SYSTEM
   ══════════════════════════════════════════════

   Flow:
   1. Admin triggers → crisis modal pops up
   2. Officer clicks "En Route" → modal closes, pending banner appears
      showing the NEW location name + "Mark Arrived" button
   3. "Posted At" stays at old location until officer clicks "Mark Arrived"
   4. On "Mark Arrived" → currentPost updates, banner hides, post UI refreshes
*/

function triggerReassignment(newPost, reason) {
    pendingReassignment = newPost;

    // Populate modal fields
    setTextById('crisis-modal-from',   currentPost.name);
    setTextById('crisis-modal-to',     newPost.name);
    setTextById('crisis-modal-zone',   newPost.zone);
    setTextById('crisis-modal-reason', reason || 'Emergency redeployment required by Command');
    setTextById('crisis-modal-risk',   `Risk Score: ${newPost.riskScore} (${newPost.riskLevel.toUpperCase()})`);

    openModal('crisis-modal');
    window.playUIBeep && window.playUIBeep('high');

    // Show red notification badge
    const badge = document.getElementById('header-notif-badge');
    if (badge) {
        badge.style.display = 'block';
        badge.textContent   = '!';
    }
}

function initCrisisModal() {
    // "En Route" — just closes modal and shows pending banner; does NOT change post yet
    const ackBtn = document.getElementById('btn-crisis-ack');
    if (ackBtn) {
        ackBtn.addEventListener('click', () => {
            closeModal('crisis-modal');
            if (pendingReassignment) {
                showReassignBanner(pendingReassignment);
            }
            showToast(`🚗 En route to ${pendingReassignment?.name || 'new location'}. Tap "Mark Arrived" when you reach.`, 'info');
            window.playUIBeep && window.playUIBeep('low');
        });
    }

    // "Request Clarification"
    const clarBtn = document.getElementById('btn-crisis-clarify');
    if (clarBtn) {
        clarBtn.addEventListener('click', () => {
            closeModal('crisis-modal');
            pendingReassignment = null;
            showToast('📡 Clarification request sent to Command Center.', 'info');
        });
    }
}

/* ——————————————————————————————————————————
   REASSIGN PENDING BANNER
   —————————————————————————————————————————— */
function showReassignBanner(newPost) {
    const banner = document.getElementById('reassign-pending-banner');
    if (!banner) return;

    setTextById('reassign-pending-name', newPost.name);
    setTextById('reassign-pending-meta', `${newPost.zone} · ${newPost.sector} · Risk ${newPost.riskScore}/100`);
    banner.style.display = 'block';
    // Smooth reveal
    banner.style.opacity  = '0';
    banner.style.transform = 'translateY(-8px)';
    requestAnimationFrame(() => {
        banner.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        banner.style.opacity    = '1';
        banner.style.transform  = 'translateY(0)';
    });
}

function initReassignBanner() {
    const arrivedBtn = document.getElementById('btn-mark-arrived');
    if (!arrivedBtn) return;

    arrivedBtn.addEventListener('click', () => {
        if (!pendingReassignment) return;

        // NOW we update the current post
        currentPost = pendingReassignment;
        pendingReassignment = null;
        sessionStorage.setItem('officer_post', currentPost.id);

        // Clear the admin localStorage signal so it doesn't re-trigger
        localStorage.removeItem(`pravah_reassign_${OFFICER_DATA.id}`);
        // Also update the generic channel to reflect arrival
        const arrivedSignal = { officerId: OFFICER_DATA.id, postId: currentPost.id, arrived: true, timestamp: Date.now() };
        localStorage.setItem('pravah_arrived', JSON.stringify(arrivedSignal));

        // Update all post info + alerts + notifications
        renderPostInfo(currentPost);
        renderAlerts(getAlertsForPost(currentPost.id));
        renderNotificationDropdown(currentPost);
        initNotifBadge(currentPost);

        // Hide the banner
        const banner = document.getElementById('reassign-pending-banner');
        if (banner) {
            banner.style.opacity   = '0';
            banner.style.transform = 'translateY(-8px)';
            setTimeout(() => { banner.style.display = 'none'; }, 300);
        }

        showToast(`✅ Arrived at ${currentPost.name}. Post updated. Command notified.`, 'success');
        window.playUIBeep && window.playUIBeep('low');
    });
}


/* ——————————————————————————————————————————
   REAL ADMIN REASSIGNMENT LISTENER
   Polls localStorage for a signal written by deployment.js
   when admin clicks "Confirm Reassignment" in the admin portal.
   Uses both storage events (cross-tab) and polling (same-tab).
   —————————————————————————————————————————— */
function initAdminReassignmentListener() {
    initCrisisModal();

    // Last seen timestamp — prevents re-triggering stale signals
    let lastSeenTimestamp = Date.now();

    function checkForReassignment() {
        const raw = localStorage.getItem('pravah_latest_reassign');
        if (!raw) return;

        try {
            const signal = JSON.parse(raw);

            // Only react if:
            // 1. The signal is newer than when we loaded the page
            // 2. It targets THIS officer
            // 3. We are not already handling a pending reassignment
            if (
                signal.timestamp > lastSeenTimestamp &&
                signal.officerId === OFFICER_DATA.id &&
                !pendingReassignment
            ) {
                lastSeenTimestamp = signal.timestamp;

                const newPost = POSTS_DB.find(p => p.id === signal.postId);
                if (newPost && newPost.id !== currentPost.id) {
                    triggerReassignment(newPost, signal.reason);
                }
            }
        } catch (e) {
            // Malformed JSON — ignore
        }
    }

    // Cross-tab: storage event fires immediately when another tab writes
    window.addEventListener('storage', (e) => {
        if (e.key === 'pravah_latest_reassign') {
            checkForReassignment();
        }
    });

    // Same-tab polling (fallback for when admin & officer use same browser tab)
    setInterval(checkForReassignment, 2000);
}

/* ——————————————————————————————————————————
   MODAL HELPERS
   —————————————————————————————————————————— */
function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
}

/* ——————————————————————————————————————————
   TOAST
   —————————————————————————————————————————— */
function showToast(message, type = 'info') {
    const existing = document.getElementById('officer-toast');
    if (existing) existing.remove();

    const colorMap = { success: '#16a34a', warning: '#d97706', info: '#1d4ed8', error: '#dc2626' };

    const toast = document.createElement('div');
    toast.id = 'officer-toast';
    toast.style.cssText = `
        position: fixed; bottom: 24px; left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: ${colorMap[type] || colorMap.info}; color: #fff;
        padding: 12px 20px; border-radius: 9999px;
        font-size: 13px; font-weight: 600;
        font-family: 'Inter', sans-serif;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        z-index: 3000; max-width: 88vw; text-align: center;
        opacity: 0; transition: opacity 0.25s ease, transform 0.25s ease;
        pointer-events: none;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity   = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
        toast.style.opacity   = '0';
        toast.style.transform = 'translateX(-50%) translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

/* ——————————————————————————————————————————
   UTILITY
   —————————————————————————————————————————— */
function setTextById(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}
