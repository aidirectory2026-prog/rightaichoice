-- Step 20: Monetization Infrastructure
-- Run this in Supabase SQL Editor

-- 1. Sponsored placements + affiliate link on tools
ALTER TABLE tools ADD COLUMN IF NOT EXISTS is_sponsored boolean DEFAULT false;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS affiliate_url text;

-- 2. API keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  key         text        NOT NULL UNIQUE,
  key_prefix  text        NOT NULL,        -- first 12 chars shown in UI
  requests_total  integer DEFAULT 0,
  last_used_at    timestamptz,
  is_active   boolean     DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own API keys"
  ON api_keys FOR ALL
  USING (auth.uid() = user_id);

-- Index for fast key lookup on inbound API requests
CREATE UNIQUE INDEX IF NOT EXISTS api_keys_key_idx ON api_keys (key);
