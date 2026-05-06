-- 074_sop_infrastructure.sql
-- Phase 4 — Tool Data Refresh SOP infrastructure.
--
-- Adds:
--   1. Three new columns on `tools` for SEO + freshness tracking
--   2. `data_refresh_log` table — per-run audit trail (what changed,
--      when, with what status). Powers the "every SOP run is auditable"
--      guardrail in the plan.
--   3. `tool_candidates` table — discovery queue. Discovery cron drops
--      candidates here; SOP-Ingest cron pulls 50/day for full enrichment.
--   4. `outbound_link_issues` + `internal_link_issues` tables — used by
--      the dead-link sweep + internal-link audit crons (see
--      automation-pipelines.md). Empty until those crons land.

-- ── Columns on tools ────────────────────────────────────────────────────────

ALTER TABLE tools
  ADD COLUMN IF NOT EXISTS faqs_long_tail        jsonb,        -- [{question, answer, target_keyword}] — 7-10 per tool
  ADD COLUMN IF NOT EXISTS seo_keywords          text[],       -- target keyword list for <meta keywords> + JSON-LD
  ADD COLUMN IF NOT EXISTS last_full_refresh_at  timestamptz;  -- bumped on every successful SOP run

COMMENT ON COLUMN tools.faqs_long_tail       IS 'Phase 4 SOP: 7-10 FAQs per tool, each {question, answer, target_keyword}. Question phrasing matches long-tail SEO patterns. Distinct from the legacy tool_faqs table.';
COMMENT ON COLUMN tools.seo_keywords         IS 'Phase 4 SOP: target keyword list seeding the page <meta keywords> + FAQPage JSON-LD.';
COMMENT ON COLUMN tools.last_full_refresh_at IS 'Phase 4 SOP: timestamp of the most recent successful full SOP run. Drives the SOP-Refresh cron selection (oldest first).';

-- ── data_refresh_log: per-run audit trail ──────────────────────────────────

CREATE TABLE IF NOT EXISTS data_refresh_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id           uuid NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  slug              text NOT NULL,                            -- denormalized for fast filtering without join
  run_at            timestamptz NOT NULL DEFAULT now(),
  status            text NOT NULL CHECK (status IN ('ok', 'partial', 'failed')),
  fields_changed    jsonb,                                    -- {field: {before: ..., after: ...}}
  fields_safemin    text[],                                   -- which fields fell back to smart safe minimum
  error             text,                                     -- error message when status='failed'
  duration_ms       int,                                      -- end-to-end pipeline time per tool
  scrape_status     text,                                     -- 'ok' / 'partial' / 'blocked' / 'failed'
  llm_model         text                                      -- 'deepseek-chat' / 'claude-sonnet-4-6' / etc.
);

CREATE INDEX IF NOT EXISTS data_refresh_log_tool_id_run_at_idx ON data_refresh_log (tool_id, run_at DESC);
CREATE INDEX IF NOT EXISTS data_refresh_log_status_run_at_idx ON data_refresh_log (status, run_at DESC);

COMMENT ON TABLE data_refresh_log IS 'Phase 4 SOP audit trail. One row per tool per SOP run. Powers the "every SOP run is auditable" guardrail. Queried by review dashboards + by the next SOP run to detect stuck tools.';

-- ── tool_candidates: discovery queue ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS tool_candidates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  website_url   text NOT NULL,
  source        text NOT NULL,                                -- 'producthunt' / 'reddit' / 'showhn' / 'alternativeto' / 'manual'
  source_url    text,                                          -- the discovery page itself
  raw_summary   text,                                          -- short blurb from the source for triage
  discovered_at timestamptz NOT NULL DEFAULT now(),
  status        text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'ingested', 'rejected')),
  rejection_reason text,                                       -- 'duplicate_slug' / 'dead_url' / 'sop_quality_gate_failed'
  ingested_tool_id uuid REFERENCES tools(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS tool_candidates_status_discovered_idx ON tool_candidates (status, discovered_at);
CREATE UNIQUE INDEX IF NOT EXISTS tool_candidates_website_url_uniq ON tool_candidates (website_url);

COMMENT ON TABLE tool_candidates IS 'Phase 4 SOP-Ingest queue. Discovery cron writes; SOP-Ingest cron consumes 50/day. Failed tools move to status=rejected with reason.';

-- ── outbound_link_issues: dead-link sweep findings ─────────────────────────

CREATE TABLE IF NOT EXISTS outbound_link_issues (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id           uuid REFERENCES tools(id) ON DELETE CASCADE,
  url               text NOT NULL,
  status_code       int,                                       -- 404 / 410 / 5xx / null on network error
  error_kind        text,                                      -- 'dead' / 'parked' / 'redirect_loop' / 'timeout'
  first_seen_at     timestamptz NOT NULL DEFAULT now(),
  last_seen_at      timestamptz NOT NULL DEFAULT now(),
  consecutive_failures int NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS outbound_link_issues_tool_id_idx ON outbound_link_issues (tool_id);
CREATE INDEX IF NOT EXISTS outbound_link_issues_consecutive_idx ON outbound_link_issues (consecutive_failures DESC);

COMMENT ON TABLE outbound_link_issues IS 'Phase 4 dead-link-sweep cron output. 3+ consecutive failures triggers a high-priority needs_manual_review entry.';

-- ── internal_link_issues: link audit findings (Phase 7 prep) ───────────────

CREATE TABLE IF NOT EXISTS internal_link_issues (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_path     text NOT NULL,                               -- the page that emits the broken link
  target_path     text NOT NULL,                               -- the broken target
  link_text       text,
  detected_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS internal_link_issues_source_idx ON internal_link_issues (source_path);

COMMENT ON TABLE internal_link_issues IS 'Phase 7+ internal-link-audit cron output. Walks generated pages, HEAD-checks every internal link, logs broken targets.';
