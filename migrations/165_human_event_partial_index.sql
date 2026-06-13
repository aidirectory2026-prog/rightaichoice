-- 165 (Phase 10.7e.3, 2026-06-13) — partial composite index for the
-- dominant admin query pattern: human-only counts of a single event over a
-- created_at window.
--
-- WHY: the admin dashboard defaults to human-only (bot_likely = false) and
-- the bulk of its tiles count ONE event over a date range — page_viewed,
-- the 4 plan-funnel steps, search/chat/tool counts, per-tool detail legs.
-- Before this index the planner used user_events_bot_likely_created_idx
-- (bot_likely, created_at) and removed every non-matching event_name AFTER
-- the index scan. EXPLAIN ANALYZE on the page_viewed/30d count showed 7702
-- "Rows Removed by Filter" for the event_name predicate (9082 scanned to
-- return 1380), 2205 buffer hits, 5.14ms — and that filter-removal cost
-- grows linearly with total human traffic.
--
-- AFTER (this index): Index Only Scan, 0 rows removed, 682 buffers
-- (-69%), 1.92ms (-63%). The partial predicate (bot_likely = false) keeps
-- the index small (no bot rows — ~85% of tool_visit traffic is bots) and
-- write-amplification low: a row is indexed here only when bot_likely=false,
-- and event_name/created_at are set at insert (no later UPDATE churn).
--
-- It composes with the existing indexes rather than duplicating them:
--   • event-pinned human counts  → THIS index (event_name leads, partial)
--   • all-events human grouping   → user_events_bot_likely_created_idx
--   • include-bots / single event → user_events_event_name_created_at_idx
-- The planner picks per query shape (verified by EXPLAIN — see
-- docs/admin/phase7e-gate.md).
--
-- CONSIDERED + REJECTED: an expression index on (properties->>'tool_slug').
-- The per-tool detail query already rides THIS index for the event+window
-- seek (Bitmap Index Scan), leaving only ~306 heap rows to recheck for the
-- slug — not worth a new index's write cost on the hot ingest table.
--
-- APPLIED CONCURRENTLY out-of-band (MCP) so the hot ingest table took no
-- write lock; CREATE INDEX CONCURRENTLY cannot run inside a migration
-- transaction, so this file is the canonical record (IF NOT EXISTS makes a
-- non-concurrent replay a no-op against the live object).

create index concurrently if not exists user_events_human_event_created_idx
  on public.user_events (event_name, created_at desc)
  where bot_likely = false;
