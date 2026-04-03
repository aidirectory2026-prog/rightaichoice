-- 013: Add editorial fields to tools table for "Our Take" section
-- Phase 3, Step 3: Editorial Trust Layer

ALTER TABLE tools
  ADD COLUMN IF NOT EXISTS best_for      text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS not_for       text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS editorial_verdict text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_verified_at  timestamptz DEFAULT NULL;

-- Backfill: set last_verified_at to now() for all existing published tools
-- so no tool page shows a missing "Last verified" date
UPDATE tools
  SET last_verified_at = now()
  WHERE is_published = true AND last_verified_at IS NULL;