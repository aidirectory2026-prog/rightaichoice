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

**⚠️ Needs founder:** `gh` CLI is not installed and the local GitHub token lacks API access, so the PR couldn't be opened/merged from this machine. Open + squash-merge here: https://github.com/aidirectory2026-prog/rightaichoice/pull/new/fable5-review (or install GitHub CLI: `brew install gh && gh auth login`).

## Department B — Conversion / CTA Architecture

_(pending)_

## Department C — Pipelines / Reliability

_(pending)_

## Department D — SEO / Growth

_(pending)_
