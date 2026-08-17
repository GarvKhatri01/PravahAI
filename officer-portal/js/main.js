/* ==========================================================================
   PravahAI Officer Portal — Core Shell Logic (main.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Theme management (persisted)
    initTheme();

    // 2. System clock (header / shift timer)
    initSystemClock();
});

/**
 * Initializes and manages Light / Dark theme switching.
 * Theme preference is persisted in localStorage.
 */
function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (!themeToggleBtn) return;

    const saved = localStorage.getItem('officer_theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let currentTheme = saved || (systemPrefersDark ? 'dark' : 'light');

    applyTheme(currentTheme);
    updateThemeIcon(themeToggleBtn, currentTheme);

    themeToggleBtn.addEventListener('click', () => {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(currentTheme);
        localStorage.setItem('officer_theme', currentTheme);
        updateThemeIcon(themeToggleBtn, currentTheme);
        window.dispatchEvent(new CustomEvent('themechanged', { detail: currentTheme }));
    });
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
}

function updateThemeIcon(btn, theme) {
    const icon = btn.querySelector('.material-symbols-outlined');
    if (!icon) return;
    icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
    btn.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
}

/**
 * Real-time clock for shift duration display.
 * Assumes shift started at the beginning of the current hour (demo only).
 */
function initSystemClock() {
    const shiftTimerEl  = document.getElementById('shift-timer');
    const clockEl       = document.getElementById('header-clock');

    // Set a fixed shift start time (current session start)
    const shiftStart = Date.now();

    const tick = () => {
        const now = new Date();

        // Update header clock
        if (clockEl) {
            clockEl.textContent = now.toLocaleTimeString('en-IN', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });
        }

        // Update shift elapsed timer
        if (shiftTimerEl) {
            const elapsed = Math.floor((Date.now() - shiftStart) / 1000);
            const h = Math.floor(elapsed / 3600).toString().padStart(2, '0');
            const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
            const s = Math.floor(elapsed % 60).toString().padStart(2, '0');
            shiftTimerEl.textContent = `${h}:${m}:${s}`;
        }
    };

    tick();
    setInterval(tick, 1000);
}

/**
 * Utility — play a subtle audio beep for UI feedback.
 * @param {'low'|'medium'|'high'} urgency
 */
window.playUIBeep = function (urgency = 'low') {
    try {
        const ctx  = new (window.AudioContext || window.webkitAudioContext)();
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        const freqs  = { low: 440, medium: 660, high: 880 };
        const durs   = { low: 0.08, medium: 0.18, high: 0.35 };

        osc.frequency.value = freqs[urgency] ?? 440;
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (durs[urgency] ?? 0.1));

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + (durs[urgency] ?? 0.1));
    } catch (_) { /* silently fail */ }
};
