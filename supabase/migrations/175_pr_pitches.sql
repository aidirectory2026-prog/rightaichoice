-- Phase 13 D2.2b — digital-PR pitch queue (data-journalism engine).
--
-- The PR engine derives newsworthy angles from our live data (lib/pr/story-angles),
-- drafts a personalized pitch per (angle × target) with DeepSeek, and stores each
-- as a DRAFT here for the operator to review, edit, approve, and send. Outcomes
-- (sent / responded / link landed) are tracked so we can see which angles + outlets
-- actually earn editorial links — the #1 Domain-Authority mover.
--
-- Admin/service-role only (RLS on, no anon policies). Reverse: 175_pr_pitches.rollback.sql

create table if not exists public.pr_pitches (
  id uuid primary key default gen_random_uuid(),
  angle_key text not null,                 -- stable key from lib/pr/story-angles.ts
  angle_title text not null,
  target_key text not null,                -- stable key from lib/pr/targets.ts
  target_name text not null,               -- person/outlet
  target_outlet text,
  target_contact text,                     -- how to reach (submit URL / email / handle)
  pitch_subject text,
  pitch_body text,
  model text,                              -- drafting model (deepseek-chat)
  status text not null default 'draft'
    check (status in ('draft','approved','sent','responded','landed','declined')),
  drafted_at timestamptz not null default now(),
  sent_at timestamptz,
  responded_at timestamptz,
  link_url text,                           -- the earned editorial link, once it lands
  link_landed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (angle_key, target_key)           -- one pitch per angle×target (idempotent drafting)
);

create index if not exists idx_pr_pitches_status on public.pr_pitches (status, drafted_at desc);
alter table public.pr_pitches enable row level security;

comment on table public.pr_pitches is
  'Phase 13 D2.2b — digital-PR pitch approval queue (data-journalism outreach). Admin/service-role only.';
