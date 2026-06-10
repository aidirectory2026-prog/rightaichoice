-- Phase 10 #60 — close the public hole on tracked_niche_pages.
--
-- Supabase advisor flagged RLS disabled on this table: it was fully readable
-- AND writable through the public anon key (64 rows of operator SEO data).
-- Mirrors the operator-table convention from 093_gsc_snapshots.sql:
--   service-role = full access (service role bypasses RLS anyway; explicit for
--   clarity/consistency), authenticated = read, anon = nothing.
-- The weekly-digest cron reads via the service-role admin client, so this does
-- not affect it; the /admin/niche-tracker dashboard (authenticated admin) keeps
-- read access via authenticated_read.

alter table public.tracked_niche_pages enable row level security;

drop policy if exists "service_role_full_access" on public.tracked_niche_pages;
create policy "service_role_full_access" on public.tracked_niche_pages
  for all to service_role using (true) with check (true);

drop policy if exists "authenticated_read" on public.tracked_niche_pages;
create policy "authenticated_read" on public.tracked_niche_pages
  for select to authenticated using (true);

-- Rollback:
--   drop policy if exists "service_role_full_access" on public.tracked_niche_pages;
--   drop policy if exists "authenticated_read" on public.tracked_niche_pages;
--   alter table public.tracked_niche_pages disable row level security;
