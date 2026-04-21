-- ============================================================
-- Step 44 slice 5 — Plan flow cache (24h TTL)
-- Caches the final /api/plan response keyed by a hash of
-- normalizedGoal + profile signature. Cache hits skip Sonnet +
-- Haiku + DB pipeline and return in <200ms.
-- ============================================================

CREATE TABLE IF NOT EXISTS plan_cache (
  cache_key text PRIMARY KEY,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plan_cache_created_at_idx
  ON plan_cache (created_at DESC);

-- RLS: no public access. Only the service role (used by /api/plan via
-- lib/cron/supabase-admin.ts) can read or write.
ALTER TABLE plan_cache ENABLE ROW LEVEL SECURITY;

-- Cleanup helper — entries older than 24h. Called opportunistically
-- from the API, can also be wired to a cron later.
CREATE OR REPLACE FUNCTION delete_expired_plan_cache()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM plan_cache WHERE created_at < now() - interval '24 hours';
$$;

REVOKE ALL ON FUNCTION delete_expired_plan_cache() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_expired_plan_cache() TO service_role;
