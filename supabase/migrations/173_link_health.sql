-- Phase 12 Bug-4.6 (2026-06-27) — Resources & Guides link health.
--
-- Some tool pages showed dead "Resources & Guides" links (vendor docs moved,
-- guides deprecated, changelogs 404'd). There was no automated check. This
-- adds a per-tool record of external resource URLs found dead, written by
-- scripts/check-link-health.ts (weekly + on onboarding). The tool page filters
-- these URLs out of Resources & Guides; if none remain, the section is skipped.

alter table public.tools
  add column if not exists dead_links text[] not null default '{}',
  add column if not exists links_checked_at timestamptz;

comment on column public.tools.dead_links is
  'External resource URLs (docs/changelog/github/tutorials/community/website) found dead by scripts/check-link-health.ts (4xx-except-auth/5xx/DNS). The tool page filters these out of Resources & Guides and the sidebar; if none remain the section is skipped. Conservative: 401/403/429/timeouts are NOT marked dead (bot-blocking false positives).';

comment on column public.tools.links_checked_at is
  'Last time scripts/check-link-health.ts probed this tool''s resource links.';
