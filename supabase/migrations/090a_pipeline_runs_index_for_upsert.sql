-- Phase 8.d.4 (2026-05-18) — fix the unique index on pipeline_runs to
-- support .upsert(..., { onConflict: 'source,external_id' }) used by
-- the poll-gh-actions cron. Partial unique indexes can't be used as
-- ON CONFLICT targets without specifying the predicate, which Supabase
-- JS client doesn't expose. Postgres default treats NULLs as DISTINCT
-- in unique constraints, so a non-partial index correctly allows many
-- (vercel_cron, null) rows AND blocks duplicate (gh_actions, run_id).

drop index if exists public.pipeline_runs_external_id_uniq;
create unique index pipeline_runs_external_id_uniq
  on public.pipeline_runs (source, external_id);
