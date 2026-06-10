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

_(pending)_

## Department B — Conversion / CTA Architecture

_(pending)_

## Department C — Pipelines / Reliability

_(pending)_

## Department D — SEO / Growth

_(pending)_
