-- ============================================================
-- Beehiiv — single-tool seed (Phase 7 / pre-flight unblock for
-- beehiiv.com/affiliates). Required because the canonical SOP
-- tracker (RAC_Affiliate_Programs_Tracker.xlsx, row 1) has
-- Beehiiv as priority #1 and "MISSING — add first".
--
-- Editorial parity matches Batch 26 / 058_seed_pinecone.sql:
-- ~200-word description, 88-word verdict, populated best_for /
-- not_for, 14 features, 14 integrations, full pricing JSONB.
-- All website_url + pricing tiers verified via WebFetch on
-- beehiiv.com/pricing on 2026-05-03.
--
-- Schema enums (001_initial_schema):
--   pricing_type → 'freemium' (free Launch + paid Scale/Max/Enterprise)
--   skill_level  → 'beginner'
--   platforms    → {'web','api'}
-- Category link → 'marketing-seo'
-- ============================================================

INSERT INTO tools (
  name, slug, tagline, description, website_url,
  pricing_type, pricing_details, skill_level, has_api, platforms,
  features, integrations, is_published,
  best_for, not_for, editorial_verdict,
  tutorial_urls, limitations, models, community_links, use_cases, our_views,
  last_verified_at
) VALUES
('Beehiiv', 'beehiiv', 'Newsletter platform built creator-first — Boosts network for paid recommendations, ad network for sponsorship revenue, and 0% take rate on paid subscriptions.', 'Beehiiv is the newsletter-and-creator-business platform built by ex-Morning Brew operators that launched in 2021 and has spent 2023–2026 systematically pulling creators off Substack, Mailchimp, and ConvertKit by attacking their structural weaknesses. The product covers newsletter sending, websites and landing pages, podcast hosting, paid subscriptions (with 0% platform take rate — competitors take 5–10%), and a built-in monetization stack: the Boost Network pays creators per qualifying subscriber referred, the Ad Network connects creators to advertisers (rev-share), and the Sponsorship Storefront (Max tier) makes the creator''s audience discoverable to brands.

Beehiiv competes with Substack (creator-economy default, but takes 10% of paid subs and has thinner analytics), Kit / ConvertKit (deeper email-automation, weaker website + monetization), Mailchimp (legacy ESP, no creator-network features), and Ghost (open-source, more technical, no Boost / Ad networks). The differentiator is the monetization flywheel: a creator on Beehiiv can earn via paid subs (0% take), ad network revenue, sponsorships, and Boost referrals — without leaving the platform or wiring three vendors together. Used by 25,000+ publishers including Lenny''s Newsletter, Milk Road, and Trends.vc.', 'https://www.beehiiv.com', 'freemium', '[{"plan":"Launch","price":"Free","features":["Up to 2,500 subscribers","Unlimited email sends","Newsletter + website + podcast","Basic analytics","No credit card required"]},{"plan":"Scale","price":"$43/mo (annual)","features":["Up to 100K subscribers","Ad Network access","Boost Network","0% take rate on paid subscriptions","Automations + surveys","3 team seats"]},{"plan":"Max","price":"$96/mo (annual)","features":["Up to 100K subscribers","Sponsorship Storefront","Audio newsletters","White-label removal","Up to 10 publications","Unlimited team seats","Priority support"]},{"plan":"Enterprise","price":"Custom (100K+ subs)","features":["Dedicated account manager","Concierge onboarding","Dedicated IP","Send API","SSO"]}]'::jsonb, 'beginner', true, '{"web","api"}', '{"Newsletter editor with block-based design","Website + landing pages built into every account","Podcast hosting alongside newsletter","0% take rate on paid subscriptions (vs Substack''s 10%)","Boost Network — paid subscriber referrals between newsletters","Ad Network — advertiser-creator marketplace","Sponsorship Storefront for direct brand deals (Max tier)","Audio newsletters (Max tier)","Multi-publication support (up to 10 on Max)","Custom domain + white-label removal (Max tier)","AI writer with daily credit allowance","Polls / surveys / segmentation","API access (Enterprise)","SSO + dedicated IP (Enterprise)"}', '{"Stripe","Zapier","Make","WordPress","Shopify","Beehiiv API","Webflow","Squarespace","Buttondown imports","Mailchimp imports","Substack imports","ConvertKit imports","Google Analytics","Meta Pixel"}', true, '{"Established newsletter creators (5K–500K subs) wanting one platform for growth + monetization","Creators monetizing via paid subscriptions (Beehiiv''s 0% take rate beats Substack''s 10%)","Newsletter operators who want sponsorship revenue without managing it manually","Multi-newsletter publishers (Max tier supports up to 10 publications)"}', '{"Tiny newsletters under 500 subs (Substack''s social distribution wins early)","Creators needing deep email-automation flows (Kit / ActiveCampaign are stronger)","Legacy e-commerce stores running transactional emails (Mailchimp / Klaviyo fit)","Workspaces wanting open-source / self-hostable (Ghost is the right answer)"}', 'The default newsletter platform for serious creators in 2026 — Beehiiv''s 0% take rate on paid subs alone makes it cheaper than Substack at scale, and the Boost Network is the only mainstream subscriber-acquisition channel that doesn''t require running ads. It''s weaker than Kit on email-automation depth, weaker than Mailchimp on legacy e-commerce integrations, and the lifetime free Launch tier caps at 2,500 subs (small for established lists). Pick Beehiiv if growth and monetization matter more than email-automation sophistication; the unit economics make almost every other platform look expensive.', '{"https://www.beehiiv.com/guides","https://docs.beehiiv.com"}', 'Scale and Max tiers both cap at 100K subscribers in the public pricing — the differentiator is monetization features (Sponsorship Storefront, audio, multi-publication), not subscriber headroom. Boost Network match quality varies wildly by niche: business / productivity / finance newsletters see strong cross-promotion fit, while hyper-narrow B2B or regional consumer niches get sparse Boost candidates. Ad Network revenue is meaningful only past ~10K engaged subs; below that, expect cents per send. AI writer credits are generous on Scale+ but still finite; serious copy work needs Claude / GPT direct. Email-automation builder is functional but lacks the conditional-split depth of ActiveCampaign or Customer.io.', '{}', '{"reddit_threads":[],"docs":"https://docs.beehiiv.com"}'::jsonb, '{"Migrate a 25K-subscriber newsletter off Substack and stop paying 10% of paid-sub revenue.","Activate the Boost Network to grow the list 15-25%/year via cross-creator recommendations.","Launch a sponsorship storefront so brands can buy slots without DM negotiations.","Run a multi-publication strategy with 3-5 newsletters on one Max account.","Replace a Substack + Linktree + Mailchimp stack with one platform."}', 'Sweet spot: an established newsletter creator (5K-500K subs) who wants growth, monetization, and operations consolidated under one platform — and who has done the math on Substack''s 10% take rate vs Beehiiv''s 0%. Once paid subscriptions cross $5K/month in gross revenue, Beehiiv pays for itself purely on the take-rate delta.

Failure modes. The Boost Network is a real growth lever in 2026 for adjacent niches and a graveyard for narrow ones — audit cohort quality after 60 days. Ad Network revenue is talked about more than earned at small scale; treat it as upside, not core revenue, until you''re past 25K engaged subs. Free Launch tier looks generous (2,500 subs) but Substack''s social-distribution flywheel still outperforms below ~1K subs — start on Substack if you have no audience yet, migrate to Beehiiv once you do.

What to pilot. Migrate one existing newsletter (Beehiiv offers free import from Substack / Mailchimp / Kit). Run for 60 days. Measure: (a) deliverability (inbox placement using Glock Apps or similar), (b) Boost Network referral count and quality, (c) net revenue after take-rate. If two of three improve, migrate the rest. If deliverability drops, raise it with support before assuming the platform fit is wrong — Beehiiv''s shared-IP pool warmup is real but workable.', now())
ON CONFLICT (slug) DO NOTHING;

-- ── Link to category: Marketing & SEO ───────────────────
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id
FROM tools t
JOIN categories c ON c.slug = 'marketing-seo'
WHERE t.slug = 'beehiiv'
ON CONFLICT DO NOTHING;
