-- 155_insights_user_directory.sql
-- Phase 10.5a.3 (2026-06-12) — the Audience "Users directory" RPC.
--
-- One row per visitor active in the requested window, with WINDOW-SCOPED
-- activity stats and a lifetime-based New/Returning split:
--
--   * membership   — the visitor has >=1 user_events row in [p_cutoff,
--                    p_end) passing the bot toggle + the shared filter
--                    predicate insights_apply_filters (migration 154).
--                    This is the F2-correct membership rule: decided by
--                    events IN the window, never by lifetime last-seen.
--   * window stats — events_in_window, IST active days, window last_seen,
--                    modal country/device (most frequent value across the
--                    visitor's in-window events), window-observed user_id.
--   * lifetime     — first_seen = the visitor's first event EVER, capped at
--                    p_end so pinned historical windows stay immutable
--                    (the same p_end cap migration 156 retrofits onto
--                    insights_returning_visitors / insights_recent_visitors;
--                    the cap cannot change is_returning, because a window
--                    member always has >=1 event before p_end).
--   * is_returning — lifetime first_seen < p_cutoff (the F2-correct
--                    definition: they existed before this window started).
--
-- Pagination is server-side (p_limit/p_offset) with an exact pre-limit
-- total via count(*) over (). p_sort is an ALLOWLIST mapped to fixed
-- ORDER BY fragments inside the function — caller text never reaches SQL —
-- and every variant carries deterministic tie-breakers (distinct_id asc)
-- so pagination can never skip/duplicate rows across pages.
--
-- Verified against independent hand SQL on the pinned audit week
-- (2026-06-01..07 IST): totals + sample rows recorded in the 10.5a.3
-- commit message and docs/admin/phase5a-gate.md.

drop function if exists public.insights_user_directory(timestamptz, timestamptz, boolean, jsonb, text, integer, integer);

create function public.insights_user_directory(
  p_cutoff timestamptz,
  p_end timestamptz default null,
  p_include_bots boolean default false,
  p_filters jsonb default null,
  p_sort text default 'last_seen',
  p_limit integer default 50,
  p_offset integer default 0
)
returns table(
  distinct_id text,
  user_id uuid,
  first_seen timestamptz,
  last_seen timestamptz,
  events_in_window bigint,
  active_days integer,
  top_country text,
  top_device text,
  is_returning boolean,
  total_rows bigint
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_order text;
begin
  -- Sort allowlist: caller-supplied text is only ever compared, never
  -- concatenated. Each variant has a full deterministic tie-break chain.
  v_order := case p_sort
    when 'last_seen'  then 'iw.w_last desc, iw.distinct_id asc'
    when 'events'     then 'iw.w_events desc, iw.w_last desc, iw.distinct_id asc'
    when 'first_seen' then 'lt.lt_first desc, iw.distinct_id asc'
    else null
  end;
  if v_order is null then
    raise exception 'Unsupported sort: %', p_sort;
  end if;
  return query execute format($f$
    with in_window as (
      select ue.distinct_id,
             (min(ue.user_id::text) filter (where ue.user_id is not null))::uuid as w_user_id,
             max(ue.created_at) as w_last,
             count(*)::bigint as w_events,
             count(distinct date_trunc('day', ue.created_at at time zone 'Asia/Kolkata'))::int as w_days,
             mode() within group (order by ue.country)
               filter (where ue.country is not null and ue.country <> '') as w_country,
             mode() within group (order by ue.device_type)
               filter (where ue.device_type is not null) as w_device
      from user_events ue
      where ue.created_at >= $1
        and ($2::timestamptz is null or ue.created_at < $2)
        and ($3 or not ue.bot_likely)
        and insights_apply_filters(ue, $4::jsonb)
      group by ue.distinct_id
    ),
    lifetime as (
      select ue.distinct_id, min(ue.created_at) as lt_first
      from user_events ue
      join in_window iw on iw.distinct_id = ue.distinct_id
      where ($3 or not ue.bot_likely)
        and ($2::timestamptz is null or ue.created_at < $2)
      group by ue.distinct_id
    )
    select iw.distinct_id,
           iw.w_user_id,
           lt.lt_first,
           iw.w_last,
           iw.w_events,
           iw.w_days,
           iw.w_country,
           iw.w_device,
           (lt.lt_first < $1) as is_returning,
           count(*) over ()::bigint as total_rows
    from in_window iw
    join lifetime lt on lt.distinct_id = iw.distinct_id
    order by %s
    limit $5 offset $6
  $f$, v_order)
  using p_cutoff, p_end, p_include_bots, p_filters, p_limit, p_offset;
end;
$function$;

revoke all on function public.insights_user_directory(timestamptz, timestamptz, boolean, jsonb, text, integer, integer) from public, anon, authenticated;
grant execute on function public.insights_user_directory(timestamptz, timestamptz, boolean, jsonb, text, integer, integer) to service_role;
