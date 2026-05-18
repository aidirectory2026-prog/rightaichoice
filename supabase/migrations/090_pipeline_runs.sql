-- Phase 8.d.2 (2026-05-18) — Canonical record of every automated pipeline
-- execution (Vercel cron + GH Actions). One row per run. Powers Knowledge
-- Room's GH/Vercel run panels, drilldown, cost tracker, freshness map,
-- health score, and failure-alert dedup downstream.

create table public.pipeline_runs (
  id uuid primary key default gen_random_uuid(),

  -- WHAT ran
  source text not null check (source in ('vercel_cron', 'gh_actions')),
  pipeline_key text not null,         -- e.g. 'refresh-faqs', 'freshness-batch/refresh-tools'
  external_id text,                   -- GH workflow_run id (nullable for Vercel)

  -- WHEN
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer,

  -- HOW it went
  status text not null check (status in ('running', 'success', 'failure', 'timeout', 'partial')),
  error_message text,
  error_class text,                   -- 'timeout' | 'api_error' | 'db_error' | 'validation' | 'unknown'

  -- WHAT it did
  items_processed integer default 0,
  items_succeeded integer default 0,
  items_failed integer default 0,

  -- WHAT it cost
  deepseek_tokens_in integer default 0,
  deepseek_tokens_out integer default 0,
  anthropic_tokens_in integer default 0,
  anthropic_tokens_out integer default 0,
  apify_usd numeric(8, 4) default 0,
  estimated_cost_usd numeric(8, 4) default 0,

  -- DETAIL
  metadata jsonb default '{}'::jsonb, -- per-pipeline extras (slugs, batch size, failed_step, log_url, …)
  created_at timestamptz default now()
);

create index pipeline_runs_started_at_idx on public.pipeline_runs (started_at desc);
create index pipeline_runs_pipeline_key_idx on public.pipeline_runs (pipeline_key, started_at desc);
create index pipeline_runs_status_idx on public.pipeline_runs (status, started_at desc);
create unique index pipeline_runs_external_id_uniq on public.pipeline_runs (source, external_id) where external_id is not null;

alter table public.pipeline_runs enable row level security;

-- Service role writes everything (used by withPipelineLogging wrapper and poll-gh-actions cron).
create policy "service_role_full_access"
  on public.pipeline_runs
  for all
  to service_role
  using (true)
  with check (true);

-- Authenticated admin reads (admin auth uses authenticated role; existing admin pages reach Supabase via createServerClient).
create policy "authenticated_read"
  on public.pipeline_runs
  for select
  to authenticated
  using (true);

comment on table public.pipeline_runs is
  'Phase 8.d.2 — every automated pipeline execution (Vercel cron + GH Actions). Written by withPipelineLogging wrapper and poll-gh-actions cron. Read by /admin/updates Knowledge Room.';
