-- Phase 10 #20 — stop storing API keys in plaintext.
--
-- The api_keys.key column stored the raw key verbatim; a DB/backup leak would
-- expose every live key. We add a SHA-256 key_hash column (unique) and have the
-- app store only the hash + a display prefix, returning the raw key once at
-- creation. The legacy `key` column is kept but made nullable so older deployed
-- code does not error during rollout; it can be dropped in a later cleanup once
-- the new code is fully live. Table currently has 0 rows, so no backfill needed.

alter table public.api_keys add column if not exists key_hash text;
create unique index if not exists api_keys_key_hash_uniq on public.api_keys(key_hash);
alter table public.api_keys alter column key drop not null;

-- Rollback:
--   drop index if exists api_keys_key_hash_uniq;
--   alter table public.api_keys drop column if exists key_hash;
--   (re-adding NOT NULL on key requires backfilling key first)
