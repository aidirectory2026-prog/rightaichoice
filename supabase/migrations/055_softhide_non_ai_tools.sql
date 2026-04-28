-- ============================================================
-- 055 — Soft-hide 8 non-AI tools still public after Step 41
-- ============================================================
-- The Phase 7 audit (2026-04-29) found 8 tools that ride into the
-- catalog as supporting tools (affiliate platforms, no-code form
-- builders, course platforms, stock-asset libraries, integration
-- middleware) but aren't AI tools by themselves. They were on the
-- 27-slug list in dropped migration 047 but slipped through the
-- earlier soft-hide pass.
--
-- Before commit, slug existence was verified against live DB:
--   SELECT slug FROM tools WHERE slug IN (
--     'ewebinar','integrately','leaddyno','refersion','rewardful',
--     'skool','storyblocks','tally-so'
--   );
-- Expected rowcount: 8. (Per feedback_slug_existence_validation.md)
--
-- Action: set is_published = false. Soft-hide leaves the row in place
-- (preserves any inbound links) but removes it from category pages,
-- listings, and the sitemap. Idempotent — re-running on already-
-- hidden rows is a no-op.
-- ============================================================

UPDATE tools SET is_published = false, updated_at = now()
WHERE slug IN (
  'ewebinar',
  'integrately',
  'leaddyno',
  'refersion',
  'rewardful',
  'skool',
  'storyblocks',
  'tally-so'
)
AND is_published = true;

-- Verification (run separately):
--   SELECT count(*) FROM tools WHERE is_published = true;
-- Expected delta: -8 from previous published count.
