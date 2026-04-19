-- 037_tool_depth_fields.sql
-- Step 40, Slice 1 — extends the tools table with the fields needed to turn
-- `/tools/[slug]` into a "last-click" decision page. Fields stay nullable so
-- the enrichment pipeline (Slice 2) can fill them tool-by-tool without
-- blocking the UI redesign (Slice 3) from shipping against partial data.
--
-- Intentionally skipped from the Phase 6 plan spec:
--   - api_available: redundant with existing `has_api boolean`.
--   - docs_url, changelog_url: already exist in 001_initial_schema.sql.
--   - integrations: already exists in 001_initial_schema.sql as text[].
--
-- See Phase6(polish-depth-scale)/plan.md step 40 for the full field rationale.

ALTER TABLE public.tools
  ADD COLUMN IF NOT EXISTS tutorial_urls   text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS limitations     text,
  ADD COLUMN IF NOT EXISTS models          text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS community_links jsonb  DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS use_cases       text[] DEFAULT '{}';

COMMENT ON COLUMN public.tools.tutorial_urls   IS 'Written tutorial URLs (blog posts, official walkthroughs). Video tutorials live in tutorial_videos.';
COMMENT ON COLUMN public.tools.limitations     IS 'Free-text summary of known limits (rate limits, regions, language, context windows).';
COMMENT ON COLUMN public.tools.models          IS 'Underlying AI models exposed by the tool (e.g. {"gpt-4o","claude-sonnet-4-6"}). Empty for non-AI tools.';
COMMENT ON COLUMN public.tools.community_links IS 'jsonb bag for external community signals: {g2_url, g2_rating, reddit_threads[], producthunt_url, twitter_sentiment{...}}.';
COMMENT ON COLUMN public.tools.use_cases       IS '3-5 concrete use cases, one per array element. Surfaced as a dedicated section on the tool page.';
