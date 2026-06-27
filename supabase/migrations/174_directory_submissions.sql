-- Phase 13 D2.1 — directory submission pipeline (authority engine).
--
-- referring_domains (mig 084) tracks links we've EARNED. This table tracks the
-- pipeline of high-authority directories we want to submit TO — status, our live
-- listing URL, and whether a backlink has been detected (which then feeds
-- referring_domains so the existing /admin/authority dashboard counts it).
--
-- Operator-approved model: the engine prepares the submission kit + queue; the
-- operator does the actual (CAPTCHA-gated, ToS-respecting) human submission and
-- records status. Reverse: 173_directory_submissions.rollback.sql

create table if not exists public.directory_submissions (
  id uuid primary key default gen_random_uuid(),
  directory_key text not null unique,            -- stable key from lib/authority/directory-targets.ts
  directory_name text not null,
  directory_url text not null,                   -- homepage
  submit_url text,                               -- where to submit a listing
  authority_tier int not null default 2,         -- 1 = highest priority, 3 = lowest
  da_estimate int,                               -- approximate Domain Rating/Authority
  pricing text not null default 'free',          -- free | freemium | paid
  dofollow boolean,                              -- expected link rel (null = unknown)
  category text,                                 -- ai-directory | saas-review | launch | entity | general
  status text not null default 'queued'
    check (status in ('queued', 'submitted', 'live', 'rejected', 'skipped')),
  submitted_at timestamptz,
  live_url text,                                 -- our listing's URL once live
  backlink_detected boolean not null default false,
  last_checked_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_dir_subs_status on public.directory_submissions (status, authority_tier);
alter table public.directory_submissions enable row level security;

comment on table public.directory_submissions is
  'Phase 13 D2.1 — pipeline of directories to submit RightAIChoice to (authority + GEO consensus). Admin/service-role only.';

-- Detected directory backlinks are logged into the existing referring_domains
-- table using source_channel='other' with a "directory:<key>" note — no change
-- to that table's schema/constraint (keeps this migration purely additive).
