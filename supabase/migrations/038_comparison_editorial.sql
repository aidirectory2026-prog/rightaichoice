-- ============================================================
-- Step 42 Slice 1 — editorial depth for /compare/[slug] pages
--
-- User-saved comparisons (created via the Compare tray) get a minimal
-- row with tool_ids + slug. The 10 SEO compare pages from Phase 6 need
-- hand-curated editorial content: a TL;DR table, a verdict, feature/
-- pricing/use-case analysis blocks, benchmarks, and a page-specific FAQ.
--
-- All new columns are nullable so user-saved comparisons still work
-- unchanged; the slug page conditionally renders each editorial block.
-- ============================================================

ALTER TABLE tool_comparisons
  ADD COLUMN IF NOT EXISTS tldr jsonb,
  ADD COLUMN IF NOT EXISTS verdict text,
  ADD COLUMN IF NOT EXISTS feature_analysis text,
  ADD COLUMN IF NOT EXISTS pricing_analysis text,
  ADD COLUMN IF NOT EXISTS use_cases jsonb,
  ADD COLUMN IF NOT EXISTS benchmarks jsonb,
  ADD COLUMN IF NOT EXISTS faqs jsonb,
  ADD COLUMN IF NOT EXISTS is_editorial boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_reviewed_at timestamptz;

COMMENT ON COLUMN tool_comparisons.tldr IS 'Array of 4-6 {dimension, values: {toolSlug: value}} rows for the TL;DR hero table';
COMMENT ON COLUMN tool_comparisons.verdict IS 'Opinionated 2-3 sentence editorial verdict — who should pick which tool';
COMMENT ON COLUMN tool_comparisons.feature_analysis IS 'Long-form feature-by-feature prose (~500-800 words, markdown-lite)';
COMMENT ON COLUMN tool_comparisons.pricing_analysis IS 'Pricing side-by-side analysis with hidden-cost flags';
COMMENT ON COLUMN tool_comparisons.use_cases IS 'Array of {persona, recommendedSlug, reasoning} "who should pick which" rows';
COMMENT ON COLUMN tool_comparisons.benchmarks IS 'Array of {dimension, values: {toolSlug: {score, unit, source}}} benchmark rows';
COMMENT ON COLUMN tool_comparisons.faqs IS 'Array of {question, answer} page-specific FAQs (not the generic fallbacks)';
COMMENT ON COLUMN tool_comparisons.is_editorial IS 'True for curated SEO pages, false for user-saved comparisons';
COMMENT ON COLUMN tool_comparisons.published_at IS 'First-publish timestamp — feeds schema.org datePublished';
COMMENT ON COLUMN tool_comparisons.last_reviewed_at IS 'Last editorial review timestamp — feeds schema.org dateModified';

-- Index to quickly list editorial comparisons for sitemap / homepage hero
CREATE INDEX IF NOT EXISTS idx_tool_comparisons_editorial
  ON tool_comparisons (is_editorial, published_at DESC)
  WHERE is_editorial = true;
