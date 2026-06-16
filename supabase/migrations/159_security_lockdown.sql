-- 159_security_lockdown.sql — Fable-5 audit (2026-06-16)
-- Closes the two ERROR-level + the high-WARN security-advisor findings, with
-- ZERO impact on the app or pipelines (verified before writing):
--
--  * event_rollup_daily / dau_rollup_daily are written only by the
--    SECURITY DEFINER function compute_event_rollups (owner=postgres → bypasses
--    RLS) and read only by the admin panel via the service_role key (bypasses
--    RLS). No anon/authenticated/browser code touches them (grep-verified).
--    Enabling RLS with no policy therefore blocks ONLY anonymous PostgREST
--    reads — exactly the exposure the advisor flagged.
--
--  * refresh_top_tools(), compute_event_rollups(int), check_freshness_sla()
--    are invoked ONLY by pg_cron (runs as postgres, bypasses EXECUTE grants)
--    and, for compute_event_rollups, also potentially by the admin client
--    (service_role). Both keep explicit grants below. No frontend code calls
--    them (grep-verified). Revoking anon/authenticated/PUBLIC removes the
--    abuse/DoS surface without touching the real callers.

-- 1) Lock the two public analytics rollup tables (deny-all for anon/authenticated;
--    service_role + postgres bypass RLS, so the rollup cron + admin reads are unaffected).
alter table public.event_rollup_daily enable row level security;
alter table public.dau_rollup_daily  enable row level security;

-- 2) Remove public EXECUTE on the three expensive admin/cron functions, keeping
--    the only legitimate callers (pg_cron=postgres, admin client=service_role).
revoke execute on function public.refresh_top_tools()           from anon, authenticated, public;
revoke execute on function public.compute_event_rollups(integer) from anon, authenticated, public;
revoke execute on function public.check_freshness_sla()         from anon, authenticated, public;

grant execute on function public.refresh_top_tools()           to service_role;
grant execute on function public.compute_event_rollups(integer) to service_role;
grant execute on function public.check_freshness_sla()         to service_role;
