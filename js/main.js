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
            statusEl.textContent = 'Offline — cached data';
            statusEl.style.color = 'var(--color-error)';
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
    const collapseBtn = document.getElementById('sidebar-collapse-btn');
    if (!sidebar || !menuToggleBtn) return;

    // Create background overlay element dynamically
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    // Toggle menu or collapsed state
    menuToggleBtn.addEventListener('click', () => {
        if (window.innerWidth > 768) {
            // Desktop: toggle collapsed layout
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
            // Mobile: toggle drawer
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        }
    });

    // Desktop Collapse Button inside sidebar
    if (collapseBtn && appLayout) {
        // Restore state from localStorage
        const isCollapsed = localStorage.getItem('sidebar-collapsed-desktop') === 'true';
        if (isCollapsed) {
            appLayout.classList.add('sidebar-collapsed');
            setTimeout(() => {
                if (window.map) window.map.invalidateSize();
            }, 100);
        }

        collapseBtn.addEventListener('click', () => {
            appLayout.classList.add('sidebar-collapsed');
            localStorage.setItem('sidebar-collapsed-desktop', 'true');
            // Trigger map sizing update
            setTimeout(() => {
                if (window.map) window.map.invalidateSize({ animate: true });
            }, 310);
        });
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
