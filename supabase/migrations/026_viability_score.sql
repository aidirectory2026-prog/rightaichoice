-- Step 29: Viability Score System
-- Adds viability scoring columns to the tools table

ALTER TABLE tools ADD COLUMN IF NOT EXISTS viability_score integer;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS viability_signals jsonb;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS viability_updated_at timestamptz;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS is_wrapper boolean DEFAULT false;

-- Index for viability pages (at-risk, safe-bets, leaderboard)
CREATE INDEX IF NOT EXISTS idx_tools_viability_score ON tools (viability_score)
  WHERE viability_score IS NOT NULL AND is_published = true;

COMMENT ON COLUMN tools.viability_score IS 'Survival probability 0-100. NULL = not yet scored.';
COMMENT ON COLUMN tools.viability_signals IS 'JSON breakdown: {wrapper_dependency, github_activity, funding_runway, hyperscaler_overlap, category_mortality, website_health}';
COMMENT ON COLUMN tools.viability_updated_at IS 'When viability score was last recalculated';
COMMENT ON COLUMN tools.is_wrapper IS 'True if tool is built entirely on top of OpenAI/Anthropic API with no proprietary tech';
