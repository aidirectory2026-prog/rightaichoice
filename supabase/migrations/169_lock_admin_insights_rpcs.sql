-- 169_lock_admin_insights_rpcs.sql — Phase 10 (Cowork QA) follow-up to 168
-- Close the remaining insights_* exposure: these admin-analytics SECURITY DEFINER
-- functions return user-level data (directories, per-user profiles, search logs,
-- painpoints, cohorts) and were callable by anon and/or authenticated via
-- /rest/v1/rpc/*. Verified every call site is SERVER-SIDE via the service_role
-- admin client behind an is_admin gate (app/admin/insights/*, /api/admin/*,
-- lib/admin/*), and NONE are called from a browser/authenticated client — so the
-- safe, complete fix is to revoke PUBLIC/anon/authenticated and keep service_role.
-- (EXECUTE defaults to PUBLIC, so revoking a single role alone is a no-op — see 168.)
--
-- NOT included: insights_live_sessions — that one IS polled from the browser
-- (admin live-feed/ticker components), so it keeps `authenticated` + the in-function
-- admin guard added in migration 166.

do $$
declare r record;
begin
  for r in
    select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'insights_cohort',
        'insights_error_overview',
        'insights_funnel_users',
        'insights_plan_dropoff',
        'insights_registered_users',
        'insights_search_everything',
        'insights_search_log',
        'insights_user_directory',
        'insights_user_painpoints',
        'insights_user_profile_v2'
      )
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.oid::regprocedure);
    execute format('grant execute on function %s to service_role', r.oid::regprocedure);
  end loop;
end $$;
