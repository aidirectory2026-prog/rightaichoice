-- Phase 8.h (2026-05-20) — Supabase mirror of all captured product events.
--
-- Why this exists: Mixpanel free tier blocks the Query API, which means
-- programmatic export of event data isn't possible without upgrading. Our
-- business model (selling per-user behavioural data to AI tool vendors)
-- needs unlimited SQL access to the raw event stream. Solution: every
-- meaningful client + server analytics call also writes here. Mixpanel
-- remains the operator-facing dashboard; this table is the salable data
-- product.

-- ── user_events — generic event log, append-only ─────────────────
-- Schema kept intentionally flexible (properties jsonb) so we don't have
-- to migrate every time a new event is added. Index strategy supports the
-- two main read patterns: "show me all events for this user" and "show me
-- all <event_name> events in the last N days."
create table public.user_events (
  id uuid primary key default gen_random_uuid(),

  -- WHO
  distinct_id text not null,           -- Mixpanel distinct_id (anon UUID or user.id once authed)
  user_id uuid references public.profiles(id) on delete set null,
  auth_state text check (auth_state in ('anon', 'known')),

  -- WHAT
  event_name text not null,
  properties jsonb default '{}'::jsonb,

  -- CONTEXT (extracted to columns for fast filtering)
  page_path text,
  referrer text,
  device_type text,                    -- mobile / tablet / desktop
  source_kind text not null check (source_kind in ('client', 'server')),

  -- ATTRIBUTION
  utm_source text,
  utm_medium text,
  utm_campaign text,
  first_touch_utm_source text,

  -- INTEGRITY
  ip text,                              -- nullable; only stored for server events for geo-attribution
  user_agent text,                      -- truncated to 300 chars
  insert_id text,                       -- dedup key (sha256 of event|distinct_id|payload)
  created_at timestamptz not null default now()
);

create index user_events_created_at_idx on public.user_events (created_at desc);
create index user_events_event_name_created_at_idx on public.user_events (event_name, created_at desc);
create index user_events_user_id_created_at_idx on public.user_events (user_id, created_at desc) where user_id is not null;
create index user_events_distinct_id_idx on public.user_events (distinct_id, created_at desc);
create unique index user_events_insert_id_uniq on public.user_events (insert_id) where insert_id is not null;

alter table public.user_events enable row level security;

create policy "service_role_full_access"
  on public.user_events for all to service_role using (true) with check (true);

-- Admin-read so /admin/exports can pull data.
create policy "authenticated_read"
  on public.user_events for select to authenticated using (true);

comment on table public.user_events is
  'Phase 8.h — generic event log mirroring all client + server analytics events. The salable data product; Mixpanel remains the operator dashboard.';


-- ── user_intent_profile — running per-user behavioural record ─────
-- Updated on every relevant event via a trigger (see below). One row per
-- distinct_id; user_id back-filled when the user signs up. The arrays here
-- are exactly the salable per-user profile a vendor would buy.
create table public.user_intent_profile (
  distinct_id text primary key,
  user_id uuid unique references public.profiles(id) on delete set null,
  email_domain text,

  -- Lifecycle timestamps
  first_seen_at timestamptz not null default now(),
  signup_at timestamptz,
  last_active_at timestamptz not null default now(),
  last_event_at timestamptz,

  -- Segment properties (latest value wins)
  plan_budget_segment text,
  plan_team_segment text,
  plan_industry_segment text,
  plan_skill_segment text,

  -- Behavioural arrays (union-ed via trigger; capped per row)
  existing_tools_history text[] default array[]::text[],
  all_search_queries_recent text[] default array[]::text[],
  tools_visited_externally text[] default array[]::text[],
  tools_compared_with text[] default array[]::text[],          -- e.g. 'notion-vs-airtable'
  plan_use_cases_submitted text[] default array[]::text[],
  ai_chat_tools_mentioned text[] default array[]::text[],
  reviews_submitted_for text[] default array[]::text[],
  favorite_categories text[] default array[]::text[],

  -- First-touch attribution (set once)
  first_touch_utm_source text,
  first_touch_utm_medium text,
  first_touch_utm_campaign text,
  first_touch_referrer text,
  first_touch_landing text,

  -- Engagement counters
  saves_count int default 0,
  comparisons_count int default 0,
  plans_completed_count int default 0,
  reviews_count int default 0,
  tools_visited_count int default 0,
  chat_messages_count int default 0,
  searches_count int default 0,

  -- Derived health
  ad_block_likely boolean default false,

  updated_at timestamptz not null default now()
);

create index user_intent_profile_user_id_idx on public.user_intent_profile (user_id) where user_id is not null;
create index user_intent_profile_email_domain_idx on public.user_intent_profile (email_domain) where email_domain is not null;
create index user_intent_profile_signup_at_idx on public.user_intent_profile (signup_at desc) where signup_at is not null;
create index user_intent_profile_last_active_idx on public.user_intent_profile (last_active_at desc);
-- GIN indexes on the arrays so vendor queries like
-- "WHERE 'notion' = ANY(existing_tools_history)" are fast.
create index user_intent_profile_existing_tools_gin on public.user_intent_profile using gin (existing_tools_history);
create index user_intent_profile_chat_tools_gin on public.user_intent_profile using gin (ai_chat_tools_mentioned);
create index user_intent_profile_compared_gin on public.user_intent_profile using gin (tools_compared_with);

alter table public.user_intent_profile enable row level security;

create policy "service_role_full_access"
  on public.user_intent_profile for all to service_role using (true) with check (true);

create policy "authenticated_read"
  on public.user_intent_profile for select to authenticated using (true);

comment on table public.user_intent_profile is
  'Phase 8.h — running per-user behavioural record. THE salable per-user data product. Built up via /api/track-mirror over time.';


-- ── Helper function: upsert profile + union arrays in one call ────
-- Called by /api/track-mirror after each event. Server-only (security
-- definer) so the client can hit the API without needing direct table
-- write access.
create or replace function public.upsert_user_intent(
  p_distinct_id text,
  p_user_id uuid default null,
  p_email_domain text default null,
  p_page_path text default null,
  p_arr_existing_tools text[] default null,
  p_arr_search_queries text[] default null,
  p_arr_tools_visited text[] default null,
  p_arr_tools_compared text[] default null,
  p_arr_plan_use_cases text[] default null,
  p_arr_chat_tools text[] default null,
  p_arr_reviews_for text[] default null,
  p_plan_budget text default null,
  p_plan_team text default null,
  p_plan_industry text default null,
  p_plan_skill text default null,
  p_inc_saves int default 0,
  p_inc_comparisons int default 0,
  p_inc_plans_completed int default 0,
  p_inc_reviews int default 0,
  p_inc_tools_visited int default 0,
  p_inc_chat_messages int default 0,
  p_inc_searches int default 0,
  p_signup_at timestamptz default null,
  p_first_touch_utm_source text default null,
  p_first_touch_utm_medium text default null,
  p_first_touch_utm_campaign text default null,
  p_first_touch_referrer text default null,
  p_first_touch_landing text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Per-array caps so a hostile or runaway client can't bloat a single row.
  cap int := 100;
begin
  insert into public.user_intent_profile (distinct_id, user_id, email_domain)
  values (p_distinct_id, p_user_id, p_email_domain)
  on conflict (distinct_id) do nothing;

  -- For all non-array fields, COALESCE-update (latest non-null wins).
  -- For arrays, union with dedup and trim to cap.
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
      else (select array_agg(distinct x) from unnest(existing_tools_history || p_arr_existing_tools) x limit cap) end,
    all_search_queries_recent = case when p_arr_search_queries is null then all_search_queries_recent
      else (select array_agg(distinct x) from unnest(all_search_queries_recent || p_arr_search_queries) x limit cap) end,
    tools_visited_externally = case when p_arr_tools_visited is null then tools_visited_externally
      else (select array_agg(distinct x) from unnest(tools_visited_externally || p_arr_tools_visited) x limit cap) end,
    tools_compared_with = case when p_arr_tools_compared is null then tools_compared_with
      else (select array_agg(distinct x) from unnest(tools_compared_with || p_arr_tools_compared) x limit cap) end,
    plan_use_cases_submitted = case when p_arr_plan_use_cases is null then plan_use_cases_submitted
      else (select array_agg(distinct x) from unnest(plan_use_cases_submitted || p_arr_plan_use_cases) x limit cap) end,
    ai_chat_tools_mentioned = case when p_arr_chat_tools is null then ai_chat_tools_mentioned
      else (select array_agg(distinct x) from unnest(ai_chat_tools_mentioned || p_arr_chat_tools) x limit cap) end,
    reviews_submitted_for = case when p_arr_reviews_for is null then reviews_submitted_for
      else (select array_agg(distinct x) from unnest(reviews_submitted_for || p_arr_reviews_for) x limit cap) end,
    saves_count = saves_count + p_inc_saves,
    comparisons_count = comparisons_count + p_inc_comparisons,
    plans_completed_count = plans_completed_count + p_inc_plans_completed,
    reviews_count = reviews_count + p_inc_reviews,
    tools_visited_count = tools_visited_count + p_inc_tools_visited,
    chat_messages_count = chat_messages_count + p_inc_chat_messages,
    searches_count = searches_count + p_inc_searches,
    updated_at = now()
  where distinct_id = p_distinct_id;
end;
$$;

revoke all on function public.upsert_user_intent from public;
grant execute on function public.upsert_user_intent to service_role;

comment on function public.upsert_user_intent is
  'Phase 8.h — single-call upsert + union + increment for user_intent_profile. Called by /api/track-mirror endpoint.';
