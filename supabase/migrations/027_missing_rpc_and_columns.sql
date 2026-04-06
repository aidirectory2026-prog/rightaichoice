-- Fix: Missing RPC functions and columns referenced in code but never created

-- 1. Add missing discussion_count column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS discussion_count integer DEFAULT 0;

-- 2. Create increment_field RPC (used in actions/discussions.ts)
CREATE OR REPLACE FUNCTION increment_field(
  table_name text,
  field_name text,
  row_id uuid
) RETURNS void AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET %I = %I + 1 WHERE id = $1',
    table_name, field_name, field_name
  ) USING row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create increment_counter RPC (used in actions/stacks.ts)
CREATE OR REPLACE FUNCTION increment_counter(
  table_name text,
  column_name text,
  row_id uuid
) RETURNS void AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET %I = %I + 1 WHERE id = $1',
    table_name, column_name, column_name
  ) USING row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Auto-sync discussion_count on profiles
CREATE OR REPLACE FUNCTION sync_profile_discussion_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF tg_op = 'INSERT' THEN
    UPDATE profiles SET discussion_count = discussion_count + 1 WHERE id = new.user_id;
  ELSIF tg_op = 'DELETE' THEN
    UPDATE profiles SET discussion_count = greatest(discussion_count - 1, 0) WHERE id = old.user_id;
  END IF;
  RETURN coalesce(new, old);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_discussions ON discussions;
CREATE TRIGGER trg_sync_profile_discussions
  AFTER INSERT OR DELETE ON discussions
  FOR EACH ROW EXECUTE FUNCTION sync_profile_discussion_count();
