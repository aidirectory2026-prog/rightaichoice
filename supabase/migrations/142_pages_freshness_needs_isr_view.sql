-- Phase 10 #14 — fix the cascade-hubs "needs ISR" query.
--
-- The route used PostgREST `.or('last_revalidated_at.is.null,last_revalidated_at
-- .lt.last_changed_at')`, but PostgREST treats `last_changed_at` as a STRING
-- LITERAL, not a column — so the timestamptz comparison errors (or matches
-- nothing) and the whole run fails. A view does the real column-to-column
-- comparison; the route selects from it instead.

create or replace view public.pages_freshness_needs_isr as
  select page_path, last_changed_at, last_revalidated_at
  from public.pages_freshness
  where last_revalidated_at is null
     or last_revalidated_at < last_changed_at;

-- Rollback: drop view if exists public.pages_freshness_needs_isr;
