-- Phase 8.g.11.e (2026-05-23) — enable Realtime INSERT broadcasts on
-- user_events so /admin/insights can stream live events as they land.
--
-- REPLICA IDENTITY DEFAULT is sufficient (we only stream INSERT, never
-- UPDATE/DELETE) and the table already has `id uuid primary key`.
-- RLS already grants SELECT to `authenticated` — admin users are
-- authenticated, so their anon-key subscription receives events.

alter publication supabase_realtime add table public.user_events;
