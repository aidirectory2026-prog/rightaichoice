-- 036_normalize_bad_logos.sql
-- Purges logo_url values that were seeded with marketing-hero screenshots
-- (cdn.futurepedia.io assets) instead of real logos. Render layer falls
-- back to a Google favicon derived from website_url, so NULL here is
-- intentional — the UI still shows a branded icon.
--
-- See Phase6(polish-depth-scale)/plan.md step 37 for context.

update public.tools
set logo_url = null
where logo_url ilike 'https://cdn.futurepedia.io/%';

-- Future-proof: any other known-bad hosts should be appended here with
-- additional update statements and a matching entry in
-- `lib/tool-logo.ts` → BAD_LOGO_HOSTS.
