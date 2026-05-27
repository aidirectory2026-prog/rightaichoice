-- Phase 9 Tier-1 (2026-05-27): per-page <title> override store.
--
-- generateMetadata in /tools, /compare, /blog checks this table first.
-- Set by admins via /admin/tier1-review after reviewing DeepSeek
-- suggestions. One ACTIVE row per page_path; revert by setting
-- reverted_at — preserves the audit trail of every approved title.
--
-- Writes are service-role only (server-actions go through the admin
-- client). Reads are public so the metadata builders can use the
-- anon client / RLS-safe server client.

create table if not exists title_overrides (
  id uuid primary key default gen_random_uuid(),
  page_path text not null,
  override_title text not null,
  source_bucket text check (source_bucket in ('1A','1B','1C')),
  approved_by uuid references auth.users(id),
  approved_at timestamptz not null default now(),
  notes text,
  reverted_at timestamptz,
  created_at timestamptz not null default now()
);

-- One ACTIVE override per path. Reverted rows don't block re-approval.
create unique index if not exists title_overrides_active_path_uidx
  on title_overrides (page_path) where reverted_at is null;

create index if not exists title_overrides_path_idx
  on title_overrides (page_path);

alter table title_overrides enable row level security;

drop policy if exists "title_overrides read all" on title_overrides;
create policy "title_overrides read all" on title_overrides for select using (true);

comment on table title_overrides is
  'Phase 9 Tier-1 CTR-rewrite store. One active title override per page_path; revert via reverted_at.';
