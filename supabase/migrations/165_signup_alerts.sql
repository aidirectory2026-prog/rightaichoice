-- 165_signup_alerts.sql
-- Phase 11.1 (2026-06-18) — never-miss-a-signup alert dedup.
-- /api/cron/new-signup-alert (every 15 min) finds accounts in auth.users not yet
-- in this table, emails/Slacks a digest, and records them here so they're never
-- re-alerted. Seeded with existing users so the first run doesn't spam the backlog.

create table if not exists public.signup_alerts_sent (
  user_id uuid primary key,
  sent_at timestamptz not null default now()
);
alter table public.signup_alerts_sent enable row level security;
grant all on public.signup_alerts_sent to service_role;

-- One-time seed: mark every existing account as already-alerted.
insert into public.signup_alerts_sent (user_id, sent_at)
select id, now() from auth.users
on conflict (user_id) do nothing;
