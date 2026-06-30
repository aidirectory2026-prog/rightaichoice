-- Phase 13 Social — per-platform weekly strategy.
--
-- One row per (platform, week_start): an AI-crafted brief built from the prior
-- week's posts + engagement, aligned to the brand goals. Drives the admin's
-- per-platform strategy card AND feeds the drafting brain so each week's posts
-- pursue that week's plan. Generated weekly by the social-strategy cron (or
-- on-demand via the admin "Regenerate" button / social:strategy CLI).
-- Reverse: 180_social_strategies.rollback.sql

create table if not exists public.social_strategies (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('linkedin','x','instagram','reddit')),
  week_start date not null,                 -- Monday (UTC) of the strategy's week
  focus text not null,                      -- one-line focus for the week
  themes jsonb not null default '[]'::jsonb,      -- string[] content themes
  post_types jsonb not null default '[]'::jsonb,  -- string[] recommended formats
  cadence text,                             -- e.g. "3 posts + engage in replies"
  rationale text,                           -- why, tied to last week's performance
  goal_alignment text,                      -- how it serves brand-awareness + engagement
  based_on jsonb not null default '{}'::jsonb,    -- { postCount, avgEngagement, topAngle, formats }
  generated_at timestamptz not null default now(),
  unique (platform, week_start)
);
alter table public.social_strategies enable row level security;

comment on table public.social_strategies is
  'Phase 13 Social — per-platform weekly strategy (AI-crafted from last week + insights, goal-aligned). Service-role only.';
