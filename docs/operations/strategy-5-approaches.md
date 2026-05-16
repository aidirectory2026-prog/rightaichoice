# Visibility Strategy — 5 Distinct Approaches

The single goal: **get RightAIChoice indexed and cited everywhere AI-tool buyers + assistants look.** Search engines (Google, Bing) AND AI assistants (Copilot, ChatGPT Search, Perplexity). One channel isn't enough — Google rations crawl by authority; Bing rations by trust + freshness; AI assistants ground on whichever index they license. Maximizing visibility needs orthogonal levers, not "more of the same."

This doc enumerates 5 truly distinct strategies, what's automated for each, what's operator-driven, and how to measure each one's contribution. Re-read this every quarter to confirm we're still pulling all 5 levers.

---

## Strategy 1 — Multi-channel push (the "wide funnel")

**Premise:** redundant push paths to crawlers. If one slows, others compensate. Authenticated > anonymous.

**Channels:**
1. Bing direct API submission (authenticated, strongest signal) — daily, smart-rotation, 100 URLs/day cap.
2. IndexNow ping (anonymous, broad — Bing + Yandex + Naver + Seznam) — daily Vercel cron.
3. GSC sitemap re-submission (Google) — weekly, throttled.
4. Passive: `/sitemap-index.xml` discovery via robots.txt — both engines re-crawl on their own cadence.

**Automation:** 95%. `npm run daily` (or the launchd plist) fires Bing + GSC + IndexNow each morning. The Vercel cron `/api/cron/indexnow-recent` also runs independently at 07:00 UTC.

**Operator effort:** ~0 min/day if launchd is installed. Just glance at the morning notification.

**Measurement:**
- Bing Webmaster → indexed-page count, weekly
- GSC → "Indexed" count + "Discovered – not indexed" delta, weekly
- `lifetimeSubmitted` in `scripts/.bing-submit-checkpoint.json`

**Target:** within 60 days, indexed-page count > 1,500 in Bing, > 500 in Google.

---

## Strategy 2 — Authority building (the "slow build")

**Premise:** "Discovered – not indexed" in Google is an authority signal, not a content signal. The fix isn't more content — it's more referring domains. Every new RD raises the per-domain crawl cap.

**Channels:**
1. **Tool-founder outreach** (7O.1) — every tool we cover is a candidate for a reciprocal link from their "as featured in" page. 100 emails/week target, 15-35 RDs per 100 sent.
2. **HARO / Qwoted / Featured.com** (7O.3) — 2-5 placements/month, often DA 70+ (Forbes, Inc, Fast Company).
3. **Data PR** (7O.2 — deferred) — quarterly "State of AI Tools" report → tier-1 publications.
4. **Embed widgets** (7O.4) — passive backlink compounding via `/embed/tool-of-day` + `/embed/viability-badge/[slug]`.

**Automation:** 40%. Email *drafts* are auto-generated via DeepSeek (`npm run outreach:draft -- --limit=100`). Sending is manual. HARO inbox check is operator. Widget embeds are passive once a vendor installs them.

**Operator effort:** ~30 min/day to send 5-10 outreach emails + check HARO. ~2 hours/week.

**Measurement:**
- `/admin/authority` dashboard — RD count over time, by source channel
- `referring_domains` table — append-only, log every link as it's spotted
- Monthly: new RDs / week-over-week growth

**Target:** 50 RDs by day 90, 150 RDs by day 180. Compounds quarterly.

---

## Strategy 3 — Freshness drumbeat (the "Google bait")

**Premise:** Google + Bing weight recency heavily for AI-tools content (a category where everything changes monthly — GPT versions, pricing tiers, integrations). A page updated weekly outranks a static page even at lower DA, *and* gets re-crawled more often.

**Channels:**
1. **Phase 4 SOP refresh** (monthly, manual trigger): `npm run refresh:apply -- --force` re-scrapes vendor sites + re-synthesizes 22 fields per tool. ~$10 DeepSeek spend, 6-8hr wall-clock.
2. **Latest-updates refresh** (weekly Vercel cron `/api/cron/refresh-latest-updates`): scrapes vendor changelogs + blog + Reddit + HN for new items.
3. **View-count increment** (real-time): every page view nudges `view_count` so rankings reflect actual interest.
4. **`article:modified_time` meta** (every page): read from `last_full_refresh_at`, surfaces "Updated X days ago" in SERPs.

**Automation:** 95%. Weekly latest-updates is cron-driven; monthly SOP needs one command.

**Operator effort:** ~5 min/month to trigger the SOP refresh + watch logs.

**Measurement:**
- `SELECT count(*) FROM tools WHERE last_full_refresh_at >= now() - interval '30 days'` — should be ~95%+
- GSC → "Average position" for refreshed pages, week-over-week
- SERP snapshots (manual, monthly) — do our pages show the "Updated X days ago" badge?

**Target:** every tool refreshed at least monthly; every "latest_updates" array refreshed weekly for top 100 tools.

---

## Strategy 4 — AI-assistant grounding (the "front-run search")

**Premise:** Microsoft Copilot, ChatGPT Search, and Perplexity all ground answers in indexed web content. Bing index drives Copilot + ChatGPT Search. Once we're in the Bing index for a query, we become eligible to be *cited* in AI answers — which is fast becoming a larger referral channel than blue links.

**Channels:**
1. **Bing indexation** (covered by Strategy 1, but the *purpose* is different — here we want quality + structured data, not just URL count).
2. **JSON-LD structured data** (`organizationJsonLd`, `comparisonJsonLd`, `articleJsonLd`, `faqPageJsonLd`) — already on every page. AI assistants prefer cite-able sources with clear schema.
3. **Clear factual tables** in editorial comparisons — pricing rows, feature deltas. AI assistants quote tables directly.
4. **`article:modified_time`** — AI assistants weight freshness when picking among multiple cite-eligible sources.

**Automation:** 100% (passive). Once in the Bing index, citations happen automatically when an assistant fields a relevant query.

**Operator effort:** ~5 min/month to spot-check. Ask Copilot "best AI directory" + "best AI tools for marketing" — are we cited? If not, audit the top-ranked sources to see what structure they have that we don't.

**Measurement:**
- Monthly: ask Copilot + ChatGPT + Perplexity 10 buyer-intent queries; count citations
- Mixpanel referrer: track sessions where `document.referrer` matches `bing.com`, `copilot.microsoft.com`, `chat.openai.com`, `perplexity.ai`
- New `referring_domains` from AI-search domains (track as source_channel='organic')

**Target:** by day 90, RAC cited in at least 1 of 10 Copilot answers for "best AI tools for [X]" queries.

---

## Strategy 5 — Distribution leverage (the "internal compounding")

**Premise:** Even with great content + lots of RDs, PageRank (and equivalent in Bing) needs internal linking to spread. A page no other page links to gets crawl-deprioritized regardless of how good it is. This is the most overlooked lever because it's structural, not transactional.

**Channels:**
1. **Topic-cluster hubs** (7L — planned): 12-15 pillar pages at `/best/[slug]` each owning 80-100 tool spokes via two-way links.
2. **Compare-to-tool internal links** (already wired): every `/compare/[A]-vs-[B]` links to both `/tools/[A]` and `/tools/[B]`. Every tool detail links to its 3-5 closest alternatives.
3. **Category landing pages** (already live): `/categories/[slug]` lists every tool in that category — internal links from category to tool detail.
4. **"Related compares" rail** (already wired via `getRelatedComparesForPair`): every compare page surfaces 4-6 related compares.
5. **Footer + nav surfaces** (already live): every page surfaces hub URLs.

**Automation:** 100% (structural — already in code). New tools / compares auto-inherit the link graph.

**Operator effort:** 0. Maintained by the build pipeline.

**Measurement:**
- `internal-links` map check (one-off): every published tool has ≥3 inbound internal links from other pages
- GSC → "Top linking pages" report
- Crawl-depth analysis (one-off, via screaming-frog or similar): no orphan pages

**Target:** zero orphan pages (every published URL reachable from `/` in ≤3 clicks).

---

## The 5-strategy matrix at a glance

| Strategy | Lever | Automation | Operator/wk | Cost/mo | Time-to-effect |
|---|---|---|---|---|---|
| 1. Multi-channel push | Crawl signal | 95% | 0 min | $0 | 48–72h per URL |
| 2. Authority building | RD count | 40% | 2 hr | <$5 | 60-90 days |
| 3. Freshness drumbeat | Re-crawl rate | 95% | 5 min | ~$10 | 7-14 days |
| 4. AI-assistant grounding | Citation surface | 100% (passive) | 5 min/mo | $0 | 30-60 days |
| 5. Distribution leverage | Internal PageRank | 100% | 0 min | $0 | immediate |

If you're picking ONE strategy to invest in this quarter and you're trying to get visibility fast: **Strategy 2 (authority)**. Everything else is supportive of it. Without RDs, Strategy 1 / 3 / 4 all hit a ceiling. Strategy 5 you get for free.

If you're picking ONE strategy to NOT skip: **Strategy 1**. Without it the other four can't surface to indexers in the first place.

---

## What's running automatically right now (2026-05-16)

- ✅ Vercel cron `/api/cron/indexnow-recent` — daily 07:00 UTC
- ✅ Vercel cron `/api/cron/calculate-viability` — Mon 04:00 UTC
- ✅ Vercel cron `/api/cron/refresh-faqs` — Mon 05:00 UTC
- ✅ Vercel cron `/api/cron/refresh-latest-updates` — daily 02:00 UTC (top 50)
- ✅ Vercel cron `/api/cron/refresh-latest-full` — Sun 03:00 UTC (whole catalog)
- ✅ macOS launchd `com.rightaichoice.daily` — weekdays 09:00 local (Bing + GSC + IndexNow + checklist)

## What's manual today (operator weekly cadence)

- Mon 09:00: open `/admin/authority`, log RDs spotted, check GSC indexed-page count
- Mon-Fri: send 5-10 outreach emails, 15-min HARO inbox check, Bing dashboard spot-check
- Last Sunday of month: trigger `npm run refresh:apply -- --force` (Phase 4 SOP refresh)
- Quarterly: review this doc + the 5-strategy matrix
