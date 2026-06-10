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
