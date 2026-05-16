-- Phase 7O.6 (2026-05-16) — referring_domains
--
-- Operator-managed table for tracking incoming backlinks from external
-- domains. Powers /admin/authority dashboard for weekly link-building
-- review. Manual-entry-first (cheap, accurate); future Ahrefs CSV
-- import can backfill in bulk.
--
-- Why: 7B–7N ship pages but don't earn links. 7O is the channel work
-- that converts the ranked-page surface area into actual indexed +
-- authoritative pages. Without measurement (this table), the operator
-- has no signal on which channel (7O.1 founders, 7O.3 HARO, etc) is
-- earning links and which is wasted effort.

CREATE TABLE IF NOT EXISTS referring_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The external domain that links to us (e.g. "techcrunch.com").
  -- Lowercased, no protocol, no trailing slash. UNIQUE by domain so
  -- duplicate entries collapse — track the FIRST link from each domain
  -- (Ahrefs measures RD count, not total backlinks).
  domain text NOT NULL UNIQUE,

  -- When the link was first observed by us. Defaults to now() on
  -- manual entry; can be overridden when backfilling from a CSV.
  first_seen_at timestamptz NOT NULL DEFAULT now(),

  -- Channel attribution — which 7O tactic earned this link.
  -- Constrained to a known set so dashboard groupings are clean.
  source_channel text NOT NULL CHECK (source_channel IN (
    'founder_outreach',     -- 7O.1
    'data_pr',              -- 7O.2 (quarterly report)
    'haro',                 -- 7O.3 (HARO/Qwoted/Featured.com)
    'embed_widget',         -- 7O.4 (tool-of-day, viability badge)
    'reddit_hn',            -- 7O.5
    'organic',              -- found us themselves
    'paid',                 -- sponsored or paid placement
    'other'
  )),

  -- Approximate Domain Authority (Moz) or Domain Rating (Ahrefs).
  -- Nullable for hand-entered rows where the operator skipped it.
  da_estimate int CHECK (da_estimate >= 0 AND da_estimate <= 100),

  -- Anchor text used in the inbound link. Useful for spotting
  -- over-optimized patterns + branded vs unbranded mix.
  anchor_text text,

  -- The URL on rightaichoice.com that the link targets. Lets us
  -- see which surfaces are earning links — informs internal-link
  -- routing + outreach prioritization.
  target_url text,

  -- The actual external URL where the link lives. Operator pastes
  -- this on entry; lets us spot-check the link is still live.
  source_url text,

  -- Free-form operator notes (e.g. "PR pitch sent 2026-05-10").
  notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referring_domains_first_seen
  ON referring_domains (first_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_referring_domains_channel
  ON referring_domains (source_channel);

-- Admin-only access — never expose to anon users (this is intel,
-- not public content).
ALTER TABLE referring_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read referring_domains"
  ON referring_domains FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );

CREATE POLICY "admins write referring_domains"
  ON referring_domains FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );

COMMENT ON TABLE referring_domains IS
  'Phase 7O.6 — operator-managed inbound-link tracker. Powers /admin/authority.';
