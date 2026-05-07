-- 076_dedup_tools.sql
-- Phase 4 — catalog dedup before SOP scale-up.
--
-- 74 published tools shared a website with at least one other tool.
-- This migration:
--   1. Adds tools.merged_into text — when set, the tool detail page
--      308-redirects to /tools/<merged_into> (preserves SEO equity
--      while collapsing duplicate index entries).
--   2. For 54 AUTO_SAFE sets (same brand, slug variants like
--      bardeen / bardeen-ai): unpublish duplicates, set merged_into
--      to the canonical slug.
--   3. For 11 USER-APPROVED MERGE sets (e.g. otter-ai-meeting +
--      otter-ai-accessibility → otter-ai): same treatment.
--   4. For 6 KEEP_SEPARATE sets (Coursera + Coursera Coach,
--      Hostinger Reach + Horizons, etc. — distinct sub-products
--      sharing a parent URL or affiliate redirect): NO action.
--   5. For 1 INVESTIGATE set (mindos vs mindverse — different
--      brands, same canonical_host, likely a website_url bug):
--      logged to needs_manual_review.txt by the calling code.
--
-- Canonical heuristic per set:
--   1. Already-SOP-refreshed slug wins (last_full_refresh_at NOT NULL)
--   2. Prefer slug WITHOUT -ai suffix
--   3. Tie-break on shorter slug
--   4. Final tie-break alphabetical
--
-- Reversible: we set is_published=false rather than DELETE; the rows
-- (and all their data) stay queryable. Rollback = UPDATE tools
-- SET is_published=true, merged_into=NULL WHERE merged_into IS NOT NULL.

-- ─── Part 1: schema column ─────────────────────────────────────────────
ALTER TABLE tools ADD COLUMN IF NOT EXISTS merged_into text;
COMMENT ON COLUMN tools.merged_into IS
  'Phase 4 dedup (migration 076): canonical slug this row was merged into. Tool detail page reads this and 308-redirects to /tools/<merged_into> when set. NULL on canonical and on standalone tools.';
CREATE INDEX IF NOT EXISTS tools_merged_into_idx ON tools(merged_into) WHERE merged_into IS NOT NULL;

-- ─── Part 2 + 3: apply the merge ───────────────────────────────────────
WITH merge_allowlist AS (
  -- 11 user-approved merges (canonical_host, identifying the duplicate set)
  SELECT unnest(ARRAY[
    'l.fusionos.ai/iietrevd9nb',  -- fusionos-ai + fusionads-ai (same brand "FusionAds.ai")
    'creator.nightcafe.studio',    -- nightcafe + nightcafe-studio
    'evenuplaw.com',               -- evenup + evenup-law
    'gemini.google.com',           -- gemini + google-gemini
    'heidihealth.com',             -- heidi + heidi-health
    'inkforall.com',               -- ink-editor + ink-for-all
    'lavender.ai',                 -- lavender + lavender-email
    'otter.ai',                    -- otter-ai + otter-ai-meeting + otter-ai-accessibility
    'runwayml.com',                -- runway + runway-ml
    'v0.dev',                      -- v0 + v0-dev
    'wellsaidlabs.com'             -- wellsaid + wellsaid-labs
  ]::text[]) AS canonical_host
),
keep_separate AS (
  -- 7 user-approved keep-separate (these won't be touched)
  SELECT unnest(ARRAY[
    'hostg.xyz/aff_c',     -- hostinger-reach + hostinger-horizons (different products)
    'coursera.org',        -- coursera + coursera-coach (parent + AI tutor sub-product)
    'duolingo.com',        -- duolingo + duolingo-max (free + paid AI tier)
    'kaiber.ai',           -- kaiber + noisee-ai (different products)
    'lumalabs.ai',         -- luma-ai + luma-ai-genie
    'topazlabs.com',       -- topaz-labs + topaz-video-ai
    'mindos.com'           -- mindos + mindverse (INVESTIGATE — likely wrong website_url on one)
  ]::text[]) AS canonical_host
),
normalized AS (
  SELECT id, slug, name, website_url, last_full_refresh_at,
    LENGTH(slug) AS slug_len,
    CASE WHEN slug LIKE '%-ai' OR slug LIKE '%-ai-%' THEN true ELSE false END AS slug_has_ai,
    regexp_replace(regexp_replace(lower(website_url), '^https?://(www\.)?', ''), '/+$', '') AS canonical_host
  FROM tools WHERE is_published = true
),
sets AS (
  SELECT
    canonical_host,
    array_length(
      array(SELECT DISTINCT regexp_replace(regexp_replace(lower(unnest), '\s*\.?\s*ai\s*$', ''), '[^a-z0-9]+', '', 'g') FROM unnest(array_agg(DISTINCT name))),
      1
    ) AS distinct_normalized_names,
    canonical_host ~ '(/aff_|aff_c|/iietrevd|tinyurl|bit\.ly|impact\.com|partnerstack)' AS is_affiliate_url
  FROM normalized
  GROUP BY canonical_host HAVING COUNT(*) > 1
),
sets_to_merge AS (
  SELECT s.canonical_host FROM sets s
  WHERE s.canonical_host NOT IN (SELECT canonical_host FROM keep_separate)
    AND (
      (NOT s.is_affiliate_url AND s.distinct_normalized_names = 1)
      OR s.canonical_host IN (SELECT canonical_host FROM merge_allowlist)
    )
),
ranked AS (
  SELECT id, slug, canonical_host,
    ROW_NUMBER() OVER (
      PARTITION BY canonical_host
      ORDER BY (last_full_refresh_at IS NOT NULL) DESC, slug_has_ai ASC, slug_len ASC, slug ASC
    ) AS rank
  FROM normalized
  WHERE canonical_host IN (SELECT canonical_host FROM sets_to_merge)
),
canonicals AS (
  SELECT canonical_host, slug AS canonical_slug FROM ranked WHERE rank = 1
)
UPDATE tools t
SET
  is_published = false,
  merged_into = c.canonical_slug,
  updated_at = NOW()
FROM ranked r
JOIN canonicals c ON c.canonical_host = r.canonical_host
WHERE t.id = r.id AND r.rank > 1;
