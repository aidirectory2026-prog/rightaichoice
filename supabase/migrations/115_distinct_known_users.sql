-- Phase 9 (2026-05-28) — distinct_known_users_in_window
--
-- Adds a true "unique humans" metric that counts distinct user_id (Supabase
-- auth) rather than distinct_id (Mixpanel anonymous browser id). The
-- existing distinct_visitors_in_window over-counts the same person across
-- devices / cookie-clears because distinct_id is per-browser-install, not
-- per-human. user_id, when present, is one row per signed-up human and is
-- the truthful denominator for "logged-in" engagement metrics.
--
-- Pairs with the existing distinct_visitors_in_window so the admin overview
-- can render both side-by-side: "Unique visitors" (all browsers, including
-- the same human across many) vs "Unique users" (one row per signed-in
-- human).

create or replace function public.distinct_known_users_in_window(
  p_cutoff timestamptz, p_include_bots boolean default false
)
returns table(count bigint)
language sql security definer set search_path = public
as $$
  select count(distinct user_id)::bigint
  from user_events
  where created_at >= p_cutoff
    and user_id is not null
    and (p_include_bots or not bot_likely);
$$;

revoke all on function public.distinct_known_users_in_window(timestamptz, boolean) from public;
grant execute on function public.distinct_known_users_in_window(timestamptz, boolean) to anon, authenticated, service_role;
