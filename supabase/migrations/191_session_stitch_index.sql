-- 191: partial expression index for the identity-stitch CTE (Phase 14b fixes).
--
-- insights_funnel_users / _breakdown / _people (175/186) and the I4 invariant
-- all open with:
--   select (properties->>'session_id') as sid, ... from user_events
--   where (properties->>'session_id') is not null and user_id is not null
--   group by 1
-- — an unbounded scan of user_events with a per-row jsonb extraction (~190ms
-- at today's 50k rows, linear growth, runs 2-3× per funnel page load). This
-- partial index covers exactly that shape.

create index if not exists user_events_session_stitch_idx
  on public.user_events ((properties->>'session_id'), user_id)
  where (properties->>'session_id') is not null and user_id is not null;
