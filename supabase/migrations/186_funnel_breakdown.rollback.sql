-- Rollback for 186_funnel_breakdown.sql — both functions are NEW in 186.
drop function if exists public.insights_funnel_breakdown(text[], timestamptz, timestamptz, boolean, jsonb, text, integer);
drop function if exists public.insights_funnel_people(text[], integer, boolean, timestamptz, timestamptz, boolean, jsonb, integer);
