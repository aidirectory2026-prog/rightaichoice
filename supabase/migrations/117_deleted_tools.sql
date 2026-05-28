-- Phase 9 Day-4 — Audit trail for hard-deleted tools.
--
-- We hard-delete non-AI tools from the catalog, but keep a small record
-- of every removal so we can:
--   1. Return HTTP 410 Gone for the dead URLs (middleware reads this set)
--   2. Trace why a slug 410s if it surfaces in a future GSC report
--   3. Re-add the tool later if classification was wrong (rationale kept)
--
-- Rows here are stable / append-only. Never truncate.

create table if not exists deleted_tools (
  slug text primary key,
  name text not null,
  reason text not null,
  classification text,
  rationale text,
  categories text[] default '{}',
  deleted_at timestamptz not null default now()
);

comment on table deleted_tools is
  'Hard-deleted tool slugs. Drives 410 Gone responses in middleware and IndexNow deindex pings.';
comment on column deleted_tools.reason is
  'Short human label, e.g. "non_ai_audit", "duplicate", "manual_takedown".';
comment on column deleted_tools.classification is
  'For audit-driven deletes, the classifier verdict (e.g. "non_ai").';
comment on column deleted_tools.rationale is
  'Classifier or curator rationale for the delete decision.';

create index if not exists idx_deleted_tools_reason on deleted_tools (reason);
create index if not exists idx_deleted_tools_deleted_at on deleted_tools (deleted_at);
