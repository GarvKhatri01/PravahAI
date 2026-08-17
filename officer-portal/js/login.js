/* ==========================================================================
   PravahAI Officer Portal — Login Page Logic (login.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('officer_logged_in')) {
        window.location.href = 'dashboard.html';
        return;
    }
    initLoginForm();
    initPasswordToggle();
    const savedTheme = localStorage.getItem('officer_theme');
    if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
});

/**
 * Officer credentials — mapped to the real deployment officer roster.
 *
 *  U-001 / pravah001  — Insp. Sanjay Patil       → Zero Mile Stone Junction
 *  U-002 / pravah002  — SI Ramesh Kumar           → Variety Square Interchange
 *  U-003 / pravah003  — Const. Priya Deshpande    → Sitabuldi Metro Interchange
 *  U-004 / pravah004  — Insp. Amit Thakur         → Wardha Road Express Corridor
 *  U-005 / pravah005  — SI Neha Joshi             → Dharampeth Commercial Market
 *  U-006 / pravah006  — Const. Vikram Rao         → Central Railway Station West Gate
 *  U-008 / pravah008  — Const. Sunita Borde       → Sadar Bazaar Promenade
 */
function initLoginForm() {
    const form      = document.getElementById('login-form');
    const submitBtn = document.getElementById('login-submit');
    const spinner   = document.getElementById('login-spinner');
    if (!form) return;

    const USERS = [
        { badgeId: 'OFF_01', password: 'pravah_off01', unitId: 'OFF_01', postId: 'LOC_01' },
        { badgeId: 'OFF_02', password: 'pravah_off02', unitId: 'OFF_02', postId: 'LOC_02' },
        { badgeId: 'OFF_03', password: 'pravah_off03', unitId: 'OFF_03', postId: 'LOC_03' },
        { badgeId: 'OFF_04', password: 'pravah_off04', unitId: 'OFF_04', postId: 'LOC_04' },
        { badgeId: 'OFF_05', password: 'pravah_off05', unitId: 'OFF_05', postId: 'LOC_05' },
        { badgeId: 'OFF_06', password: 'pravah_off06', unitId: 'OFF_06', postId: 'LOC_06' },
        { badgeId: 'OFF_07', password: 'pravah_off07', unitId: 'OFF_07', postId: 'LOC_07' },
        { badgeId: 'OFF_08', password: 'pravah_off08', unitId: 'OFF_08', postId: 'LOC_08' },
        { badgeId: 'OFF_09', password: 'pravah_off09', unitId: 'OFF_09', postId: 'LOC_09' },
        { badgeId: 'OFF_10', password: 'pravah_off10', unitId: 'OFF_10', postId: 'LOC_10' },
        { badgeId: 'OFF_11', password: 'pravah_off11', unitId: 'OFF_11', postId: 'LOC_11' },
        { badgeId: 'OFF_12', password: 'pravah_off12', unitId: 'OFF_12', postId: 'LOC_12' },
        { badgeId: 'OFF_13', password: 'pravah_off13', unitId: 'OFF_13', postId: 'LOC_13' },
        { badgeId: 'OFF_14', password: 'pravah_off14', unitId: 'OFF_14', postId: 'LOC_14' },
        { badgeId: 'OFF_15', password: 'pravah_off15', unitId: 'OFF_15', postId: 'LOC_15' },
    ];

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError();

        const badgeId  = document.getElementById('badge-id').value.trim().toUpperCase();
        const password = document.getElementById('password').value;

        if (!badgeId || !password) { showError('Please fill in all fields.'); return; }

        setLoading(true, submitBtn, spinner);
        await delay(900);

        const user = USERS.find(u => u.badgeId === badgeId && u.password === password);

        if (user) {
            sessionStorage.setItem('officer_logged_in', 'true');
            sessionStorage.setItem('officer_unit_id',   user.unitId);
            sessionStorage.setItem('officer_post',      user.postId);

            submitBtn.textContent = '✓ Authenticated';
            submitBtn.style.background = '#16a34a';
            await delay(600);
            window.location.href = 'dashboard.html';
        } else {
            setLoading(false, submitBtn, spinner);
            showError('Invalid Badge ID or password. Please try again.');
            shakeBadgeField();
        }
    });
}

function initPasswordToggle() {
    const toggleBtn  = document.getElementById('pw-toggle-btn');
    const passwordEl = document.getElementById('password');
    const toggleIcon = document.getElementById('pw-toggle-icon');
    if (!toggleBtn || !passwordEl) return;
    toggleBtn.addEventListener('click', () => {
        const isText = passwordEl.type === 'text';
        passwordEl.type        = isText ? 'password' : 'text';
        toggleIcon.textContent = isText ? 'visibility' : 'visibility_off';
    });
}

function showError(msg) {
    const el = document.getElementById('login-error');
    if (!el) return;
    el.querySelector('#login-error-text').textContent = msg;
    el.classList.add('visible');
}
function hideError() {
    const el = document.getElementById('login-error');
    if (el) el.classList.remove('visible');
}
function setLoading(loading, btn, spinner) {
    if (!btn) return;
    btn.disabled = loading;
    if (spinner) spinner.style.display = loading ? 'inline-block' : 'none';
    btn.textContent = loading ? 'Authenticating…' : 'Sign In';
    if (spinner && loading) btn.prepend(spinner);
}
function shakeBadgeField() {
    const field = document.getElementById('badge-id');
    if (!field) return;
    field.style.animation = 'none';
    void field.offsetWidth;
    field.style.animation = 'shake 0.5s ease';
    setTimeout(() => { field.style.animation = ''; }, 600);
}
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
