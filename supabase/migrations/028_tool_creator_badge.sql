-- ============================================================
-- Step 35: Tool Creator Badge
-- Adds 'tool_creator' to badge_type enum and retroactively
-- awards the badge to users who submitted published tools.
-- ============================================================

-- Add new enum value
ALTER TYPE badge_type ADD VALUE IF NOT EXISTS 'tool_creator';

-- Retroactive award: give badge to all users who submitted a published tool
INSERT INTO user_badges (user_id, badge)
SELECT DISTINCT submitted_by, 'tool_creator'::badge_type
FROM tools
WHERE submitted_by IS NOT NULL
  AND is_published = true
ON CONFLICT DO NOTHING;
