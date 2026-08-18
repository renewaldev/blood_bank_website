-- ============================================================
-- RENEWAL BLOOD NETWORK — Supabase Database Schema
-- ============================================================
-- Run this ONCE in your Supabase project:
--   supabase.com → Your Project → SQL Editor → New Query → Paste & Run
-- ============================================================

-- ── 1. DONORS TABLE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS donors (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  name_en           TEXT,
  phone             TEXT,
  alt_phone         TEXT,
  blood_group       TEXT NOT NULL,
  district          TEXT,
  upazila           TEXT,
  area              TEXT,
  age               INTEGER,
  gender            TEXT,
  profession        TEXT,
  last_donation     DATE,
  donation_count    INTEGER DEFAULT 0,
  can_donate        BOOLEAN DEFAULT TRUE,
  next_available    DATE,
  donation_types    TEXT[],
  emergency_call    BOOLEAN DEFAULT FALSE,
  contact_prefs     TEXT[],
  verification_level INTEGER DEFAULT 0,
  trust_score       INTEGER DEFAULT 0,
  badge             TEXT DEFAULT 'registered',
  availability      TEXT DEFAULT 'available',
  donation_history  JSONB DEFAULT '[]',
  verification_log  JSONB DEFAULT '[]',
  join_date         DATE,
  suspicious        BOOLEAN DEFAULT FALSE,
  reported          INTEGER DEFAULT 0,
  lat               NUMERIC,
  lng               NUMERIC,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  user_id           UUID REFERENCES auth.users(id)
);

-- ── 2. BLOOD REQUESTS TABLE ──────────────────────────────────
CREATE TABLE IF NOT EXISTS blood_requests (
  id                TEXT PRIMARY KEY,
  patient_name      TEXT NOT NULL,
  blood_group       TEXT NOT NULL,
  units             INTEGER DEFAULT 1,
  hospital          TEXT,
  district          TEXT,
  upazila           TEXT,
  needed_date       DATE,
  needed_time       TEXT,
  attendant_name    TEXT,
  contact           TEXT,
  reason            TEXT,
  status            TEXT DEFAULT 'pending',
  submitted_at      TIMESTAMPTZ DEFAULT NOW(),
  verified_at       TIMESTAMPTZ,
  reported          INTEGER DEFAULT 0,
  verification_note TEXT DEFAULT '',
  user_id           UUID REFERENCES auth.users(id)
);

-- ── 3. CONTACT REQUESTS TABLE ────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_requests (
  id           TEXT PRIMARY KEY,
  donor_id     TEXT REFERENCES donors(id),
  patient      TEXT,
  blood_group  TEXT,
  hospital     TEXT,
  units        TEXT,
  phone        TEXT,
  status       TEXT DEFAULT 'pending',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  user_id      UUID REFERENCES auth.users(id)
);

-- ── 4. ROW LEVEL SECURITY ────────────────────────────────────
ALTER TABLE donors           ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE blood_requests   ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE donors           ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- Require authentication to read and write (Strict Security Option)
DROP POLICY IF EXISTS "Public read donors" ON donors;
DROP POLICY IF EXISTS "Authenticated read donors" ON donors;
CREATE POLICY "Authenticated read donors"
  ON donors FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public insert donors" ON donors;
CREATE POLICY "Public insert donors"
  ON donors FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public update donors" ON donors;
CREATE POLICY "Public update donors"
  ON donors FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own donors" ON donors;
CREATE POLICY "Users can delete own donors"
  ON donors FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public read requests" ON blood_requests;
DROP POLICY IF EXISTS "Authenticated read requests" ON blood_requests;
CREATE POLICY "Authenticated read requests"
  ON blood_requests FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public insert requests" ON blood_requests;
CREATE POLICY "Public insert requests"
  ON blood_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public update requests" ON blood_requests;
CREATE POLICY "Public update requests"
  ON blood_requests FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own requests" ON blood_requests;
CREATE POLICY "Users can delete own requests"
  ON blood_requests FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public read contact requests" ON contact_requests;
DROP POLICY IF EXISTS "Authenticated read contact requests" ON contact_requests;
CREATE POLICY "Authenticated read contact requests"
  ON contact_requests FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public insert contact requests" ON contact_requests;
CREATE POLICY "Public insert contact requests"
  ON contact_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public update contact requests" ON contact_requests;
CREATE POLICY "Public update contact requests"
  ON contact_requests FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own contact requests" ON contact_requests;
CREATE POLICY "Users can delete own contact requests"
  ON contact_requests FOR DELETE USING (auth.uid() = user_id);


