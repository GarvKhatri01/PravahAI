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
 * Demo credentials:
 *   Badge ID : B-2247
 *   Password : pravah2247
 */
function initLoginForm() {
    const form      = document.getElementById('login-form');
    const errorEl   = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-submit');
    const spinner   = document.getElementById('login-spinner');

    if (!form) return;

    // Mock user store
    const USERS = [
        { badgeId: 'B-2247', password: 'pravah2247', postId: 'P01' },
        { badgeId: 'B-1012', password: 'officer1012', postId: 'P02' },
        { badgeId: 'B-0033', password: 'sentinel33', postId: 'P03' },
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
            sessionStorage.setItem('officer_post',      user.postId);

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
