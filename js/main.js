/* ==========================================================================
   Civic Sentinel - Core Shell Logic (main.js)
   ========================================================================== */

const PRAVAH_API = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Theme Management (Light / Dark Mode)
    initTheme();

    // 2. Mobile Responsive Sidebar Navigation
    initMobileSidebar();

    // 3. System Global Clock
    initSystemClock();

    // 4. Sync Risk Engine from live API
    syncRiskEngineFromAPI();
    setInterval(syncRiskEngineFromAPI, 5 * 60 * 1000); // refresh fallback every 5 minutes

    // 5. Connect to Live WebSocket Server for Instant Sync
    initWebSocketSync();
});

/**
 * Connects to the backend WebSocket stream and triggers sync on database mutations.
 */
function initWebSocketSync() {
    const wsUrl = `ws://${window.location.hostname || 'localhost'}:3000`;
    let socket;

    function connect() {
        console.log(`[WebSocket] Connecting to ${wsUrl}...`);
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            console.log('[WebSocket] Connected to live event stream');
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('[WebSocket] Live event received:', data.event);
                
                // On any update event, sync state instantly
                if (['incidents_updated', 'deployment_updated', 'traffic_updated'].includes(data.event)) {
                    syncRiskEngineFromAPI();
                }

                // Auto-assignment notification — show controller alert banner
                if (data.event === 'backup_auto_assigned') {
                    showBackupAssignmentAlert(data);
                    // Notify the backup log table (on incidents page)
                    window.dispatchEvent(new CustomEvent('backup_auto_assigned_event', { detail: data }));
                    // Also trigger incidents refresh since a new incident may have been created
                    syncRiskEngineFromAPI();
                }

                // Backup status update (acknowledged / resolved)
                if (data.event === 'backup_status_updated') {
                    const req = data.data;
                    window.dispatchSystemAlert(
                        `Backup ${req.status}`,
                        `Request ${req.request_id} at ${req.location} marked ${req.status}.`,
                        req.status === 'Resolved' ? 'info' : 'elevated'
                    );
                }
            } catch (err) {
                console.warn('[WebSocket] Mismatched payload:', err.message);
            }
        };

        socket.onclose = () => {
            console.warn('[WebSocket] Connection lost. Reconnecting in 5s...');
            setTimeout(connect, 5000);
        };

        socket.onerror = (err) => {
            socket.close();
        };
    }

    connect();
}

/**
 * Fetches live data from the Pravah API and pushes it into the RiskEngine.
 * Falls back gracefully if the API is unreachable — engine uses last known state.
 */
async function syncRiskEngineFromAPI() {
    if (typeof RiskEngine === 'undefined') return;

    try {
        const res  = await fetch(`${PRAVAH_API}/api/risk/score`, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        const data = await res.json();

        // Push all live inputs into the engine
        RiskEngine.updateState({
            incidents:          data.meta ? [] : [],   // zone scores come pre-computed
            officersOnDuty:     data.meta.officersOnDuty,
            totalOfficers:      data.meta.totalOfficers,
            unmannedZones:      data.meta.unmannedZones,
            totalHighRiskZones: data.meta.totalHighRiskZones,
            avgTrafficVelocity: data.meta.avgVelocity,
            freeFlowVelocity:   55
        });

        // Store full API result for pages to consume
        window.__pravahRiskData = data;

        // Dispatch event so pages can react immediately
        window.dispatchEvent(new CustomEvent('riskDataUpdated', { detail: data }));

        // Update API status indicator if present
        const statusEl = document.getElementById('api-status');
        if (statusEl) {
            statusEl.textContent = `Live • ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
            statusEl.style.color = 'var(--color-secondary)';
        }

        console.log(`[PravahAI] Risk engine synced — Score: ${data.score} (${data.label.text})`);
    } catch (err) {
        console.warn('[PravahAI] API unreachable, engine using cached state.', err.message);

        const statusEl = document.getElementById('api-status');
        if (statusEl) {
            statusEl.textContent = 'Using local data';
            statusEl.style.color = 'var(--color-on-surface-variant)';
        }
    }
}

/**
 * Initializes and manages theme switching (Light / Dark)
 */
function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (!themeToggleBtn) return;

    // Load theme from localStorage or fallback to system preference
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let currentTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

    // Apply initial theme
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(themeToggleBtn, currentTheme);

    // Click handler
    themeToggleBtn.addEventListener('click', () => {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('theme', currentTheme);
        updateThemeIcon(themeToggleBtn, currentTheme);
        
        // Dispatch event for other modules that depend on theme state (e.g. charts)
        window.dispatchEvent(new CustomEvent('themechanged', { detail: currentTheme }));
    });
}

function updateThemeIcon(btn, theme) {
    const icon = btn.querySelector('.material-symbols-outlined');
    if (!icon) return;
    
    if (theme === 'dark') {
        icon.textContent = 'light_mode';
    } else {
        icon.textContent = 'dark_mode';
    }
}

/**
 * Setup mobile slide-over navigation toggling
 */
function initMobileSidebar() {
    const sidebar = document.querySelector('.app-sidebar');
    const menuToggleBtn = document.getElementById('menu-toggle');
    const appLayout = document.querySelector('.app-layout');
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    if (!sidebar || !menuToggleBtn) return;

    // Create background overlay element dynamically
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    // Toggle menu or collapsed state
    const handleToggle = () => {
        if (window.innerWidth > 768) {
            if (appLayout) {
                appLayout.classList.toggle('sidebar-collapsed');
                const nowCollapsed = appLayout.classList.contains('sidebar-collapsed');
                localStorage.setItem('sidebar-collapsed-desktop', nowCollapsed);
                // Trigger map sizing update
                setTimeout(() => {
                    if (window.map) window.map.invalidateSize({ animate: true });
                }, 310);
            }
        } else {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        }
    };

    if (menuToggleBtn) menuToggleBtn.addEventListener('click', handleToggle);
    if (toggleBtn) toggleBtn.addEventListener('click', handleToggle);

    // Restore desktop collapsed state from localStorage
    if (appLayout && window.innerWidth > 768) {
        const isCollapsed = localStorage.getItem('sidebar-collapsed-desktop') === 'true';
        if (isCollapsed) {
            appLayout.classList.add('sidebar-collapsed');
            setTimeout(() => {
                if (window.map) window.map.invalidateSize();
            }, 100);
        }
    }

    // Close when overlay is clicked
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    });

    // Close when nav links are clicked on small screens
    const navLinks = sidebar.querySelectorAll('.nav-item');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
    });
}

/**
 * Display command center real-time clock
 */
function initSystemClock() {
    const clockLabel = document.getElementById('sidebar-clock');
    if (!clockLabel) return;
    
    const updateTime = () => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        clockLabel.textContent = timeStr;
    };
    
    updateTime();
    setInterval(updateTime, 1000);
}

/**
 * Common notification utility to broadcast events across pages
 */
window.dispatchSystemAlert = function(title, description, riskLevel = 'info') {
    // Increment notification badge counter if exists
    const badge = document.querySelector('.badge-dot');
    if (badge) {
        let currentCount = parseInt(badge.getAttribute('data-count') || '1');
        currentCount++;
        badge.setAttribute('data-count', currentCount);
        badge.style.display = 'block';
    }

    // Play a low procedural sound (using web audio API) for command center feedback
    playBeepSound(riskLevel);

    console.log(`[Civic Sentinel Alert - ${riskLevel.toUpperCase()}] ${title}: ${description}`);
};

function playBeepSound(riskLevel) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        // Frequencies corresponding to risk urgency
        let frequency = 440;
        let duration = 0.1;
        
        if (riskLevel === 'critical') {
            frequency = 880;
            duration = 0.3;
        } else if (riskLevel === 'elevated') {
            frequency = 660;
            duration = 0.15;
        }
        
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    } catch (e) {
        // Fallback silently if audio context is blocked
    }
}

/* ==========================================================================
   Backup Auto-Assignment Alert Banner
   Shows a persistent card in the controller UI when officers are auto-dispatched.
   ========================================================================== */

/**
 * Renders a dismissible alert banner at the top of the page for the controller.
 * Stacks multiple banners if several requests arrive quickly.
 */
function showBackupAssignmentAlert(payload) {
    // Play critical beep
    playBeepSound(payload.severity === 'Critical' ? 'critical' : 'elevated');

    // Increment nav badge
    window.dispatchSystemAlert(
        `Auto-Dispatch: ${payload.location}`,
        payload.summary,
        payload.severity === 'Critical' ? 'critical' : 'elevated'
    );

    // Create or find the alert container
    let container = document.getElementById('backup-alert-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'backup-alert-container';
        container.style.cssText = [
            'position:fixed', 'top:72px', 'right:16px', 'z-index:8000',
            'display:flex', 'flex-direction:column', 'gap:10px',
            'max-width:420px', 'width:calc(100% - 32px)'
        ].join(';');
        document.body.appendChild(container);
    }

    // Build the alert card
    const card = document.createElement('div');
    const isSOSOrCritical = payload.severity === 'Critical';
    card.style.cssText = [
        'background:' + (isSOSOrCritical ? '#7f1d1d' : '#1c3a2c'),
        'border:1px solid ' + (isSOSOrCritical ? '#dc2626' : '#16a34a'),
        'border-radius:12px', 'padding:14px 16px',
        'box-shadow:0 4px 20px rgba(0,0,0,0.5)',
        'animation:slideInRight 0.3s ease',
        'font-family:inherit'
    ].join(';');

    const assignments = (payload.assignments || [])
        .map(a => `<span style="display:inline-block;background:rgba(255,255,255,0.12);border-radius:6px;padding:2px 8px;font-size:11px;margin:2px;">${a.name || a.unit_id} (${a.distance_km}km · Risk ${a.zone_risk})</span>`)
        .join('');

    card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
            <div style="display:flex;align-items:center;gap:8px;">
                <span class="material-symbols-outlined" style="font-size:20px;color:${isSOSOrCritical ? '#f87171' : '#4ade80'};">
                    ${isSOSOrCritical ? 'crisis_alert' : 'local_police'}
                </span>
                <div>
                    <div style="font-size:13px;font-weight:700;color:#fff;">
                        ${isSOSOrCritical ? '🆘 SOS / Critical' : '📡 Backup Auto-Dispatched'}
                    </div>
                    <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:2px;">
                        ${payload.requestId} · ${payload.requestingUnit} · ${new Date(payload.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                </div>
            </div>
            <button onclick="this.closest('[id]').remove();" style="background:none;border:none;color:rgba(255,255,255,0.5);cursor:pointer;font-size:18px;padding:0;line-height:1;">×</button>
        </div>
        <div style="font-size:12px;color:rgba(255,255,255,0.85);margin:8px 0 4px;">
            📍 <strong>${payload.location}</strong>
            ${payload.description ? `<br><span style="opacity:0.7;">${payload.description}</span>` : ''}
        </div>
        <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-bottom:8px;">
            ${payload.assignedCount} officer(s) dispatched from low-risk zones:
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">
            ${assignments || '<span style="font-size:11px;opacity:0.6;">No assignment details available</span>'}
        </div>
        <div style="margin-top:10px;display:flex;gap:8px;justify-content:flex-end;">
            <button onclick="acknowledgeBackupRequest('${payload.requestId}', this);"
                style="font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid rgba(255,255,255,0.3);
                       background:rgba(255,255,255,0.1);color:#fff;cursor:pointer;">
                ✓ Acknowledge
            </button>
            <button onclick="this.closest('[id]').remove();"
                style="font-size:11px;padding:4px 10px;border-radius:6px;border:none;
                       background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.5);cursor:pointer;">
                Dismiss
            </button>
        </div>
    `;

    card.id = 'bkp-card-' + payload.requestId;
    container.prepend(card);

    // Auto-dismiss after 30 seconds
    setTimeout(() => { if (card.parentNode) card.remove(); }, 30000);
}

/**
 * Marks a backup request as Acknowledged via API.
 */
async function acknowledgeBackupRequest(requestId, btn) {
    try {
        btn.disabled    = true;
        btn.textContent = 'Acknowledging…';

        const res = await fetch(`${PRAVAH_API}/api/backup/${requestId}/status`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ status: 'Acknowledged' }),
            signal:  AbortSignal.timeout(5000)
        });

        if (res.ok) {
            btn.textContent       = '✓ Acknowledged';
            btn.style.background  = '#16a34a';
        } else {
            btn.disabled    = false;
            btn.textContent = '✓ Acknowledge';
        }
    } catch (_) {
        btn.disabled    = false;
        btn.textContent = '✓ Acknowledge';
    }
}

// CSS animation for slide-in
(function injectStyles() {
    if (document.getElementById('backup-alert-styles')) return;
    const style = document.createElement('style');
    style.id = 'backup-alert-styles';
    style.textContent = `
        @keyframes slideInRight {
            from { opacity: 0; transform: translateX(40px); }
            to   { opacity: 1; transform: translateX(0); }
        }
    `;
    document.head.appendChild(style);
})();
