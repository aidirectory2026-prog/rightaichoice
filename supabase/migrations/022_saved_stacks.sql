-- ============================================================
-- 022: Saved Stacks — users can save & share AI tool stacks
-- ============================================================

CREATE TABLE IF NOT EXISTS saved_stacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  goal text NOT NULL,
  description text,
  stages jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary jsonb,
  source text NOT NULL DEFAULT 'planner', -- 'planner' | 'curated' | 'custom'
  source_slug text, -- slug of curated stack if forked from one
  is_public boolean NOT NULL DEFAULT true,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_stacks_user_id ON saved_stacks(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_stacks_public ON saved_stacks(is_public, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_stacks_source ON saved_stacks(source);

-- RLS
ALTER TABLE saved_stacks ENABLE ROW LEVEL SECURITY;

-- Anyone can view public stacks
CREATE POLICY "Public stacks are viewable by everyone"
  ON saved_stacks FOR SELECT
  USING (is_public = true);

-- Users can view their own stacks (even private ones)
CREATE POLICY "Users can view own stacks"
  ON saved_stacks FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own stacks
CREATE POLICY "Users can save stacks"
  ON saved_stacks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own stacks
CREATE POLICY "Users can update own stacks"
  ON saved_stacks FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own stacks
CREATE POLICY "Users can delete own stacks"
  ON saved_stacks FOR DELETE
  USING (auth.uid() = user_id);
