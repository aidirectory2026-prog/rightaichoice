-- ============================================================
-- Step 41 audit cleanup — soft-hide tools that fail the
-- AI-relevance bar (rule codified in Phase 6 build log,
-- 2026-04-27).
--
-- Rule recap: a tool qualifies if it is (1) AI-native,
-- (2) ships an AI feature as a headline reason to buy, or
-- (3) ships an AI feature even if incidental. Excluded:
-- traditional SaaS whose only AI connection is integrating
-- WITH AI tools.
--
-- These 27 rows ship zero product-side AI per the audit
-- (full report: /tmp/fail_review.txt). Soft-hidden via
-- is_published=false so the cleanup is reversible — if a
-- vendor ships AI later we flip the flag back in one query.
-- The rows themselves are preserved (prose, slug, all metadata).
-- ============================================================

UPDATE tools
SET is_published = false
WHERE slug IN (
  -- Affiliate tracking / no AI feature
  'refersion',
  'rewardful',
  'leaddyno',
  -- Form / community / webinar / community platforms with no AI
  'tally-so',
  'skool',
  'ewebinar',
  -- Stock libraries with no AI generation
  'storyblocks',
  'audiosocket',
  -- No-code / low-code app builders with no AI
  'adalo',
  'appgyver',
  'draftbit',
  'softr',
  'internal-io',
  'airplane',
  'solid',
  -- Algorithmic (not AI) tools
  'observable',
  'connected-papers',
  'litmaps',
  'option-alpha',
  'beatwave',
  -- Generic SaaS / utilities with no AI
  'spiritt',
  'instories',
  'post-boost',
  'google-earth-studio',
  'dr-fone',
  -- Workflow automation that ships zero own-product AI
  'activepieces',
  'integrately'
);
