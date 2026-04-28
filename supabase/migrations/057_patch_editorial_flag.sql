-- ============================================================
-- 057 — Defensive idempotency guard for editorial compare flags
-- ============================================================
-- Phase 7 audit follow-up (2026-04-29).
--
-- Earlier this session we believed the sitemap was missing /compare/
-- URLs because is_editorial = false on 7 of 8 rows. That was wrong:
-- live diagnostic showed all 8 already had is_editorial = true. The
-- ACTUAL bug was in lib/data/comparisons.ts:getAllComparisonSlugs —
-- it selected the non-existent `updated_at` column on tool_comparisons,
-- PostgREST errored, fetchAllPages swallowed the error and returned
-- [], so the sitemap silently dropped every /compare/ URL. That code
-- bug is fixed in the same Phase 7 commit.
--
-- We keep this migration anyway as a defensive idempotency guard —
-- if a future seed path inserts an editorial compare with
-- is_editorial = false (or a user-saved row collides on slug with
-- a planned editorial slug), re-running 057 will fix it. Initial
-- (and current) state on prod is already correct; this migration
-- is a clean no-op there.
--
-- Slug-existence pre-check (per feedback_slug_existence_validation.md):
--   SELECT slug, is_editorial FROM tool_comparisons WHERE slug IN (
--     'cline-vs-aider-vs-continue','openhands-vs-devin',
--     'claude-code-vs-cursor','dify-vs-langflow-vs-fastgpt',
--     'langgraph-vs-crewai-vs-autogen','argil-vs-heygen',
--     'hailuo-vs-vidu-vs-pika','fathom-vs-grain-vs-gong'
--   );
-- Expected: 8 rows.
--
-- Note: tool_comparisons has no `updated_at` column, only
-- `created_at`, `published_at`, `last_reviewed_at`. The earlier
-- version of this migration referenced `updated_at` and failed at
-- planning time with `column does not exist`. Fixed below.
-- ============================================================

UPDATE tool_comparisons
SET is_editorial = true,
    published_at = COALESCE(published_at, now()),
    last_reviewed_at = COALESCE(last_reviewed_at, now())
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
