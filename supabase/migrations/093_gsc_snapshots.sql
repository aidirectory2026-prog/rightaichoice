-- Day 1 (2026-05-20) — Weekly GSC optimization loop data layer.
--
-- Three tables that drive the Monday→Friday loop spec'd in Doc 13:
--   1. gsc_snapshots      — one row per (snapshot_date, scope) capturing the full
--                           page+query result set as JSONB. Source of truth for
--                           every triage decision.
--   2. gsc_diffs          — page+query deltas between two snapshots. Computed by
--                           scripts/diff-gsc-snapshots.ts. Signal = winning|losing
--                           |flat|new|lost.
--   3. weekly_loop_actions — the sprint log. Every triage-emitted action lives
--                           here through its lifecycle (proposed → accepted →
--                           executed → measured).

create table public.gsc_snapshots (
  id uuid primary key default gen_random_uuid(),

  -- WHEN
  snapshot_date date not null,             -- the Monday this snapshot represents
  scope text not null check (scope in ('7d', '28d')),

  -- WHAT
  -- Site-wide totals for the window (rolled up at write time so dashboards
  -- don't re-aggregate every read).
  totals jsonb not null default '{}'::jsonb,
  -- Per-(page, query) rows. Shape: [{ page, query, clicks, impressions, ctr, position }, ...]
  -- Stored as JSONB rather than relational rows because we read it whole and
  -- never query into it — the diff/triage scripts load it, the dashboard
  -- aggregates it client-side. ~5k rows × ~200 bytes ≈ 1MB/snapshot.
  rows jsonb not null default '[]'::jsonb,
  rows_count integer not null default 0,

  -- HOW
  source text not null default 'querySearchAnalytics',
  generated_at timestamptz not null default now(),

  unique (snapshot_date, scope)
);

create index gsc_snapshots_date_idx on public.gsc_snapshots (snapshot_date desc);

comment on table public.gsc_snapshots is
  'Day 1 — weekly GSC snapshot. One row per (Monday, scope). Source of truth for diff/triage.';

create table public.gsc_diffs (
  id uuid primary key default gen_random_uuid(),

  from_date date not null,
  to_date date not null,
  scope text not null check (scope in ('7d', '28d')),

  -- Per-(page, query) deltas. Shape per row:
  --   { page, query, current: {pos, clicks, impr, ctr}, prior: {...},
  --     delta_position, delta_impressions, delta_clicks, delta_ctr,
  --     signal: 'winning'|'losing'|'flat'|'new'|'lost' }
  signals jsonb not null default '[]'::jsonb,
  signals_count integer not null default 0,

  -- Aggregate counts for fast dashboard reads.
  winners_count integer not null default 0,
  losers_count integer not null default 0,
  new_pairs_count integer not null default 0,
  lost_pairs_count integer not null default 0,

  generated_at timestamptz not null default now(),

  unique (from_date, to_date, scope)
);

create index gsc_diffs_to_date_idx on public.gsc_diffs (to_date desc);

comment on table public.gsc_diffs is
  'Day 1 — page+query deltas between two GSC snapshots. Drives the triage matrix.';

create table public.weekly_loop_actions (
  id uuid primary key default gen_random_uuid(),

  -- WHICH snapshot generated this action
  diff_id uuid references public.gsc_diffs(id) on delete set null,
  snapshot_date date not null,

  -- WHAT page + WHICH action
  page text not null,                      -- canonical path, e.g. /compare/cline-vs-aider
  action_type text not null,               -- title_rewrite | depth_expand | links_inject | noindex | canonical_fix | boost_discovery | refresh_page
  priority text not null check (priority in ('critical', 'high', 'medium', 'low')),
  reason text not null,

  -- LIFECYCLE
  status text not null default 'proposed'
    check (status in ('proposed', 'accepted', 'rejected', 'executed', 'measured', 'reverted')),
  proposed_at timestamptz not null default now(),
  accepted_at timestamptz,
  executed_at timestamptz,
  measured_at timestamptz,

  -- BASELINE (frozen at acceptance) — used to compute lift in /seo-impact
  baseline_position numeric,
  baseline_impressions integer,
  baseline_clicks integer,
  baseline_ctr numeric,

  -- OUTCOME (filled in 4 weeks after execution by /seo-impact)
  outcome_position numeric,
  outcome_impressions integer,
  outcome_clicks integer,
  outcome_ctr numeric,

  -- DETAIL
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index weekly_loop_actions_snapshot_idx on public.weekly_loop_actions (snapshot_date desc);
create index weekly_loop_actions_page_idx on public.weekly_loop_actions (page);
create index weekly_loop_actions_status_idx on public.weekly_loop_actions (status, priority);

comment on table public.weekly_loop_actions is
  'Day 1 — the weekly sprint log. One row per triage-emitted action through its lifecycle.';

-- RLS — service role only; the admin pages talk to Supabase via the admin
-- client, so anon/authenticated roles never need read access.
alter table public.gsc_snapshots enable row level security;
alter table public.gsc_diffs enable row level security;
alter table public.weekly_loop_actions enable row level security;

create policy "service_role_full_access" on public.gsc_snapshots
  for all to service_role using (true) with check (true);
create policy "authenticated_read" on public.gsc_snapshots
  for select to authenticated using (true);

create policy "service_role_full_access" on public.gsc_diffs
  for all to service_role using (true) with check (true);
create policy "authenticated_read" on public.gsc_diffs
  for select to authenticated using (true);

create policy "service_role_full_access" on public.weekly_loop_actions
  for all to service_role using (true) with check (true);
create policy "authenticated_read" on public.weekly_loop_actions
  for select to authenticated using (true);
