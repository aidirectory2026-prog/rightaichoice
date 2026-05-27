-- Phase 9 B4 (2026-05-28) — Tool-indexation long-tail sweep.
--
-- The B3 --all GSC URL Inspection audit (1996 URLs, 2026-05-27) found 540
-- "Discovered - currently not indexed" URLs, almost all tool pages. The
-- one-off audit JSON at scripts/.gsc-indexation-report.json captured this
-- snapshot but it's ephemeral — every audit run overwrites it, and runtime
-- code (sibling-tools rail, IndexNow cron) has no way to read it.
--
-- This table persists per-URL inspection state so:
--   1. The sibling-tools rail can weight UN-INDEXED tools higher
--      (currently uses view_count as a proxy in lib/data/tools.ts:534).
--   2. The IndexNow cron can re-ping the un-indexed bucket on a schedule.
--   3. Future audit runs upsert in place instead of writing a fresh JSON
--      every time.
--
-- The audit script writes BOTH locations (JSON + table) during transition;
-- once we trust the table, the JSON output becomes a debug dump only.

CREATE TABLE IF NOT EXISTS public.gsc_url_inspections (
  url           TEXT        PRIMARY KEY,
  page_type     TEXT        NOT NULL,
  -- Raw GSC coverageState string. Stable enough to query against; values:
  --   'Submitted and indexed'
  --   'Discovered - currently not indexed'
  --   'Crawled - currently not indexed'
  --   'URL is unknown to Google'
  --   'Duplicate without user-selected canonical'
  --   'Duplicate, Google chose different canonical than user'
  --   'Page with redirect'
  --   'Excluded by noindex tag'
  --   'Soft 404'
  --   'Not found (404)'
  --   'Server error (5xx)'
  coverage_state    TEXT    NOT NULL,
  verdict           TEXT,   -- PASS / FAIL / NEUTRAL
  indexing_state    TEXT,
  page_fetch_state  TEXT,
  google_canonical  TEXT,
  user_canonical    TEXT,
  last_crawl_time   TIMESTAMPTZ,
  inspected_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Query patterns:
--   - "all tool URLs that are discovered-not-indexed" (sibling-rail bias)
--   - "all URLs with coverage_state X" (audit reporting)
--   - "stale inspections older than 7d" (weekly refresh cron)
CREATE INDEX IF NOT EXISTS gsc_url_inspections_type_state_idx
  ON public.gsc_url_inspections (page_type, coverage_state);

CREATE INDEX IF NOT EXISTS gsc_url_inspections_inspected_at_idx
  ON public.gsc_url_inspections (inspected_at);

-- RLS: this is operator/system data, not user-visible. Service role only;
-- the table is read from server components and cron handlers, never from
-- the browser.
ALTER TABLE public.gsc_url_inspections ENABLE ROW LEVEL SECURITY;
-- No policies = service-role-only access (default-deny for anon/authed).

COMMENT ON TABLE public.gsc_url_inspections IS
  'Per-URL GSC URL Inspection cache. Source: scripts/audit-gsc-indexation.ts. Consumed by lib/data/tools.ts (sibling-rail bias) and app/api/cron/indexnow-* (un-indexed re-ping).';
