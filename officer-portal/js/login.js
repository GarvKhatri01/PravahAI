/* ==========================================================================
   PravahAI Officer Portal — Login Page Logic (login.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // If already logged in, redirect to dashboard
    if (sessionStorage.getItem('officer_logged_in')) {
        window.location.href = 'dashboard.html';
        return;
    }

    initLoginForm();
    initPasswordToggle();

    // Apply saved theme
    const savedTheme = localStorage.getItem('officer_theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    }
});

/**
 * Handles login form submit with mock credential validation.
 * In a real deployment this would call an API endpoint.
 *
 * Demo credentials (mapped to live DB unit_ids):
 *   Badge ID : U-001  Password: pravah001  (Insp. Sanjay Patil — Zero Mile Stone)
 *   Badge ID : U-002  Password: pravah002  (SI Ramesh Kumar — Wardha Road)
 *   Badge ID : U-003  Password: pravah003  (Const. Priya Deshpande — Sitabuldi)
 *   Badge ID : U-004  Password: pravah004  (Insp. Amit Thakur — Variety Square)
 *   Badge ID : U-005  Password: pravah005  (SI Neha Joshi — Sadar Bazar)
 *   Badge ID : U-006  Password: pravah006  (Const. Vikram Rao — Kamptee Road)
 *   Badge ID : U-008  Password: pravah008  (Const. Sunita Borde — Sitabuldi Interchange)
 */
function initLoginForm() {
    const form      = document.getElementById('login-form');
    const errorEl   = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-submit');
    const spinner   = document.getElementById('login-spinner');

    if (!form) return;

    // Credential store mapped to real DB unit_ids
    const USERS = [
        { badgeId: 'U-001', password: 'pravah001', unitId: 'U-001' },
        { badgeId: 'U-002', password: 'pravah002', unitId: 'U-002' },
        { badgeId: 'U-003', password: 'pravah003', unitId: 'U-003' },
        { badgeId: 'U-004', password: 'pravah004', unitId: 'U-004' },
        { badgeId: 'U-005', password: 'pravah005', unitId: 'U-005' },
        { badgeId: 'U-006', password: 'pravah006', unitId: 'U-006' },
        { badgeId: 'U-008', password: 'pravah008', unitId: 'U-008' },
    ];

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError();

        const badgeId  = document.getElementById('badge-id').value.trim().toUpperCase();
        const password = document.getElementById('password').value;

        if (!badgeId || !password) {
            showError('Please fill in all fields.');
            return;
        }

        // Show loading state
        setLoading(true, submitBtn, spinner);

        // Simulate network latency
        await delay(900);

        const user = USERS.find(u => u.badgeId === badgeId && u.password === password);

        if (user) {
            sessionStorage.setItem('officer_logged_in', 'true');
            sessionStorage.setItem('officer_unit_id',   user.unitId);

            // Brief success animation before redirect
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
        passwordEl.type          = isText ? 'password' : 'text';
        toggleIcon.textContent   = isText ? 'visibility' : 'visibility_off';
    });
}

/* helpers */
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
    void field.offsetWidth; // reflow
    field.style.animation = 'shake 0.5s ease';
    setTimeout(() => { field.style.animation = ''; }, 600);
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
