-- Rollback for 191_session_stitch_index.sql
drop index if exists public.user_events_session_stitch_idx;
