-- ============================================================
-- Priority-program editorial remediation (Phase 7 / pre-flight).
-- One UPDATE per slug for the 8 in-catalog priority programs that
-- failed pre-flight gates 1.3 (verdict ≥30w) or 1.5 / 1.6 (features
-- + integrations + best_for / not_for populated).
--
-- Slug existence pre-verified via Supabase MCP on 2026-05-03 — all
-- 8 slugs live in the published catalog.
--
-- Buckets:
--   A. Verdict-only expansion (4 rows): kajabi, teachable, thinkific,
--      riverside-fm — current 21–27w → proposed 84–89w each.
--   B. Stub rewrites (2 rows): customgpt-ai, hubspot — verdict +
--      tagline + description + best_for + not_for + integrations +
--      pricing_details JSONB type-fix (currently stored as
--      JSON-encoded string, violates jsonb array contract).
--   C. Thin rewrites (2 rows): webflow, notion-ai — verdict +
--      description + best_for + not_for; existing pricing/features
--      already pass.
--
-- All UPDATEs bump last_verified_at = now() so the rows pass gate
-- 1.7 after this migration applies.
-- ============================================================

-- ── A1. kajabi (current verdict 23w → 87w) ───────────────────
UPDATE tools SET
  editorial_verdict = 'The premium all-in-one creator platform — pick it once your business has real revenue and tool sprawl hurts more than the subscription does. Kajabi consolidates courses, communities, coaching, email, funnels, and a built-in payments layer into one bill, and the AI Creator Hub now adds outline drafting, dubbing, and 1-video-to-40-assets repurposing. It is materially more expensive than Teachable or Thinkific on courses-only, weaker than Kit on pure email depth, and overkill for pre-PMF creators. Buy it when your bottleneck is operating five vendors, not the cost per month.',
  last_verified_at = now(),
  updated_at = now()
WHERE slug = 'kajabi';

-- ── A2. teachable (current verdict 27w → 87w) ────────────────
UPDATE tools SET
  editorial_verdict = 'A solid creator-first course platform with the strongest international-payment handling in the category — built-in EU VAT, 130+ currencies, no separate Merchant of Record needed. The 2024–2026 AI additions (Curriculum Generator, Lesson scripts, AI quizzes) are real time-savers for first-draft course building, but they don''t replace the editorial work. It''s weaker than Thinkific on native community, weaker than Kajabi on funnel/email depth, and the per-product caps on lower tiers bite faster than they should. Pick Teachable when you sell internationally; pick Thinkific when community matters more than payments.',
  last_verified_at = now(),
  updated_at = now()
WHERE slug = 'teachable';

-- ── A3. thinkific (current verdict 26w → 84w) ────────────────
UPDATE tools SET
  editorial_verdict = 'A strong creator-led course platform with the best native community product in the category — Spaces, events, and discussion threads sit alongside courses without bolting on Circle or Discord. The 2025–2026 AI suite (Outline generator, AI quiz, video transcription with chapters) is competent if uninspired, and Thinkific Plus adds SSO, API access, and a dedicated CSM for mid-market brands. It''s weaker than Teachable on international payments and EU VAT handling, weaker than Kajabi on email/funnels. Pick Thinkific when community matters; pick Teachable when payments do.',
  last_verified_at = now(),
  updated_at = now()
WHERE slug = 'thinkific';

-- ── A4. riverside-fm (current verdict 21w → 89w) ─────────────
UPDATE tools SET
  editorial_verdict = 'Riverside solves the biggest problem in remote podcast and video recording — quality loss from network compression — by capturing each guest locally in 4K/48kHz and syncing to the cloud. Magic Clips, text-based editing, and AI transcription are integrated rather than afterthoughts. It''s weaker than Descript on post-production depth (use both for serious shows), weaker than SquadCast on raw audio fidelity for audio-only podcasters, and the editing UX is more constrained than dedicated tools. Pick Riverside when you record video interviews remotely and want one tool that handles capture through publish.',
  last_verified_at = now(),
  updated_at = now()
WHERE slug = 'riverside-fm';

-- ── B1. customgpt-ai (full rewrite — stub) ───────────────────
UPDATE tools SET
  tagline = 'Custom AI agents that ground answers in your content and refuse to hallucinate when they can''t.',
  description = 'CustomGPT.ai is a no-code platform for building enterprise-grade AI agents grounded in your own content — sites, docs, knowledge bases, support tickets — without writing code or training models. The product''s central pitch is anti-hallucination: it cites sources for every answer and explicitly returns "I don''t know" when the retrieval context can''t support a claim, which is the opposite of how most general-purpose chatbots fail.

The platform handles 1,400+ file formats and ships 100+ first-party integrations including Google Drive, Notion, Confluence, HubSpot, Zendesk, Salesforce, SharePoint, Shopify, and WordPress, plus deployment widgets for every major CMS. Under the hood it routes to OpenAI and Anthropic models, but the moat is the retrieval and citation layer rather than the model choice.

CustomGPT competes with Chatbase (similar AI-chatbot category, broader marketing surface), Sider (browser-side AI assistant with different scope), IBM watsonx Assistant (enterprise-incumbent, heavier deployment), Intercom Fin (support-channel-locked), and Zendesk AI (bundled with Zendesk seats). The differentiator versus that field is the combination of speed-to-deploy (15 minutes), citation accuracy, and SOC-2 / GDPR readiness without requiring a six-figure implementation. Customer roster includes Adobe, Dropbox, MIT, the United Nations, and Medtronic.',
  editorial_verdict = 'The default pick when "AI chatbot grounded in our docs" is the actual problem and you don''t want to roll your own RAG. CustomGPT''s anti-hallucination posture (cite-or-decline) and 1,400+ file format support cover most enterprise knowledge bases without an integration project. It''s weaker than Chatbase on pricing for small sites, overkill for hobbyist projects (Standard starts at $89/mo), and not the right answer if your team wants tight prompt-template control. Buy it when source-citation and SOC-2 matter more than monthly cost.',
  best_for = '{"Mid-market and enterprise teams deploying AI chatbots over proprietary docs","Customer-support orgs needing source-cited answers (compliance / accuracy mandates)","Internal-search use cases where ''I don''t know'' beats a confident guess","Teams without ML engineers who want production-grade RAG without building it"}',
  not_for = '{"Hobbyists and small sites — pricing starts at $89/mo Standard","Buyers wanting deep prompt-template / model-config control (Flowise, Voiceflow fit better)","Workflows where speed matters more than citation accuracy (use a faster general LLM)","Teams already deep in Intercom Fin or Zendesk AI for support specifically"}',
  integrations = '{"Google Drive","Dropbox","OneDrive","SharePoint","HubSpot","Zendesk","Freshdesk","Shopify","Notion","Confluence","GitBook","WordPress","Zapier","Salesforce","Wix","Squarespace"}',
  pricing_details = '[{"plan":"Standard","price":"$89/mo","features":["Anti-hallucination retrieval","100+ integrations","SOC-2 compliance","Citation in every answer","1,400+ file formats supported"]},{"plan":"Premium","price":"$449/mo","features":["Advanced functionality","Higher usage limits","Priority support","Custom model routing"]},{"plan":"Enterprise","price":"Custom","features":["Dedicated support","Custom SLAs","Volume pricing","Single sign-on","Audit logs"]}]'::jsonb,
  last_verified_at = now(),
  updated_at = now()
WHERE slug = 'customgpt-ai';

-- ── B2. hubspot (full rewrite — stub) ────────────────────────
UPDATE tools SET
  tagline = 'Customer Platform unifying Marketing, Sales, Service, Content, and Operations Hubs — Breeze AI threaded throughout.',
  description = 'HubSpot is the dominant SMB-to-mid-market customer platform — a unified CRM with five attached Hubs (Marketing, Sales, Service, Content, Operations) that together cover the full revenue lifecycle. The 2024 rebrand to "Customer Platform" reflected the integration push: contacts, deals, tickets, content, and workflows all share a single object model, so a marketing-source contact rolls into a sales pipeline rolls into a support ticket without separate-system reconciliation. Breeze AI (the rebranded ChatSpot) layers AI assistance across every Hub — content drafting, deal forecasting, lead enrichment, customer-service summarisation — and is included in paid Hub seats rather than charged separately.

HubSpot competes with Salesforce (heavier enterprise CRM), Pipedrive (lighter sales-only CRM), ActiveCampaign (cheaper marketing automation), Zoho One (price-aggressive bundle), and Mailchimp (email-only at the bottom). The differentiation is the single-platform integration depth — most competitors require stitching together two or three vendors to get the same coverage. Pricing scales aggressively: Free tier is genuinely usable, Starter Customer Platform is $20/seat/month, Professional jumps to ~$1,300/month, Enterprise to multiple thousands. Adopted by 200,000+ companies including DoorDash, Reddit, SurveyMonkey, and SoundCloud.',
  editorial_verdict = 'The default Customer Platform for any company between 10 and 1,000 people who wants CRM, marketing, sales, service, and content under one bill. HubSpot''s 2024–2026 unification — and Breeze AI threaded into every Hub — make the cross-hub workflow real, not marketing copy. It''s weaker than Salesforce on enterprise customisation, weaker than ActiveCampaign on pure email automation, and the Professional-tier price jump from Starter is brutal. Pick HubSpot when you want one vendor for the whole revenue lifecycle and you can stomach the $1,300/mo Professional tier when you outgrow Starter.',
  best_for = '{"SMB-to-mid-market teams (10–1,000) wanting one platform for marketing/sales/service","Companies running inbound marketing motions with content + email + lead routing","Sales teams needing a real CRM without Salesforce-level setup cost","Customer success orgs adopting service desks with shared context across Hubs"}',
  not_for = '{"Enterprise teams needing deep customisation (Salesforce wins for complex orgs)","Pure email-marketing-only teams (ActiveCampaign / Klaviyo are cheaper and deeper)","Cost-sensitive small teams scaling past Starter (Professional jump is steep)","Engineering-heavy product-led companies wanting API-first CRMs (Attio fits better)"}',
  integrations = '{"Salesforce","Slack","Gmail","Outlook","Zoom","Microsoft Teams","Stripe","Shopify","WordPress","Zapier","Make","Mailchimp","Calendly","LinkedIn Sales Navigator","Asana","Trello"}',
  pricing_details = '[{"plan":"Free","price":"$0","features":["Free CRM (unlimited users)","Forms, landing pages, email","Live chat","Limited reporting"]},{"plan":"Starter Customer Platform","price":"$20/seat/mo","features":["All five Hubs at Starter tier","1,000 marketing contacts","Removes HubSpot branding","Basic Breeze AI","Stripe payments"]},{"plan":"Professional Customer Platform","price":"$1,300/mo (3 seats included)","features":["Marketing automation","Custom reporting","ABM tools","Enhanced Breeze AI","Sales sequences"]},{"plan":"Enterprise Customer Platform","price":"From $4,300/mo","features":["Custom objects","Predictive lead scoring","Single sign-on","Advanced permissions","Dedicated CSM"]}]'::jsonb,
  last_verified_at = now(),
  updated_at = now()
WHERE slug = 'hubspot';

-- ── C1. webflow (verdict + description + best_for/not_for) ───
UPDATE tools SET
  description = 'Webflow is the visual-first website-building platform that designers use when they want production-quality websites without writing HTML/CSS/JS by hand — but with the full power of those primitives exposed in a designer-friendly canvas. The product covers static sites, CMS-driven content (blogs, portfolios, marketing sites), full e-commerce, custom interactions and animations, multi-language localization, and a logic-builder for low-code automation. The 2024–2026 expansion added Webflow AI (page generation, section design, copy generation), an AEO (AI-driven search visibility) module, and tighter Vercel-style hosting performance.

Webflow competes with Framer (lighter, faster for marketing sites), WordPress + Elementor (cheaper, vastly more plugins, less polish), Squarespace and Wix (template-driven, lower ceiling), and bespoke Next.js builds (more control, far more engineering cost). The differentiator is that the export is real production HTML/CSS — not a proprietary runtime — with a CMS that designers can actually use without filing tickets to engineers. Pricing splits into Site Plans (per-site hosting) and Workspace Plans (per-team-seat), which is genuinely confusing on first contact. Used by 300,000+ designers including teams at Discord, IDEO, and Hellosign.',
  editorial_verdict = 'The default for designers who want production websites without an engineering team — Webflow is the visual canvas with full HTML/CSS/JS power exposed underneath, and Webflow AI now drafts pages, sections, and copy with no per-feature surcharge. It''s weaker than Framer on speed and motion polish, weaker than WordPress on plugin breadth, and the dual Site Plans + Workspace Plans pricing model is genuinely confusing. Pick Webflow for marketing sites and CMS-driven content where designer ownership matters; skip it if you need a real e-commerce engine (Shopify wins).',
  best_for = '{"Designers and marketing teams shipping production websites without engineering","Agencies handing off CMS-driven sites to non-technical clients","SaaS marketing sites needing pixel-perfect design + hosting + a real CMS in one","Brands consolidating off WordPress + Elementor for a cleaner editorial workflow"}',
  not_for = '{"Teams with a real engineering org (Next.js / Astro give more control)","High-volume e-commerce stores (Shopify is the right answer)","Plugin-heavy WordPress workflows (the WP plugin ecosystem is unmatched)","Cost-sensitive personal sites (custom domain still requires a paid Site Plan)"}',
  last_verified_at = now(),
  updated_at = now()
WHERE slug = 'webflow';

-- ── C2. notion-ai (verdict + description + best_for/not_for) ─
UPDATE tools SET
  description = 'Notion AI is the AI layer integrated directly into Notion''s workspace — write, summarize, brainstorm, draft databases, and search across docs and connected apps without context-switching. The 2024 merger collapsed what was a $10/seat add-on into Business and Enterprise plan tiers, so paying Notion users get AI access bundled rather than as a separate line item. Recent product additions reframe Notion as an AI workspace rather than a docs tool: Notion Agent handles multi-step tasks; Custom Agents run scheduled workflows; Notion AI Connectors extend search across Slack, Google Drive, GitHub, and Gmail; AI Meeting Notes auto-transcribe and summarize calls; Research Mode does structured deep-dives.

Notion AI competes with Mem (AI-first notes, less flexible structure), Reflect (single-user smart notes), Coda AI (similar all-in-one workspace, smaller community), Obsidian + plugins (local-first, much more configurable), and standalone Claude / ChatGPT for general writing. Notion''s edge is integration depth — the AI sees every doc, database, and connected-app context the user has access to, which produces materially better answers than asking a context-blind LLM. Pricing transitions to credit-based for Custom Agents starting May 2026 ($10 per 1,000 credits); core AI stays bundled.',
  editorial_verdict = 'Notion AI''s bundled-into-Business pricing makes it the no-brainer AI layer for teams already running on Notion — the cross-doc and connected-app context (Slack, Drive, GitHub) gives it materially better answers than context-blind ChatGPT. It''s weaker than dedicated tools on pure writing depth (Claude or GPT direct still wins for long-form), weaker than Mem on AI-first note capture, and the new credit-based Custom Agents pricing (May 2026 onward) introduces unpredictable cost. Pick Notion AI if your team lives in Notion already; skip it if you''re shopping for a standalone AI assistant.',
  best_for = '{"Teams already standardised on Notion who want AI without a new tool/contract","Knowledge workers needing cross-doc Q&A and database autofill","Meeting-heavy teams who want auto-transcription + summary integrated","Workspaces using AI Connectors to search Slack/Drive/GitHub from one place"}',
  not_for = '{"Teams not using Notion (you''re paying for the wrapper, not the AI)","Heavy long-form writing where Claude or GPT direct gives better quality","AI-first note capture (Mem, Reflect are designed around that)","Cost-sensitive teams worried about the 2026 credit-based Custom Agents pricing"}',
  last_verified_at = now(),
  updated_at = now()
WHERE slug = 'notion-ai';
