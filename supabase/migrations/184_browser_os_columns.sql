-- 184: browser + os columns on user_events (Phase 14b Wave 2).
--
-- Family-level browser/os extracted from the user agent AT INGEST TIME
-- (lib/ua-parse.ts in app/api/track-mirror/route.ts), NOT at query time:
-- PostgREST cannot regex-extract from user_agent, so a SQL-time parse could
-- never be mirrored by applyFilters() and would permanently break the
-- SQL↔TS equivalence proof (scripts/audit/verify-filters.ts).
-- Historical rows are backfilled by scripts/backfill-browser-os.ts using the
-- SAME lib/ua-parse.ts.

alter table public.user_events
  add column if not exists browser text,
  add column if not exists os text;

comment on column public.user_events.browser is
  'Family-level browser from UA (chrome/safari/firefox/edge/opera/samsung), parsed at ingest by lib/ua-parse.ts; null when unparseable';
comment on column public.user_events.os is
  'Family-level OS from UA (ios/android/windows/macos/chromeos/linux), parsed at ingest by lib/ua-parse.ts; null when unparseable';
