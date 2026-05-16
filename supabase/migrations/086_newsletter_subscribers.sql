-- Phase 7K (2026-05-16) — newsletter_subscribers
--
-- Email capture surface, deliberately decoupled from any specific
-- ESP. Resend integration ships when the API key is configured;
-- until then we just collect addresses + unsubscribe state.
--
-- Why: organic-search visitors who don't convert today are still
-- worth a future-conversion attempt via email. The "I read X
-- comparison and got value, now send me one tool a week" loop has
-- 5-10x the LTV of a one-shot visit. Even a 0.5% capture rate at
-- 30k monthly sessions = 150 new subscribers/month, compounding.

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Lowercased, trimmed before insert. Unique so re-subscribes are
  -- idempotent (the form's server action updates source instead of
  -- failing on duplicate).
  email text NOT NULL UNIQUE,

  -- Which placement / page captured the address. Drives "where did
  -- our subscribers come from" analytics + per-source tuning.
  source text NOT NULL CHECK (source IN (
    'home_hero',
    'plan_completion',
    'mobile_sticky',
    'footer',
    'tool_detail',
    'compare_detail',
    'other'
  )),

  -- Confirmation lifecycle. Double opt-in deferred until ESP is wired;
  -- until then `confirmed_at` is set on first capture (single opt-in).
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz,

  -- Optional: which entity surfaced the form (tool_id, compare_slug,
  -- etc). Stored as free-text "type:id" string to avoid migration
  -- churn — we're not joining on it.
  source_entity text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_created_at
  ON newsletter_subscribers (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_source
  ON newsletter_subscribers (source);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_active
  ON newsletter_subscribers (unsubscribed_at)
  WHERE unsubscribed_at IS NULL;

-- Anon users can INSERT (capture form) but NEVER SELECT — emails are
-- PII and the table is admin-read-only.
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon insert newsletter_subscribers"
  ON newsletter_subscribers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "admins read newsletter_subscribers"
  ON newsletter_subscribers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );

CREATE POLICY "admins update newsletter_subscribers"
  ON newsletter_subscribers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );

COMMENT ON TABLE newsletter_subscribers IS
  'Phase 7K — email capture. Anon INSERT-only. Admin SELECT/UPDATE only.';
