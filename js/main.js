/* ==========================================================================
   Civic Sentinel - Core Shell Logic (main.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Theme Management (Light / Dark Mode)
    initTheme();

    // 2. Mobile Responsive Sidebar Navigation
    initMobileSidebar();

    // 3. System Global Clock
    initSystemClock();
});

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
        btn.setAttribute('data-tooltip', 'Switch to Light Mode');
    } else {
        icon.textContent = 'dark_mode';
        btn.setAttribute('data-tooltip', 'Switch to Dark Mode');
    }
}

/**
 * Setup mobile slide-over navigation toggling
 */
function initMobileSidebar() {
    const sidebar = document.querySelector('.app-sidebar');
    const menuToggleBtn = document.getElementById('menu-toggle');
    if (!sidebar || !menuToggleBtn) return;

    // Create background overlay element dynamically
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    // Toggle menu
    menuToggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    });

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
    const clockLabel = document.querySelector('.sidebar-header-titles p');
    if (!clockLabel) return;
    
    const updateTime = () => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        clockLabel.textContent = `Command Alpha | ${timeStr}`;
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
