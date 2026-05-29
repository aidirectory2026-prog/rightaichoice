-- 125_security_perf_sweep.sql
-- Phase 9 security + performance hardening, driven by Supabase advisor lints.
-- All changes are behavior-preserving. service_role bypasses RLS, so all
-- server-side (getAdminClient) access paths are unaffected.
--
-- Prior context: Phase 9.0 (migration 120) revoked anon/authenticated EXECUTE
-- on _apply_migration_chunk*, insights_*, refresh_v_field_freshness,
-- delete_expired_plan_cache. Phase 9.B (migration 124) added FK indexes and
-- locked down user_events / user_intent_profile RLS. Not redone here.

begin;

-- =====================================================================
-- SECURITY 1 — Enable RLS on 5 unprotected admin/server-only tables.
-- No anon/authenticated policy is created; service_role bypasses RLS so
-- the only readers/writers (cron + maintenance scripts via getAdminClient)
-- are unaffected. Verified via repo grep: none read by the browser client.
-- =====================================================================
alter table public.data_refresh_log     enable row level security;
alter table public.tool_candidates       enable row level security;
alter table public.outbound_link_issues  enable row level security;
alter table public.internal_link_issues  enable row level security;
alter table public.deleted_tools         enable row level security;

-- =====================================================================
-- SECURITY 2 — Recreate v_stale_comparisons with security_invoker = true.
-- Definition copied verbatim from pg_get_viewdef (live).
-- =====================================================================
create or replace view public.v_stale_comparisons
with (security_invoker = true) as
 SELECT id AS comparison_id,
    slug AS comparison_slug,
    tool_ids,
    last_reviewed_at,
    ( SELECT max(t.last_verified_at) AS max
           FROM tools t
          WHERE t.id = ANY (tc.tool_ids)) AS most_recent_tool_refresh,
    (( SELECT max(t.last_verified_at) AS max
           FROM tools t
          WHERE t.id = ANY (tc.tool_ids))) - COALESCE(last_reviewed_at, '1970-01-01 00:00:00+00'::timestamp with time zone) AS staleness
   FROM tool_comparisons tc
  WHERE is_editorial = true AND (EXISTS ( SELECT 1
           FROM tools t
          WHERE (t.id = ANY (tc.tool_ids)) AND t.last_verified_at > COALESCE(tc.last_reviewed_at, '1970-01-01 00:00:00+00'::timestamp with time zone)));

-- =====================================================================
-- SECURITY 3 — Pin search_path on the 10 mutable-search_path functions.
-- ALTER FUNCTION only (no body change). Using 'public' (not '') because
-- every one of these references unqualified public tables in its body.
-- =====================================================================
alter function public.adjust_counter(text, uuid, text, integer)        set search_path = public;
alter function public.increment_counter(text, text, uuid)              set search_path = public;
alter function public.increment_field(text, text, uuid)                set search_path = public;
alter function public.sync_discussion_replies()                        set search_path = public;
alter function public.sync_profile_discussion_count()                  set search_path = public;
alter function public.sync_tool_rating()                               set search_path = public;
alter function public.sync_profile_review_count()                      set search_path = public;
alter function public.sync_question_answers()                          set search_path = public;
alter function public.set_updated_at()                                 set search_path = public;
alter function public.tools_search_vector_update()                     set search_path = public;

-- =====================================================================
-- SECURITY 4 — Revoke EXECUTE from PUBLIC/anon/authenticated on the
-- remaining SECURITY DEFINER functions that are trigger functions or
-- only called server-side (service_role / getAdminClient). Re-grant
-- service_role. Verified call sites via repo grep.
--
-- KEPT (client-callable via @/lib/supabase/server, runs as anon/authenticated):
--   adjust_counter            -> lib/data/votes.ts, lib/data/comparisons.ts
--   increment_counter         -> actions/stacks.ts
--   category_published_counts -> app/categories/page.tsx (public SSR page)
-- =====================================================================

-- increment_field: no rpc call sites; helper, server-only.
revoke execute on function public.increment_field(text, text, uuid) from public, anon, authenticated;
grant  execute on function public.increment_field(text, text, uuid) to service_role;

-- propagate_freshness: only getAdminClient (cron, lib/seo/freshness.ts).
revoke execute on function public.propagate_freshness(text, text, text, text) from public, anon, authenticated;
grant  execute on function public.propagate_freshness(text, text, text, text) to service_role;

-- upsert_user_intent: only getAdminClient (app/api/track-mirror).
revoke execute on function public.upsert_user_intent(text, uuid, text, text, text[], text[], text[], text[], text[], text[], text[], text, text, text, text, integer, integer, integer, integer, integer, integer, integer, timestamptz, text, text, text, text, text) from public, anon, authenticated;
grant  execute on function public.upsert_user_intent(text, uuid, text, text, text[], text[], text[], text[], text[], text[], text[], text, text, text, text, integer, integer, integer, integer, integer, integer, integer, timestamptz, text, text, text, text, text) to service_role;

-- distinct_* analytics helpers: server-only (insights / admin server routes).
revoke execute on function public.distinct_known_users_in_window(timestamptz, boolean, timestamptz) from public, anon, authenticated;
grant  execute on function public.distinct_known_users_in_window(timestamptz, boolean, timestamptz) to service_role;
revoke execute on function public.distinct_visitors_for_event(text, timestamptz, boolean, timestamptz) from public, anon, authenticated;
grant  execute on function public.distinct_visitors_for_event(text, timestamptz, boolean, timestamptz) to service_role;
revoke execute on function public.distinct_visitors_for_tool(text, timestamptz, boolean, timestamptz) from public, anon, authenticated;
grant  execute on function public.distinct_visitors_for_tool(text, timestamptz, boolean, timestamptz) to service_role;
revoke execute on function public.distinct_visitors_in_window(timestamptz, boolean, timestamptz) from public, anon, authenticated;
grant  execute on function public.distinct_visitors_in_window(timestamptz, boolean, timestamptz) to service_role;

-- handle_new_user: trigger on auth.users; not meant to be RPC-callable.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant  execute on function public.handle_new_user() to service_role;

-- Pure trigger functions (no legitimate direct RPC path).
revoke execute on function public.sync_discussion_replies() from public, anon, authenticated;
grant  execute on function public.sync_discussion_replies() to service_role;
revoke execute on function public.sync_page_tool_mentions_db() from public, anon, authenticated;
grant  execute on function public.sync_page_tool_mentions_db() to service_role;
revoke execute on function public.trg_comparisons_propagate_freshness() from public, anon, authenticated;
grant  execute on function public.trg_comparisons_propagate_freshness() to service_role;
revoke execute on function public.trg_tools_propagate_freshness() from public, anon, authenticated;
grant  execute on function public.trg_tools_propagate_freshness() to service_role;

-- =====================================================================
-- SECURITY 5 — Tighten the 5 WITH CHECK (true) public-insert policies.
-- Each new check re-asserts the table's already-NOT-NULL key column(s):
-- it can never reject a row the table would otherwise accept, so the
-- public insert path (track-mirror, newsletter signup, view/click/search
-- logging, comparison cache writes) is preserved, while the linter no
-- longer sees a literal "true".
-- =====================================================================
drop policy if exists "insert click_logs" on public.click_logs;
create policy "insert click_logs" on public.click_logs
  for insert to public
  with check (tool_id is not null);

drop policy if exists "anon insert newsletter_subscribers" on public.newsletter_subscribers;
create policy "anon insert newsletter_subscribers" on public.newsletter_subscribers
  for insert to public
  with check (email is not null and email <> '' and source is not null);

drop policy if exists "insert page_views" on public.page_views;
create policy "insert page_views" on public.page_views
  for insert to public
  with check (path is not null and path <> '');

drop policy if exists "insert search_logs" on public.search_logs;
create policy "insert search_logs" on public.search_logs
  for insert to public
  with check (query is not null);

drop policy if exists "auth write comparisons" on public.tool_comparisons;
create policy "auth write comparisons" on public.tool_comparisons
  for insert to public
  with check (slug is not null and slug <> '' and tool_ids is not null);

-- =====================================================================
-- SECURITY 6 — Restrict public storage buckets so anon can READ objects
-- (via the public CDN object endpoint, which bypasses RLS for public
-- buckets) but cannot LIST the bucket. Both buckets are public=true and
-- logos are served via getPublicUrl, so dropping the broad bucket-wide
-- SELECT policy does not affect object reads.
-- =====================================================================
drop policy if exists "Public read access for tool logos" on storage.objects;
drop policy if exists "Public can read user-avatars"      on storage.objects;

-- =====================================================================
-- PERFORMANCE 7 — auth_rls_initplan: wrap auth.*()/current_setting() in a
-- scalar subquery so it is evaluated once per query instead of once per
-- row. Logic is identical. Each policy is dropped + recreated with the
-- same role/cmd/qual/with_check, only the auth call wrapped.
-- =====================================================================

-- answer_votes
drop policy if exists "auth answer_votes" on public.answer_votes;
create policy "auth answer_votes" on public.answer_votes for all to public
  using ((select auth.uid()) = user_id);

-- answers
drop policy if exists "auth delete answers" on public.answers;
create policy "auth delete answers" on public.answers for delete to public
  using ((select auth.uid()) = user_id);
drop policy if exists "auth update answers" on public.answers;
create policy "auth update answers" on public.answers for update to public
  using ((select auth.uid()) = user_id);
drop policy if exists "auth write answers" on public.answers;
create policy "auth write answers" on public.answers for insert to public
  with check ((select auth.uid()) = user_id);

-- api_keys
drop policy if exists "Users manage own API keys" on public.api_keys;
create policy "Users manage own API keys" on public.api_keys for all to public
  using ((select auth.uid()) = user_id);

-- bing_submit_state
drop policy if exists "admins read bing_submit_state" on public.bing_submit_state;
create policy "admins read bing_submit_state" on public.bing_submit_state for select to public
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin = true));
drop policy if exists "admins update bing_submit_state" on public.bing_submit_state;
create policy "admins update bing_submit_state" on public.bing_submit_state for update to public
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin = true));

-- categories
drop policy if exists "admin insert categories" on public.categories;
create policy "admin insert categories" on public.categories for insert to public
  with check (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin = true));
drop policy if exists "admin update categories" on public.categories;
create policy "admin update categories" on public.categories for update to public
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin = true));

-- click_logs (SELECT admin; INSERT policy handled in SECURITY 5)
drop policy if exists "admin read click_logs" on public.click_logs;
create policy "admin read click_logs" on public.click_logs for select to public
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin = true));

-- daily_update_summaries
drop policy if exists "admins read daily_update_summaries" on public.daily_update_summaries;
create policy "admins read daily_update_summaries" on public.daily_update_summaries for select to public
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin = true));

-- discussion_replies
drop policy if exists "auth delete replies" on public.discussion_replies;
create policy "auth delete replies" on public.discussion_replies for delete to public
  using ((select auth.uid()) = user_id);
drop policy if exists "auth update replies" on public.discussion_replies;
create policy "auth update replies" on public.discussion_replies for update to public
  using ((select auth.uid()) = user_id);
drop policy if exists "auth write replies" on public.discussion_replies;
create policy "auth write replies" on public.discussion_replies for insert to public
  with check ((select auth.uid()) = user_id);

-- discussion_reply_votes
drop policy if exists "auth delete discussion_reply_votes" on public.discussion_reply_votes;
create policy "auth delete discussion_reply_votes" on public.discussion_reply_votes for delete to public
  using ((select auth.uid()) = user_id);
drop policy if exists "auth update discussion_reply_votes" on public.discussion_reply_votes;
create policy "auth update discussion_reply_votes" on public.discussion_reply_votes for update to public
  using ((select auth.uid()) = user_id);
drop policy if exists "auth write discussion_reply_votes" on public.discussion_reply_votes;
create policy "auth write discussion_reply_votes" on public.discussion_reply_votes for insert to public
  with check ((select auth.uid()) = user_id);

-- discussion_votes
drop policy if exists "auth delete discussion_votes" on public.discussion_votes;
create policy "auth delete discussion_votes" on public.discussion_votes for delete to public
  using ((select auth.uid()) = user_id);
drop policy if exists "auth update discussion_votes" on public.discussion_votes;
create policy "auth update discussion_votes" on public.discussion_votes for update to public
  using ((select auth.uid()) = user_id);
drop policy if exists "auth write discussion_votes" on public.discussion_votes;
create policy "auth write discussion_votes" on public.discussion_votes for insert to public
  with check ((select auth.uid()) = user_id);

-- discussions
drop policy if exists "auth delete discussions" on public.discussions;
create policy "auth delete discussions" on public.discussions for delete to public
  using ((select auth.uid()) = user_id);
drop policy if exists "auth update discussions" on public.discussions;
create policy "auth update discussions" on public.discussions for update to public
  using ((select auth.uid()) = user_id);
drop policy if exists "auth write discussions" on public.discussions;
create policy "auth write discussions" on public.discussions for insert to public
  with check ((select auth.uid()) = user_id);

-- ingestion_logs
drop policy if exists "Service role full access on ingestion_logs" on public.ingestion_logs;
create policy "Service role full access on ingestion_logs" on public.ingestion_logs for all to public
  using ((select auth.role()) = 'service_role');

-- newsletter_subscribers (SELECT/UPDATE admin; INSERT handled in SECURITY 5)
drop policy if exists "admins read newsletter_subscribers" on public.newsletter_subscribers;
create policy "admins read newsletter_subscribers" on public.newsletter_subscribers for select to public
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin = true));
drop policy if exists "admins update newsletter_subscribers" on public.newsletter_subscribers;
create policy "admins update newsletter_subscribers" on public.newsletter_subscribers for update to public
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin = true));

-- outreach_log
drop policy if exists "admins read outreach_log" on public.outreach_log;
create policy "admins read outreach_log" on public.outreach_log for select to public
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin = true));
drop policy if exists "admins write outreach_log" on public.outreach_log;
create policy "admins write outreach_log" on public.outreach_log for all to public
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin = true));

-- page_views (SELECT admin; INSERT handled in SECURITY 5)
drop policy if exists "admin read page_views" on public.page_views;
create policy "admin read page_views" on public.page_views for select to public
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin = true));

-- plan_intents
drop policy if exists "plan_intents_select_own" on public.plan_intents;
create policy "plan_intents_select_own" on public.plan_intents for select to authenticated
  using (user_id = (select auth.uid()));

-- profiles
drop policy if exists "users update profile" on public.profiles;
create policy "users update profile" on public.profiles for update to public
  using ((select auth.uid()) = id);

-- question_votes
drop policy if exists "auth question_votes" on public.question_votes;
create policy "auth question_votes" on public.question_votes for all to public
  using ((select auth.uid()) = user_id);

-- questions
drop policy if exists "auth delete questions" on public.questions;
create policy "auth delete questions" on public.questions for delete to public
  using ((select auth.uid()) = user_id);
drop policy if exists "auth update questions" on public.questions;
create policy "auth update questions" on public.questions for update to public
  using ((select auth.uid()) = user_id);
drop policy if exists "auth write questions" on public.questions;
create policy "auth write questions" on public.questions for insert to public
  with check ((select auth.uid()) = user_id);

-- referring_domains
drop policy if exists "admins read referring_domains" on public.referring_domains;
create policy "admins read referring_domains" on public.referring_domains for select to public
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin = true));
drop policy if exists "admins write referring_domains" on public.referring_domains;
create policy "admins write referring_domains" on public.referring_domains for all to public
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin = true));

-- refresh_logs
drop policy if exists "Service role full access on refresh_logs" on public.refresh_logs;
create policy "Service role full access on refresh_logs" on public.refresh_logs for all to public
  using ((select auth.role()) = 'service_role');

-- reputation_logs
drop policy if exists "users read reputation" on public.reputation_logs;
create policy "users read reputation" on public.reputation_logs for select to public
  using ((select auth.uid()) = user_id);

-- review_votes
drop policy if exists "auth review_votes" on public.review_votes;
create policy "auth review_votes" on public.review_votes for all to public
  using ((select auth.uid()) = user_id);

-- reviews
drop policy if exists "auth delete reviews" on public.reviews;
create policy "auth delete reviews" on public.reviews for delete to public
  using ((select auth.uid()) = user_id);
drop policy if exists "auth update reviews" on public.reviews;
create policy "auth update reviews" on public.reviews for update to public
  using ((select auth.uid()) = user_id);
drop policy if exists "auth write reviews" on public.reviews;
create policy "auth write reviews" on public.reviews for insert to public
  with check ((select auth.uid()) = user_id);

-- saved_stacks
drop policy if exists "Users can view own stacks" on public.saved_stacks;
create policy "Users can view own stacks" on public.saved_stacks for select to public
  using ((select auth.uid()) = user_id);
drop policy if exists "Users can save stacks" on public.saved_stacks;
create policy "Users can save stacks" on public.saved_stacks for insert to public
  with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update own stacks" on public.saved_stacks;
create policy "Users can update own stacks" on public.saved_stacks for update to public
  using ((select auth.uid()) = user_id);
drop policy if exists "Users can delete own stacks" on public.saved_stacks;
create policy "Users can delete own stacks" on public.saved_stacks for delete to public
  using ((select auth.uid()) = user_id);

-- search_logs (SELECT admin; INSERT handled in SECURITY 5)
drop policy if exists "admin read search_logs" on public.search_logs;
create policy "admin read search_logs" on public.search_logs for select to public
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin = true));

-- tags
drop policy if exists "admin insert tags" on public.tags;
create policy "admin insert tags" on public.tags for insert to public
  with check (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin = true));

-- tool_alternatives
drop policy if exists "admin manage alternatives" on public.tool_alternatives;
create policy "admin manage alternatives" on public.tool_alternatives for all to public
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin = true));

-- tool_categories
drop policy if exists "admin manage tool_categories" on public.tool_categories;
create policy "admin manage tool_categories" on public.tool_categories for all to public
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin = true));

-- tool_faqs
drop policy if exists "Service role full access on tool_faqs" on public.tool_faqs;
create policy "Service role full access on tool_faqs" on public.tool_faqs for all to public
  using ((select auth.role()) = 'service_role');

-- tool_sentiment_cache
drop policy if exists "Service role write access on tool_sentiment_cache" on public.tool_sentiment_cache;
create policy "Service role write access on tool_sentiment_cache" on public.tool_sentiment_cache for all to public
  using ((select auth.role()) = 'service_role');

-- tool_tags
drop policy if exists "admin manage tool_tags" on public.tool_tags;
create policy "admin manage tool_tags" on public.tool_tags for all to public
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin = true));

-- tools
drop policy if exists "admin insert tools" on public.tools;
create policy "admin insert tools" on public.tools for insert to public
  with check (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin = true));
drop policy if exists "admin update tools" on public.tools;
create policy "admin update tools" on public.tools for update to public
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin = true));
drop policy if exists "admin delete tools" on public.tools;
create policy "admin delete tools" on public.tools for delete to public
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin = true));

-- user_events (admin_read; inner auth.uid() wrapped)
drop policy if exists "admin_read" on public.user_events;
create policy "admin_read" on public.user_events for select to authenticated
  using (coalesce((select profiles.is_admin from profiles where profiles.id = (select auth.uid())), false));

-- user_saved_tools
drop policy if exists "auth manage saved" on public.user_saved_tools;
create policy "auth manage saved" on public.user_saved_tools for all to public
  using ((select auth.uid()) = user_id);

-- workflow_votes
drop policy if exists "auth workflow_votes" on public.workflow_votes;
create policy "auth workflow_votes" on public.workflow_votes for all to public
  using ((select auth.uid()) = user_id);

-- workflows
drop policy if exists "auth write workflows" on public.workflows;
create policy "auth write workflows" on public.workflows for insert to public
  with check (((select auth.uid()) = user_id) or (user_id is null));

-- =====================================================================
-- PERFORMANCE 8 — Drop the duplicate api_keys index. Keep api_keys_key_key
-- (the UNIQUE constraint's index); drop the redundant plain index.
-- =====================================================================
drop index if exists public.api_keys_key_idx;

-- =====================================================================
-- PERFORMANCE 9 — Covering indexes for unindexed FKs (perf advisor).
-- The 3 FK indexes added in migration 123 (tool_categories.category_id,
-- tool_tags.tag_id, tool_alternatives.alternative_id) are NOT in this set.
-- =====================================================================
create index if not exists idx_answer_votes_user_id           on public.answer_votes(user_id);
create index if not exists idx_answers_user_id                on public.answers(user_id);
create index if not exists idx_api_keys_user_id               on public.api_keys(user_id);
create index if not exists idx_click_logs_user_id             on public.click_logs(user_id);
create index if not exists idx_discussion_replies_discussion_id on public.discussion_replies(discussion_id);
create index if not exists idx_discussion_replies_user_id     on public.discussion_replies(user_id);
create index if not exists idx_discussions_user_id            on public.discussions(user_id);
create index if not exists idx_insights_goals_updated_by      on public.insights_goals(updated_by);
create index if not exists idx_page_views_tool_id             on public.page_views(tool_id);
create index if not exists idx_page_views_user_id             on public.page_views(user_id);
create index if not exists idx_question_votes_user_id         on public.question_votes(user_id);
create index if not exists idx_questions_user_id              on public.questions(user_id);
create index if not exists idx_refresh_logs_tool_id           on public.refresh_logs(tool_id);
create index if not exists idx_reputation_logs_user_id        on public.reputation_logs(user_id);
create index if not exists idx_review_votes_user_id           on public.review_votes(user_id);
create index if not exists idx_search_logs_user_id            on public.search_logs(user_id);
create index if not exists idx_title_overrides_approved_by    on public.title_overrides(approved_by);
create index if not exists idx_tool_candidates_ingested_tool_id on public.tool_candidates(ingested_tool_id);
create index if not exists idx_tool_comparisons_user_id       on public.tool_comparisons(user_id);
create index if not exists idx_tools_submitted_by            on public.tools(submitted_by);
create index if not exists idx_user_saved_tools_tool_id       on public.user_saved_tools(tool_id);
create index if not exists idx_weekly_loop_actions_diff_id    on public.weekly_loop_actions(diff_id);
create index if not exists idx_workflow_votes_user_id         on public.workflow_votes(user_id);
create index if not exists idx_workflows_user_id              on public.workflows(user_id);

commit;
