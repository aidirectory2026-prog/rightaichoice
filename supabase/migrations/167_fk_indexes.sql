-- 167_fk_indexes.sql — Phase 10 (Cowork QA) P3
-- Two foreign keys had no covering index (advisor: unindexed_foreign_keys),
-- so a delete/update on the parent does a seq scan on the child + joins are slow.
-- Add btree indexes. CONCURRENTLY isn't usable inside a migration txn block, so
-- plain CREATE INDEX (tables are small) — IF NOT EXISTS keeps it idempotent.

create index if not exists idx_ai_citations_created_by
  on public.ai_citations (created_by);

create index if not exists idx_sentiment_searches_tool_id
  on public.sentiment_searches (tool_id);
