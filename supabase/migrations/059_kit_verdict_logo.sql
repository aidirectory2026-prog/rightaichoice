-- ============================================================
-- Kit (formerly ConvertKit) — verdict expansion + logo set
-- (Phase 7 / pre-flight unblock for kit.com/affiliate)
--
-- Pre-flight gates required:
--   • editorial_verdict ≥ 30 words (current = 29; SOP minimum)
--   • logo_url not null (current = NULL; falls back to favicon)
--
-- Slug existence check (per memory feedback_slug_existence_validation):
--   verified `kit` exists in 044_seed_tools_batch21.sql line 49 —
--   slug is real, this is an UPDATE not an INSERT.
--
-- Logo URL canonical source: kit.com/brand. We use the
-- warm-white SVG variant because the RAC tool page renders on
-- a dark zinc-900 background; the soft-black variant is invisible.
--
-- Verdict expansion: 60–100 words covering best-fit, standout
-- features, weaker-than-alts framing (Beehiiv on growth,
-- Mailchimp on e-commerce, HubSpot on B2B), one-line buy line.
-- ============================================================

UPDATE tools
SET
  editorial_verdict = 'The default email platform for serious creators in 2026 — newsletter writers, course creators, and digital-product sellers whose business is the audience itself. Kit''s standout primitives are creator-economy native: tip jars, the Creator Network referrals engine, paid recommendations, and built-in Stripe-powered digital products fold what would otherwise be Mailchimp + Gumroad + Linktree into one bill. It is weaker than Beehiiv on raw growth and discovery tooling, weaker than Mailchimp / Klaviyo on e-commerce automation, and not in the conversation with HubSpot for B2B sales. Pick Kit when your business is your audience.',
  logo_url = 'https://media.kit.com/images/logos/kit-logo-warm-white.svg',
  last_verified_at = now(),
  updated_at = now()
WHERE slug = 'kit';
