-- Phase 9 onboarding: fast-onboard orchestrator support.
--
-- onboarded_at = timestamp the new-tool onboard orchestrator
-- (lib/cron/onboard.ts) finished populating a freshly-inserted tool's core
-- fields (refresh + categories + viability + latest-updates + logo). NULL =
-- not yet onboarded → the orchestrator will pick it up oldest-created-first.
--
-- Backfill: every CURRENT row is treated as already-onboarded
-- (coalesce(last_verified_at, created_at, now())) so the orchestrator only
-- ever processes genuinely-new tools inserted after this migration.

ALTER TABLE tools ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;

UPDATE tools
SET onboarded_at = coalesce(last_verified_at, created_at, now())
WHERE onboarded_at IS NULL;

-- Partial index so the orchestrator's `onboarded_at IS NULL ORDER BY created_at`
-- scan stays cheap as the catalog grows (the pending set is tiny — just the
-- last few hours of inserts).
CREATE INDEX IF NOT EXISTS idx_tools_onboard_pending
  ON tools (created_at ASC)
  WHERE onboarded_at IS NULL;

COMMENT ON COLUMN tools.onboarded_at IS
  'When the fast-onboard orchestrator finished populating core fields for a new tool. NULL = pending onboard.';
