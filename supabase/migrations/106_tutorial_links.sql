-- ============================================================
-- 106_tutorial_links (2026-05-26)
-- Add tutorial_links jsonb [{url, title, description}] so tutorial
-- entries can show real <title> + meta-description instead of
-- bare hostnames. Backfilled separately by scripts/backfill-link-titles.mjs.
-- ============================================================

ALTER TABLE public.tools
  ADD COLUMN IF NOT EXISTS tutorial_links jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.tools.tutorial_links IS
  'Tutorial/docs links enriched with real page titles + descriptions. Shape: [{url, title, description}]. Backfilled from tutorial_urls via HTTP <title> scrape.';
