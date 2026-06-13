# Phase 10 (Fable 5 Review) — Build Log

Every unit of work done under [`Plan_phase-10-fable-5-review.md`](./Plan_phase-10-fable-5-review.md) is logged here: what was done, files touched, how it was verified, and a plain-language note. Newest entries at the bottom of each department.

**SOP per entry:** Step → Files/queries → Verification evidence → Plain-language note → Status (done / blocked / needs-founder).

---

## 2026-06-10 — Review & planning

- **Full-stack review completed** (codebase exploration ×3 + live Supabase queries). Key verified findings recorded in the plan's "Live Evidence" table: plan CTA 0.37% CTR, tool-visit metric ~96% bot-inflated, compare-table links bypass tracking, cascade-hubs never ran (0/2,839 pages revalidated), tool refresh itself healthy, newsletter signups zero.
- **Plan written and approved by founder.** Strategy locked: affiliate-first 60% + /plan funnel improvement 40%. Execution order: Dept 0 → A → B ∥ C → D.

## Department 0 — Verification Gate

### 2026-06-10 — Verification complete ✅

**0.1 cascade-hubs liveness — ALIVE (first successful runs in its history).**
- The fix merged at 15:30 IST (10:00 UTC) — too late for the 10:00 UTC hourly tick. At the **11:00 UTC tick it fired and succeeded** (2 success rows in `pipeline_runs`, ~5s each).
- First hour drained **944 of 2,845 pages** (revalidated + IndexNow-pinged); 1,901 pending → full backlog clears by ~15:00 UTC today at 500/run.
- Live endpoint probe: GET without auth → **401** (previously 405) — route deployed correctly, auth gate intact.
- _Plain language: the machine that tells Google "this page changed, come look again" ran successfully for the first time ever today, and is working through the 2,845-page backlog. Done by this afternoon._
- **Follow-up noted:** two invocations fired at 11:00 (11:00:01 and 11:00:42) — harmless (both succeeded, work is idempotent) but watch whether double-firing persists.

**0.2 Phase 10 SEO claims spot-checked on production — PASS.**
- Sitemap `lastmod` (best/stacks/for): dates now vary realistically per page (Jun 6–10 spread), no more identical build-timestamps. ✅
- Soft-404s: bogus `/compare/...` → **404**, bogus `/best/...` → **404**, real pages → 200. ✅
- `/best/writing` live with valid FAQPage schema; `/tools/chatgpt` emits no invalid aggregateRating (none present = safe behavior). ✅

**0.3 Alert triage — all three explained.**
- `freshness-sla` "935 tools >3d" — **real but expected**: post-deploy catch-up backlog; new twice-daily batch refreshes ~1,000 tools/day → should self-clear in ~2 days. Action: monitor trend through 2026-06-12; escalate only if count isn't falling.
- `poll-gh-actions-heartbeat` failures — **stale noise**: all fired before this morning's OPT-2 deploy; the job now runs every 10 min on Vercel (73 recent successes). Should stop on its own.
- `submit-urls-bing` — **quota misclassification, not an outage**: Bing API rejects with "exceeded daily quota: 100". Something consumes the quota before the 09:00 cron. → Dept C: classify quota errors as `partial` + find the quota consumer.

**Status: done.** No code changes required in Dept 0.

## Department A — Tracking Integrity

### 2026-06-10 — Code complete on branch `fable5-review` (worktree `../rac-fable5`), awaiting PR merge

**A1. Visit-endpoint bot gate** — `app/api/tools/[slug]/visit/route.ts`
- A redirect now counts as a human click only with same-origin evidence: `Sec-Fetch-Site: same-origin/same-site`, OR a same-host Referer, OR the `?d=` param the client button appends. Bots are still redirected, never counted.
- _Plain language: robots that fetched our outbound links directly were counted as people. Now a click only counts when it demonstrably came from a real page on our own site._

**A2. Historical backfill — DONE (live DB).**
- Reclassified **2,073** `tool_visit_redirected` rows (all-time, May 25 → Jun 10) matching the crawler pattern (`referrer='/'` + `anon-<ip>` id) as `bot_likely=true`. Verified: **92 genuine human visit events remain all-time** — that's the true baseline the dashboard will now show.

**A3. NEW BUG found & fixed: `click_logs` insert never worked.**
- The table had **exactly 1 row ever** while redirects flowed for weeks: the route inserted with the user-context client, RLS rejected anon inserts, and the fire-and-forget `void` swallowed every error. Now inserts via the admin client and warns on failure.
- _Plain language: a second click counter existed but had been broken since day one — silently. Fixed._

**A4. Plan-intent fallback id** — `lib/analytics.ts` + `lib/cta/persist-intent.ts`
- New `getDistinctIdWithFallback()`: localStorage-backed `fb-` UUID when Mixpanel is blocked (ad-blockers) or not yet loaded. Typed goals are never silently dropped; the same id is used for post-auth linking.

**A5. Honest dashboard numbers** — `app/api/cron/snapshot-daily-updates/route.ts`
- Bing submissions: real count from `pipeline_runs.items_succeeded` (was hardcoded 100 whenever the cron ran). IndexNow pings: real count from `pages_freshness.last_indexnow_at` stamps (was hardcoded 0).

**A6. Surface-breakdown parity row** — `lib/admin/plan-conversion.ts`
- Appended an unfiltered "ALL (parity check)" row to /admin/plan-conversion. If per-surface rows don't sum to it, a silent JSONB-filter failure is visible instead of masquerading as "zero conversions". (Live SQL ground-truth check today showed the per-surface data is real: sticky_bar 1,159 impr/4 clicks, homepage 102/1, inline_card 82/0 over 30d — the dashboard was honest; the conversions genuinely weren't happening. That's Dept B's job.)

**Verification:** `tsc --noEmit` + `eslint` clean. Post-merge checks: human visits collapse to ~5/day baseline; `click_logs` rows start appearing; uBlock browser still records plan intent.

**MERGED 2026-06-10** — PR #11 (`ced60c4`), squash-merged by founder via GitHub web. Vercel auto-deploy in progress; post-deploy verification (human-baseline visits, click_logs rows appearing) tracked under Dept C's observation week.

**Status: done.**

## Department B — Conversion / CTA Architecture

### 2026-06-10 — Code complete on branch `fable5-review` (commit `7a1d954`), awaiting PR merge

Strategy applied: **affiliate-first 60% + /plan funnel improvement 40%** (locked with founder).

**B1. Compare-table Visit links now tracked** — `components/compare/comparison-table.tsx`
- Was a raw `website_url` anchor: the #2 traffic surface (420 views/14d) produced zero click logs. Now routes through `/api/tools/[slug]/visit` with `source='compare_table'`.
- `VisitWebsiteButton` gained `className`/`label`/`icon` props for reuse, and its `?d=` param now uses the fallback-aware distinct id (clicks count even with Mixpanel blocked).

**B2. "Try {tool}" CTAs at the comparison verdict** — `app/compare/[slug]/page.tsx`
- The editorial verdict is the highest-intent moment on the site; readers previously had to scroll back up to act. Tracked buttons for each compared tool, `source='compare_verdict'`.

**B3. Auto-UTM on outbound** — `app/api/tools/[slug]/visit/route.ts`
- Plain `website_url` destinations get `utm_source=rightaichoice&utm_medium=referral&utm_campaign=<surface>`. Affiliate URLs untouched (program-controlled). Existing utm_source on a destination wins.
- _Plain language: every tool vendor will now see "rightaichoice" in their analytics — that's the door-opener for affiliate negotiations._

**B4. Plan-CTA copy pass** — `components/cta/plan-cta-inline.tsx`
- Old (0.37% CTR baseline): "Skip the guesswork" / "Plan my stack". New: "Get your full AI stack in 60 seconds" + "Free, no signup" + button "Get my free stack". Measured per surface on /admin/plan-conversion.

**B5. Newsletter capture where the traffic is**
- `/blog/[slug]`: card at the article footer (`source='blog_post'`, new source registered in form + API).
- `/compare/[slug]`: "Still deciding?" card near the page bottom (`source='compare_detail'`).
- Deviation from plan: skipped the scroll-triggered popup on tool pages for now — tool pages already carry 4 CTAs (Visit/Save/Compare/Plan) and a popup risks hurting the funnel that already works; revisit after measuring blog/compare capture.

**B6. "Affiliate gaps" card** — `app/admin/analytics/page.tsx`
- Tools real humans clicked out to that have no `affiliate_url`, highest-clicked first — the founder's affiliate-enrollment to-do list, range-windowed.

**Verification:** `tsc --noEmit`, `eslint`, and full `next build` clean. Post-merge checks: `tool_visit_redirected` events with `/compare/` referrers; UTM visible in redirect Location; newsletter subs > 0; plan CTA CTR trend vs 0.37%.
- Also fixed in passing: pre-existing `t: any` lint error in the compare page's "Explore each tool" block.

**MERGED 2026-06-11** — PR #13 (`8789644`), squash-merged by founder (bundled with Dept C). **Status: done**; live verification of compare-click events + UTM tracked under the Dept C observation week.

## Department C — Pipelines / Reliability

### 2026-06-11 — Failure-alert triage + fixes (commit `a30d82e` on `fable5-review`, awaiting PR merge)

Founder reported failure emails. Root-caused every alert from the last 36h of `pipeline_runs`:

| Alert | Verdict | Action |
|---|---|---|
| `onboard-tools` timeout ×8 (the :17/:47 SOP runs) | **Real** — 5 heavy SOP drafts per run regularly blew the 300s limit; Vercel killed the process mid-tool, sweeper marked it timeout | **Fixed**: 240s time-budget guard in `runOnboardSop` (`lib/cron/onboard.ts`) — completed drafts commit, the rest defer 30 min |
| `cascade-hubs` timeout ×1 (18:00 UTC) | **Real** — full 500-page pass can exceed the route's 60s `maxDuration` | **Fixed**: `maxDuration` 60 → 300 |
| `submit-urls-bing` failure daily 09:00 | **Real but expected condition** — Bing's "quota exceeded" 400 treated as an incident | **Fixed**: detect quota-exceeded, advance cursor past accepted URLs, record `partial` — no more morning emails |
| `scrape-sentiment` timeout (Sun) | **Real** — up to 100 tools × scrape+LLM in one 300s run | **Fixed**: 240s time-budget + schedule weekly → **daily** 04:00 (7-day cache keeps total work identical; deferred tools catch up within days) |
| `freshness-sla` breaches | Self-cleared as predicted — none since Jun 10 10:00 UTC; refresh backlog draining (482 tools >3d, down from 935) | Monitor only |
| `poll-gh-actions-heartbeat` | Stale noise from before the OPT-2 deploy — none since Jun 10 09:07 | None |

Also verified: cascade-hubs has IndexNow-pinged **2,899 pages total**, backlog down to 905 and draining hourly. Branch rebased onto main to incorporate the parallel session's PR #12 (attribution fixes) — no conflicts, tsc clean.

_Plain language: of the six alarm types in your inbox, two had already stopped on their own (catch-up noise from Tuesday's deploy), and four were real — all four are now fixed at the cause: jobs that bit off more than their time limit now stop early and hand the rest to the next run, and Bing's daily quota running out is logged as "did what we could today" instead of a failure._

**MERGED 2026-06-11** — PR #13 (`8789644`), squash-merged by founder (bundled with Dept B). `docs/automated-workflows/README.md` updated to reflect the new schedules/budgets (scrape-sentiment daily, cascade-hubs 300s, onboard SOP time-budget, Bing quota→partial). **Remaining: observation week** — confirm alert emails drop to ~zero by 2026-06-13 and compare-surface click events appear post-deploy.

## Department D — SEO / Growth

### 2026-06-11 — Diagnosis + first fixes (commit `2d554e3` on `fable5-review`, awaiting PR merge)

**D1. GSC diagnosis of the 64 niche /best pages — COMPLETE. Verdict: indexed but invisible.**
- Indexing is NOT the problem: 50/51 inspected /best URLs are "Submitted and indexed" (`gsc_url_inspections`).
- Ranking IS the problem: latest snapshot (Jun 8) shows **51/64 pages with zero impressions**; the 13 that appear average **position 69**; zero clicks across all 64.
- Root cause: thin internal authority — their only inbound internal link was the footer `/best` hub.
- _Plain language: Google knows the pages exist but parks them on page 7 because nothing on our own site points at them. The fix is links from our strong pages, not rewriting the content._

**D2. Internal links INTO /best — SHIPPED.**
- New `lib/seo/best-page-links.ts`: matches best-pages to a context by category intersection first, then niche-keyword-in-text. Pure static-config lookup, no DB cost.
- Tool pages (~2,000 indexed): "Best-of guides" chips in the right rail → thousands of new internal edges into /best.
- Category pages: best-of guide chips above the tool listing.

**D3. OG images — SHIPPED (site-wide gap, not just /best).**
- Discovery: the site declared `summary_large_image` cards but had **no OG image anywhere** — every social/chat share rendered as a bare text link.
- Added `app/opengraph-image.tsx` (site-wide default, inherited by all routes) + `app/best/[slug]/opengraph-image.tsx` (per-guide title card), both via `next/og` ImageResponse.

**D4. Position 31–50 cohort — NAMED (content upgrades = next phase).**
- Latest GSC snapshot, top of cohort by impressions: `langchain` (pos 47.8, 273 impr), `amazon-translate` (48.2, 187), `google-earth-studio` (39.1, 117), `appgyver` (43.5, 56), `dynamic-yield` (41.9, 55), `amper-music` (38.5, 53), `rebuy` (39.4, 52), `orca-security` (49.8, 50), `amira-learning` (41.9, 48), `hackerone` (48.6, 47) — ~25 tools total in range with ≥20 impressions.
- All but one are on the `standard` refresh tier. Recommended next step (not done yet): editorial content upgrades on the top ~10 (deeper our_views, FAQs, comparison links), tracked before/after via the Monday `seo-impact` digest. NOT title rewrites — titles only matter on page 1.

**Measurement:** /best impressions + position tracked weekly in `niche_page_latest` (already automated); expect first visible movement 2–4 weeks after the internal links deploy and get recrawled (cascade-hubs + IndexNow accelerate this).

**MERGED 2026-06-11 (IST)** — PR #14 (`358d7cd`), squash-merged by founder. **Status: done.**

---

## 2026-06-11 (IST) — Full post-merge re-verification (production)

Every shipped change re-checked against the LIVE site and database after PR #14 deployed:

| Check | Result |
|---|---|
| Site-wide OG image (`/opengraph-image`) | ✅ 200, image/png |
| Per-guide OG image (`/best/writing/opengraph-image`) | ✅ 200, image/png |
| "Best-of guides" chips on tool pages | ✅ live (checked /tools/langchain) |
| New Plan-CTA copy ("Get my free stack") | ✅ live |
| Newsletter card on compare pages ("Still deciding?") | ✅ live |
| "Try {tool}" CTAs at comparison verdict | ✅ live (Try ChatGPT / Try Claude on /compare/chatgpt-vs-claude) |
| Auto-UTM on outbound redirect | ✅ Location header carries `utm_source=rightaichoice&utm_medium=referral&utm_campaign=<surface>` |
| cascade-hubs post-deploy | ✅ 19:00 UTC run success; ISR backlog 2,845 → **446** and draining hourly |
| Tool freshness | 482 tools >3d (down from 935), batch refresh on track |
| Pipeline failures since fixes | none logged (next scheduled tests: sentiment 04:00 UTC daily run, Bing 09:00 UTC, onboard :17/:47 runs overnight) |

**Still in observation (needs real traffic/time, checked through ~2026-06-13):** human visit counts at the new truthful baseline, compare-surface click events, first newsletter subs, alert-email volume ~zero, sentiment/Bing/onboard runs completing clean on their new budgets.

---

## 2026-06-12 — Observation-week results + new P0 found & fixed

**Observation results (~2 days post-deploy) — the fixes hold:**
- cascade-hubs: 42 consecutive successes; **ISR backlog fully drained (2,845 → 0)**.
- onboard-tools: 168 successes, **zero timeouts** (was 8 timeout emails/day).
- scrape-sentiment: 2 clean daily runs. submit-urls-bing: 2 clean runs, no quota emails.
- Freshness: only **6 tools** >3 days stale (from 935) — SLA effectively met.
- Tracking truth: 20 human outbound clicks vs **0 bot-counted** (was ~96% bots); `click_logs` recording (24 rows, was broken-forever).
- Plan CTA new copy: 0/110 clicks so far — too early, keep watching. Newsletter: 0 — too early.
- `freshness-sla` alert noise: now fires on a single straggler daily-tier tool (threshold `>0`); tune to ≥5 or 36h grace if it keeps emailing (deferred — may self-resolve).

**NEW P0 — catalog ingestion dead since June 1 (found via the daily `freshness-batch` failure email).**
- **No new tool has been added for 11 days.** Discovery finds ~100 candidates/day but the curation gate rejected 100% of them.
- Root cause chain: Reddit started blocking tokenless API requests from datacenter IPs ~Jun 1 → the scrapers were migrated to OAuth that same day **but the ingest traction probe was missed** → every candidate scored `reddit=0` → the "in-use" criterion + traction score starved → nothing reached the 3-of-4 bar → the ingest script correctly exited failure daily. The alarm worked; the cause was never traced until now.
- **Fixed** (commit `f3b137d`): traction probe now uses the shared Reddit OAuth token (public endpoint only as local fallback); ingest GH job now passes `REDDIT_CLIENT_ID`/`REDDIT_CLIENT_SECRET`.
- **⚠️ BLOCKED ON FOUNDER → UPDATE 2026-06-13:** self-serve app creation is **no longer possible** — Reddit's Responsible Builder Policy (Nov 2025) requires a manual application + approval (reportedly 2–4 weeks) for ALL new API access, even non-commercial. Founder attempted and was bounced to the policy page.
- **Unblock shipped instead** (commit `cbb21d5`): **degraded-mode gate** — when no Reddit creds are configured, the ingest criteria bar drops 3→2 over the measurable signals. ~16 candidates/day were passing the hard traction check (HackerNews buzz) and dying only on the unreachable Reddit-dependent criterion; those now flow again **as drafts**, still fully SOP-quality-gated before anything publishes. The bar auto-tightens back to 3 the moment `REDDIT_CLIENT_ID`/`SECRET` exist.
- **Founder follow-up (non-blocking, long-term):** submit Reddit's Data API access application (free non-commercial tier; start at support.reddithelp.com → "Developer Platform & Accessing Reddit Data"). When approved, create the script app, add the two secrets to GitHub Actions + Vercel — the OAuth probe and the stricter gate re-engage automatically.

**DEEPER FINDING (logged for next phase, not fixed here):** `tool_sentiment_cache` history shows **zero Reddit/Twitter/G2 posts ever collected** — the entire social-scraping layer has never returned data (missing credentials across all sources). Every "sentiment report" on the site has been synthesized from the tool's own metadata, not real community posts. The same Reddit creds above revive the Reddit leg; Twitter (Apify) and G2 need their own follow-up. This affects the credibility of the sentiment/viability features and deserves a scoped workstream.

---

## 2026-06-13 — Sentiment 2.0: real community data, zero new cost (commit `841493f`, awaiting merge)

Founder mandate: reports must be outstanding, accurate, extremely valuable — without Apify (no active subscription, costly) and without waiting weeks for Reddit's API approval.

**Found and fixed (all verified against live APIs):**
| Source | Was | Now |
|---|---|---|
| Product Hunt | **Never worked once** — query requested a `reviews` field that doesn't exist in PH's schema; every call silently returned nothing | Pulls launch comments + aggregate rating/review-count. Live test: Lovable 16 posts (4.68★/189 reviews), Midjourney 14 |
| App Store | Crashed whenever an app had exactly one review (Apple returns an object, not a list) | Normalized; Cursor now returns instead of erroring |
| Twitter (Apify) | The actor it called **doesn't exist on Apify** — never returned a post | Retired; replaced by Bluesky |
| Bluesky | — | NEW free source; anonymous search is IP-blocked so it supports an optional free-account login (no approval process), public fallback otherwise |
| HackerNews / YouTube | Working (verified 30 + ~25 posts per tool locally) | Unchanged; YouTube needs its key present in Vercel |
| Reddit | Blocked pending API approval | OAuth-ready; revives automatically when creds land |
| **Honesty gate** | 11 of the last 30 cached "sentiment reports" were synthesized from **zero** community posts — the AI invented community buzz from the tool's own description | `totalPosts=0` → no synthesis, row marked failed and retried later. A report now always sits on real posts |

**Verified mix (local run, real APIs):** Cursor 59 posts, Lovable 66, Midjourney 83 — vs the old reality of mostly 0–9.

**Founder checklist to get full strength in production:**
1. Merge the branch (includes this + the ingest degraded-mode fix).
2. Vercel → Settings → Environment Variables: confirm `YOUTUBE_API_KEY` and `PRODUCTHUNT_TOKEN` exist there (they exist locally; production runs mostly miss YouTube/PH, which points to absent Vercel env).
3. Optional, 2 minutes, no approval: create a free Bluesky account → Settings → App Passwords → add `BLUESKY_IDENTIFIER` + `BLUESKY_APP_PASSWORD` to Vercel + GitHub secrets.
4. Already in flight: Reddit API application (weeks); plugs back in automatically.

---

### 2026-06-13 (later) — Three more free sources + team playbook (commit `5fc8a8c`)

- **Stack Overflow** (the free Quora substitute — dev Q&A intent; Quora has no API and hard-blocks scraping), **GitHub signals** (stars = adoption ground truth + most-commented issues; near-exact repo match so `cursor` can't grab `cursorrules`), **Lemmy** (federated Reddit-style forums; partial Reddit stand-in while approval is pending).
- All verified against live APIs: Cursor → `cursor/cursor` 33k stars; LangChain → 139k stars + real issues + 15 SO posts; Ollama → 174k stars + its famous AMD-GPU issue (323 comments). Mix is now **9 live free sources + Reddit pending**.
- **Playbook written for the team:** `docs/automated-workflows/10-sentiment-sources-playbook.md` — full architecture (who each source represents, costs, auth, failure modes), the data-flow diagram, env-keys checklist, verification commands, and rules for adding sources.

### 2026-06-13 (later) — Production verification + source-label quality pass

**PRODUCTION VERIFIED — the full sentiment mix is live and Bluesky works.** After the founder added the Bluesky creds + redeployed and merged PR #29, live `tool_sentiment_cache` rows (12:19 UTC) show the new mix producing real data at scale:
- `google-gemini`: **130 mentions** across hn, youtube, appstore, **bluesky**, stackoverflow, lemmy
- `canva-ai`: **126 mentions** across 7 sources incl. bluesky + stackoverflow + lemmy
- `chorus-ai` / `quizlet-ai`: bluesky + lemmy contributing
- vs the old reality of 0–9 mentions and zero social data. Reddit correctly still absent (pending approval); GitHub correctly empty for these closed-source tools (name-match guard working).

**Label-quality fix (branch `fable5-sentiment-labels`, awaiting merge):** while verifying, found user-facing reports leaked raw keys (`stackoverflow`, `hn`) and the synthesizer's prompt/schema still named the four **dead** sources (Reddit-via-Apify, X/Twitter, Quora, G2) as where data comes from — misdirecting the model and keying the per-source sentiment bars by dead sources.
- New `lib/scrapers/source-labels.ts` (single `sourceLabel()` map, graceful fallback).
- Synthesizer section headers + system prompt + `sentiment_breakdown` schema now reference the real live sources; model keys the breakdown/themes by the exact labels.
- Applied in the scan route, report-client, and `sentiment-synthesis.tsx` (the inline block on every tool page).
- Verified end-to-end (real scrape + DeepSeek): LangChain → 104 posts; report breakdown keyed "Hacker News, YouTube, Product Hunt, Stack Overflow, GitHub, Lemmy". `tsc` + `next build` clean.

_Plain language: the data was already flowing the moment you redeployed — popular tools now draw on 100+ real community posts including live Bluesky chatter. This last fix just makes the source names read "Bluesky, Stack Overflow" instead of "bluesky, stackoverflow" on the page, and stops the AI from being told it's reading sources we retired months ago._

---

## Phase summary — everything done and verified (in plain words)

This phase started with three worries: *"we get traffic but no conversions," "I don't trust the tracking,"* and *"are the pipelines running and is our data fresh?"* Here is what was actually found and fixed, end to end:

1. **We found out why there were no conversions.** Visitors arrive from Google onto tool pages and comparison pages, already knowing what they're researching. Our main button asked them to "plan their AI stack" — the wrong ask — and only 5 people in two weeks clicked it. Meanwhile the thing they naturally do (click out to a tool's website) was happening at a healthy rate all along — we just couldn't see it through the bot noise, and we weren't earning from it.

2. **The counters now tell the truth.** About 96% of the "tool visits" number was robots being counted as people — over 2,000 fake rows cleaned out of history, and the door is now shut on new ones. A second click counter that had been silently broken since day one is fixed. Goals typed by people with ad-blockers are no longer lost. Two dashboard numbers that were literally hardcoded fakes now show real counts.

3. **The site now asks for the right things in the right places.** Every "Visit Website" button is tracked (comparison pages — our #2 traffic source — were completely untracked before). The decision moment on comparison pages now has "Try X" buttons. Every outbound click carries our name so tool vendors see us in their stats — our calling card for affiliate deals. A new admin card lists exactly which tools people click out to that we haven't monetized yet — that's the money to-do list. Newsletter signup boxes now exist where readers actually are. The Plan button got sharper wording ("Get your free AI stack in 60 seconds") and we measure whether it beats the old 0.37% click rate.

4. **The pipelines are genuinely running, and the one big broken one is revived.** Tool data was already fresh (nothing older than a week). But the hourly job that tells Google "this page changed, come look again" had *never worked once* in its life — it came alive this phase and has been re-notifying Google about all ~2,800 pages. Every failure email from the inbox was traced to its cause and fixed: jobs that took on more work than their time limit now stop early and hand the rest to the next run, and Bing's daily quota running out is logged as routine, not as an emergency.

5. **We know exactly why the 64 niche SEO pages get no traffic, and the first fix is live.** Google has indexed them but ranks them around page 7 — because almost nothing on our own site linked to them. Now ~2,000 tool pages and every category page link into the relevant guides. We also discovered no page on the site had a social-share image (every shared link looked like bare text) — fixed site-wide. Results will show in Google's data over 2–4 weeks; the weekly tracker measures it automatically.

**What's left (intentionally):** a week of watching the alerts stay quiet and the new conversion numbers come in; enrolling in affiliate programs from the admin list (founder task — this is where revenue starts); and content upgrades for the ~25 tool pages sitting just off Google's page 3.
