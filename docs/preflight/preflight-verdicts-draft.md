# Pre-flight Verdict Remediation — Draft for Review

**Branch:** `chore/preflight-remediation`  
**Status:** drafted, no SQL has touched the live DB  
**Approve / redline this file**, then I'll generate the corresponding migrations (`061_seed_beehiiv.sql`, `062_seed_convertbox.sql`, `063_remediate_priority_verdicts.sql`).

Verdict word counts are in parentheses next to each. Target: 60–100 words, RAC editorial voice (direct, opinionated, names competitors, no hedging).

---

## Section A — Verdict expansions (4 tools)

These rows have full description + features + integrations + best_for/not_for already; only the verdict needs to grow from ~21–27 words to 60–100.

### A1. kajabi (current 23w → proposed 87w)

> The premium all-in-one creator platform — pick it once your business has real revenue and tool sprawl hurts more than the subscription does. Kajabi consolidates courses, communities, coaching, email, funnels, and a built-in payments layer into one bill, and the AI Creator Hub now adds outline drafting, dubbing, and 1-video-to-40-assets repurposing. It is materially more expensive than Teachable or Thinkific on courses-only, weaker than Kit on pure email depth, and overkill for pre-PMF creators. Buy it when your bottleneck is operating five vendors, not the cost per month.

### A2. teachable (current 27w → proposed 87w)

> A solid creator-first course platform with the strongest international-payment handling in the category — built-in EU VAT, 130+ currencies, no separate Merchant of Record needed. The 2024–2026 AI additions (Curriculum Generator, Lesson scripts, AI quizzes) are real time-savers for first-draft course building, but they don't replace the editorial work. It's weaker than Thinkific on native community, weaker than Kajabi on funnel/email depth, and the per-product caps on lower tiers bite faster than they should. Pick Teachable when you sell internationally; pick Thinkific when community matters more than payments.

### A3. thinkific (current 26w → proposed 84w)

> A strong creator-led course platform with the best native community product in the category — Spaces, events, and discussion threads sit alongside courses without bolting on Circle or Discord. The 2025–2026 AI suite (Outline generator, AI quiz, video transcription with chapters) is competent if uninspired, and Thinkific Plus adds SSO, API access, and a dedicated CSM for mid-market brands. It's weaker than Teachable on international payments and EU VAT handling, weaker than Kajabi on email/funnels. Pick Thinkific when community matters; pick Teachable when payments do.

### A4. riverside-fm (current 21w → proposed 89w)

> Riverside solves the biggest problem in remote podcast and video recording — quality loss from network compression — by capturing each guest locally in 4K/48kHz and syncing to the cloud. Magic Clips, text-based editing, and AI transcription are integrated rather than afterthoughts. It's weaker than Descript on post-production depth (use both for serious shows), weaker than SquadCast on raw audio fidelity for audio-only podcasters, and the editing UX is more constrained than dedicated tools. Pick Riverside when you record video interviews remotely and want one tool that handles capture through publish.

### A5. systeme-io — already passes (92w)

Audit was stale; current verdict is 92 words and on-voice. **No change.** (Logo fix is handled by the script in commit 1.)

---

## Section B — Deeper rewrites (4 tools)

These are stubs or near-stubs. They need verdict + best_for + not_for + (in 2 cases) a description rewrite + a `pricing_details` JSONB-type fix (currently stored as a JSON-encoded string, which violates the column's array contract).

### B1. customgpt-ai

#### New tagline
> Custom AI agents that ground answers in your content and refuse to hallucinate when they can't.

#### New description (~200w)
> CustomGPT.ai is a no-code platform for building enterprise-grade AI agents grounded in your own content — sites, docs, knowledge bases, support tickets — without writing code or training models. The product's central pitch is anti-hallucination: it cites sources for every answer and explicitly returns "I don't know" when the retrieval context can't support a claim, which is the opposite of how most general-purpose chatbots fail.
>
> The platform handles 1,400+ file formats and ships 100+ first-party integrations including Google Drive, Notion, Confluence, HubSpot, Zendesk, Salesforce, SharePoint, Shopify, and WordPress, plus deployment widgets for every major CMS. Under the hood it routes to OpenAI and Anthropic models, but the moat is the retrieval and citation layer rather than the model choice.
>
> CustomGPT competes with Chatbase (similar AI-chatbot category, broader marketing surface), Sider (browser-side AI assistant with different scope), IBM watsonx Assistant (enterprise-incumbent, heavier deployment), Intercom Fin (support-channel-locked), and Zendesk AI (bundled with Zendesk seats). The differentiator versus that field is the combination of speed-to-deploy (15 minutes), citation accuracy, and SOC-2 / GDPR readiness without requiring a six-figure implementation. Customer roster includes Adobe, Dropbox, MIT, the United Nations, and Medtronic.

#### New verdict (81w)
> The default pick when "AI chatbot grounded in our docs" is the actual problem and you don't want to roll your own RAG. CustomGPT's anti-hallucination posture (cite-or-decline) and 1,400+ file format support cover most enterprise knowledge bases without an integration project. It's weaker than Chatbase on pricing for small sites, overkill for hobbyist projects (Standard starts at $89/mo), and not the right answer if your team wants tight prompt-template control. Buy it when source-citation and SOC-2 matter more than monthly cost.

#### best_for
- Mid-market and enterprise teams deploying AI chatbots over proprietary docs
- Customer-support orgs needing source-cited answers (compliance / accuracy mandates)
- Internal-search use cases where "I don't know" beats a confident guess
- Teams without ML engineers who want production-grade RAG without building it

#### not_for
- Hobbyists and small sites — pricing starts at $89/mo Standard
- Buyers wanting deep prompt-template / model-config control (Flowise, Voiceflow fit better)
- Workflows where speed matters more than citation accuracy (use a faster general LLM)
- Teams already deep in Intercom Fin or Zendesk AI for support specifically

#### integrations (currently empty array)
`Google Drive, Dropbox, OneDrive, SharePoint, HubSpot, Zendesk, Freshdesk, Shopify, Notion, Confluence, GitBook, WordPress, Zapier, Salesforce, Wix, Squarespace`

#### pricing_details — fix type from string → JSONB array
```json
[
  {"plan":"Standard","price":"$89/mo","features":["Anti-hallucination retrieval","100+ integrations","SOC-2 compliance","Citation in every answer","1,400+ file formats supported"]},
  {"plan":"Premium","price":"$449/mo","features":["Advanced functionality","Higher usage limits","Priority support","Custom model routing"]},
  {"plan":"Enterprise","price":"Custom","features":["Dedicated support","Custom SLAs","Volume pricing","Single sign-on","Audit logs"]}
]
```

---

### B2. hubspot

#### New tagline
> Customer Platform unifying Marketing, Sales, Service, Content, and Operations Hubs — Breeze AI threaded throughout.

#### New description (~200w)
> HubSpot is the dominant SMB-to-mid-market customer platform — a unified CRM with five attached Hubs (Marketing, Sales, Service, Content, Operations) that together cover the full revenue lifecycle. The 2024 rebrand to "Customer Platform" reflected the integration push: contacts, deals, tickets, content, and workflows all share a single object model, so a marketing-source contact rolls into a sales pipeline rolls into a support ticket without separate-system reconciliation. Breeze AI (the rebranded ChatSpot) layers AI assistance across every Hub — content drafting, deal forecasting, lead enrichment, customer-service summarisation — and is included in paid Hub seats rather than charged separately.
>
> HubSpot competes with Salesforce (heavier enterprise CRM), Pipedrive (lighter sales-only CRM), ActiveCampaign (cheaper marketing automation), Zoho One (price-aggressive bundle), and Mailchimp (email-only at the bottom). The differentiation is the single-platform integration depth — most competitors require stitching together two or three vendors to get the same coverage. Pricing scales aggressively: Free tier is genuinely usable, Starter Customer Platform is $20/seat/month, Professional jumps to ~$1,300/month, Enterprise to multiple thousands. Adopted by 200,000+ companies including Doordash, Reddit, Trello, and SoundCloud.

#### New verdict (88w)
> The default Customer Platform for any company between 10 and 1,000 people who wants CRM, marketing, sales, service, and content under one bill. HubSpot's 2024–2026 unification — and Breeze AI threaded into every Hub — make the cross-hub workflow real, not marketing copy. It's weaker than Salesforce on enterprise customisation, weaker than ActiveCampaign on pure email automation, and the Professional-tier price jump from Starter is brutal. Pick HubSpot when you want one vendor for the whole revenue lifecycle and you can stomach the $1,300/mo Professional tier when you outgrow Starter.

#### best_for
- SMB-to-mid-market teams (10–1,000) wanting one platform for marketing/sales/service
- Companies running inbound marketing motions with content + email + lead routing
- Sales teams needing a real CRM without Salesforce-level setup cost
- Customer success orgs adopting service desks with shared context across Hubs

#### not_for
- Enterprise teams needing deep customisation (Salesforce wins for complex orgs)
- Pure email-marketing-only teams (ActiveCampaign / Klaviyo are cheaper and deeper)
- Cost-sensitive small teams scaling past Starter (Professional jump is steep)
- Engineering-heavy product-led companies wanting API-first CRMs (Attio fits better)

#### integrations (currently empty array)
`Salesforce, Slack, Gmail, Outlook, Zoom, Microsoft Teams, Stripe, Shopify, WordPress, Zapier, Make, Mailchimp, Calendly, LinkedIn Sales Navigator, Asana, Trello`

#### pricing_details — fix type from string → JSONB array
> ⚠️ HubSpot's pricing page is JS-rendered and unreadable to WebFetch. The numbers below are from training-data knowledge of public 2026 pricing — please eyeball-verify before approving.
```json
[
  {"plan":"Free","price":"$0","features":["Free CRM (unlimited users)","Forms, landing pages, email","Live chat","Limited reporting"]},
  {"plan":"Starter Customer Platform","price":"$20/seat/mo","features":["All five Hubs at Starter tier","1,000 marketing contacts","Removes HubSpot branding","Basic Breeze AI","Stripe payments"]},
  {"plan":"Professional Customer Platform","price":"$1,300/mo (3 seats included)","features":["Marketing automation","Custom reporting","ABM tools","Enhanced Breeze AI","Sales sequences"]},
  {"plan":"Enterprise Customer Platform","price":"From $4,300/mo","features":["Custom objects","Predictive lead scoring","Single sign-on","Advanced permissions","Dedicated CSM"]}
]
```

---

### B3. webflow

#### Description rewrite (~200w — current is 193 chars)
> Webflow is the visual-first website-building platform that designers use when they want production-quality websites without writing HTML/CSS/JS by hand — but with the full power of those primitives exposed in a designer-friendly canvas. The product covers static sites, CMS-driven content (blogs, portfolios, marketing sites), full e-commerce, custom interactions and animations, multi-language localization, and a logic-builder for low-code automation. The 2024–2026 expansion added Webflow AI (page generation, section design, copy generation), an AEO (AI-driven search visibility) module, and tighter Vercel-style hosting performance.
>
> Webflow competes with Framer (lighter, faster for marketing sites), WordPress + Elementor (cheaper, vastly more plugins, less polish), Squarespace and Wix (template-driven, lower ceiling), and bespoke Next.js builds (more control, far more engineering cost). The differentiator is that the export is real production HTML/CSS — not a proprietary runtime — with a CMS that designers can actually use without filing tickets to engineers. Pricing splits into Site Plans (per-site hosting) and Workspace Plans (per-team-seat), which is genuinely confusing on first contact. Used by 300,000+ designers including teams at Dell, Discord, IDEO, and Hellosign.

#### New verdict (86w)
> The default for designers who want production websites without an engineering team — Webflow is the visual canvas with full HTML/CSS/JS power exposed underneath, and Webflow AI now drafts pages, sections, and copy with no per-feature surcharge. It's weaker than Framer on speed and motion polish, weaker than WordPress on plugin breadth, and the dual Site Plans + Workspace Plans pricing model is genuinely confusing. Pick Webflow for marketing sites and CMS-driven content where designer ownership matters; skip it if you need a real e-commerce engine (Shopify wins).

#### best_for
- Designers and marketing teams shipping production websites without engineering
- Agencies handing off CMS-driven sites to non-technical clients
- SaaS marketing sites needing pixel-perfect design + hosting + a real CMS in one
- Brands consolidating off WordPress + Elementor for a cleaner editorial workflow

#### not_for
- Teams with a real engineering org (Next.js / Astro give more control)
- High-volume e-commerce stores (Shopify is the right answer)
- Plugin-heavy WordPress workflows (the WP plugin ecosystem is unmatched)
- Cost-sensitive personal sites (custom domain still requires a paid Site Plan)

---

### B4. notion-ai

#### Description rewrite (~200w — current is 255 chars)
> Notion AI is the AI layer integrated directly into Notion's workspace — write, summarize, brainstorm, draft databases, and search across docs and connected apps without context-switching. The 2024 merger collapsed what was a $10/seat add-on into Business and Enterprise plan tiers, so paying Notion users get AI access bundled rather than as a separate line item. Recent product additions reframe Notion as an AI workspace rather than a docs tool: Notion Agent handles multi-step tasks; Custom Agents run scheduled workflows; Notion AI Connectors extend search across Slack, Google Drive, GitHub, and Gmail; AI Meeting Notes auto-transcribe and summarize calls; Research Mode does structured deep-dives.
>
> Notion AI competes with Mem (AI-first notes, less flexible structure), Reflect (single-user smart notes), Coda AI (similar all-in-one workspace, smaller community), Obsidian + plugins (local-first, much more configurable), and standalone Claude / ChatGPT for general writing. Notion's edge is integration depth — the AI sees every doc, database, and connected-app context the user has access to, which produces materially better answers than asking a context-blind LLM. Pricing transitions to credit-based for Custom Agents starting May 2026 ($10 per 1,000 credits); core AI stays bundled.

#### New verdict (89w)
> Notion AI's bundled-into-Business pricing makes it the no-brainer AI layer for teams already running on Notion — the cross-doc and connected-app context (Slack, Drive, GitHub) gives it materially better answers than context-blind ChatGPT. It's weaker than dedicated tools on pure writing depth (Claude or GPT direct still wins for long-form), weaker than Mem on AI-first note capture, and the new credit-based Custom Agents pricing (May 2026 onward) introduces unpredictable cost. Pick Notion AI if your team lives in Notion already; skip it if you're shopping for a standalone AI assistant.

#### best_for
- Teams already standardised on Notion who want AI without a new tool/contract
- Knowledge workers needing cross-doc Q&A and database autofill
- Meeting-heavy teams who want auto-transcription + summary integrated
- Workspaces using AI Connectors to search Slack/Drive/GitHub from one place

#### not_for
- Teams not using Notion (you're paying for the wrapper, not the AI)
- Heavy long-form writing where Claude or GPT direct gives better quality
- AI-first note capture (Mem, Reflect are designed around that)
- Cost-sensitive teams worried about the 2026 credit-based Custom Agents pricing

---

## Section C — New seed migrations (2 tools)

Same shape as `058_seed_pinecone.sql`. Insert with `ON CONFLICT (slug) DO NOTHING`, link to the right category.

### C1. beehiiv (new — file would be `061_seed_beehiiv.sql`)

| Field | Value |
|---|---|
| name | Beehiiv |
| slug | beehiiv |
| website_url | https://www.beehiiv.com |
| pricing_type | freemium |
| skill_level | beginner |
| has_api | true |
| platforms | `{web, api}` |
| category link | marketing-seo |

#### tagline
> Newsletter platform built creator-first — Boosts network for paid recommendations, ad network for sponsorship revenue, and 0% take rate on paid subscriptions.

#### description (~200w)
> Beehiiv is the newsletter-and-creator-business platform built by ex-Morning Brew operators that launched in 2021 and has spent 2023–2026 systematically pulling creators off Substack, Mailchimp, and ConvertKit by attacking their structural weaknesses. The product covers newsletter sending, websites and landing pages, podcast hosting, paid subscriptions (with 0% platform take rate — competitors take 5–10%), and a built-in monetization stack: the Boost Network pays creators per qualifying subscriber referred, the Ad Network connects creators to advertisers (rev-share), and the Sponsorship Storefront (Max tier) makes the creator's audience discoverable to brands.
>
> Beehiiv competes with Substack (creator-economy default, but takes 10% of paid subs and has thinner analytics), Kit / ConvertKit (deeper email-automation, weaker website + monetization), Mailchimp (legacy ESP, no creator-network features), and Ghost (open-source, more technical, no Boost / Ad networks). The differentiator is the monetization flywheel: a creator on Beehiiv can earn via paid subs (0% take), ad network revenue, sponsorships, and Boost referrals — without leaving the platform or wiring three vendors together. Used by 25,000+ publishers including Lenny's Newsletter, Milk Road, and Trends.vc.

#### verdict (88w)
> The default newsletter platform for serious creators in 2026 — Beehiiv's 0% take rate on paid subs alone makes it cheaper than Substack at scale, and the Boost Network is the only mainstream subscriber-acquisition channel that doesn't require running ads. It's weaker than Kit on email-automation depth, weaker than Mailchimp on legacy e-commerce integrations, and the lifetime free Launch tier caps at 2,500 subs (small for established lists). Pick Beehiiv if growth and monetization matter more than email-automation sophistication; the unit economics make almost every other platform look expensive.

#### features (14)
`Newsletter editor with block-based design, Website + landing pages built into every account, Podcast hosting alongside newsletter, 0% take rate on paid subscriptions (vs Substack's 10%), Boost Network — paid subscriber referrals between newsletters, Ad Network — advertiser-creator marketplace, Sponsorship Storefront for direct brand deals (Max tier), Audio newsletters (Max tier), Multi-publication support (up to 10 on Max), Custom domain + white-label removal (Max tier), AI writer with daily credit allowance, Polls / surveys / segmentation, API access (Enterprise), SSO + dedicated IP (Enterprise)`

#### integrations (14)
`Stripe, Zapier, Make, WordPress, Shopify, Beehiiv API, Webflow, Squarespace, Buttondown imports, Mailchimp imports, Substack imports, ConvertKit imports, Google Analytics, Meta Pixel`

#### pricing
```json
[
  {"plan":"Launch","price":"Free","features":["Up to 2,500 subscribers","Unlimited email sends","Newsletter + website + podcast","Basic analytics","No credit card required"]},
  {"plan":"Scale","price":"$43/mo (annual)","features":["Up to 100K subscribers","Ad Network access","Boost Network","0% take rate on paid subscriptions","Automations + surveys","3 team seats"]},
  {"plan":"Max","price":"$96/mo (annual)","features":["Up to 100K subscribers","Sponsorship Storefront","Audio newsletters","White-label removal","Up to 10 publications","Unlimited team seats","Priority support"]},
  {"plan":"Enterprise","price":"Custom (100K+ subs)","features":["Dedicated account manager","Concierge onboarding","Dedicated IP","Send API","SSO"]}
]
```

#### best_for
- Established newsletter creators (5K–500K subs) wanting one platform for growth + monetization
- Creators monetizing via paid subscriptions (Beehiiv's 0% take rate beats Substack's 10%)
- Newsletter operators who want sponsorship revenue without managing it manually
- Multi-newsletter publishers (Max tier supports up to 10 publications)

#### not_for
- Tiny newsletters under 500 subs (Substack's social distribution wins early)
- Creators needing deep email-automation flows (Kit / ActiveCampaign are stronger)
- Legacy e-commerce stores running transactional emails (Mailchimp / Klaviyo fit)
- Workspaces wanting open-source / self-hostable (Ghost is the right answer)

---

### C2. convertbox (new — file would be `062_seed_convertbox.sql`)

| Field | Value |
|---|---|
| name | ConvertBox |
| slug | convertbox |
| website_url | https://convertbox.com |
| pricing_type | paid |
| skill_level | beginner |
| has_api | false |
| platforms | `{web}` |
| category link | marketing-seo |

#### tagline
> On-site engagement and lead-capture platform — smart popups, multi-step funnels, and dynamic personalization tied to your email list.

#### description (~200w)
> ConvertBox is an on-site conversion tool for sites running on email-driven business models — courses, coaching, newsletters, SaaS — that lets you build smart popups, slide-in forms, multi-step quizzes, and full-screen welcome mats without engineering. The visual editor handles design, A/B testing, multi-step branching with skip logic, mobile-specific layouts, dynamic text personalization, and countdown timers. The differentiator vs the popup-tool category is integration depth with email and CRM platforms (ConvertKit, ActiveCampaign, Drip, Mailchimp, Ontraport, Infusionsoft, Klaviyo, AWeber) — captured leads flow directly into the right tag/segment without wiring through Zapier.
>
> ConvertBox competes with OptinMonster (similar popup builder, more aggressive sales motion), Sumo (legacy free tier), Privy (e-commerce-focused), and ConvertFlow (similar feature set, recurring monthly billing). The structural differentiator is the lifetime deal: $495 one-time for 250K views/mo across 10 sites, no recurring billing — a deliberately unusual pricing posture in a SaaS-default category. Beyond price, the multi-step funnel logic is more flexible than OptinMonster's, and the personalization layer (dynamic text based on referrer, UTM, segment tag) is genuinely powerful for warm-audience landing pages. Used by 10,000+ creators and small businesses worldwide.

#### verdict (88w)
> The lifetime-deal popup-and-on-site-form tool that creators actually keep using because the multi-step funnel logic and email/CRM integration depth are real, not marketing copy. ConvertBox's $495 one-time deal is the kind of pricing OptinMonster's $588/year customers stare at jealously. It's weaker than OptinMonster on template breadth, weaker than Privy on pure e-commerce features, and the lifetime deal sometimes goes unavailable for months at a time (check before recommending). Pick ConvertBox when you run an email-list-driven business and want one tool to capture leads across multiple sites without monthly billing.

#### features (10)
`Drag-and-drop visual editor, Multi-step funnels with skip logic and conditional paths, A/B split testing with real-time analytics, Mobile-specific editor and responsive layouts, Dynamic text personalization (referrer / UTM / segment tag), Countdown timers for urgency, Smart targeting (URL, exit intent, scroll, time, device), Multi-site management (up to 10 on lifetime deal), Tag-based segmentation and conditional content, Webhook and email-platform integrations`

#### integrations (15)
`ConvertKit, ActiveCampaign, Drip, Mailchimp, Ontraport, Infusionsoft (Keap), Klaviyo, AWeber, Beehiiv, WordPress, Webflow, Shopify, WebinarJam, Demio, Zapier`

#### pricing
```json
[
  {"plan":"Lifetime Deal","price":"$495 one-time","features":["250,000 views/month","10 websites","Unlimited ConvertBoxes","All features included","No recurring billing"]},
  {"plan":"Pro Lifetime","price":"$945 one-time (upgrade at checkout)","features":["1M views/month","Unlimited sites","White-label option","Priority support"]},
  {"plan":"Standard Monthly","price":"$99/mo or $1,188/yr","features":["Standard usage limits","All core features","Monthly billing"]}
]
```

#### best_for
- Creators and small businesses running email-list-driven monetization
- Multi-site operators who want one popup tool across 10+ properties
- Buyers tired of recurring SaaS billing on conversion tooling
- Marketing teams that want multi-step quiz funnels without ConvertFlow's recurring price

#### not_for
- E-commerce stores (use Privy or Klaviyo flows)
- Teams that need 100+ pre-built templates (OptinMonster wins)
- Buyers who need the lifetime deal active right now (sometimes unavailable for months)
- Workflows requiring SOC-2 / SSO / enterprise security (lifetime tools rarely ship those)

---

## Section D — What this becomes when you approve

Three SQL files would land in commit 2/3:

| File | Contents |
|---|---|
| `061_seed_beehiiv.sql` | Full INSERT for Beehiiv + tool_categories link to `marketing-seo` |
| `062_seed_convertbox.sql` | Full INSERT for ConvertBox + tool_categories link to `marketing-seo` |
| `063_remediate_priority_verdicts.sql` | One UPDATE per row for the 8 remediations: kajabi, teachable, thinkific, riverside-fm verdict-only; customgpt-ai + hubspot full rewrite (verdict + description + tagline + best_for + not_for + integrations + pricing JSONB fix); webflow + notion-ai verdict + description + best_for + not_for. Also bumps `last_verified_at` on each. |

Commit 3 is the integrations + last_verified_at sweep for any rows still failing the audit after commit 2 (right now: customgpt-ai + hubspot integrations are filled in commit 2, so commit 3 may be a no-op).

## Open flags

- **HubSpot pricing numbers** are from training-data knowledge, not a live WebFetch read (pricing page is JS-rendered). Eyeball them before approving.
- **Notion AI Custom Agents pricing** moves to credit-based on 2026-05-04 (one day from now). Verdict + description reflect this; numbers may shift after launch.
- **CustomGPT.ai homepage / FAQ price discrepancy**: homepage shows $89 / $449, FAQ shows $99 / $499. Used $89 / $449 (homepage wins).
- **Beehiiv Scale + Max** both cap at 100K subs in their public pricing — that's not a typo above; the differentiator is the monetization features, not subscriber tiers.

---

**Approve, redline, or request changes.** Once you say go, I generate `061`, `062`, `063` and commit them as commit 2/3 of the chore branch. No SQL hits the live DB until then.
