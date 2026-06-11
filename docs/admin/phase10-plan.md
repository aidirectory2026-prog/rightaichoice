# Phase 10 (Admin Panel) — Verify Everything, Then Rebuild Everything

**Status:** APPROVED · Phase 0 ✅ complete (PR #15) · Phase 1 next
**Started:** 2026-06-11
**Branch / worktree:** `phase10-admin` at `rac-phase10-admin/` (PR per phase, squash-merged)
**Build log:** see `build-log.md` in this folder (updated every phase)

---

## Why this phase exists

The admin panel can't be trusted yet, and trust is the whole point of having one:

- Metrics were never systematically verified. The June 2026 audits kept finding real bugs the dashboard happily displayed: affiliate outclicks that were 99% bots, plan intents silently never saved, referrer attribution 100% empty for months, and (found during planning) the DAU/WAU/MAU tiles using different time-window rules than every other metric on the same page.
- The UI is a cramped top nav with 17 flat links, inconsistent spacing and alignment across ~18 pages, and no way to drill into a user or an event properly.

**Owner's requirements (verbatim intent):**
1. Verify EVERY metric and EVERY event/property is captured 100% correctly — *"at any cost"*, continuously, by multiple independent means.
2. Rebuild the admin to Mixpanel-grade, **in-house** (owner's explicit choice: we own the data, no vendor caps — Mixpanel free tier already maxed out; Mixpanel stays as a backup mirror, Microsoft Clarity stays for session replays).
3. Left sidebar with sub-menus. **Smart filters everywhere, and every filter must provably work** — multiple filters wherever needed.
4. Deep detail on every unique user and every unique event. Capture every small necessary detail a business would want.
5. A **Resources** section inside the admin: a complete learning guide for the owner + future team — what we capture, how, and why we trust each number, in BOTH non-technical and technical language.

**Governing principle: trust before beauty.** No pixel of redesign ships until every number it displays has a written, tested provenance. Order: audit → fix → harness → shell → rebuild → capture-more → teach → automate-forever.

---

## What already exists (build on, don't duplicate)

| Asset | What it does |
|---|---|
| `lib/analytics.ts` (~120 events) | Client tracking with rich properties; dual-writes Mixpanel + our DB via `/api/track-mirror`; all events funnel through ONE `capture()` function |
| `lib/analytics-registry.ts` + CI guard | Event-NAME lifecycle registry (FIRED/PLANNED/DEPRECATED) with `scripts/audit/verify-event-registry.ts` |
| `scripts/audit/e2e-tracking-verification.ts` | Puppeteer browser test that fires real events and asserts DB rows — the seed of our full harness |
| `tracking_health` + nightly invariants | 7 in-DB checks (dedup, future timestamps, bot share…) shown at /admin/tracking-health |
| `/admin/data-audit` suite | SQL integrity invariants (PASS/FAIL matrix) |
| Ground-truth tables | `page_views`, `click_logs`, `search_logs` — independent server-side logs to triangulate against |
| `scripts/mixpanel/verify.ts` | Mixpanel-vs-our-DB delta checks |
| Since 2026-06-10 (PR #12) | Every event carries referrer, UTM, session_id, bot flag, first-touch — the "data epoch" all attribution metrics start from |

---

## The 10 phases (each = one PR, each with a hard gate)

### Phase 0 — Setup + baseline snapshot (~0.5 session) ← CURRENT
- Worktree + branch created. This folder + plan + build log.
- `scripts/audit/snapshot-admin-metrics.ts`: records every admin metric for pinned historical date ranges into `docs/admin/baselines/<date>.json`. This is the **regression oracle**: after any redesign we re-run it and prove the numbers didn't change — only the pixels did.
- pg_cron availability: ✅ CONFIRMED installed (v1.6.4) — Phase 7 rollups viable.
- **Gate:** deterministic baseline committed.

### Phase 1 — Metric provenance audit (~3–4 sessions)
Every metric on every admin page gets a row in `docs/admin/metric-audit.md`: what query produces it → exact time-window rules → bot filtering → an INDEPENDENT hand-written SQL cross-check → verdict PASS / FAIL / UNVERIFIABLE.
Three independent means per metric: (a) static trace into the actual RPC bodies in `supabase/migrations/`; (b) hand-rolled SQL on pinned days via Supabase MCP; (c) triangulation vs Mixpanel mirror + ground-truth tables.
Known suspects that MUST be resolved: the `p_end` omission in `app/admin/insights/queries.ts:240-246` (confirmed); custom date-range end-day semantics; pre-June-10 null referrers counted as "(direct)"; zero-result search rate counting nulls as zeros; pipeline cost math by subtraction; null tool_id in top-tools; plan-funnel branch steps both labeled "4."; bot-flag precision/recall (sample 200 bot + 200 human UAs and manually verify); the 36h SLA false-positives for weekly crons; missing bot checks on sentiment payment routes.
**Gate:** every metric has a verdict; every FAIL has a reproduction query pasted in the doc.

### Phase 2 — Bug-fix sweep (~2–3 sessions)
One commit per bug, citing its audit row. Cross-cutting fixes: `TRACKING_EPOCHS` constants (attribution data begins 2026-06-10 — metrics clamp to it or visibly annotate); uniform window semantics (`>= start AND < end`) everywhere incl. new migration for RPCs missing `p_end`; explicit "unknown" buckets instead of silently-wrong derived numbers; funnel branch labels; bot checks on payment routes.
**Gate:** re-run ALL Phase 1 cross-checks → PASS; data-audit + tracking-health green; baseline re-snapshot diff = exactly the intended fixes, each documented.

### Phase 3 — Event-schema registry + verification harness (~3–4 sessions)
The "at any cost" machinery, down to the property level:
- **`lib/analytics-schema.ts`** — single source of truth: a strict schema for each of the ~120 events (every property: name, type, required/optional) + a plain-English and a technical description per event. Powers validation, the auto-generated event dictionary (Phase 8), and the property-breakdown UI (Phase 6).
- **Zero-rewrite retrofit:** validation plugs into the single `capture()` choke point — loud in dev/test, zero-cost in production. Server events validated at their single emit path. Rows that fail schema get flagged `schema_valid=false` but are NEVER dropped (capture at any cost; flag, don't lose).
- **Synthetic event suite** (`scripts/audit/synthetic-event-suite.ts`): for EVERY event, a "firing recipe" — a real browser interaction on localhost (tagged test visitor ID), or a canonical payload for non-browser-drivable paths (payments, auth) — then assert the exact row + every property + the envelope (session, UTM, referrer) lands in the DB, and double-fire to prove dedup. Coverage requirement: **100% of fired events**.
- CI guards extended: every event must have a schema; every property the admin panel queries must exist in that event's schema (drift becomes impossible). New DB invariants: schema-violation %, missing session_id post-epoch, orphan event names, dedup rate.
**Gate:** suite 100% green + a deliberately broken event is caught (negative test).

### Phase 4 — UI shell: left sidebar + global smart filter bar + chart kit (~2–3 sessions)
- **New navigation** (left sidebar, collapsible sections, mobile drawer), defined as data so breadcrumbs/sitemap render from the same source:
  - **Overview:** Dashboard · Live · Goals & KPIs
  - **Audience:** Users directory · Geography · Devices · Returning & retention
  - **Behavior:** Events explorer · Event detail · Search · Tool engagement
  - **Funnels & Conversion:** Funnels · Plan funnel · Onboarding
  - **Revenue:** Sentiment & payments
  - **SEO & Growth:** SEO Pulse · SEO Impact · Niche Tracker · AI Citations · Authority · Tier-1 Review
  - **Content Ops:** Knowledge Room · Tools catalog · Freshness · Daily log
  - **Pipelines & Health:** Pipeline health · Activity
  - **Tracking & Trust:** Tracking health · Data audit · Reconciliation · Verified-events wall
  - **Resources:** the learning guide (Phase 8)
  - Kill: charts-test. Merge: raw→Events explorer, journey→user profile tab, insights/health→health, analytics→dashboard. Old URLs redirect.
- **Global smart filter bar** on every page, state in the URL (shareable/bookmarkable): date range (IST-correct presets + custom), bots include/exclude, traffic source, UTM source/medium/campaign, device, country, logged-in vs anonymous, event picker. Pages declare which filters apply to them; filters combine (multi-filter stacks). ONE shared SQL predicate implements filtering for all queries — one place to verify, no per-page drift.
- **Filter correctness is a first-class gate:** new `scripts/audit/verify-filters.ts` asserts that page-query results for a whole matrix of filter combinations exactly equal independent raw SQL with the same predicates. Runs in CI forever.
- Chart kit: extract the existing server-rendered chart components into a shared `components/admin/charts/` kit (no heavy chart library — keeps pages fast and server-rendered; props shaped so a library swap stays mechanical if ever needed).
**Gate:** all pages render in the new shell; baseline snapshot diff = 0 (proof the redesign changed nothing numeric); filter-matrix verifier green.

### Phase 5 — Per-section page rebuilds (3 sub-PRs, ~4–6 sessions)
- **5a Overview + Audience:** dashboard with period-over-period deltas; every tile gets an ⓘ provenance popover ("what this counts, how, why it's trustworthy") and a drill-down link; new Users directory (paginated, sortable, filterable).
- **5b Behavior + Funnels + Revenue:** Events explorer rebuilt on the schema registry (grouped event picker, volume sparklines); verified funnels; bot-clean revenue.
- **5c SEO / Content / Pipelines:** re-skin onto the shared kit + filter bar; execute merges/kills.
**Gate per sub-PR:** rebuilt numbers identical to the Phase-2-verified queries; every tile drills down; filter verifier extended to the new pages.

### Phase 6 — User 360 + Event detail (Mixpanel-grade drill-downs) (~2–3 sessions)
- **User 360** (`/admin/insights/user/[id]`): identity header (anonymous ID ↔ account, first/last seen, first-touch source, devices, countries), computed traits, **sessions timeline** (events grouped into sessions), full virtualized event stream with raw-property expanders, Microsoft Clarity replay deep-link, links to their reviews/saves/plan intents.
- **Event detail** (`/admin/insights/event/[name]`): volume trend (bot-split), automatic property-breakdown cards for every property in the schema, where-it-fires code references, plain-English + technical schema card, last 50 raw rows, synthetic-test status for this event.
**Gate:** 5 real users + 10 events fully reproduced by hand SQL; Clarity links open the right sessions.

### Phase 7 — Capture-everything (ADVANCED) + scale prep (~3–4 sessions)
*(Expanded 2026-06-11 per owner: "capture the referrer source and very advanced level tracking — capture whatever would be good to capture, like everything.")*

**Already captured per event since 2026-06-10 (PR #12), for reference:** referrer, UTM source/medium/campaign, session_id, first-touch referrer + landing, bot/webdriver flag, device type, geo (country/city/region), IP, user-agent, Clarity session id.

**7a — Source & attribution (the referrer ask):**
- **Channel classifier** (`lib/analytics/channels.ts`): every referrer host mapped to a channel taxonomy — Search (google/bing/ddg), AI (chatgpt/perplexity/claude/gemini), Social (linkedin/x/facebook/reddit), Community (HN/PH/forums), Email, Referral, Direct, Internal. Stored on the event + shown as the admin "Sources" dimension; unknown hosts surface in a review queue so the map keeps growing.
- Multi-touch history: per-visitor array of every distinct (source, medium, campaign, landing, ts) touch — first-touch AND last-touch AND full path, so we can answer "which channels assist vs close".
- Google Ads / Meta click ids (gclid/fbclid/msclkid/ttclid) captured when present; search-engine keyword capture where the referrer still carries it.

**7b — Device, environment & performance envelope (added to every event):**
locale, timezone, viewport w×h, screen resolution + devicePixelRatio, connection type/downlink/rtt, device memory, CPU cores, touch capability, cookie state, do-not-track, ad-blocker-detected signal (mixpanel blocked but mirror alive), tab count hint (visibility), dark/light preference.
Web-vitals event per page (LCP, INP, CLS, TTFB, FCP via `useReportWebVitals`) + slow-page flag.

**7c — Behavior depth:**
- Finer scroll marks (10/25/50/75/90/100) + max-scroll-per-page; engaged-time heartbeat every 30s (active vs idle separated via input/visibility signals) replacing fire-once time_on_page.
- Rage clicks, dead clicks (click with no UI response), text selection/copy (exists — keep), exit-intent (desktop), outbound-link clicks with full target URL (exists — verify coverage), file/print/share actions.
- JS errors + unhandled promise rejections + failed resource loads with page context (error_encountered exists — extend + verify).
- Form analytics on every form: field focus/blur order, per-field correction counts, error shown, abandon point.
- Per-session computed: landing page, exit page, pages count, duration, engaged seconds, channel — rolled into user_intent_profile.
- Promote all valuable PLANNED events: pagination, sort changes, filter clears, review load-more, newsletter unsubscribe, compare-tray clear, auth-step events.

**7d — Iron rule (unchanged):** schema entry first → code → synthetic recipe → only then it counts as FIRED. Nothing fires unschema'd; everything new lands in the event dictionary automatically.

**7e — Scale prep (unchanged):** hourly pg_cron rollups for trends, rollup-vs-raw reconciliation invariant, composite + partial indexes verified with explain-analyze. Privacy note: we already store IP + UA; document retention and admin-only access in Resources (Phase 8).

**Gate:** synthetic coverage 100% incl. every new event/property; channel classifier validated against a hand-labeled sample of 100 referrers; rollup invariant green 3 consecutive days.

### Phase 8 — Resources (the learning guide) (~2 sessions)
In-admin docs section, rendered from markdown/MDX, written for both audiences:
1. **How tracking works** — non-technical story with a visual pipeline diagram (browser → our tracking code → Mixpanel + our database → this admin).
2. **The same, technically** — capture() → queue → track-mirror → user_events + intent profile; identity stitching; session model; bot detection; dedup; outage retry queue.
3. **Event dictionary** — auto-generated from the schema registry (can never drift from reality): every event, its plain-English meaning, every property, lifecycle status, link to its live event-detail page.
4. **Metric provenance cards** — for every headline metric: what it counts / how it's computed / why we trust it (which invariant + which synthetic test covers it) / known caveats (data epochs, bot precision). Same content feeds the ⓘ popovers on the dashboard.
5. **Trust & verification** — all eight verification means explained + a "this number looks wrong" runbook.
6. **Glossary + FAQ** (distinct_id vs user, session, bot flag, UTM, first touch, IST windows, epochs).
**Gate (literal acceptance test):** the owner can explain every Overview tile's meaning and trust basis using ONLY the Resources section.

### Phase 9 — Permanent nightly verification (~1–2 sessions)
Nightly automated cycle: registry guard → schema guard → Mixpanel reconciliation → full synthetic suite → filter-matrix verifier → DB invariants. Any failure writes to tracking_health AND lights a **red trust banner across every admin page** — broken tracking becomes impossible to not notice. /admin/tracking-health rebuilt: invariant history, the per-event "verified wall", schema-violation trend.
**Gate:** one full nightly cycle green; an intentionally broken event trips the banner.

---

## The eight independent verification means (the owner's standing requirement)

1. Hand-SQL cross-checks vs every RPC/query (Phase 1, re-run Phase 2)
2. Synthetic browser suite proving every event + every property + dedup (Phase 3 → nightly forever)
3. Mixpanel mirror reconciliation (deltas explained or investigated)
4. Ground-truth table triangulation (page_views / click_logs / search_logs)
5. Rollup-vs-raw reconciliation invariants (Phase 7)
6. Filter-matrix verifier — every filter and filter combination proven against raw SQL (Phase 4+)
7. Baseline snapshot diffs — redesigns provably change zero numbers (Phase 0 oracle)
8. Nightly watchdog + the always-visible trust banner (Phase 9)

## Estimates & risks

~22–30 working sessions total across 10 phases; each phase independently shippable, admin stays usable throughout.
Risks: migration-number collisions with concurrent Claude sessions (check max number right before each migration commit); synthetic-suite flakiness vs the batched event queue (reuse the proven polling pattern from the existing e2e script); payment/auth events verified payload-driven rather than browser-driven (always labeled as such); Next 16 MDX friction (read bundled docs first per AGENTS.md); scope creep bounded by the registry — nothing fires unschema'd.
