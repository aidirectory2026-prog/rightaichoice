-- Phase 8.d.10 (2026-05-18) — dedup table for failure-alert delivery.
-- One row per pipeline_runs.id we've already alerted on; prevents
-- duplicate email/Slack pings when the same failed run is still within
-- the alert-cron's lookback window across multiple firings.

create table public.pipeline_alerts_sent (
  id uuid primary key default gen_random_uuid(),
  pipeline_run_id uuid not null unique references public.pipeline_runs(id) on delete cascade,
  sent_at timestamptz not null default now(),
  channel text not null check (channel in ('email', 'slack', 'both'))
);

create index pipeline_alerts_sent_sent_at_idx on public.pipeline_alerts_sent (sent_at desc);

alter table public.pipeline_alerts_sent enable row level security;

create policy "service_role_full_access"
  on public.pipeline_alerts_sent
  for all
  to service_role
  using (true)
  with check (true);

create policy "authenticated_read"
  on public.pipeline_alerts_sent
  for select
  to authenticated
  using (true);

comment on table public.pipeline_alerts_sent is
  'Phase 8.d.10 — dedup for /api/cron/alert-failed-pipelines. UNIQUE on pipeline_run_id blocks duplicate alerts when the same failed run is still within the 35-min lookback across multiple 30-min cron fires.';
