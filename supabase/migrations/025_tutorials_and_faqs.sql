-- Tutorial videos and editorial views on tools
ALTER TABLE tools ADD COLUMN IF NOT EXISTS tutorial_videos jsonb DEFAULT '[]';
-- Shape: [{"title": "...", "youtube_url": "...", "channel": "...", "video_id": "..."}]

ALTER TABLE tools ADD COLUMN IF NOT EXISTS our_views text;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS our_views_generated_at timestamptz;

-- Tool FAQs
CREATE TABLE tool_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id uuid NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  source text, -- reddit, x, quora, g2, producthunt, ai_generated
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_tool_faqs_tool ON tool_faqs(tool_id);
CREATE INDEX idx_tool_faqs_sort ON tool_faqs(tool_id, sort_order);

ALTER TABLE tool_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access on tool_faqs"
  ON tool_faqs FOR SELECT
  USING (true);

CREATE POLICY "Service role full access on tool_faqs"
  ON tool_faqs FOR ALL
  USING (auth.role() = 'service_role');
