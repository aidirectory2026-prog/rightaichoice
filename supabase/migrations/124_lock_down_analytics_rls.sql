-- 124_lock_down_analytics_rls.sql
-- Phase 9.B / 9.C — close the analytics/PII over-exposure.
--
-- Both user_events (raw stream incl. ip, user_agent, page_path, referrer) and
-- user_intent_profile (email_domain, search history, tools-visited — the
-- salable per-user record) had `authenticated_read USING (true)`, so ANY
-- logged-in user could read EVERY user's behavioural data + PII via the browser
-- key (and stream it live via Supabase Realtime).
--
-- user_events: the only browser readers are the ADMIN live-feed components
-- (Realtime INSERT subscription on /admin), so scope SELECT to admins instead
-- of all authenticated users. service_role_full_access stays, so every
-- server-side admin read (getAdminClient) is unaffected.
--
-- user_intent_profile: nothing reads it via the browser client — lock it to
-- service_role only (drop the authenticated read entirely).

drop policy if exists "authenticated_read" on public.user_events;
create policy "admin_read" on public.user_events
  for select to authenticated
  using ((select coalesce((select is_admin from public.profiles where id = auth.uid()), false)));

drop policy if exists "authenticated_read" on public.user_intent_profile;
