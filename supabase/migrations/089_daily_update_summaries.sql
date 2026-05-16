-- 089 (2026-05-16) — daily_update_summaries
--
-- One row per UTC day with aggregated stats from every Phase 8
-- freshness pipeline. The 23:55 UTC cron (snapshot-daily-updates)
-- writes the row. /admin/updates renders the rolling history.
--
-- "Maintain a doc for everyday updates" — this IS the doc, queried
-- live in the admin UI instead of a stale static markdown file.

CREATE TABLE IF NOT EXISTS daily_update_summaries (
  -- Single row per UTC date.
  utc_date date PRIMARY KEY,

  -- Pipeline 1 — refresh-tools (hourly).
  tools_refreshed int NOT NULL DEFAULT 0,
  tools_refresh_failed int NOT NULL DEFAULT 0,

  -- Pipeline 2 — ingest-tools (twice daily).
  tools_ingested int NOT NULL DEFAULT 0,
  tools_ingest_gated int NOT NULL DEFAULT 0,
  tools_ingest_failed int NOT NULL DEFAULT 0,

  -- Pipeline 3 — cascade compare editorials (daily).
  compares_regenerated int NOT NULL DEFAULT 0,
  compares_cascade_failed int NOT NULL DEFAULT 0,

  -- Latest-updates refresh (daily, top 50).
  tools_latest_updates_refreshed int NOT NULL DEFAULT 0,

  -- Bing direct submission (daily).
  bing_urls_submitted int NOT NULL DEFAULT 0,

  -- IndexNow batch (daily).
  indexnow_urls_pinged int NOT NULL DEFAULT 0,

  -- Sample slugs for the day — first 10 of each, for the drill-down UI
  -- without needing a second query.
  refreshed_slugs_sample text[] DEFAULT ARRAY[]::text[],
  ingested_slugs_sample text[] DEFAULT ARRAY[]::text[],
  cascaded_slugs_sample text[] DEFAULT ARRAY[]::text[],

  -- Catalog snapshot at end-of-day for tracking growth.
  total_published_tools int,
  oldest_last_verified_at timestamptz,
  cascade_backlog int,

  -- Per-pipeline health at end-of-day. JSON so we can add fields later
  -- without migrations.
  health_flags jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_update_summaries_date
  ON daily_update_summaries (utc_date DESC);

-- Admin-only read; the cron writes via service role which bypasses RLS.
ALTER TABLE daily_update_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read daily_update_summaries"
  ON daily_update_summaries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );

COMMENT ON TABLE daily_update_summaries IS
  '089 — one row per UTC day, written by /api/cron/snapshot-daily-updates at 23:55 UTC. Rolling growth + freshness log; rendered at /admin/updates.';
