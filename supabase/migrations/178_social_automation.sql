-- Phase 13 Social Media Automation — core tables (queue + accounts + metrics).
--
-- social_posts = the approval queue + audit log (mirrors the pr_pitches pattern).
-- social_accounts = per-platform OAuth connection (tokens; service-role only).
-- social_metrics = engagement captured over time per post (feeds the insights loop).
-- All RLS-enabled with NO anon policies (service role bypasses) — admin/cron only.
-- Reverse: 178_social_automation.rollback.sql

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('linkedin','x','instagram','reddit')),
  kind text not null default 'text'
    check (kind in ('stat_card','tool_spotlight','news_roundup','comparison','quote','text')),
  status text not null default 'draft'
    check (status in ('draft','approved','scheduled','posted','failed','cancelled')),
  copy text not null,
  hashtags text[] not null default '{}',
  link_url text,
  graphic_template text,                 -- null = text-only post
  graphic_data jsonb not null default '{}'::jsonb,
  graphic_size text,                     -- e.g. '1080x1080'
  subreddit text,                        -- reddit only
  source_refs jsonb not null default '[]'::jsonb,  -- [{title,url}] the facts came from
  content_hash text not null,            -- variety/dedup key (angle fingerprint)
  brain_meta jsonb not null default '{}'::jsonb,   -- { angle, why, score, predicted }
  scheduled_at timestamptz,
  posted_at timestamptz,
  external_post_id text,                 -- platform's id once posted
  external_url text,                     -- live post URL
  cost_usd numeric not null default 0,   -- X pay-per-use accounting
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_social_posts_status_sched on public.social_posts (status, scheduled_at);
create index if not exists idx_social_posts_platform_hash on public.social_posts (platform, content_hash);
alter table public.social_posts enable row level security;

create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  platform text not null unique check (platform in ('linkedin','x','instagram','reddit')),
  display_name text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scope text,
  external_account_id text,              -- org URN / ig-user-id / reddit username
  status text not null default 'disconnected'
    check (status in ('connected','disconnected','error')),
  meta jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.social_accounts enable row level security;

create table if not exists public.social_metrics (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  captured_at timestamptz not null default now(),
  impressions int,
  likes int,
  comments int,
  shares int,
  clicks int,
  raw jsonb not null default '{}'::jsonb
);
create index if not exists idx_social_metrics_post on public.social_metrics (post_id, captured_at desc);
alter table public.social_metrics enable row level security;

comment on table public.social_posts is
  'Phase 13 Social — approval queue + audit log for cross-platform posts. Admin/service-role only.';
comment on table public.social_accounts is
  'Phase 13 Social — per-platform OAuth connection (tokens). Service-role only.';
comment on table public.social_metrics is
  'Phase 13 Social — per-post engagement over time (insights loop).';
