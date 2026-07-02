-- Phase 14 (2026-07-02) — tool_submissions: free vendor submission queue.
--
-- Why: vendor-intent signups (ifive.in ×2) bounced because no submit surface
-- exists. This table is the moderated inbox: the public /submit form writes
-- HERE, never to tools. A human approves at /admin/submissions, which creates
-- the tools DRAFT row (is_published=false, submitted_by set); the onboard SOP
-- remains the only publish path. Vendor submissions bypass the traction gate —
-- human approval replaces it. Submission is free and never influences
-- rankings/recommendations (decision-engine integrity constraint).

CREATE TABLE IF NOT EXISTS tool_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Vendor-supplied fields, mirroring tools' NOT-NULL columns so approve can
  -- map 1:1 into a draft row. Bounds re-checked in the server action.
  name           text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  website_url    text NOT NULL CHECK (char_length(website_url) <= 500),
  tagline        text NOT NULL CHECK (char_length(tagline) BETWEEN 10 AND 200),
  description    text NOT NULL CHECK (char_length(description) BETWEEN 50 AND 2000),
  pricing_type   text NOT NULL CHECK (pricing_type IN ('free','freemium','paid','contact')),
  -- Editorial hint only — real categories are assigned by the onboard SOP.
  categories_freetext text CHECK (char_length(categories_freetext) <= 300),
  logo_url       text CHECK (char_length(logo_url) <= 500),
  submitter_role text NOT NULL DEFAULT 'other'
    CHECK (submitter_role IN ('founder','employee','agency','user','other')),

  -- Dedupe snapshot computed at submit time (server action) so the admin queue
  -- can show collision hints without recomputing.
  normalized_domain text NOT NULL,
  proposed_slug     text NOT NULL,
  duplicate_tool_id uuid REFERENCES tools(id),  -- soft hint (name collision), non-blocking

  -- Lifecycle. Submissions are immutable to vendors; only admins transition.
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  rejected_reason text CHECK (rejected_reason IN
    ('not_ai_tool','duplicate','low_quality','site_unreachable','spam','other')),
  rejected_note text CHECK (char_length(rejected_note) <= 1000),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  tool_id uuid REFERENCES tools(id),            -- draft created on approve

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tool_submissions_status
  ON tool_submissions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_submissions_user
  ON tool_submissions (user_id);
CREATE INDEX IF NOT EXISTS idx_tool_submissions_domain
  ON tool_submissions (normalized_domain);

ALTER TABLE tool_submissions ENABLE ROW LEVEL SECURITY;

-- Signed-in, NON-anonymous users may insert their own pending rows only.
-- Guests (anonymous Supabase sessions) are blocked here AND re-checked in the
-- server action (defense in depth) — decision emails need a real address.
CREATE POLICY "authed insert own tool_submissions"
  ON tool_submissions FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );

-- Submitter can read own rows — powers the "your submissions" list on /submit.
CREATE POLICY "read own tool_submissions"
  ON tool_submissions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admin full access (086 convention). Review-queue writes go through the
-- service-role client anyway; this keeps ad-hoc admin SQL working.
CREATE POLICY "admins all tool_submissions"
  ON tool_submissions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );

-- No vendor UPDATE/DELETE policies on purpose — submissions are immutable to
-- their submitters once sent.

COMMENT ON TABLE tool_submissions IS
  'Phase 14 — free vendor tool-submission queue. Authed non-anonymous INSERT own rows; submitter SELECT own; admin ALL. Approve creates tools draft (is_published=false).';
