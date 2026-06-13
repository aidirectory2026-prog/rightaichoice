-- 162 (Phase 10.7c.4, 2026-06-13) — per-session computed rollups.
--
-- user_intent_profile.session_history: per-visitor jsonb array of session
-- rollups {ts_start, ts_end, duration_seconds, landing, exit, pages,
-- engaged_seconds, channel}. /api/track-mirror computes ONE fragment per
-- distinct_id per batch (p_session: batch min/max client ts, page_viewed
-- count, first page_viewed path as landing candidate, last page_path as
-- exit candidate, summed engaged_time_heartbeat deltas, first
-- traffic_channel) and the RPC owns the session semantics: a fragment
-- starting within 30 minutes of the last entry's ts_end MERGES into it
-- (landing/channel keep first value, exit takes latest, pages/engaged sum,
-- ts_end extends, duration recomputed); otherwise a NEW session entry is
-- appended. Capped at 30 entries, oldest dropped.
--
-- Concurrency note: the read-modify-write is per-distinct_id and batches
-- for one distinct_id come from a single browser's sequential flush loop,
-- so lost updates are not a practical concern (same trade-off as
-- touch_history in 159).
--
-- upsert_user_intent is rebuilt FROM THE LIVE DEFINITION (pulled 2026-06-13,
-- byte-identical to migration 159) with one appended defaulted parameter.
-- CREATE OR REPLACE with a new defaulted param would create an OVERLOAD
-- (PostgREST RPC ambiguity), so the old signature is dropped first — the new
-- function accepts every existing call site unchanged (p_session defaults
-- to null).

alter table public.user_intent_profile
  add column if not exists session_history jsonb not null default '[]'::jsonb;

drop function if exists public.upsert_user_intent(
  text, uuid, text, text,
  text[], text[], text[], text[], text[], text[], text[],
  text, text, text, text,
  integer, integer, integer, integer, integer, integer, integer,
  timestamptz, text, text, text, text, text, jsonb
);

create or replace function public.upsert_user_intent(
  p_distinct_id text,
  p_user_id uuid default null::uuid,
  p_email_domain text default null::text,
  p_page_path text default null::text,
  p_arr_existing_tools text[] default null::text[],
  p_arr_search_queries text[] default null::text[],
  p_arr_tools_visited text[] default null::text[],
  p_arr_tools_compared text[] default null::text[],
  p_arr_plan_use_cases text[] default null::text[],
  p_arr_chat_tools text[] default null::text[],
  p_arr_reviews_for text[] default null::text[],
  p_plan_budget text default null::text,
  p_plan_team text default null::text,
  p_plan_industry text default null::text,
  p_plan_skill text default null::text,
  p_inc_saves integer default 0,
  p_inc_comparisons integer default 0,
  p_inc_plans_completed integer default 0,
  p_inc_reviews integer default 0,
  p_inc_tools_visited integer default 0,
  p_inc_chat_messages integer default 0,
  p_inc_searches integer default 0,
  p_signup_at timestamp with time zone default null::timestamp with time zone,
  p_first_touch_utm_source text default null::text,
  p_first_touch_utm_medium text default null::text,
  p_first_touch_utm_campaign text default null::text,
  p_first_touch_referrer text default null::text,
  p_first_touch_landing text default null::text,
  p_touch jsonb default null::jsonb,
  p_session jsonb default null::jsonb
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  cap int := 100;
  -- 10.7c.4 — session-rollup working vars
  sess_cap int := 30;
  v_hist jsonb;
  v_last jsonb;
  v_entry jsonb;
  v_new_start timestamptz;
  v_new_end timestamptz;
  v_start timestamptz;
  v_end timestamptz;
begin
  insert into public.user_intent_profile (distinct_id, user_id, email_domain)
  values (p_distinct_id, p_user_id, p_email_domain)
  on conflict (distinct_id) do nothing;

  update public.user_intent_profile
  set
    user_id = coalesce(p_user_id, user_id),
    email_domain = coalesce(p_email_domain, email_domain),
    last_active_at = now(),
    last_event_at = now(),
    plan_budget_segment = coalesce(p_plan_budget, plan_budget_segment),
    plan_team_segment = coalesce(p_plan_team, plan_team_segment),
    plan_industry_segment = coalesce(p_plan_industry, plan_industry_segment),
    plan_skill_segment = coalesce(p_plan_skill, plan_skill_segment),
    signup_at = coalesce(signup_at, p_signup_at),
    first_touch_utm_source = coalesce(first_touch_utm_source, p_first_touch_utm_source),
    first_touch_utm_medium = coalesce(first_touch_utm_medium, p_first_touch_utm_medium),
    first_touch_utm_campaign = coalesce(first_touch_utm_campaign, p_first_touch_utm_campaign),
    first_touch_referrer = coalesce(first_touch_referrer, p_first_touch_referrer),
    first_touch_landing = coalesce(first_touch_landing, p_first_touch_landing),
    existing_tools_history = case when p_arr_existing_tools is null then existing_tools_history
      else (select array_agg(x) from (select distinct x from unnest(existing_tools_history || p_arr_existing_tools) x limit cap) s(x)) end,
    all_search_queries_recent = case when p_arr_search_queries is null then all_search_queries_recent
      else (select array_agg(x) from (select distinct x from unnest(all_search_queries_recent || p_arr_search_queries) x limit cap) s(x)) end,
    tools_visited_externally = case when p_arr_tools_visited is null then tools_visited_externally
      else (select array_agg(x) from (select distinct x from unnest(tools_visited_externally || p_arr_tools_visited) x limit cap) s(x)) end,
    tools_compared_with = case when p_arr_tools_compared is null then tools_compared_with
      else (select array_agg(x) from (select distinct x from unnest(tools_compared_with || p_arr_tools_compared) x limit cap) s(x)) end,
    plan_use_cases_submitted = case when p_arr_plan_use_cases is null then plan_use_cases_submitted
      else (select array_agg(x) from (select distinct x from unnest(plan_use_cases_submitted || p_arr_plan_use_cases) x limit cap) s(x)) end,
    ai_chat_tools_mentioned = case when p_arr_chat_tools is null then ai_chat_tools_mentioned
      else (select array_agg(x) from (select distinct x from unnest(ai_chat_tools_mentioned || p_arr_chat_tools) x limit cap) s(x)) end,
    reviews_submitted_for = case when p_arr_reviews_for is null then reviews_submitted_for
      else (select array_agg(x) from (select distinct x from unnest(reviews_submitted_for || p_arr_reviews_for) x limit cap) s(x)) end,
    -- 10.7a — multi-touch history. Append p_touch unless it repeats the last
    -- entry's source signature within 30 minutes (consecutive-dedupe); cap at
    -- 50 entries by dropping the oldest (index 0).
    touch_history = case
      when p_touch is null then touch_history
      when jsonb_array_length(coalesce(touch_history, '[]'::jsonb)) > 0
        and coalesce(touch_history -> -1 ->> 'channel', '')  = coalesce(p_touch ->> 'channel', '')
        and coalesce(touch_history -> -1 ->> 'source', '')   = coalesce(p_touch ->> 'source', '')
        and coalesce(touch_history -> -1 ->> 'medium', '')   = coalesce(p_touch ->> 'medium', '')
        and coalesce(touch_history -> -1 ->> 'campaign', '') = coalesce(p_touch ->> 'campaign', '')
        and coalesce((touch_history -> -1 ->> 'ts')::timestamptz, 'epoch'::timestamptz)
            > coalesce((p_touch ->> 'ts')::timestamptz, now()) - interval '30 minutes'
        then touch_history
      when jsonb_array_length(coalesce(touch_history, '[]'::jsonb)) >= 50
        then (coalesce(touch_history, '[]'::jsonb) - 0) || jsonb_build_array(p_touch)
      else coalesce(touch_history, '[]'::jsonb) || jsonb_build_array(p_touch)
    end,
    saves_count = saves_count + p_inc_saves,
    comparisons_count = comparisons_count + p_inc_comparisons,
    plans_completed_count = plans_completed_count + p_inc_plans_completed,
    reviews_count = reviews_count + p_inc_reviews,
    tools_visited_count = tools_visited_count + p_inc_tools_visited,
    chat_messages_count = chat_messages_count + p_inc_chat_messages,
    searches_count = searches_count + p_inc_searches,
    updated_at = now()
  where distinct_id = p_distinct_id;

  -- 10.7c.4 — per-session rollups. One fragment per batch: merge into the
  -- last session entry when it starts within 30 minutes of that entry's
  -- ts_end, otherwise append a new session (cap 30, drop oldest).
  if p_session is not null then
    select session_history into v_hist
    from public.user_intent_profile
    where distinct_id = p_distinct_id;
    v_hist := coalesce(v_hist, '[]'::jsonb);
    v_last := case when jsonb_array_length(v_hist) > 0 then v_hist -> -1 else null end;
    v_new_start := coalesce((p_session ->> 'ts_start')::timestamptz, now());
    v_new_end := greatest(coalesce((p_session ->> 'ts_end')::timestamptz, v_new_start), v_new_start);

    if v_last is not null
      and coalesce((v_last ->> 'ts_end')::timestamptz, 'epoch'::timestamptz)
          >= v_new_start - interval '30 minutes' then
      -- same session: extend + accumulate
      v_start := least(coalesce((v_last ->> 'ts_start')::timestamptz, v_new_start), v_new_start);
      v_end := greatest(coalesce((v_last ->> 'ts_end')::timestamptz, v_new_end), v_new_end);
      v_entry := jsonb_build_object(
        'ts_start', to_char(v_start at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'ts_end',   to_char(v_end   at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'duration_seconds', floor(extract(epoch from (v_end - v_start)))::int,
        'landing', coalesce(nullif(v_last ->> 'landing', ''), nullif(p_session ->> 'landing', '')),
        'exit', coalesce(nullif(p_session ->> 'exit', ''), nullif(v_last ->> 'exit', '')),
        'pages', coalesce((v_last ->> 'pages')::int, 0) + coalesce((p_session ->> 'pages')::int, 0),
        'engaged_seconds', coalesce((v_last ->> 'engaged_seconds')::int, 0) + coalesce((p_session ->> 'engaged_seconds')::int, 0),
        'channel', coalesce(nullif(v_last ->> 'channel', ''), nullif(p_session ->> 'channel', ''))
      );
      v_hist := (v_hist - -1) || jsonb_build_array(v_entry);
    else
      -- new session
      v_entry := jsonb_build_object(
        'ts_start', to_char(v_new_start at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'ts_end',   to_char(v_new_end   at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'duration_seconds', floor(extract(epoch from (v_new_end - v_new_start)))::int,
        'landing', nullif(p_session ->> 'landing', ''),
        'exit', nullif(p_session ->> 'exit', ''),
        'pages', coalesce((p_session ->> 'pages')::int, 0),
        'engaged_seconds', coalesce((p_session ->> 'engaged_seconds')::int, 0),
        'channel', nullif(p_session ->> 'channel', '')
      );
      if jsonb_array_length(v_hist) >= sess_cap then
        v_hist := v_hist - 0;
      end if;
      v_hist := v_hist || jsonb_build_array(v_entry);
    end if;

    update public.user_intent_profile
    set session_history = v_hist, updated_at = now()
    where distinct_id = p_distinct_id;
  end if;
end;
$function$;
