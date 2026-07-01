-- Rollback of 182 — drop the Explore RPCs.
drop function if exists public.insights_session_breakdown(timestamptz, timestamptz, boolean, jsonb, text, int, int);
drop function if exists public.insights_breakdown_matrix(timestamptz, timestamptz, boolean, jsonb, text, text, int);
