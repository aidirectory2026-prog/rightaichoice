-- Phase 10.2 (F11, 2026-06-11) — KPI DAU: UTC day → IST day.
--
-- insights_kpi_values bucketed "today" by UTC midnight while the engagement
-- tile uses IST midnight (migration 119) — two DAU numbers on one dashboard
-- disagreeing by an order of magnitude (169 vs 10 at 01:15 IST during audit).
-- This patches the single declare line in the live definition, keeping the
-- rest of the function byte-identical (fetched via pg_get_functiondef so the
-- body can't drift from what production actually runs).
-- Note: p_days remains declared-but-unused (callers pass 7); documented in
-- metric-audit.md F11 — candidate for removal in the Phase 5 rebuild.

do $patch$
declare
  d text;
begin
  d := pg_get_functiondef('public.insights_kpi_values(integer)'::regprocedure);
  if d not like '%date_trunc(''day'', now())%' then
    raise exception 'insights_kpi_values: expected UTC date_trunc line not found — already patched or drifted';
  end if;
  d := replace(
    d,
    'v_today_start timestamptz := date_trunc(''day'', now());',
    'v_today_start timestamptz := (date_trunc(''day'', now() at time zone ''Asia/Kolkata'') at time zone ''Asia/Kolkata'');'
  );
  execute d;
end
$patch$;
