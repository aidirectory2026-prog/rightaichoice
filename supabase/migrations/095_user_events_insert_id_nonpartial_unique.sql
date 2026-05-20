-- Phase 8.h fix (2026-05-20) — make user_events.insert_id unique-index usable
-- by Supabase .upsert({ onConflict: 'insert_id' }).
--
-- Bug: migration 094 created a PARTIAL unique index
--   `where insert_id is not null`, which PostgREST's ON CONFLICT cannot use
--   without explicitly naming the partial predicate. Result: every
--   /api/track-mirror call returns 500 ("there is no unique or exclusion
--   constraint matching the ON CONFLICT specification") and `user_events`
--   stays empty.
--
-- Same class of bug we hit on pipeline_runs (see 090a).
--
-- Fix: drop the partial index, recreate WITHOUT the WHERE clause. Multiple
-- NULL insert_ids are still allowed because PG treats NULLs as distinct in
-- unique indexes by default.

drop index if exists public.user_events_insert_id_uniq;

create unique index user_events_insert_id_uniq
  on public.user_events (insert_id);
