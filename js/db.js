/* =============================================================
   PravahAI — Supabase Client (js/db.js)
   ─────────────────────────────────────────────────────────────
   Shared database client used by ALL pages in the admin portal
   and the officer portal.

   ⚠️  FILL IN YOUR KEYS before going live:
       PRAVAH_SUPABASE_URL  → Project Settings → API → Project URL
       PRAVAH_SUPABASE_KEY  → Project Settings → API → anon / public key
   =============================================================*/

const PRAVAH_SUPABASE_URL = 'PASTE_YOUR_PROJECT_URL_HERE';
const PRAVAH_SUPABASE_KEY = 'PASTE_YOUR_ANON_PUBLIC_KEY_HERE';

/* ── Load Supabase client library if not already loaded ─────── */
(function ensureSupabaseLoaded(callback) {
    if (window.supabase) { callback(); return; }
    const s = document.createElement('script');
    s.src   = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    s.onload = callback;
    document.head.appendChild(s);
})(function () {
    window.db = window.supabase.createClient(PRAVAH_SUPABASE_URL, PRAVAH_SUPABASE_KEY);
    console.log('[PravahAI] Supabase client initialised.');
    window.dispatchEvent(new Event('pravah_db_ready'));
});

/* ─────────────────────────────────────────────────────────────
   HELPER: wait until db is ready, then call fn(db)
   Usage:
       withDB(async (db) => {
           const { data } = await db.from('incidents').select('*');
       });
   ───────────────────────────────────────────────────────────── */
window.withDB = function (fn) {
    if (window.db) { fn(window.db); return; }
    window.addEventListener('pravah_db_ready', function () { fn(window.db); }, { once: true });
};
