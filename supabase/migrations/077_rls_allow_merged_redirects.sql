-- 077_rls_allow_merged_redirects.sql
-- Phase 4 follow-up: fix the dedup redirect.
--
-- The existing "public read tools" RLS policy filters to
-- (is_published = true). After migration 076 unpublished 67 duplicate
-- rows with merged_into set, the tool detail page can no longer SEE
-- those rows from the anon-key client to read their merged_into and
-- 308-redirect — so /tools/bardeen-ai (and 66 other deduplicated
-- slugs) was hitting notFound() instead of redirecting.
--
-- Fix: extend the policy to also allow rows where merged_into is set.
-- These rows expose only old superseded catalog data that was already
-- public before dedup; merged_into itself is the redirect target which
-- is also public via the 308 anyway. No new sensitive surface.
--
-- Regular drafts (is_published=false AND merged_into IS NULL) remain
-- hidden as before.

DROP POLICY IF EXISTS "public read tools" ON tools;

CREATE POLICY "public read tools" ON tools
  FOR SELECT
  USING (is_published = true OR merged_into IS NOT NULL);
