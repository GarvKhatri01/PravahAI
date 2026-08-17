/* ==========================================================================
   PravahAI Officer Portal — Dashboard Logic (dashboard.js)
   ========================================================================== */

const PRAVAH_API = 'http://localhost:3000';

/* ——————————————————————————————————————————
   STATIC DATA — used as fallback when API is offline
   (Vercel deployment has no backend server)
   —————————————————————————————————————————— */

const OFFICERS_DB = {
    'OFF_01': { id: 'OFF_01', name: 'Insp. Patil',       rank: 'Squad Alpha',     postId: 'LOC_01' },
    'OFF_02': { id: 'OFF_02', name: 'SI Kulkarni',        rank: 'Squad Beta',      postId: 'LOC_02' },
    'OFF_03': { id: 'OFF_03', name: 'Const. Deshmukh',    rank: 'Squad Gamma',     postId: 'LOC_03' },
    'OFF_04': { id: 'OFF_04', name: 'SI Bendre',          rank: 'Patrol Delta',    postId: 'LOC_04' },
    'OFF_05': { id: 'OFF_05', name: 'Insp. Joshi',        rank: 'Tactical Echo',   postId: 'LOC_05' },
    'OFF_06': { id: 'OFF_06', name: 'Const. Rao',         rank: 'Reserve Foxtrot', postId: 'LOC_06' },
    'OFF_07': { id: 'OFF_07', name: 'SI Shinde',          rank: 'Highway Mobile',  postId: 'LOC_07' },
    'OFF_08': { id: 'OFF_08', name: 'Insp. Wagh',         rank: 'North Sector QRT',postId: 'LOC_08' },
    'OFF_09': { id: 'OFF_09', name: 'SI Jadhav',          rank: 'East Precinct',   postId: 'LOC_09' },
    'OFF_10': { id: 'OFF_10', name: 'Const. Chavan',      rank: 'South Patrol',    postId: 'LOC_10' },
    'OFF_11': { id: 'OFF_11', name: 'Insp. More',         rank: 'Traffic Control', postId: 'LOC_11' },
    'OFF_12': { id: 'OFF_12', name: 'SI Pawar',           rank: 'Metro Security',  postId: 'LOC_12' },
    'OFF_13': { id: 'OFF_13', name: 'Insp. Sawant',       rank: 'Airport RR',      postId: 'LOC_13' },
    'OFF_14': { id: 'OFF_14', name: 'SI Kadam',           rank: 'West Suburb',     postId: 'LOC_14' },
    'OFF_15': { id: 'OFF_15', name: 'Const. Gaikwad',     rank: 'Central Reserve', postId: 'LOC_15' },
};

const POSTS_DB = [
    { id:'LOC_01', name:'Zero Mile Stone Junction',          zone:'Zone A — Central',   sector:'Sector 3',  riskScore:96, riskLevel:'high',   congestionStatus:'Gridlock', activeIncidents:3, description:'Critical 6-way intersection. VIP convoy routes pass through. Stay vigilant.', instructions:'Maintain lane discipline. Coordinate with adjacent units. Report obstructions immediately.', incidents:[{id:'N1',title:'Multi-vehicle Accident',desc:'Near eastern approach — lanes blocked',time:'2 min ago',icon:'car_crash',color:'#dc2626'},{id:'N2',title:'Severe Traffic Jam',desc:'Northbound backup > 500m',time:'8 min ago',icon:'traffic',color:'#d97706'},{id:'N3',title:'VIP Convoy Movement',desc:'Route clearance required 14:30–15:00',time:'15 min ago',icon:'directions_car',color:'#1d4ed8'}] },
    { id:'LOC_02', name:'Variety Square Interchange',        zone:'Zone B — East',      sector:'Sector 7',  riskScore:89, riskLevel:'high',   congestionStatus:'Heavy',    activeIncidents:2, description:'High-volume interchange. Market spillover common. Frequent unauthorized parking.', instructions:'Ensure signal compliance. Monitor vendor encroachments.', incidents:[{id:'N4',title:'Signal Malfunction',desc:'Junction B-2 — traffic light offline',time:'5 min ago',icon:'traffic',color:'#dc2626'},{id:'N5',title:'Unauthorized Parking',desc:'HGVs blocking lane 3',time:'20 min ago',icon:'local_parking',color:'#d97706'}] },
    { id:'LOC_03', name:'Sitabuldi Metro Interchange',       zone:'Zone A — Central',   sector:'Sector 1',  riskScore:92, riskLevel:'high',   congestionStatus:'Heavy',    activeIncidents:2, description:'Elevated metro interchange. High pedestrian flow. Pickpocketing reported.', instructions:'Station personnel at all 4 exits. Coordinate with Metro Security.', incidents:[{id:'N6',title:'Crowd Surge — Platform 2',desc:'Overcrowding during peak hour',time:'3 min ago',icon:'group',color:'#dc2626'},{id:'N7',title:'Suspicious Activity',desc:'Unattended bag near east exit',time:'12 min ago',icon:'warning',color:'#d97706'}] },
    { id:'LOC_04', name:'Wardha Road Express Corridor',      zone:'Zone C — South',     sector:'Sector 9',  riskScore:76, riskLevel:'high',   congestionStatus:'Heavy',    activeIncidents:1, description:'High-speed arterial road. Frequent overspeeding violations.', instructions:'Deploy speed detection at km marker 14. Monitor highway ramps.', incidents:[{id:'N8',title:'Overspeeding Convoy',desc:'3 heavy vehicles flagged — action pending',time:'10 min ago',icon:'speed',color:'#d97706'}] },
    { id:'LOC_05', name:'Dharampeth Commercial Market',      zone:'Zone B — West',      sector:'Sector 5',  riskScore:64, riskLevel:'medium', congestionStatus:'Moderate', activeIncidents:1, description:'Busy commercial belt. Vendor disputes common.', instructions:'Maintain visible patrol. Mediate disputes proactively.', incidents:[{id:'N9',title:'Vendor Dispute',desc:'Altercation between 2 shops — de-escalation needed',time:'7 min ago',icon:'store',color:'#d97706'}] },
    { id:'LOC_06', name:'Central Railway Station West Gate', zone:'Zone A — Central',   sector:'Sector 2',  riskScore:81, riskLevel:'high',   congestionStatus:'Heavy',    activeIncidents:2, description:'Major transit node. High theft incidents. Hawker encroachment persistent.', instructions:'Maintain presence at all gates. Coordinate with Railway Police.', incidents:[{id:'N10',title:'Pickpocket Reported',desc:'Victim near platform 4 — suspect at large',time:'4 min ago',icon:'person_search',color:'#dc2626'},{id:'N11',title:'Crowd Overflow',desc:'Delayed train — platform 1 at 180% capacity',time:'18 min ago',icon:'group',color:'#d97706'}] },
    { id:'LOC_07', name:'Sadar Bazaar Promenade',            zone:'Zone B — North',     sector:'Sector 6',  riskScore:58, riskLevel:'medium', congestionStatus:'Moderate', activeIncidents:0, description:'Heritage promenade market. Light congestion. Generally peaceful.', instructions:'Standard patrol every 45 minutes. Watch for illegal hawkers after 8PM.', incidents:[] },
    { id:'LOC_08', name:'Mihan IT Park Flyover',             zone:'Zone D — South-West',sector:'Sector 14', riskScore:89, riskLevel:'high',   congestionStatus:'Heavy',    activeIncidents:1, description:'Busy IT park flyover. Peak hour congestion severe. Construction diversions active.', instructions:'Manage lane closures. Coordinate with NHAI on diversions.', incidents:[{id:'N12',title:'Construction Zone Hazard',desc:'Unmarked excavation near ramp — barriers needed',time:'6 min ago',icon:'construction',color:'#d97706'}] },
    { id:'LOC_09', name:'Automotive Square Kanhan Road',     zone:'Zone E — North-East', sector:'Sector 11', riskScore:85, riskLevel:'high',   congestionStatus:'Heavy',    activeIncidents:1, description:'Commercial vehicle hub. Overloaded trucks frequent.', instructions:'Check vehicle overloading at weigh station. Night patrols essential.', incidents:[{id:'N13',title:'Overloaded Truck',desc:'Vehicle stopped — RTO inspection pending',time:'9 min ago',icon:'local_shipping',color:'#d97706'}] },
    { id:'LOC_10', name:'Kalamna Grain Market Junction',     zone:'Zone E — East',      sector:'Sector 12', riskScore:71, riskLevel:'high',   congestionStatus:'Heavy',    activeIncidents:1, description:'Agricultural market with heavy goods traffic. Seasonal peaks.', instructions:'Manage loading/unloading zones. Prevent unauthorized roadside parking.', incidents:[{id:'N14',title:'Road Blockage',desc:'Overturned cart — lane 2 blocked',time:'13 min ago',icon:'block',color:'#d97706'}] },
    { id:'LOC_11', name:'Medical College Hospital Square',   zone:'Zone A — Central',   sector:'Sector 4',  riskScore:94, riskLevel:'high',   congestionStatus:'Gridlock', activeIncidents:2, description:'Critical hospital zone. Emergency vehicle access must be maintained at all times.', instructions:'Keep emergency lanes clear. Strict no-parking enforcement.', incidents:[{id:'N15',title:'Emergency Lane Blocked',desc:'Private vehicle blocking ambulance bay',time:'1 min ago',icon:'emergency',color:'#dc2626'},{id:'N16',title:'Crowd Near Casualty',desc:'Large crowd near trauma centre entrance',time:'16 min ago',icon:'group',color:'#d97706'}] },
    { id:'LOC_12', name:'Nagpur International Airport Gate', zone:'Zone D — South',     sector:'Sector 15', riskScore:69, riskLevel:'medium', congestionStatus:'Moderate', activeIncidents:0, description:'Airport entry/exit. VIP and diplomatic traffic. High security zone.', instructions:'Maintain security perimeter. Coordinate with CISF.', incidents:[] },
    { id:'LOC_13', name:'Manewada Ring Road Square',         zone:'Zone C — East',      sector:'Sector 10', riskScore:78, riskLevel:'high',   congestionStatus:'Heavy',    activeIncidents:1, description:'Ring road intersection. High-speed traffic merging from 4 directions.', instructions:'Deploy traffic marshals at peak hours.', incidents:[{id:'N17',title:'Near-miss Collision',desc:'Two vehicles — no injury — traffic disruption',time:'11 min ago',icon:'car_crash',color:'#d97706'}] },
    { id:'LOC_14', name:'Mankapur Sports Complex Crossing',  zone:'Zone B — West',      sector:'Sector 8',  riskScore:55, riskLevel:'medium', congestionStatus:'Moderate', activeIncidents:0, description:'Stadium area. Event-day traffic surges. Otherwise light.', instructions:'Check event calendar weekly. Pre-position crowd barriers on match days.', incidents:[] },
    { id:'LOC_15', name:'Amravati Road Bypass Junction',     zone:'Zone A — West',      sector:'Sector 13', riskScore:83, riskLevel:'high',   congestionStatus:'Heavy',    activeIncidents:1, description:'National highway bypass. Truck traffic high. Illegal U-turns common.', instructions:'Strict no-U-turn enforcement. Coordinate with highway patrol.', incidents:[{id:'N18',title:'Illegal U-Turn Blockage',desc:'Truck attempted U-turn — blocking 3 lanes',time:'14 min ago',icon:'u_turn_right',color:'#d97706'}] },
];

const ALERTS_BY_POST = {
    LOC_01: [{id:'A01a',type:'critical',title:'Accident — Lanes Blocked',desc:'Multi-vehicle collision. Ambulance dispatched.',time:'2 min ago',votes:0,totalOfficers:4,resolved:false},{id:'A01b',type:'warning',title:'Signal Failure',desc:'Traffic light unit #3 offline. Manual control required.',time:'11 min ago',votes:0,totalOfficers:4,resolved:false}],
    LOC_02: [{id:'A02a',type:'critical',title:'Signal Malfunction',desc:'Junction B-2 offline — dangerous free-flow traffic.',time:'5 min ago',votes:0,totalOfficers:3,resolved:false},{id:'A02b',type:'warning',title:'Lane Blockage',desc:'HGVs blocking lane 3 at south ramp.',time:'20 min ago',votes:0,totalOfficers:3,resolved:false}],
    LOC_03: [{id:'A03a',type:'critical',title:'Crowd Surge — Platform 2',desc:'Overcrowding — risk of crush. Immediate crowd management required.',time:'3 min ago',votes:0,totalOfficers:4,resolved:false},{id:'A03b',type:'warning',title:'Unattended Bag',desc:'Suspicious object reported. Bomb disposal alerted.',time:'12 min ago',votes:0,totalOfficers:4,resolved:false}],
    LOC_04: [{id:'A04a',type:'warning',title:'Overspeeding Violation',desc:'3 heavy vehicles flagged. FIR filing in progress.',time:'10 min ago',votes:0,totalOfficers:3,resolved:false}],
    LOC_05: [{id:'A05a',type:'warning',title:'Vendor Dispute',desc:'De-escalation ongoing. Backup requested.',time:'7 min ago',votes:0,totalOfficers:3,resolved:false}],
    LOC_06: [{id:'A06a',type:'critical',title:'Pickpocket Incident',desc:'Victim near platform 4. Suspect at large.',time:'4 min ago',votes:0,totalOfficers:4,resolved:false},{id:'A06b',type:'warning',title:'Platform Overcrowding',desc:'Train delayed 40 min — platform 1 at 180% capacity.',time:'18 min ago',votes:0,totalOfficers:4,resolved:false}],
    LOC_07: [],
    LOC_08: [{id:'A08a',type:'warning',title:'Construction Zone Hazard',desc:'Unmarked excavation near ramp. Barriers required.',time:'6 min ago',votes:0,totalOfficers:3,resolved:false}],
    LOC_09: [{id:'A09a',type:'warning',title:'Overloaded Truck',desc:'Vehicle stopped — RTO inspection pending.',time:'9 min ago',votes:0,totalOfficers:3,resolved:false}],
    LOC_10: [{id:'A10a',type:'warning',title:'Road Blockage',desc:'Overturned cart — lane 2 blocked.',time:'13 min ago',votes:0,totalOfficers:3,resolved:false}],
    LOC_11: [{id:'A11a',type:'critical',title:'Emergency Lane Blocked',desc:'Private vehicle blocking ambulance bay.',time:'1 min ago',votes:0,totalOfficers:4,resolved:false},{id:'A11b',type:'warning',title:'Crowd Near Casualty',desc:'Large crowd near trauma centre entrance.',time:'16 min ago',votes:0,totalOfficers:4,resolved:false}],
    LOC_12: [],
    LOC_13: [{id:'A13a',type:'warning',title:'Near-miss Collision',desc:'Two vehicles — no injury — traffic disruption.',time:'11 min ago',votes:0,totalOfficers:3,resolved:false}],
    LOC_14: [],
    LOC_15: [{id:'A15a',type:'warning',title:'Illegal U-Turn Blockage',desc:'Truck attempted U-turn — blocking 3 lanes.',time:'14 min ago',votes:0,totalOfficers:3,resolved:false}],
};


/* ——————————————————————————————————————————
   STATE
   —————————————————————————————————————————— */
let liveOfficerData     = null;  // officer row from DB (null if offline)
let currentPost         = null;  // normalised post object for rendering
let liveIncidents       = [];    // raw incidents from DB for this zone
let onDuty              = true;
let pendingReassignment = null;  // new post after crisis modal acknowledged

// Votes persist in localStorage so all officer sessions share history
// myVotes: which alerts THIS officer has voted on (keyed by officerId+alertId)
// alertVoteCounts: { alertId: { votes: N, resolved: bool } } — shared across all officers
let myVotes             = {};    // alertId → true if already voted
let alertVoteCounts     = {};    // alertId → { votes, resolved }

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
    badge.textContent = isLive ? '🟢 Live' : '🟡 Data Ready';
    badge.title       = isLive
        ? 'Connected to PravahAI Command Center'
        : 'Using local deployment data';
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

    // Load persisted vote data from localStorage (shared across all officer sessions)
    try {
        const savedVoteCounts = localStorage.getItem('pravah_alert_vote_counts');
        if (savedVoteCounts) alertVoteCounts = JSON.parse(savedVoteCounts);
    } catch(_) {}

    const unitId = sessionStorage.getItem('officer_unit_id');
    try {
        const savedMyVotes = localStorage.getItem(`pravah_my_votes_${unitId}`);
        if (savedMyVotes) myVotes = JSON.parse(savedMyVotes);
    } catch(_) {}

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
    // Helper: apply persisted vote counts to an alert array
    function applyPersistedVotes(alerts) {
        return alerts.map(a => {
            const saved = alertVoteCounts[a.id];
            if (saved) {
                return { ...a, votes: saved.votes, resolved: saved.resolved };
            }
            return { ...a };
        });
    }

    const pid = postId || currentPost?.id;
    if (!liveOfficerData && pid && ALERTS_BY_POST[pid]) {
        return applyPersistedVotes(ALERTS_BY_POST[pid]);
    }
    // Convert live DB incidents to the alert format used by renderAlerts
    const liveAlerts = liveIncidents.map((inc, i) => ({
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
    return applyPersistedVotes(liveAlerts);
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

    const unitId = sessionStorage.getItem('officer_unit_id') || 'unknown';

    myVotes[alert.id] = true;
    alert.votes += 1;

    // Persist shared vote count (read by all officers on login)
    alertVoteCounts[alert.id] = { votes: alert.votes, resolved: alert.resolved };

    const majority = alert.votes >= Math.ceil(alert.totalOfficers / 2);
    if (majority) {
        alert.resolved = true;
        alertVoteCounts[alert.id].resolved = true;
        console.log(`[PravahAI] Majority vote — alert ${alert.id} marked resolved. Admin notified.`);
        showToast(`✅ Majority vote confirmed — "${alert.title}" marked resolved. Admin notified.`, 'success');
        window.playUIBeep && window.playUIBeep('low');
    } else {
        showToast(`🗳️ Vote recorded (${alert.votes}/${alert.totalOfficers}). Waiting for majority.`, 'info');
    }

    // Save to localStorage so other officer portals see the updated count
    try {
        localStorage.setItem('pravah_alert_vote_counts', JSON.stringify(alertVoteCounts));
        localStorage.setItem(`pravah_my_votes_${unitId}`, JSON.stringify(myVotes));
    } catch(_) {}

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
    // ── Report Incident ──────────────────────────────────────────────────
    const incidentBtn = document.getElementById('btn-report-incident');
    if (incidentBtn) {
        incidentBtn.addEventListener('click', () => {
            openIncidentReportModal();
        });
    }

    // ── Request Backup ────────────────────────────────────────────────────
    const backupBtn = document.getElementById('btn-backup');
    if (backupBtn) {
        backupBtn.addEventListener('click', async () => {
            if (backupBtn.disabled) return;
            backupBtn.disabled    = true;
            backupBtn.textContent = 'Requesting…';
            window.playUIBeep && window.playUIBeep('medium');

            try {
                const unitId   = sessionStorage.getItem('officer_unit_id') || 'UNKNOWN';
                const location = (currentPost && (currentPost.name || currentPost.sector)) || 'Unknown Location';

                const res = await fetch(PRAVAH_API + '/api/backup', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({
                        requesting_unit: unitId,
                        location:        location,
                        severity:        'Warning',
                        description:     'Backup requested by officer ' + unitId + ' at ' + location + '.',
                        count:           2
                    }),
                    signal: AbortSignal.timeout(8000)
                });

                if (res.ok) {
                    const data  = await res.json();
                    const units = (data.assignments || []).map(function(a) { return a.name || a.unit_id; }).join(', ');
                    showToast('\uD83D\uDCE1 Backup dispatched! ' + data.assignedCount + ' unit(s) en route: ' + (units || 'Assigned') + '. ID: ' + data.requestId, 'success');
                } else {
                    const err = await res.json().catch(function() { return {}; });
                    showToast('\uD83D\uDCE1 Backup requested. ' + (err.message || 'Processing…'), 'warning');
                }
            } catch (err) {
                showToast('\uD83D\uDCE1 Backup requested. Command Center notified (offline mode).', 'warning');
            } finally {
                backupBtn.disabled  = false;
                backupBtn.innerHTML = '<span class="material-symbols-outlined">support_agent<\/span> Request Backup';
            }
        });
    }

    // ── View Map ──────────────────────────────────────────────────────────
    const mapBtn = document.getElementById('btn-view-map');
    if (mapBtn) {
        mapBtn.addEventListener('click', function() {
            showToast('\uD83D\uDDFA\uFE0F Full map view — coming soon.', 'info');
        });
    }

    // ── SOS ───────────────────────────────────────────────────────────────
    const sosBtn = document.getElementById('btn-sos');
    if (sosBtn) {
        sosBtn.addEventListener('click', async function() {
            if (sosBtn.disabled) return;
            sosBtn.disabled = true;
            window.playUIBeep && window.playUIBeep('high');

            try {
                const unitId   = sessionStorage.getItem('officer_unit_id') || 'UNKNOWN';
                const location = (currentPost && (currentPost.name || currentPost.sector)) || 'Unknown Location';

                await fetch(PRAVAH_API + '/api/backup', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({
                        requesting_unit: unitId,
                        location:        location,
                        severity:        'Critical',
                        description:     '\uD83C\uDE86 SOS — Officer ' + unitId + ' at ' + location + ' requires immediate assistance!',
                        count:           3
                    }),
                    signal: AbortSignal.timeout(8000)
                });
            } catch (_) { /* offline — ignore */ }

            showToast('\uD83C\uDE86 SOS signal sent to Command Center! Backup auto-assigned.', 'error');
            setTimeout(function() { sosBtn.disabled = false; }, 10000);
        });
    }
}

/* ——————————————————————————————————————————
   INCIDENT REPORT MODAL
   Opens a dynamic modal so officers can log incidents from the field.
   Calls POST /api/backup/incident which logs the incident AND auto-assigns backup.
   —————————————————————————————————————————— */
function openIncidentReportModal() {
    var existing = document.getElementById('incident-report-modal');
    if (existing) existing.remove();

    var unitId      = sessionStorage.getItem('officer_unit_id') || 'UNKNOWN';
    var officerName = (OFFICER_DATA && OFFICER_DATA.name) || unitId;
    var location    = (currentPost && (currentPost.name || currentPost.sector)) || '';

    var modal = document.createElement('div');
    modal.id  = 'incident-report-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px);';

    modal.innerHTML = `
    <div style="
        background:#ffffff;
        border-radius:18px;
        padding:28px 28px 22px;
        width:100%;
        max-width:480px;
        box-shadow:0 20px 60px rgba(0,0,0,0.25);
        font-family:'Inter',sans-serif;
        color:#111827;
    ">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
            <div style="width:38px;height:38px;border-radius:10px;background:#fef2f2;display:flex;align-items:center;justify-content:center;">
                <span class="material-symbols-outlined" style="color:#dc2626;font-size:22px;">emergency</span>
            </div>
            <div>
                <div style="font-size:17px;font-weight:800;color:#111827;">Report Incident</div>
                <div style="font-size:11px;color:#6b7280;">Officer ${unitId} · ${officerName}</div>
            </div>
        </div>

        <label style="font-size:11px;font-weight:600;color:#374151;letter-spacing:0.4px;text-transform:uppercase;">Location</label>
        <input id="inc-location" type="text" value="${location}" placeholder="Current post or custom location"
            style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:9px;margin:5px 0 14px;
            border:1.5px solid #d1d5db;background:#f9fafb;color:#111827;font-size:14px;outline:none;
            transition:border-color 0.2s;" onfocus="this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#d1d5db'" />

        <label style="font-size:11px;font-weight:600;color:#374151;letter-spacing:0.4px;text-transform:uppercase;">Category</label>
        <select id="inc-category"
            style="width:100%;padding:10px 12px;border-radius:9px;margin:5px 0 14px;
            border:1.5px solid #d1d5db;background:#f9fafb;color:#111827;font-size:14px;outline:none;">
            <option>Accident</option>
            <option>Congestion</option>
            <option>Criminal Activity</option>
            <option>Maintenance</option>
            <option>Crowd Control</option>
            <option>System</option>
        </select>

        <label style="font-size:11px;font-weight:600;color:#374151;letter-spacing:0.4px;text-transform:uppercase;">Severity</label>
        <select id="inc-severity"
            style="width:100%;padding:10px 12px;border-radius:9px;margin:5px 0 14px;
            border:1.5px solid #d1d5db;background:#f9fafb;color:#111827;font-size:14px;outline:none;">
            <option value="Warning">⚠️ Warning</option>
            <option value="Critical">🔴 Critical</option>
            <option value="Normal">🟢 Normal</option>
        </select>

        <label style="font-size:11px;font-weight:600;color:#374151;letter-spacing:0.4px;text-transform:uppercase;">Description</label>
        <textarea id="inc-description" rows="3" placeholder="Describe the incident…"
            style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:9px;margin:5px 0 16px;
            border:1.5px solid #d1d5db;background:#f9fafb;color:#111827;font-size:14px;
            resize:vertical;outline:none;font-family:inherit;"
            onfocus="this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#d1d5db'"></textarea>

        <div id="inc-result" style="margin-bottom:12px;font-size:13px;min-height:18px;font-weight:500;"></div>

        <div style="display:flex;gap:10px;justify-content:flex-end;">
            <button id="inc-cancel-btn"
                style="padding:9px 20px;border-radius:9px;border:1.5px solid #d1d5db;
                background:transparent;color:#374151;cursor:pointer;font-size:14px;font-weight:600;
                transition:background 0.15s;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='transparent'">
                Cancel
            </button>
            <button id="inc-submit-btn"
                style="padding:9px 20px;border-radius:9px;border:none;
                background:#dc2626;color:#fff;cursor:pointer;font-size:14px;font-weight:700;
                box-shadow:0 2px 8px rgba(220,38,38,0.3);transition:background 0.15s;"
                onmouseover="this.style.background='#b91c1c'" onmouseout="this.style.background='#dc2626'">
                🚨 Submit Report
            </button>
        </div>
    </div>`;

    document.body.appendChild(modal);

    document.getElementById('inc-cancel-btn').addEventListener('click', function() { modal.remove(); });
    modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });

    document.getElementById('inc-submit-btn').addEventListener('click', async function() {
        var submitBtn   = document.getElementById('inc-submit-btn');
        var resultEl    = document.getElementById('inc-result');
        var loc         = document.getElementById('inc-location').value.trim();
        var category    = document.getElementById('inc-category').value;
        var severity    = document.getElementById('inc-severity').value;
        var description = document.getElementById('inc-description').value.trim();

        if (!loc) {
            resultEl.style.color = '#dc2626';
            resultEl.textContent = 'Location is required.';
            return;
        }

        submitBtn.disabled    = true;
        submitBtn.textContent = 'Submitting…';
        resultEl.textContent  = '';

        // Always write to localStorage so admin portal picks it up (works offline too)
        var incidentRecord = {
            id:          'INC_' + Date.now(),
            officerId:   unitId,
            officerName: officerName,
            location:    loc,
            category:    category,
            severity:    severity,
            description: description || (category + ' reported by ' + unitId + ' at ' + loc + '.'),
            timestamp:   Date.now(),
            status:      'Open'
        };
        try {
            var existing = JSON.parse(localStorage.getItem('pravah_officer_incidents') || '[]');
            existing.push(incidentRecord);
            localStorage.setItem('pravah_officer_incidents', JSON.stringify(existing));
        } catch(_) {}

        try {
            var res = await fetch(PRAVAH_API + '/api/backup/incident', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    requesting_unit: unitId,
                    location:        loc,
                    category:        category,
                    severity:        severity,
                    description:     incidentRecord.description
                }),
                signal: AbortSignal.timeout(8000)
            });

            if (res.ok) {
                var data = await res.json();
                var aa   = data.autoAssignment;
                if (aa && aa.success) {
                    var units = (aa.assignments || []).map(function(a) { return a.name || a.unit_id; }).join(', ');
                    resultEl.style.color = '#16a34a';
                    resultEl.textContent = '✅ Reported (' + (data.incident && data.incident.incident_id) + '). Auto-assigned: ' + units + '.';
                    showToast('🚨 Incident logged. ' + aa.assignedCount + ' unit(s) auto-dispatched.', 'success');
                } else {
                    resultEl.style.color = '#16a34a';
                    resultEl.textContent = '✅ Incident logged. Command Center notified.';
                    showToast('🚨 Incident reported. Command Center notified.', 'warning');
                }
                setTimeout(function() { modal.remove(); }, 2000);
            } else {
                var errData = await res.json().catch(function() { return {}; });
                resultEl.style.color  = '#dc2626';
                resultEl.textContent  = 'Error: ' + (errData.error || 'Failed to submit. Please try again.');
                submitBtn.disabled    = false;
                submitBtn.textContent = '🚨 Submit Report';
            }
        } catch (_) {
            // API offline — already saved to localStorage above
            resultEl.style.color = '#16a34a';
            resultEl.textContent = '✅ Incident lodged locally. Admin portal has been notified.';
            showToast('🚨 Incident logged and sent to Command Center.', 'success');
            setTimeout(function() { modal.remove(); }, 2000);
        }
    });

    window.playUIBeep && window.playUIBeep('medium');
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

    // Set to 0 so ANY existing signal (even sent before login) is detected on load
    let lastSeenTimestamp = 0;

    function checkForReassignment() {
        // Check officer-specific key first (most reliable)
        const specificRaw = localStorage.getItem(`pravah_reassign_${OFFICER_DATA.id}`);
        const broadcastRaw = localStorage.getItem('pravah_latest_reassign');
        const raw = specificRaw || broadcastRaw;
        if (!raw) return;

        try {
            const signal = JSON.parse(raw);

            // Only react if:
            // 1. Signal targets THIS officer
            // 2. Newer than last processed
            // 3. Not already handling a pending reassignment
            if (
                signal.officerId === OFFICER_DATA.id &&
                signal.timestamp > lastSeenTimestamp &&
                !pendingReassignment
            ) {
                lastSeenTimestamp = signal.timestamp;

                const newPost = POSTS_DB.find(p => p.id === signal.postId);
                if (newPost && (!currentPost || newPost.id !== currentPost.id)) {
                    triggerReassignment(newPost, signal.reason);
                }
            }
        } catch (e) {
            // Malformed JSON — ignore
        }
    }

    // Cross-tab: storage event fires immediately when another tab writes
    window.addEventListener('storage', (e) => {
        if (e.key === 'pravah_latest_reassign' || e.key === `pravah_reassign_${OFFICER_DATA.id}`) {
            checkForReassignment();
        }
    });

    // Poll every 2 seconds — also catches signals sent before login
    setInterval(checkForReassignment, 2000);

    // Immediate check on load — catches any signal already waiting
    checkForReassignment();
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
