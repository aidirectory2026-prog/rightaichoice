-- ============================================================
-- ConvertBox — single-tool seed (Phase 7 / pre-flight unblock
-- for convertbox.com/affiliate). Required because the canonical
-- SOP tracker (RAC_Affiliate_Programs_Tracker.xlsx, row 12) has
-- ConvertBox as priority and "MISSING — add first".
--
-- Editorial parity matches Batch 26 / 058_seed_pinecone.sql:
-- ~200-word description, 88-word verdict, populated best_for /
-- not_for, 10 features, 15 integrations, full pricing JSONB
-- (lifetime deal + monthly tier). Verified via WebFetch on
-- convertbox.com on 2026-05-03.
--
-- Schema enums (001_initial_schema):
--   pricing_type → 'paid' (lifetime + monthly; no genuinely free tier)
--   skill_level  → 'beginner'
--   platforms    → {'web'} (no public API)
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
('ConvertBox', 'convertbox', 'On-site engagement and lead-capture platform — smart popups, multi-step funnels, and dynamic personalization tied to your email list.', 'ConvertBox is an on-site conversion tool for sites running on email-driven business models — courses, coaching, newsletters, SaaS — that lets you build smart popups, slide-in forms, multi-step quizzes, and full-screen welcome mats without engineering. The visual editor handles design, A/B testing, multi-step branching with skip logic, mobile-specific layouts, dynamic text personalization, and countdown timers. The differentiator vs the popup-tool category is integration depth with email and CRM platforms (ConvertKit, ActiveCampaign, Drip, Mailchimp, Ontraport, Infusionsoft, Klaviyo, AWeber) — captured leads flow directly into the right tag/segment without wiring through Zapier.

ConvertBox competes with OptinMonster (similar popup builder, more aggressive sales motion), Sumo (legacy free tier), Privy (e-commerce-focused), and ConvertFlow (similar feature set, recurring monthly billing). The structural differentiator is the lifetime deal: $495 one-time for 250K views/mo across 10 sites, no recurring billing — a deliberately unusual pricing posture in a SaaS-default category. Beyond price, the multi-step funnel logic is more flexible than OptinMonster''s, and the personalization layer (dynamic text based on referrer, UTM, segment tag) is genuinely powerful for warm-audience landing pages. Used by 10,000+ creators and small businesses worldwide.', 'https://convertbox.com', 'paid', '[{"plan":"Lifetime Deal","price":"$495 one-time","features":["250,000 views/month","10 websites","Unlimited ConvertBoxes","All features included","No recurring billing"]},{"plan":"Pro Lifetime","price":"$945 one-time (upgrade at checkout)","features":["1M views/month","Unlimited sites","White-label option","Priority support"]},{"plan":"Standard Monthly","price":"$99/mo or $1,188/yr","features":["Standard usage limits","All core features","Monthly billing"]}]'::jsonb, 'beginner', false, '{"web"}', '{"Drag-and-drop visual editor","Multi-step funnels with skip logic and conditional paths","A/B split testing with real-time analytics","Mobile-specific editor and responsive layouts","Dynamic text personalization (referrer / UTM / segment tag)","Countdown timers for urgency","Smart targeting (URL, exit intent, scroll, time, device)","Multi-site management (up to 10 on lifetime deal)","Tag-based segmentation and conditional content","Webhook and email-platform integrations"}', '{"ConvertKit","ActiveCampaign","Drip","Mailchimp","Ontraport","Infusionsoft (Keap)","Klaviyo","AWeber","Beehiiv","WordPress","Webflow","Shopify","WebinarJam","Demio","Zapier"}', true, '{"Creators and small businesses running email-list-driven monetization","Multi-site operators who want one popup tool across 10+ properties","Buyers tired of recurring SaaS billing on conversion tooling","Marketing teams that want multi-step quiz funnels without ConvertFlow''s recurring price"}', '{"E-commerce stores (use Privy or Klaviyo flows)","Teams that need 100+ pre-built templates (OptinMonster wins)","Buyers who need the lifetime deal active right now (sometimes unavailable for months)","Workflows requiring SOC-2 / SSO / enterprise security (lifetime tools rarely ship those)"}', 'The lifetime-deal popup-and-on-site-form tool that creators actually keep using because the multi-step funnel logic and email/CRM integration depth are real, not marketing copy. ConvertBox''s $495 one-time deal is the kind of pricing OptinMonster''s $588/year customers stare at jealously. It''s weaker than OptinMonster on template breadth, weaker than Privy on pure e-commerce features, and the lifetime deal cycles in and out of availability — verify before sending traffic. Pick ConvertBox when you run an email-list-driven business and want one tool to capture leads across multiple sites without monthly billing.', '{"https://convertbox.com/help"}', 'Template library is materially smaller than OptinMonster''s — most users start from a blank canvas, which is fine if you have brand opinions and slow if you don''t. Lifetime deal availability is genuinely unpredictable; the page sometimes redirects to a waitlist for months at a time. No native A/B significance testing — you eyeball the percentages, which is good enough at high volume but noisy at low. Webhook + native integrations cover most ESPs but miss some niche tools (Customer.io, Loops, Resend) that newer creators may use. Reporting is functional but lacks cohort / time-window analysis that ConvertFlow ships natively.', '{}', '{"reddit_threads":[],"facebook_group":"https://www.facebook.com/groups/convertboxusers"}'::jsonb, '{"Build a 4-step quiz funnel that segments subscribers by goal and tags them in ConvertKit.","Run a sitewide exit-intent popup with dynamic text matching the user''s referrer.","Drop in countdown timers on launch landing pages without wiring custom JS.","Manage popups across 10 client sites from one ConvertBox dashboard.","Replace a $49/mo OptinMonster + $29/mo ConvertFlow stack with one $495 one-time payment."}', 'Sweet spot: a creator or small marketing team running email-list-driven monetization (courses, coaching, newsletters, SaaS) who has 2-10 sites and wants one popup-and-form tool with serious email-platform integration depth. The lifetime-deal pricing is the headline, but the multi-step funnel logic and dynamic personalization are what keep users on the platform after the novelty of the price wears off.

Failure modes. Three to flag. First, lifetime-deal availability — ConvertBox sometimes pulls the deal page and waitlists buyers for months. If the deal isn''t live when you need it, the $99/mo monthly is rarely worth the price vs ConvertFlow ($23-49/mo). Second, template scarcity: blank-canvas first-build takes 30-60 minutes, which is fine for designers and rough for non-designers. Third, no native A/B significance testing — you''ll eyeball the win/loss, which is fine at >10K views/mo per variant and noisy below that.

What to pilot. Buy the lifetime deal if it''s live, install on one site, build three ConvertBoxes (welcome popup, exit-intent, multi-step quiz). Wire to your ESP. Run for 30 days and compare conversion rate to whatever you replaced. If conversions match or beat the prior tool and the multi-step quiz captures useful segmentation data, scale to remaining sites. If the template-scarcity friction makes you abandon builds half-finished, OptinMonster''s recurring price probably saves money in the long run.', now())
ON CONFLICT (slug) DO NOTHING;

-- ── Link to category: Marketing & SEO ───────────────────
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id
FROM tools t
JOIN categories c ON c.slug = 'marketing-seo'
WHERE t.slug = 'convertbox'
ON CONFLICT DO NOTHING;
