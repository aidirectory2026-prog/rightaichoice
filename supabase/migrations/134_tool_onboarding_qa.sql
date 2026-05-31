-- 134_tool_onboarding_qa.sql
-- Phase 9 (Automations & Catalog) C — per-tool gold-standard SOP QA record.
-- Written + read by the onboard SOP (lib/cron/onboard.ts) and /admin/onboarding.
-- The table was first applied to prod via MCP during C; this file mirrors it
-- for repo tracking, and adds RLS (service-role only — admin/SOP write via the
-- service client; bypasses RLS).
create table if not exists public.tool_onboarding_qa (
  tool_id    uuid primary key references public.tools(id) on delete cascade,
  checks     jsonb       not null default '{}'::jsonb,
  all_green  boolean     not null default false,
  published  boolean     not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists idx_tool_onboarding_qa_pending
  on public.tool_onboarding_qa (all_green, published, updated_at desc);
alter table public.tool_onboarding_qa enable row level security;
