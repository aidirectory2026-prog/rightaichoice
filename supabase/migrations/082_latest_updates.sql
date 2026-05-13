-- Phase 8.next Stage 4 / Tier 2 (2026-05-13): "Latest from {Tool}" data layer.
--
-- Adds 5 columns to tools so per-tool changelog/blog/news/Reddit/HN/
-- Twitter signals can be aggregated into one rendered timeline.
-- Populated by scripts/refresh-latest-updates.ts. Display section is
-- Stage 5; weekly auto-refresh cron is Stage 8.

ALTER TABLE tools
  ADD COLUMN IF NOT EXISTS latest_updates jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS latest_updates_at timestamptz,
  ADD COLUMN IF NOT EXISTS changelog_url text,
  ADD COLUMN IF NOT EXISTS blog_url text,
  ADD COLUMN IF NOT EXISTS twitter_handle text;

CREATE INDEX IF NOT EXISTS idx_tools_latest_updates_at
  ON tools (latest_updates_at NULLS FIRST);

COMMENT ON COLUMN tools.latest_updates IS
  'Phase 8.next Tier 2: array of {date, source, title, url, summary, type} — top 5-10 recent items per tool.';
COMMENT ON COLUMN tools.latest_updates_at IS
  'Last refresh timestamp; daily delta cron picks stalest tools first.';
COMMENT ON COLUMN tools.changelog_url IS
  'Discovered changelog URL (cached so heuristic only runs once).';
COMMENT ON COLUMN tools.blog_url IS
  'Discovered blog index URL (cached as above).';
COMMENT ON COLUMN tools.twitter_handle IS
  'Vendor twitter/X handle without @. Used by Apify Twitter scraper.';
