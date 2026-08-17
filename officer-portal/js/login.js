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
        { badgeId: 'U-001', password: 'pravah001', unitId: 'U-001', postId: 'LOC_01' },
        { badgeId: 'U-002', password: 'pravah002', unitId: 'U-002', postId: 'LOC_02' },
        { badgeId: 'U-003', password: 'pravah003', unitId: 'U-003', postId: 'LOC_03' },
        { badgeId: 'U-004', password: 'pravah004', unitId: 'U-004', postId: 'LOC_04' },
        { badgeId: 'U-005', password: 'pravah005', unitId: 'U-005', postId: 'LOC_05' },
        { badgeId: 'U-006', password: 'pravah006', unitId: 'U-006', postId: 'LOC_06' },
        { badgeId: 'U-008', password: 'pravah008', unitId: 'U-008', postId: 'LOC_07' },
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
