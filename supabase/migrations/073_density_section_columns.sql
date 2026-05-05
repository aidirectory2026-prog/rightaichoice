-- 073_density_section_columns.sql
-- Phase 3 — Canonical tool detail template.
--
-- Adds the eight nullable columns the new "density-replacement"
-- sections read from. Phase 3 ships the components; Phase 4 backfills
-- the data via scripts/backfill-tool-data.ts. Until the backfill runs,
-- each component renders nothing (server-side console warning) so a
-- skeletal tool stays usable but invisible-of-this-section. After
-- Phase 4 every published tool has every column populated.
--
-- Naming convention: keep the field name aligned with the section
-- heading users see, so the audit trail is one-grep-away.

ALTER TABLE tools
  ADD COLUMN IF NOT EXISTS hidden_costs       text[],          -- Hidden costs & gotchas
  ADD COLUMN IF NOT EXISTS migration_in       text[],          -- "How to import from common predecessors"
  ADD COLUMN IF NOT EXISTS migration_out      text[],          -- "How to export to common successors"
  ADD COLUMN IF NOT EXISTS setup_time_text    text,            -- Setup time + first-value timeline (per-persona prose)
  ADD COLUMN IF NOT EXISTS recent_changes     text[],          -- Material changes (pricing / brand / ownership)
  ADD COLUMN IF NOT EXISTS skip_if            text,            -- Single sentence: "Skip this if …"
  ADD COLUMN IF NOT EXISTS pricing_power_text text,            -- Stage / team-size sweet spot vs. peers
  ADD COLUMN IF NOT EXISTS workflow_scenarios jsonb;           -- [{persona, scenario, outcome}]

-- Document the columns so a future reader doesn't have to guess
COMMENT ON COLUMN tools.hidden_costs       IS 'Phase 3: bullet list of overage rates, surprise add-ons, contract minimums, mid-tier paywalls. Sourced from pricing-page footnotes + community discussion.';
COMMENT ON COLUMN tools.migration_in       IS 'Phase 3: how to import data from common predecessors (one bullet per predecessor).';
COMMENT ON COLUMN tools.migration_out      IS 'Phase 3: how to export data to common successors (one bullet per successor).';
COMMENT ON COLUMN tools.setup_time_text    IS 'Phase 3: free-form prose ETA per persona, e.g. "solo creator: ~30 min to first email; agency with 3 brands: ~half day".';
COMMENT ON COLUMN tools.recent_changes     IS 'Phase 3: material changes worth surfacing (pricing changes, brand changes, ownership changes, deprecations). Bullets, dated.';
COMMENT ON COLUMN tools.skip_if            IS 'Phase 3: single honest sentence describing who should NOT pick this tool. The most professional credibility builder on the page.';
COMMENT ON COLUMN tools.pricing_power_text IS 'Phase 3: at which company stage / team size the pricing actually makes sense vs. cheaper or better-priced peers. Free-form prose.';
COMMENT ON COLUMN tools.workflow_scenarios IS 'Phase 3: jsonb array of {persona: string, scenario: string, outcome: string} — 2-3 short real-world scenarios.';
