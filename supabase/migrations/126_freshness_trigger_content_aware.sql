-- Phase 9 Smart SEO (2026-05-30): make the tools freshness cascade content-aware.
--
-- Problem found while verifying the sitemap-lastmod fix: trg_tools_freshness_cascade
-- fired on EVERY tools UPDATE where the slug was unchanged — including routine
-- refresh-cron touches of last_full_refresh_at / last_verified_at / view_count /
-- avg_rating / search_vector. A nightly bulk refresh therefore stamped
-- pages_freshness.last_changed_at = now() for ~all tools, collapsing sitemap
-- <lastmod> back to "everything changed today" (the exact signal we just removed
-- from app/tools/sitemap.ts). 1,888 tool rows were inflated this way.
--
-- Fix: only cascade freshness when a USER-VISIBLE content column actually changes.
-- Routine metadata/refresh bumps no longer move <lastmod>. Reversible.

drop trigger if exists trg_tools_freshness_cascade on public.tools;

create trigger trg_tools_freshness_cascade
after update on public.tools
for each row
when (
  old.slug is not distinct from new.slug
  and (
       old.name is distinct from new.name
    or old.tagline is distinct from new.tagline
    or old.description is distinct from new.description
    or old.pricing_type is distinct from new.pricing_type
    or old.pricing_details is distinct from new.pricing_details
    or old.features is distinct from new.features
    or old.website_url is distinct from new.website_url
    or old.logo_url is distinct from new.logo_url
    or old.latest_updates is distinct from new.latest_updates
    or old.models is distinct from new.models
    or old.tutorial_links is distinct from new.tutorial_links
    or old.community_links is distinct from new.community_links
    or old.is_published is distinct from new.is_published
  )
)
execute function trg_tools_propagate_freshness();
