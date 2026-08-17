-- =============================================================
--  PravahAI — Supabase Database Schema
--  Run this entire script in: Supabase → SQL Editor → New Query
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. OFFICERS
--    Stores live officer state (name, current post, duty status)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS officers (
    id           TEXT PRIMARY KEY,          -- e.g. 'OFF_01'
    name         TEXT NOT NULL,
    badge        TEXT,
    unit         TEXT,
    post_id      TEXT,                      -- current post e.g. 'LOC_01'
    on_duty      BOOLEAN DEFAULT true,
    phone        TEXT,
    updated_at   TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- 2. REASSIGNMENTS
--    Each row = one admin-triggered reassignment event
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reassignments (
    id           BIGSERIAL PRIMARY KEY,
    officer_id   TEXT NOT NULL,
    from_post_id TEXT,
    to_post_id   TEXT NOT NULL,
    reason       TEXT DEFAULT 'Emergency redeployment required by Command',
    status       TEXT DEFAULT 'pending',    -- 'pending' | 'en_route' | 'arrived'
    created_at   TIMESTAMPTZ DEFAULT now(),
    arrived_at   TIMESTAMPTZ
);

-- ─────────────────────────────────────────────────────────────
-- 3. INCIDENTS
--    All incidents — from both admin portal and officer portal
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incidents (
    id           TEXT PRIMARY KEY,          -- e.g. 'INC_1723902345'
    location     TEXT NOT NULL,
    category     TEXT NOT NULL,             -- 'Accident' | 'Congestion' | etc.
    severity     TEXT NOT NULL,             -- 'Critical' | 'Warning' | 'Normal'
    description  TEXT,
    reported_by  TEXT,                      -- officer id or 'ADMIN'
    status       TEXT DEFAULT 'Logged',     -- 'Logged' | 'Dispatched' | 'Resolved'
    created_at   TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- 4. ALERT VOTES
--    "Task Complete" votes — one row per officer per alert
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alert_votes (
    id           BIGSERIAL PRIMARY KEY,
    alert_id     TEXT NOT NULL,
    officer_id   TEXT NOT NULL,
    voted_at     TIMESTAMPTZ DEFAULT now(),
    UNIQUE (alert_id, officer_id)           -- prevents double-voting
);

-- ─────────────────────────────────────────────────────────────
-- 5. SEED OFFICERS (all 15 officers from PravahAI roster)
-- ─────────────────────────────────────────────────────────────
INSERT INTO officers (id, name, badge, unit, post_id, on_duty) VALUES
    ('OFF_01', 'Insp. Rajesh Sharma',     'B-1042', 'Unit Alpha',   'LOC_01', true),
    ('OFF_02', 'SI Priya Nair',           'B-1087', 'Unit Bravo',   'LOC_02', true),
    ('OFF_03', 'ASI Arun Mehta',          'B-1123', 'Unit Charlie', 'LOC_03', true),
    ('OFF_04', 'Const. Deepa Reddy',      'B-1156', 'Unit Delta',   'LOC_04', true),
    ('OFF_05', 'HC Vikram Singh',         'B-1199', 'Unit Echo',    'LOC_05', true),
    ('OFF_06', 'SI Anjali Desai',         'B-1234', 'Unit Foxtrot', 'LOC_06', true),
    ('OFF_07', 'ASI Suresh Kumar',        'B-1278', 'Unit Golf',    'LOC_07', true),
    ('OFF_08', 'Const. Meena Joshi',      'B-1312', 'Unit Hotel',   'LOC_08', true),
    ('OFF_09', 'HC Rajan Pillai',         'B-1345', 'Unit India',   'LOC_09', true),
    ('OFF_10', 'Insp. Fatima Sheikh',     'B-1389', 'Unit Juliet',  'LOC_10', true),
    ('OFF_11', 'SI Arjun Malhotra',       'B-1423', 'Unit Kilo',    'LOC_11', true),
    ('OFF_12', 'ASI Lakshmi Iyer',        'B-1467', 'Unit Lima',    'LOC_12', true),
    ('OFF_13', 'Const. Ramesh Yadav',     'B-1501', 'Unit Mike',    'LOC_13', true),
    ('OFF_14', 'HC Sunita Patil',         'B-1534', 'Unit November','LOC_14', true),
    ('OFF_15', 'Insp. Dinesh Gupta',      'B-1578', 'Unit Oscar',   'LOC_15', true)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 6. ENABLE REALTIME on all four tables
--    This makes changes appear instantly across all browser tabs
-- ─────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE officers;
ALTER PUBLICATION supabase_realtime ADD TABLE reassignments;
ALTER PUBLICATION supabase_realtime ADD TABLE incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE alert_votes;

-- ─────────────────────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY — allow all reads/writes from frontend
--    (Fine for prototype; tighten later with auth tokens)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE officers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE reassignments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_votes    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON officers      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON reassignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON incidents     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON alert_votes   FOR ALL USING (true) WITH CHECK (true);
