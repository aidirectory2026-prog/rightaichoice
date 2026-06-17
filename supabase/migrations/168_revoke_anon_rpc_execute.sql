-- 168_revoke_anon_rpc_execute.sql — Phase 10 (Cowork QA) P2
-- Advisor: SECURITY DEFINER functions callable by anon/authenticated via
-- /rest/v1/rpc/*. NOTE: EXECUTE defaults to PUBLIC, so revoking from anon alone
-- is a no-op — we must revoke from PUBLIC and re-grant the roles that need it.
--
--  server-only (our code calls them via the service_role admin client, which
--  bypasses grants): revoke PUBLIC/anon/authenticated, grant service_role.
--    rate_limit_check, upsert_user_intent, claim_sentiment_scan, increment_counter
--    (rate_limit_check is invoked from many anon routes, but always via the
--     service_role client inside lib/rate-limit.ts — so this is safe.)
--
--  admin-only analytics (called from the admin insights UI as `authenticated`):
--  revoke PUBLIC/anon, grant authenticated + service_role.
--    insights_error_overview / _funnel_users / _plan_dropoff / _search_log /
--    _user_directory / _user_profile_v2
--
--  left public on purpose: category_published_counts (public category page),
--  adjust_counter (public votes / view counts).
--
-- Follow-up: the insights_* fns are still callable by ANY authenticated user;
-- fully closing that needs the per-function admin guard (migration 166 / H8).

do $$
declare r record;
begin
  for r in
    select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('rate_limit_check','upsert_user_intent','claim_sentiment_scan','increment_counter')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.oid::regprocedure);
    execute format('grant execute on function %s to service_role', r.oid::regprocedure);
  end loop;

  for r in
    select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('insights_error_overview','insights_funnel_users','insights_plan_dropoff',
                        'insights_search_log','insights_user_directory','insights_user_profile_v2')
  loop
    execute format('revoke execute on function %s from public, anon', r.oid::regprocedure);
    execute format('grant execute on function %s to authenticated, service_role', r.oid::regprocedure);
  end loop;
end $$;
