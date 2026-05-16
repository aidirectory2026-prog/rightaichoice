-- 087 (2026-05-16) — bing_submit_state
--
-- Single-row table holding the cursor for daily Bing direct submissions.
-- Previously stored in a local file (scripts/.bing-submit-checkpoint.json)
-- but that only worked when the operator's laptop was on. Moving to DB
-- so a Vercel cron can run daily regardless of laptop state.
--
-- Schema: id is fixed to 1 (we always upsert that row). Daily cron
-- reads the cursor, slices N URLs of `type`, submits, advances the
-- cursor + bumps lifetime_submitted + sets last_run_utc.

CREATE TABLE IF NOT EXISTS bing_submit_state (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),

  -- Where the current rotation pass is.
  type text NOT NULL DEFAULT 'compare' CHECK (type IN (
    'compare',
    'tool',
    'alternative',
    'category'
  )),

  -- How many URLs of the current `type` have been submitted in this pass.
  offset_in_pass integer NOT NULL DEFAULT 0 CHECK (offset_in_pass >= 0),

  -- Last successful run (UTC). Used by the cron to refuse a same-day
  -- second run (Bing's quota is per-UTC-day).
  last_run_utc timestamptz,

  -- Lifetime stats — never resets.
  lifetime_submitted integer NOT NULL DEFAULT 0,
  lifetime_runs integer NOT NULL DEFAULT 0,

  -- Last observed quota from GetUrlSubmissionQuota. Stored so the
  -- dashboard can show "Bing currently allows N URLs/day" without
  -- re-probing.
  last_quota integer,

  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed the single row. ON CONFLICT DO NOTHING so re-running the migration
-- never clobbers live cursor state.
INSERT INTO bing_submit_state (id, type, offset_in_pass, lifetime_submitted)
VALUES (1, 'compare', 100, 100)
ON CONFLICT (id) DO NOTHING;

-- Admin-only access; never expose to anon (this is operational intel).
ALTER TABLE bing_submit_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read bing_submit_state"
  ON bing_submit_state FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );

CREATE POLICY "admins update bing_submit_state"
  ON bing_submit_state FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );

COMMENT ON TABLE bing_submit_state IS
  '087 — single-row cursor for the daily Bing direct-submission cron.';
