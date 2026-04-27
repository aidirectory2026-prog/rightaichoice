-- Step 42 editorial compare: argil-vs-heygen
-- Personal AI clone (Argil) vs enterprise avatar studio (HeyGen).
-- SERP gap: Argil owns 5 of top 10 with first-party blog posts; no neutral
-- third-party deep dive currently exists. This page fills that gap.

-- ------------------------------------------------------------
-- Argil vs HeyGen — AI clone vs enterprise avatar studio
-- ------------------------------------------------------------
INSERT INTO tool_comparisons
  (tool_ids, slug, tldr, verdict, feature_analysis, pricing_analysis,
   use_cases, benchmarks, faqs, is_editorial, published_at, last_reviewed_at, view_count)
VALUES (
  ARRAY[
    (SELECT id FROM tools WHERE slug = $body0$argil-ai$body0$),
    (SELECT id FROM tools WHERE slug = $body1$heygen$body1$)
  ],
  $body2$argil-vs-heygen$body2$,
  $body3$[
    {"dimension":"Best for","values":{"argil-ai":"Solo creators scaling a personal brand on TikTok / Reels / Shorts","heygen":"Marketing, sales, L&D and localization teams who need 175+ language reach"}},
    {"dimension":"Avatar approach","values":{"argil-ai":"Personal AI clone trained on ~2 minutes of your face and voice","heygen":"700+ stock avatars + Avatar V instant clone from 15 seconds of footage"}},
    {"dimension":"Pricing floor","values":{"argil-ai":"$0 free / $39 Classic","heygen":"$0 free / $24 Creator (annual) · $29 monthly"}},
    {"dimension":"Free tier","values":{"argil-ai":"2 video minutes/mo on stock avatars (no personal clone)","heygen":"3 videos/mo, 3-min cap each, 720p, watermarked"}},
    {"dimension":"Languages","values":{"argil-ai":"~120 languages, 3 with high-fidelity lip-sync (EN/ES/FR/DE)","heygen":"175+ languages with lip-sync video translation"}},
    {"dimension":"Output resolution","values":{"argil-ai":"1080p across paid tiers","heygen":"1080p Creator/Pro · 4K on Business / Enterprise"}},
    {"dimension":"Translation feature","values":{"argil-ai":"Multilingual generation, lip-sync limited to handful of EU languages","heygen":"Video Translator dubs + lip-syncs into 175+ languages, unlimited on paid"}},
    {"dimension":"Best workflow","values":{"argil-ai":"1-shot personal-clone UGC at high cadence","heygen":"Reusable templates, brand kits, team collaboration, API at scale"}},
    {"dimension":"Compliance","values":{"argil-ai":"GDPR, EU-hosted","heygen":"SOC 2 Type II, GDPR, CCPA, DPF, EU AI Act-aligned"}}
  ]$body3$::jsonb,
  $body4$Pick Argil if you are a solo creator or founder who wants to scale your own face and voice on short-form social — its 2-minute personal clone is the fastest way to turn yourself into a content factory. Pick HeyGen if you are a marketing, sales, L&D or localization team that needs 175+ language reach, 4K output, SOC 2 compliance, and team collaboration — its breadth and enterprise plumbing are unmatched. The decision is creator velocity (Argil) versus enterprise scale and language coverage (HeyGen), and most teams pick one — not both.$body4$,
  $body5$Argil and HeyGen are often searched as direct alternatives, but they solve genuinely different problems. Argil is built around a single, personal AI clone that becomes the engine of one creator or founder's content output. HeyGen is built around a stock-avatar library, video translation, and enterprise workflows that let many people inside an organization ship video at scale. Picking the wrong one wastes both time and money — so the question is which side of the creator-vs-enterprise line you sit on.

**What each is optimised for**

[Argil](/tools/argil-ai) optimises for one thing: turning a single human into an always-on short-form video creator. You record about two minutes of consent footage to camera, the system trains a digital twin in roughly ten minutes, and from then on you type a script and Argil renders a 9:16 social video of "you" delivering it. The product is heavily tuned for TikTok, Instagram Reels, and YouTube Shorts: built-in social templates, auto-captions, B-roll insertion, and natural head movements. The lip-sync on the trained clone is the centerpiece, and on a clean training take it lands closer to "real you" than any stock-avatar product.

[HeyGen](/tools/heygen) optimises for breadth. Its catalogue includes 700+ stock avatars (500+ on the free plan), 1,000+ AI voices, text-to-speech in 40+ languages, voice cloning, and the Video Translator — which dubs and lip-syncs an existing English video into 175+ target languages with unlimited usage on every paid tier as of February 2026. The interface is studio-like: a timeline editor, brand kits, templates, team folders, an API, and SSO on enterprise plans. HeyGen also ships Avatar V, an instant clone trained on just 15 seconds of footage, which closes some of Argil's first-mover advantage but is positioned as one feature among many rather than the entire product.

If you are choosing one, this orientation matters more than any spec sheet. **If you are a creator, pick Argil because the whole product is your clone. If you are a team, pick HeyGen because the whole product is a platform.**

**The clone vs stock-avatar decision — quality reality check**

This is the real fork. A personal AI clone — your face, your voice, your mannerisms — is more authentic and converts better on personal-brand channels. A stock avatar is faster, lower-friction, and avoids putting your own likeness into a model.

On Argil, the trained clone holds up well in 30–60-second clips on a phone screen. Critics still note rigid blink patterns, occasional jaw stutter on plosive consonants, and that the model can drift if the training take had inconsistent lighting. You will need to re-record consent footage roughly every 6–12 months as your appearance changes (haircut, glasses, weight) — Argil quietly recommends a refresh on that cadence to keep avatars looking current.

On HeyGen's stock avatars, the rendering is cleaner because the system has thousands of training hours per stock identity, but the avatar is not you — viewers reading "personal brand" content will sense the gap. HeyGen's Avatar V (consumer instant clone) and HeyGen's Studio Avatar (premium custom clone, requires longer footage and a paid Business / Enterprise plan) close that gap, but Studio Avatar setup involves a recording session and review queue measured in days, not minutes.

The honest read: for personal brand on social, Argil's clone is the better artefact most of the time; for studio-grade corporate video where everyone in the company will use the same avatar, HeyGen's premium custom avatars are better. For one-off internal training videos where the avatar identity does not matter, HeyGen's stock library wins on convenience.

**Where Argil wins cleanly**

Creator velocity. From the moment you record consent footage to the moment your first 9:16 clip is ready, Argil is faster than every competitor. The product is engineered around one workflow — script in, social video out — and there is almost nothing else to learn. For a solo founder, indie creator, or coach who wants to ship one short-form video a day, Argil's friction floor is the lowest in the category.

Personal-brand fidelity. Because the entire system is your clone, the lip-sync, voice intonation, and micro-expressions are tuned to one identity rather than abstracted across a generic library. On TikTok and Reels, where viewers detect "this is just an AI" within two seconds, that fidelity is a real conversion lever.

Lower paid floor for active creators. Argil Classic at $39/month with 25 video minutes (about 50 thirty-second clips) and one cloned avatar is well-priced for the daily-content use case. HeyGen Creator at $29/month gives unlimited basic videos but only ~10 minutes of the higher-quality Avatar V output via the Premium Credit pool, so for actual personal-clone work the comparable HeyGen tier is Pro at $99/month.

If you are a creator scaling yourself on social, **pick Argil because the entire product is built around the workflow you actually run**.

**Where HeyGen wins cleanly**

Languages. 175+ supported languages is not just a marketing number — HeyGen has spent two years tuning lip-sync, prosody, and timing across that catalogue. For a SaaS company localizing a 20-minute product walkthrough into Japanese, German, and Brazilian Portuguese in one afternoon, HeyGen is not competing with Argil; Argil cannot do this job at the same fidelity. As of February 2026, audio dubbing on the Video Translator is unlimited on every paid HeyGen plan and no longer consumes Premium Credits, which is a meaningful pricing improvement.

Enterprise compliance. SOC 2 Type II, GDPR, CCPA, the EU-US Data Privacy Framework, and explicit alignment with the EU AI Act covers the checklist enterprise legal will demand. HeyGen also runs an explicit consent workflow: verbal consent plus a spoken password before any custom avatar is trained. Argil is GDPR-aligned but does not publish a SOC 2 report at the time of writing — for procurement at any company over a few hundred employees, that gap usually decides the contract.

Team collaboration and API. Brand kits, multi-seat dashboards, role-based access, an API priced per minute of generated video, and a Zapier integration. None of this is on Argil's roadmap in a serious way; their product is single-creator first.

If you are running a marketing, sales, L&D, or localization function inside an organization, **pick HeyGen because the platform plumbing is what you are paying for, not the avatar**.

**Production-readiness reality check**

Three failure modes matter and the marketing pages downplay both.

*Uncanny valley.* Both products show artefacts on close-up shots. Argil's clone can stutter on hard consonants and lose eye-tracking when the script has long sentences without commas. HeyGen's stock avatars feel "smooth but slightly dead" — the micro-pauses real humans use are missing. Editors mitigate by cutting away to B-roll and captions; you should plan for B-roll cutaways in roughly every 8–12 seconds of avatar-on-camera footage.

*Refresh cadence.* Argil clones drift. The first signal is usually the voice — your model was trained on a week when you happened to be slightly congested, and now your real voice does not match. Plan to re-record training footage every 6–12 months, especially if your appearance changes. HeyGen's stock avatars do not have this problem; HeyGen's custom Studio avatars do, with a similar 6–12 month re-shoot expectation.

*Consent and ethics.* Argil's clone is your own likeness, so the consent question is internal — but if you are building UGC ads with a hired creator's clone, you need a written license that covers training footage, derivative outputs, and a deletion-on-termination clause. HeyGen had public deepfake-misuse incidents in 2024–2025 and tightened consent controls in response: it now requires verbal consent plus a spoken password and bans avatars depicting public figures. For any commercial use, HeyGen's documented consent flow is easier to defend in front of legal.

If you are shipping a regulated industry video (healthcare, finance, edu), **pick HeyGen because the consent and compliance documentation is auditable**.

**Content cadence at scale — the math**

Take a creator shipping one 45-second video per day, six days a week — about 18 minutes of finished video per month.

On Argil Classic ($39/mo, 25 video minutes), this fits with headroom. Effective cost per minute of finished video: ~$1.56, dropping to ~$0.39/min if you maximize the quota. The clone is yours, lip-sync is tight, and the workflow is one product.

On HeyGen Creator ($29/mo annual, "unlimited" videos but ~10 minutes of Avatar IV / V via Premium Credits), 18 minutes a month of personal-clone output exceeds the quota. To match, you need HeyGen Pro at $99/month (2,000 Premium Credits ≈ 100 Avatar minutes). Effective cost per finished minute: ~$5.50 at typical use.

For a creator pushing daily personal-clone short-form, **Argil is roughly 3.5× cheaper per finished minute**. For a marketing team pushing a quarterly launch with five reusable avatars in twelve languages and a 4K hero video, HeyGen Business at $149/mo plus seats is the only platform that does the whole job in one tool — Argil cannot match the language fan-out at quality.

**Compliance and ethics — what enterprise legal will ask**

Five questions enterprise legal will ask, and how each tool answers in April 2026:

- *Where is the data stored and processed?* Argil: EU (France-based company, EU hosting). HeyGen: US-primary with EU hosting on Enterprise. Both publish DPAs.
- *Is there a SOC 2 Type II report?* Argil: not at time of writing. HeyGen: yes, available under NDA.
- *How is consent verified for custom avatars?* Argil: in-app live verification (head turn / nod) plus signed terms before training. HeyGen: verbal consent plus spoken-password verification, ban on depicting third parties without proof.
- *Can the model be deleted on demand?* Both: yes, account-level deletion removes the trained clone.
- *Is there an explicit ban on generating content of real third parties?* Both: yes — but enforcement depends on the consent workflow, and HeyGen's is the more rigorously documented.

For procurement at a company with a security-review process, **HeyGen clears the bar faster**. For a solo creator generating their own face, the bar is whatever you decide it is.

**When to use which / when to use both**

Use Argil if you are one person scaling your own face and voice on social — solo creator, solo founder, solo coach. The entire product is built for you.

Use HeyGen if you are a team — marketing, sales, L&D, localization, agencies — that needs templates, languages, compliance, brand kits, and an API. The breadth is the point.

Use both if you are a small content studio: HeyGen for client work where stock avatars and translation are the requirement, Argil for the founder's own personal-brand channel. The combined cost — $39 + $99 = $138/month — is far less than hiring a video editor for a single ad cycle, and you cover both jobs.

For comparable next reads, see our [/tools/synthesia](/tools/synthesia) page if your decision criteria lean enterprise (Synthesia and HeyGen overlap heavily on the enterprise quadrant), our [/tools/runway](/tools/runway) page if you are also evaluating generative video that does not centre on avatars, the [/blog/best-ai-stack-for-content-creators-2026](/blog/best-ai-stack-for-content-creators-2026) playbook for how Argil fits a wider creator stack, and the [/compare](/compare) hub for adjacent head-to-heads.

If you are still on the fence, the cleanest test is to subscribe to Argil Classic for one month and ship daily clips with your own clone. If retention and watch-time on those clips lifts versus your previous workflow, the personal-clone approach is the right one and you can stay on Argil. If your bottleneck is languages or team workflow, switch to HeyGen Pro and never look back.$body5$,
  $body6$**Argil tiers (April 2026).** Argil keeps its plan structure intentionally narrow.

- *Free* — $0/month. 2 video minutes per month on stock generic avatars only — you do not get a trained personal clone on free. Watermark applied. Useful purely as a sandbox.
- *Classic* — $39/month. One trained avatar (your personal clone), 25 video minutes per month (≈50 clips at 30 seconds), 75 audio minutes via the bundled ElevenLabs voice integration, no watermark, full commercial use, social-mode templates, auto-captions, B-roll insertion, magic AI editing.
- *Pro* — $149/month. Up to 10 custom avatars (e.g., AI Influencer use cases or multiple founders sharing one workspace), 100 video minutes/month, 300 audio minutes, advanced editing, A/B testing on hooks.
- *Enterprise* — custom. Unlimited videos, unlimited avatars, exclusive avatar slots, API access, priority support, dedicated DPA. Pricing typically lands in the low-to-mid four figures per month for serious volume.

**HeyGen tiers (April 2026).**

- *Free* — $0/month. 3 videos per month, each capped at 3 minutes, 720p output, watermarked, no API. Avatar V instant-clone is gated to paid plans for commercial use.
- *Creator* — $29/month monthly, $24/month on annual. Unlimited basic videos at 1080p, no watermark, 200 Premium Credits/month (≈10 minutes of Avatar V output), unlimited Video Translator dubbing/lip-sync, 700+ avatars.
- *Pro* — $99/month monthly, $79/month annual. 2,000 Premium Credits (≈100 minutes of Avatar V), priority rendering, advanced editor, 4K export becomes available on selected projects.
- *Business* — $149/month plus $20/seat (~$119/mo annual base). 4K hero exports, brand kits, team folders, role-based access, advanced analytics, custom Studio Avatars (limited per seat), SSO available as add-on.
- *Enterprise* — custom. Studio avatars at scale, API contracts (priced per minute of generated video), SSO, audit logs, dedicated CSM. Real-world contracts typically run $500–$5,000/month depending on volume, with multi-year discounts.

The legacy Team plan is being deprecated as of January 2026 — existing Team subscribers grandfather in, but new buyers are routed to Business.

**Hidden costs to know.**

- HeyGen's Premium Credit pool is the meter to watch. Avatar V minutes consume credits faster than basic stock-avatar minutes, and overages on Creator and Pro require either upgrading or buying credit top-ups (priced per pack, ~$0.50/credit equivalent).
- Argil charges per additional cloned avatar above the plan limit (typically $20–$30 per added avatar on Pro), which adds up if your studio runs multiple creators.
- HeyGen API minutes are billed separately on Business / Enterprise contracts — assume $0.30–$0.80 per generated minute depending on resolution and avatar tier.
- Both charge for re-training a clone if you exceed the included re-train allowance — Argil includes one free re-train per quarter on Classic and Pro; HeyGen includes two on Pro and Business.

**If you are picking one to pay for.**

For a creator running 15–25 minutes of personal-brand output per month, Argil Classic at $39/mo is the right answer — same workflow you actually want, fraction of HeyGen's equivalent tier.

For a team of 3+ shipping localised content into multiple languages or running cross-functional video projects, HeyGen Pro at $99/mo (or Business at $149+seats) is the right answer — the language fan-out and team workflow alone justify the premium, and HeyGen does jobs Argil cannot do at any price (175+ language lip-sync, 4K, SSO).

If your monthly budget is under $50 and you only ship personal-clone short-form, **pick Argil Classic and never look back**.$body6$,
  $body7$[
    {"persona":"Solo creator scaling personal brand on TikTok / YT Shorts","recommendedSlug":"argil-ai","reasoning":"Argil's personal AI clone is purpose-built for daily 9:16 short-form. The two-minute training, social-mode templates, and auto-B-roll mean the workflow is one product end to end. Cost per finished minute is ~$1.50–$2 at Classic pricing, roughly 3.5× cheaper than HeyGen's Avatar V equivalent."},
    {"persona":"Founder doing weekly investor updates and async product demos","recommendedSlug":"argil-ai","reasoning":"You want your own face, voice, and tone — not a stock avatar. Argil clones better lip-sync on personal identity than HeyGen Avatar V on a 15-second consent take, and the Classic plan covers a weekly cadence with margin to spare."},
    {"persona":"Sales team running personalised prospecting videos","recommendedSlug":"heygen","reasoning":"Templates, brand kits, the API, SSO, and CRM-friendly variable substitution are all on HeyGen. Sales engineering teams typically run on HeyGen Pro or Business; Argil does not have the multi-seat workflow to handle 20 SDRs sharing assets."},
    {"persona":"Corporate L&D building training in 175+ languages","recommendedSlug":"heygen","reasoning":"This is HeyGen's home-court use case. The Video Translator with 175+ language lip-sync, unlimited dubbing on paid plans, and SOC 2 / EU AI Act alignment are exactly what enterprise L&D procurement requires. Argil's ~3 high-fidelity lip-sync languages do not cover this need."},
    {"persona":"Marketing agency producing client videos at scale","recommendedSlug":"heygen","reasoning":"Brand kits per client, team folders, role-based access, and API access on Business / Enterprise let an agency run 5–20 client accounts cleanly inside one workspace. Argil is single-creator first; agency multi-tenant workflow is not its sweet spot."},
    {"persona":"Localization team translating existing English content","recommendedSlug":"heygen","reasoning":"HeyGen Video Translator dubs and lip-syncs source video into 175+ languages with unlimited usage on every paid tier as of Feb 2026. This is a job Argil cannot do at the same fidelity or scale at any price."}
  ]$body7$::jsonb,
  $body8$[
    {"dimension":"Free tier video minutes/mo","values":{"argil-ai":{"score":"2","unit":"minutes (no personal clone)","source":"argil.ai/pricing"},"heygen":{"score":"~9","unit":"minutes (3 videos × 3 min, 720p, watermark)","source":"heygen.com/pricing"}}},
    {"dimension":"Paid floor video minutes/mo","values":{"argil-ai":{"score":"25","unit":"minutes (Classic $39)","source":"argil.ai/pricing"},"heygen":{"score":"~10","unit":"min Avatar V (Creator $29) · unlimited basic","source":"heygen.com/pricing"}}},
    {"dimension":"Languages","values":{"argil-ai":{"score":"~120","unit":"langs (3 high-fidelity lip-sync)","source":"argil.ai docs"},"heygen":{"score":"175+","unit":"langs with lip-sync translation","source":"heygen.com/translate"}}},
    {"dimension":"Avatar consent training time","values":{"argil-ai":{"score":"~2","unit":"min consent + ~10 min train","source":"argil.ai onboarding"},"heygen":{"score":"~15","unit":"sec (Avatar V) · longer for Studio","source":"heygen.com Avatar V docs"}}},
    {"dimension":"Output resolution top tier","values":{"argil-ai":{"score":"1080p","unit":"","source":"argil.ai/pricing (Pro/Enterprise)"},"heygen":{"score":"4K","unit":"","source":"heygen.com/pricing (Business/Enterprise)"}}},
    {"dimension":"Translation lip-sync","values":{"argil-ai":{"score":"Limited","unit":"3–4 EU langs at high fidelity","source":"argil.ai docs"},"heygen":{"score":"Unlimited","unit":"175+ langs, all paid plans (Feb 2026)","source":"heygen.com/translate"}}},
    {"dimension":"Stock avatar count","values":{"argil-ai":{"score":"~20","unit":"generic avatars","source":"argil.ai library"},"heygen":{"score":"700+","unit":"stock avatars (500+ on free)","source":"heygen.com avatar library"}}}
  ]$body8$::jsonb,
  $body9$[
    {"question":"Argil vs HeyGen — which is better in 2026?","answer":"Neither is universally better — they solve different problems. Argil is better if you are a solo creator or founder scaling your own face on short-form social, because the entire product is your personal AI clone. HeyGen is better if you are a team that needs 175+ languages, 4K output, SOC 2 compliance, brand kits, an API, or video translation. The decision is creator velocity (Argil) vs enterprise scale (HeyGen)."},
    {"question":"Is Argil better than HeyGen for creators?","answer":"For solo creators running daily personal-brand short-form, yes. Argil's clone-based workflow is faster, the lip-sync on a properly trained clone holds up better than HeyGen's 15-second Avatar V on personal identity, and the cost per finished minute on Classic at $39/mo is roughly 3.5× cheaper than HeyGen Pro at $99/mo for comparable Avatar V output. For creators who also need multilingual reach, HeyGen pulls back ahead."},
    {"question":"Does HeyGen have a personal AI clone?","answer":"Yes — two of them. Avatar V is the consumer instant clone trained on ~15 seconds of consent footage, available on paid plans. Studio Avatar is the premium custom clone trained from a longer recording session, available on Business and Enterprise. Avatar V's quality on a short take is good but Argil's clone trained on ~2 minutes of footage typically wins on lip-sync fidelity for personal-brand content."},
    {"question":"Can I export videos from each without watermarks?","answer":"Yes on every paid tier. Argil Classic ($39/mo) and above export with no watermark and full commercial-use rights. HeyGen Creator ($29/mo, $24/mo annual) and above export at 1080p with no watermark; 4K is gated to Business and Enterprise. Both free tiers apply a watermark."},
    {"question":"Which has better languages?","answer":"HeyGen, by a wide margin. HeyGen supports 175+ languages with lip-sync video translation, and as of February 2026 audio dubbing is unlimited on every paid plan. Argil supports ~120 languages but only delivers high-fidelity lip-sync on a smaller subset (English, Spanish, French, German). For multilingual content, HeyGen is the only serious choice."},
    {"question":"Argil vs HeyGen for UGC creators?","answer":"Argil. UGC ads work because they feel like a real person, and a trained personal clone reads more authentic than a stock avatar. Argil's social-mode templates, 9:16 format, auto-captions, and B-roll insertion are tuned for short-form UGC. HeyGen can do it, but the workflow assumes more editing surface and the stock avatars trip the 'this is AI' detection that kills UGC conversion."},
    {"question":"Argil vs HeyGen for corporate training?","answer":"HeyGen. Corporate L&D needs SOC 2 Type II, EU AI Act alignment, multi-seat collaboration, role-based access, brand kits, an API, and 175+ language coverage so one training course can serve global teams. HeyGen has all of this; Argil's single-creator focus and lighter compliance posture mean it is rarely the right answer for L&D procurement."},
    {"question":"Argil vs HeyGen for product demos?","answer":"It depends on who is in the demo. If a founder or a solo PM is the on-camera presence and the demo lives on a landing page or social, Argil's personal clone is more believable and faster to ship. If the demo needs to be localised into 8 languages, integrate brand kits across a 30-product portfolio, or push through a marketing approval workflow, HeyGen's templates, translation, and team plumbing win."},
    {"question":"Are there ethical / consent concerns with each?","answer":"Yes — for both. Argil enforces in-app live verification (nod, head turn) and signed terms before any clone is trained. HeyGen requires verbal consent plus a spoken-password verification and explicitly bans avatars depicting third parties without proof of consent (a tightening that followed deepfake-misuse incidents in 2024–2025). For commercial use of a hired creator's clone, write a license covering training footage, derivative outputs, and deletion on termination — both platforms support deletion but neither replaces a real legal agreement."},
    {"question":"Can I switch from HeyGen to Argil — does my workflow break?","answer":"Migration is straightforward but not zero-cost. Scripts, brand assets, and B-roll are portable. What does not transfer: trained avatars (you must re-record consent footage on the new platform), HeyGen brand kits (rebuild in Argil), and any HeyGen API integrations (Argil's API is more limited and Enterprise-only). If your HeyGen usage was mostly stock avatars and translation, Argil will not replace that — keep both. If you were only using HeyGen for a custom clone, Argil's $39/mo Classic typically replaces a $99/mo HeyGen Pro at higher personal-clone fidelity."}
  ]$body9$::jsonb,
  true,
  $body10$2026-04-27T00:00:00Z$body10$,
  $body11$2026-04-27T00:00:00Z$body11$,
  0
) ON CONFLICT (slug) DO NOTHING;
