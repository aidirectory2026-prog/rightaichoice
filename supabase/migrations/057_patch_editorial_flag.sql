-- ============================================================
-- 057 — Patch is_editorial flag on the 8 SEO compare pages
-- ============================================================
-- Phase 7 audit follow-up (2026-04-29).
--
-- After migration 056 + Vercel redeploy, /sitemap.xml showed only 1
-- of 8 editorial compare URLs (langgraph-vs-crewai-vs-autogen). The
-- sitemap filter `is_editorial = true` (lib/data/comparisons.ts) is
-- doing the right thing — but 7 of 8 rows in tool_comparisons ended
-- up with is_editorial = false despite source migrations 041_01
-- through 041_04, 051, 052, 053 all sending `true` in the INSERT.
--
-- Most likely cause: those rows were seeded via an earlier path
-- (the dropped 041_seed_comparisons_editorial.sql aggregate, or a
-- user-saved Compare tray click) before the per-file editorial
-- seeds ran. The per-file inserts then no-op'd on slug conflict
-- and the original is_editorial = false survived.
--
-- This migration force-sets is_editorial = true on the 8 known
-- editorial slugs and back-fills published_at for any that lack
-- it. Idempotent — guarded by `WHERE is_editorial IS DISTINCT
-- FROM true`, so re-running is a no-op.
--
-- Slug-existence pre-check (per feedback_slug_existence_validation.md):
--   SELECT slug, is_editorial FROM tool_comparisons WHERE slug IN (
--     'cline-vs-aider-vs-continue','openhands-vs-devin',
--     'claude-code-vs-cursor','dify-vs-langflow-vs-fastgpt',
--     'langgraph-vs-crewai-vs-autogen','argil-vs-heygen',
--     'hailuo-vs-vidu-vs-pika','fathom-vs-grain-vs-gong'
--   );
-- Expected: 8 rows.
-- ============================================================

UPDATE tool_comparisons
SET is_editorial = true,
    published_at = COALESCE(published_at, now()),
    last_reviewed_at = COALESCE(last_reviewed_at, now()),
    updated_at = now()
WHERE slug IN (
  'cline-vs-aider-vs-continue',
  'openhands-vs-devin',
  'claude-code-vs-cursor',
  'dify-vs-langflow-vs-fastgpt',
  'langgraph-vs-crewai-vs-autogen',
  'argil-vs-heygen',
  'hailuo-vs-vidu-vs-pika',
  'fathom-vs-grain-vs-gong'
)
AND is_editorial IS DISTINCT FROM true;

-- Verification (run separately):
--   SELECT slug, is_editorial FROM tool_comparisons
--   WHERE is_editorial = true ORDER BY slug;
-- Expected: 8 rows, all 8 known editorial slugs above.
