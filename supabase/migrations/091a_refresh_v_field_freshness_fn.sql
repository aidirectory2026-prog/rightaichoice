-- Phase 8.d.8 (2026-05-18) — Service-role RPC wrapper for refreshing
-- the v_field_freshness materialized view. PostgREST can't refresh
-- materialized views directly; the cron at /api/cron/refresh-freshness-view
-- calls this function via .rpc().

create or replace function public.refresh_v_field_freshness()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view public.v_field_freshness;
end;
$$;

revoke all on function public.refresh_v_field_freshness() from public;
grant execute on function public.refresh_v_field_freshness() to service_role;
