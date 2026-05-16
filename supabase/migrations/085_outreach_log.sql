-- Phase 7O.1 (2026-05-16) — outreach_log
--
-- Per-tool outreach CRM. One row per (tool, contact) attempt.
-- Powers the 7O.1 tool-founder backlink loop:
--   1. scripts/outreach/draft-tool-founder-emails.ts pulls tools where
--      sent_at IS NULL, drafts emails via DeepSeek V3, exports CSV.
--   2. Operator pastes CSV into Gmail / Apollo / Instantly to send.
--   3. Operator updates response + link_landed_at as replies/links arrive.
--   4. Backlinks landed feed into referring_domains (migration 084).
--
-- Why: 580+ published tools = 580+ potential reciprocal links from each
-- vendor's "as featured in" / press / partners page. Single highest-ROI
-- backlink play because every email is grounded in a real editorial review.

CREATE TABLE IF NOT EXISTS outreach_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which tool the outreach is about. Drafts pull editorial signal
  -- (tagline, verdict, viability score) from this row.
  tool_id uuid NOT NULL REFERENCES tools(id) ON DELETE CASCADE,

  -- Where we sent it. Nullable while in draft state.
  contact_email text,

  -- Outreach channel — drives draft prompt, response tracking, and
  -- per-channel ROI in the dashboard. Same enum-style as referring_domains
  -- but scoped to outbound tactics (not organic / paid).
  source_channel text NOT NULL DEFAULT 'founder_outreach' CHECK (source_channel IN (
    'founder_outreach',     -- 7O.1 tool-vendor email
    'data_pr',              -- 7O.2 press pitch
    'haro',                 -- 7O.3 HARO/Qwoted reply
    'other'
  )),

  -- Lifecycle timestamps. Each transitions forward; nulls mean "not yet."
  drafted_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  responded_at timestamptz,
  link_landed_at timestamptz,

  -- Operator-classified response. NULL until they tag it.
  response text CHECK (response IN (
    'positive',
    'negative',
    'no_response',
    'bounced',
    'unsubscribe'
  )),

  -- Where the link landed (if any). When this is set, a corresponding
  -- row should also exist in referring_domains (manual entry for now).
  link_url text,

  -- The draft body itself. Stored so we can refine prompts based on
  -- what's working.
  draft_subject text,
  draft_body text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One outreach attempt per (tool, channel) — prevents double-sending.
-- A SECOND attempt should be a new row with channel='other' + a note,
-- not an upsert.
CREATE UNIQUE INDEX IF NOT EXISTS idx_outreach_log_unique_tool_channel
  ON outreach_log (tool_id, source_channel);

CREATE INDEX IF NOT EXISTS idx_outreach_log_sent_at
  ON outreach_log (sent_at NULLS FIRST);

CREATE INDEX IF NOT EXISTS idx_outreach_log_response
  ON outreach_log (response);

ALTER TABLE outreach_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read outreach_log"
  ON outreach_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );

CREATE POLICY "admins write outreach_log"
  ON outreach_log FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );

COMMENT ON TABLE outreach_log IS
  'Phase 7O.1 — per-tool outreach attempts. Powers draft-tool-founder-emails.ts + 7O ROI tracking.';
