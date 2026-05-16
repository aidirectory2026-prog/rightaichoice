-- 088 (2026-05-16) — Identify stale editorial comparisons.
--
-- A comparison is "stale" when any of the tools it covers has been
-- refreshed (tools.last_verified_at) more recently than the comparison's
-- last_reviewed_at — meaning the underlying facts may have moved on
-- since we wrote the editorial verdict.
--
-- The daily /api/cron/refresh-compare-editorials cron consumes this
-- view (oldest staleness first) to regenerate the editorial fields
-- via DeepSeek. Compare-page-level numeric facts (pricing, integrations)
-- already render live from tools.* — this only refreshes the OPINION
-- layer.

CREATE OR REPLACE VIEW v_stale_comparisons AS
SELECT
  tc.id          AS comparison_id,
  tc.slug        AS comparison_slug,
  tc.tool_ids,
  tc.last_reviewed_at,
  -- Most recent refresh across ANY tool in the pair.
  (
    SELECT MAX(t.last_verified_at)
    FROM tools t
    WHERE t.id = ANY (tc.tool_ids)
  ) AS most_recent_tool_refresh,
  -- Staleness lag — how long the editorial has been out of sync with
  -- the underlying tool data. NULL means never reviewed.
  (
    SELECT MAX(t.last_verified_at)
    FROM tools t
    WHERE t.id = ANY (tc.tool_ids)
  ) - COALESCE(tc.last_reviewed_at, '1970-01-01'::timestamptz) AS staleness
FROM tool_comparisons tc
WHERE tc.is_editorial = true
  AND EXISTS (
    SELECT 1 FROM tools t
    WHERE t.id = ANY (tc.tool_ids)
      AND t.last_verified_at > COALESCE(tc.last_reviewed_at, '1970-01-01'::timestamptz)
  );

COMMENT ON VIEW v_stale_comparisons IS
  'Phase 8 cascade — editorial comparisons whose underlying tool data has moved past the last editorial review. Consumed by /api/cron/refresh-compare-editorials.';
