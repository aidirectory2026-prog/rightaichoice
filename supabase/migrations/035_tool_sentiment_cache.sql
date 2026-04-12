-- Phase 6: Personalized Tool Recommendations & Social Sentiment
-- Creates the sentiment cache table for storing scraped + AI-synthesized reports

CREATE TABLE IF NOT EXISTS tool_sentiment_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,

  -- Synthesized report data
  ai_verdict TEXT,
  pros JSONB DEFAULT '[]'::jsonb,
  cons JSONB DEFAULT '[]'::jsonb,
  sentiment_score TEXT,                -- "positive" | "mixed" | "negative"
  sentiment_breakdown JSONB DEFAULT '{}'::jsonb,  -- {"reddit": 0.72, "twitter": 0.65, ...}
  themes JSONB DEFAULT '[]'::jsonb,
  best_for JSONB DEFAULT '[]'::jsonb,
  not_for JSONB DEFAULT '[]'::jsonb,
  pricing_analysis JSONB DEFAULT '{}'::jsonb,
  community_buzz JSONB DEFAULT '{}'::jsonb,
  learning_curve JSONB DEFAULT '{}'::jsonb,
  integration_insights JSONB DEFAULT '[]'::jsonb,

  -- Raw scraped data (for re-synthesis)
  raw_reddit JSONB,
  raw_twitter JSONB,
  raw_quora JSONB,
  raw_g2 JSONB,

  -- Metadata
  mention_count INT DEFAULT 0,
  sources_scraped JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'ready',  -- "generating" | "ready" | "failed"
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  synthesized_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),

  UNIQUE(tool_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sentiment_tool ON tool_sentiment_cache(tool_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_expires ON tool_sentiment_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_sentiment_status ON tool_sentiment_cache(status);

-- RLS: public can read, only service role can write
ALTER TABLE tool_sentiment_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access on tool_sentiment_cache"
  ON tool_sentiment_cache FOR SELECT
  USING (true);

CREATE POLICY "Service role write access on tool_sentiment_cache"
  ON tool_sentiment_cache FOR ALL
  USING (auth.role() = 'service_role');
