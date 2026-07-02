-- Rollback for 187_retention_paths.sql — both functions are NEW in 187.
drop function if exists public.insights_retention(timestamptz, timestamptz, boolean, jsonb, text, text, text);
drop function if exists public.insights_event_paths(timestamptz, timestamptz, boolean, jsonb, text, text, integer, integer);
