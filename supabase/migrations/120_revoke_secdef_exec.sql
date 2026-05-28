-- Phase 9.0.1 (2026-05-29) — Emergency security hardening.
--
-- Supabase security advisor flagged 39 SECURITY DEFINER functions in `public`
-- as EXECUTE-able by the `anon` (unauthenticated) and `authenticated` roles
-- over the public PostgREST API. The most dangerous are the migration helpers
-- `_apply_migration_chunk` / `_apply_migration_chunk_b64`, which run arbitrary
-- DDL as the function owner — an anonymous caller could execute arbitrary SQL
-- (RCE-class exposure).
--
-- This migration revokes EXECUTE from anon + authenticated on:
--   - the two _apply_migration_chunk* DDL helpers (never called by the app)
--   - all insights_* admin-analytics RPCs (called ONLY via the service-role
--     client in app/admin/insights/queries.ts -> getAdminClient(); confirmed)
--   - refresh_v_field_freshness / delete_expired_plan_cache (cron-only, service role)
--
-- NOTE: Postgres grants EXECUTE to PUBLIC by default, and anon/authenticated
-- inherit it — so we must revoke from PUBLIC (not just the two roles) and then
-- explicitly re-grant to service_role so the admin dashboard + crons keep
-- working. Verified post-apply: anon=0, authenticated=0, service_role=25/25.
-- The remaining ~14 SECURITY DEFINER functions are handled in Phase 9.C after
-- per-function call-path verification.
--
-- Reversible: GRANT EXECUTE ON FUNCTION <sig> TO PUBLIC;

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (
        p.proname IN (
          '_apply_migration_chunk',
          '_apply_migration_chunk_b64',
          'refresh_v_field_freshness',
          'delete_expired_plan_cache'
        )
        OR p.proname LIKE 'insights%'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.sig);
    RAISE NOTICE 'locked down EXECUTE on %', fn.sig;
  END LOOP;
END $$;
