# Phase 10.1 — Metric Provenance Audit

Every metric on every admin page: source → window semantics → bot filter → independent
cross-check → verdict. Cross-check window (pinned, immutable): **2026-06-01 → 2026-06-07 IST**
(`2026-05-31T18:30:00Z` ≤ created_at < `2026-06-07T18:30:00Z`), matching baseline
`docs/admin/baselines/2026-06-01_2026-06-07.json`.

Verdicts: ✅ PASS (independent SQL matches exactly) · ❌ FAIL (mismatch, reproduction included)
· ⚠️ SUSPECT (works but semantics misleading) · ⏳ pending.

---

## /admin/insights — Overview metrics (queries.ts getOverviewMetrics)

| Metric | Source | Claimed (humans / +bots) | Hand SQL | Verdict |
|---|---|---|---|---|
| Page views | direct select `event_name='page_viewed'`, bot filter, `>= cutoff AND < end` | 856 / 1012 | 856 / 1012 | ✅ PASS |
| Unique visitors | RPC `distinct_visitors_in_window(p_cutoff,p_end,p_include_bots)` | 637 / 1080 | 637 / 1080 | ✅ PASS |
| Signed-in accounts | RPC `distinct_known_users_in_window` | 3 | 3 | ✅ PASS |
| Signups | direct select `signup_completed` | 0 | 0 | ✅ PASS |
| Newsletter subs | direct select `newsletter_subscribed` | 0 | 0 (table also 0) | ✅ PASS |

## /admin/insights — Bot share (RPC insights_bot_share)

| Field | Claimed | Hand SQL | Verdict |
|---|---|---|---|
| total_events | 6240 | 6240 | ✅ PASS |
| bot_events | 1098 | 1098 | ✅ PASS |
| total_visitors | 1080 | 1080 | ✅ PASS |
| bot_visitors | 443 | 443 | ✅ PASS |

## /admin/insights — Daily Active Users (RPC insights_daily_active_users)

Claimed 2026-06-07 = 117; hand SQL with IST day boundary (06-06T18:30Z..06-07T18:30Z) = **117** ✅ PASS
(IST bucketing verified for sampled day; full-week sum 659 is per-day actives, correctly > distinct weekly visitors 637.)
Double-run determinism: PASS for all 39 baseline snapshots (0 nondeterministic) — the suspected
missing-ORDER-BY issue did not manifest; treat as verified for current data volume.

## ❌ FINDING F1 — "Searches" tile counts an event that never fires

- **Where:** insights getSearchMetrics → counts `search_query_submitted`; also "Clicks on results" → `search_result_clicked`, zero-result RPC.
- **Observed:** all 0 for the audit week, while **9 real search events exist** (`search_typing` ×6, `search_query_typed` ×3). `search_query_submitted` has NO rows in the window (and the search UI appears to be live-search with no submit step).
- **Impact:** the entire Search panel reads zero forever; real search behavior is invisible.
- **Repro:** `select event_name, count(*) from user_events where event_name like '%search%' and created_at >= '2026-05-31T18:30Z' and created_at < '2026-06-07T18:30Z' group by 1;`
- **Fix direction (Phase 2):** either wire `search_query_submitted`/`search_result_clicked` in the search component (preferred — submitted-query semantics are what the panel promises) or redefine the panel on the events that actually fire. Registry/schema (Phase 3) will prevent this class permanently (admin-consumed events must be FIRED).

## ❌ FINDING F2 — Returning-visitors RPC silently drops window-active visitors who return later

- **Where:** RPC `insights_returning_visitors` (migration 121_insights_window_threading.sql:582) — `active_in_window` = lifetime `last_seen` within `[cutoff, end)`.
- **Observed:** truly active in audit week = **637**; RPC total = **633**; exactly **4** visitors excluded because their lifetime last event is after the window end.
- **Impact:** any historical/custom range under-counts total + returning visitors; bias grows with how long ago the window is (recent windows look fine, which is why it went unnoticed). Internal inconsistency on the dashboard: "Unique visitors" (637) ≠ returning-summary "total" (633) for the same filters.
- **Repro:** see audit query in build log 1.3 (in_window vs per_visitor.last_seen comparison → 637 / 633 / 4).
- **Fix direction (Phase 2):** active-in-window must be `exists (event in [cutoff,end))`, not a predicate on lifetime last_seen; returning = first_seen < cutoff (that part is correct).

## /admin/insights — second verification batch (all exact matches)

| Metric | Claimed (humans) | Hand SQL | Verdict |
|---|---|---|---|
| Page views by device | desktop 790 / mobile 56 / unknown 10 | identical | ✅ PASS |
| Top events (top 3) | scroll 2178 / page_viewed 856 / cta_impr 701 | identical | ✅ PASS |
| Top viewed tools | screenplayiq 8 / vercel 7 | identical | ✅ PASS |
| Plan funnel (insights variant) | plan_started 4 → 0 → 0 → 0 | identical | ✅ PASS |
| Reconciliation stats | client 5711 + server 529 = 6240 total | internally consistent w/ events_all | ✅ PASS |
| Plan-conversion surface parity | 747+37+68+0+0 = 852 total impressions | sums match funnel total | ✅ PASS (but see F6) |

## ❌ FINDING F3 — `plan_cta_clicked` is (at best) partially wired

- **Observed:** 852 CTA impressions in the audit week, modal shown 4×, plan_started 4× — but `plan_cta_clicked` = 0 in window and only **5 all-time**. The modal cannot open without a click, so clicks are happening and not being tracked on at least the main path.
- **Impact:** the plan-conversion funnel's step 2 ("CTA clicked") is a hole — CTR reads ~0% forever; per-surface CTR meaningless.
- **Fix direction:** trace the CTA components (sticky_bar/inline_card/homepage) — fire `plan_cta_clicked` on every path that opens the modal or navigates to /plan. Synthetic recipe in Phase 3 prevents regression.
- Related dead/dormant events (all-time counts): `search_query_submitted` 5, `ai_chat_message` 1, `tool_saved` **0 ever** (save feature either unused or broken — needs a manual click-test in Phase 2).

## ❌ FINDING F4 — "Top referrers" counts events, hides half the traffic

- **Where:** RPC `insights_top_property` `first_touch_referrer` branch (121_insights_window_threading.sql:369-383) — joins events to `user_intent_profile` and counts EVENTS per profile-level first-touch.
- **Observed (audit week, humans):** claimed "direct 2489 / google 56 / chatgpt 12" — in visitor terms that's **direct 208 / google 11** visitors. Worse: **2,585 human events (≈50% of the window) are silently excluded** because their visitor has no profile row or empty first-touch — no "(unknown)" bucket exists. The panel shows less than half the traffic and implies event-volume = source-volume.
- **Verdict:** ❌ FAIL on semantics (values reproducible, meaning wrong).
- **Fix direction (Phase 2):** count distinct visitors (or sessions); add an explicit "(unknown — pre-tracking or no profile)" bucket; annotate with the 2026-06-10 attribution epoch.

## ⚠️ FINDING F5 — Engagement tiles ignore the global date filter by design (`void sel`)

- **Where:** `queries.ts:236-258` — DAU/WAU/MAU + signed-in tiles always use now-anchored IST-today/7d/30d, discard the page's RangeSelection (`void sel`, no `p_end`).
- **Impact:** with a custom/historical range selected, these six tiles silently show different windows than every other panel. Labels do say "(today)/(7d)/(30d)", so it's not lying — but it breaks the "every filter works" contract.
- **Fix direction (Phase 4):** move them to a visually distinct "Right now" pulse strip exempt from filters, or thread the range through. Decide in the shell rebuild; document either way.

## ❌ FINDING F6 — /admin/plan-conversion has NO bot filtering anywhere

- **Observed:** plan-conversion funnel "CTA shown" = 852 = with-bots count; humans = 701. The page's queries (`lib/admin/plan-conversion.ts`) never touch `bot_likely` — every number on a *conversion* page is ~18% bot-inflated this week (and bots never convert, so all rates are understated).
- **Verdict:** ❌ FAIL.
- **Fix direction (Phase 2):** thread `includeBots` through plan-conversion.ts identically to insights; default humans-only.

## ⏳ Remaining audit queue (next sessions)

- insights: getRecentVisitors, getKpiRows, getVolumeProjection, getEventHealth, getToolAudienceDetail (param'd spot-check).
- plan-conversion: funnel branch-label issue (4a/4b) — fix alongside F6.
- /admin/updates (Knowledge Room): catalog freshness counts, pipeline cost disaggregation (known suspect: subtraction math), top tools (null tool_id), top searches (null-vs-0 zero-result conflation).
- /admin/health: SLA verdicts (36h rule vs weekly crons), success rates, durations.
- /admin/sentiment: funnel + revenue (bot checks missing on payment routes — known suspect).
- /admin/seo-pulse, niche-tracker, ai-citations, freshness, tracking-health, data-audit: source-trace + spot checks.
- bot_likely precision/recall sample (200 bot + 200 human UAs, manual classification).
- range.ts custom-range consumer sweep (`.lt` vs `.lte` vs RPCs ignoring p_end).

---

## bot_likely precision/recall sample (agent-audited, 2026-06-11)

**Window:** last 30 days (19,475 events; 3,714 flagged bot, 15,761 flagged human). Method: every distinct UA classified by hand (flagged-true side has only 13 UAs + NULL; flagged-false top ~90 UAs cover >95% of volume), ambiguous UAs resolved behaviorally (engagement mix, visitor-to-IP ratios, country concentration, page spread). Estimates weighted by event count.

| Metric | Value | Math |
|---|---|---|
| Precision | ≈100% | 3,714 / 3,714 — no flagged-bot UA looks human |
| **Recall** | **≈29–30%** | 3,714 / 12,342 true-bot events |
| "Human" events that are actually bot | **8,628 of 15,761 (~55%)** | SG farm 7,460 + auth prober 944 + dev-builds 194 + named bots 25 + fake-UA 5 |

Flagged-true composition (all correct): 2,073 NULL-UA server redirect fetches; 1,388 HeadlessChrome; 253 named crawlers.

**True human picture (30d):** ~7,100 events — of which ~3,900 are the owner's own devices → **genuine third-party human traffic ≈ 3,200 events/30d, ~6× smaller than dashboards currently show.**

Top false-negative signatures: Win10 Chrome/103–133 stale-version band (7,460 ev, ~1,323 "visitors" ≈ 977 IPs, 97% Singapore, 4,732 auto-scrolls, **0 time_on_page, 0 tool clicks**); Chrome/142.x auth prober (944 ev, 118 ids on 13 IPs, only /login /signup /plan /); dev-build UA strings (`Chrome/\d+.0.…0`); `OAI-SearchBot` (regex gap — `oai-searchbot` missing); `TPCWorker`, `newsai/1.0`; impossible UA combos (Safari 10 on iOS 14).

Special checks: webdriver=true ⇒ bot_likely=true holds (16/16, zero violations). Server-mirrored events: 99.7% NULL user_agent pre-2026-06-10 (UA pass-through shipped then); NULL-UA→bot convention does NOT apply on the server path (`mirrorServerEvent` defaults `botLikely ?? false`) — sentiment/auth server events ride as human (acceptable: authenticated), but reference-repo vs deployed flagging of `tool_visit_redirected` should be reconciled.

## ❌ FINDING F7 — UA-regex-only bot detection misses ~70% of bot events; "human" metrics ~2× inflated

- **Where:** `lib/bot-detection.ts` BOT_UA_REGEX (sole signal besides webdriver), consumed by track-mirror; every insights RPC filters on bot_likely=false.
- **Observed:** see table above. The SG farm alone = 38% of all events counted as human; scroll-depth metrics are the worst-poisoned (4,732 fake scrolls).
- **Impact:** every bot-excluded dashboard number (visitors, page views, engagement, funnel tops) is roughly **2× its true value**; after real bot removal, ~55% of remaining traffic is the owner's own devices.
- **Repro:** `SELECT country, count(*), count(*) FILTER (WHERE event_name='time_on_page') FROM user_events WHERE created_at >= now()-interval '30 days' AND bot_likely=false AND user_agent ~ 'Windows NT 10\.0.*Chrome/1(0[3-9]|1[0-9]|2[0-9]|3[0-3])' AND user_agent NOT ILIKE '%edg%' GROUP BY 1` → SG ≈ 7,138 events, 0 time_on_page.
- **Fix direction (Phase 2, high priority):** (1) regex additions: `oai-searchbot`, `tpcworker`, `newsai`; (2) behavioral second-pass classifier as a nightly SQL job (≥N events with zero time_on_page/tool clicks; visitor-to-IP ratio ≫1 on auth pages); (3) ingest heuristics: desktop Chrome major-version >12 behind current = bot-likely; dev-build patch patterns; (4) **one-time backfill** re-flagging SG-band + prober signatures so historical dashboards correct; (5) exclude owner's user_id from default insights views (separate "team traffic" toggle).

---

# Remaining pages (agent-audited 2026-06-11) — updates / health / sentiment / seo / remaining insights

*(Agent findings renumbered F8–F13 to follow F7. Full verdict tables below; PASS highlights: Knowledge Room catalog counts (2,003 published, twice-fetched deterministic), pipeline_health RPC per-pipeline numbers exact, sentiment funnel counts exact (86/10/8/8/0), seo-pulse GSC snapshot totals exact, niche-tracker exact (64 tracked / 398 impressions), getVolumeProjection exact (1,513 today / 10,735 MTD), getEventHealth exact (page_viewed 2,580/30d).)*

## ❌ FINDING F8 — Cost instrumentation is dead: every cost metric shows a hard $0
- **Where:** /admin/updates cost tracker + $5/day red flag (page.tsx:349-409); /admin/health 7d cost KPI; writer `lib/pipelines/with-logging.ts`.
- **Observed:** ALL 1,826 all-time pipeline_runs rows have estimated_cost_usd / deepseek tokens / anthropic tokens / apify_usd = 0/NULL. The schema and UI are plumbed; the writer never populates them. (The suspected subtraction-goes-negative bug is moot — inputs all zero.)
- **Impact:** operator sees "$0.00" and the over-budget alarm can never fire while real DeepSeek/Anthropic/Apify spend goes unmonitored. Misleading green on a money metric.
- **Repro:** `SELECT count(*), count(*) FILTER (WHERE coalesce(estimated_cost_usd,0)>0) FROM pipeline_runs;` → 1826, 0.
- **Fix direction:** populate token+cost fields in withPipelineLogging/cronRoute; until then render cost sections as "not instrumented", not $0.

## ❌ FINDING F9 — Knowledge Room aggregates silently undercount at 14d/30d/90d (un-ordered, limit-capped client-side grouping)
- **Where:** updates/page.tsx — page_views limit 2000 (:131), search_logs limit 2000 (:158), refresh/ingestion logs limit 5000 (:223,:253), healthRows limit 10000 (:371); none ordered, so WHICH rows drop is arbitrary.
- **Observed (30d):** search_logs 5,459 > 2,000 cap (audit week alone 3,962); page_views 3,447 > 2,000; refresh_logs 6,776 > 5,000 (ok/failed badge can miss ~26% of rows).
- **Impact:** Top search queries, top viewed tools, zero-result badges, refresh ok/failed tallies all wrong at longer ranges, unpredictably. (Also verify PostgREST max-rows isn't capping everything at 1,000.)
- **Repro:** `SELECT count(*) FROM search_logs WHERE created_at >= now()-interval '30 days';` → 5,459 vs fetched 2,000.
- **Fix direction:** SQL-side aggregation (RPC GROUP BY); minimum: add ordering + "showing first N of M" disclosure.
- *Resolved benign:* zero-result NULL-vs-0 conflation — 0 NULL result_count rows all-time, rate unchanged. Null tool_id leak — does not occur (filtered + 0 rows).

## ❌ FINDING F10 — `insights_recent_visitors` repeats the F2 defect + shows lifetime stats as window stats
- **Where:** queries.ts:785-810 → RPC insights_recent_visitors (migration 121) — membership = lifetime last_seen within window; total_events/active_days are lifetime values.
- **Observed:** pinned week — correct 637 vs RPC 633; the 4 dropped are exactly the most-engaged visitors (returned later). is_returning itself is correct.
- **Impact:** historical "Recent visitors" lists omit the best visitors and overstate per-row event counts.
- **Repro:** same 637-vs-633 query as F2.
- **Fix direction:** membership = exists(event in window); window-scoped stats (or relabel "lifetime").

## ❌ FINDING F11 — Two "DAU"s on screen disagree by an order of magnitude (UTC vs IST) and `insights_kpi_values(p_days)` ignores its parameter
- **Where:** RPC insights_kpi_values (migration 099) buckets by UTC `date_trunc('day', now())`; p_days declared, never used. Engagement tile uses IST midnight.
- **Observed at audit time (01:15 IST):** KPI acq_dau = **169** (UTC day) vs IST-day DAU = **10** — both labeled "DAU".
- **Impact:** contradictory "today" numbers on the same dashboard; goal percentages swing on the UTC clock, not the founder's day.
- **Repro:** `SELECT current_value FROM insights_kpi_values(7) WHERE kpi_key='acq_dau'` vs IST-midnight distinct count → 169 vs 10.
- **Fix direction:** align KPI day-bucketing to Asia/Kolkata (as migration 119 did elsewhere); use or drop p_days.

## ❌ FINDING F12 — Health SLA layer: stale cadence map → false FAILs, permanent FAILs, and invisible pipelines
- **Where:** health/page.tsx CADENCE_HOURS (:72-95) + evaluateSla (:137-157).
- **Observed:** `calculate-viability` mapped 24h but real success gaps up to **353.7h** → false hard-FAILs; `snapshot-daily-updates` gapped 47.7h once; failure-only monitor keys (`freshness-sla`, `poll-gh-actions-heartbeat`) show as forever-failing; mapped keys `refresh-tools`, `refresh-latest-updates`, `refresh-compare-editorials` have ZERO rows ever → never appear in pipeline_health → **silent blind spot**; 10 of 24 live keys unmapped (8-day fallback) incl. `submit-urls-bing`, a daily job currently failing (9 ok of 22 runs/30d).
- **Impact:** Failing/Stale/Healthy KPIs blend real alerts with mapping artifacts; worst case is the inverse — a never-logging pipeline is invisible instead of red.
- **Fix direction:** derive cadence empirically (median success gap) or from vercel.json; add "expected but never logged" rows; exclude/fix failure-only monitor keys.

## ⚠️ FINDING F13 (note) — Sentiment funnel is all-time, unwindowed, bot-unfiltered; payment-succeeded never fired
- **Observed:** counts exact today (86/10/8/8/0); 0 sentiment events flagged bot all-time, so no current distortion; sentiment_payments: 7 rows, 0 paid (sandbox-consistent) so success wiring untestable.
- **Fix direction:** add range + bot filter when payments go live. Low priority.

## Also verified PASS (agent, full tables in transcript): Knowledge Room stat tiles + catalog counts + stalest-tool + cascade backlog; health per-pipeline runs/failures (exact RPC match) + 24h KPI + freshness SLA banner; sentiment funnel/revenue/status-mix (limit currently lossless); seo-pulse WoW totals + action counts; niche-tracker exact recompute from GSC snapshot JSONB; ai-citations (trivially — table empty); getVolumeProjection; getEventHealth(30).

---

# Phase 2 gate (2026-06-11): PASSED ✅

Post-fix baseline `docs/admin/baselines/post-phase2.json` vs pre-fix baseline, pinned week:
- **25/39 snapshots byte-identical** (no collateral change).
- **All 14 changed keys map 1:1 to documented fixes:** every `.humans` variant → F7 backfill (history corrected; e.g. unique visitors 637 → 214); `.withBots` overview totals byte-identical (1012/1080) proving the backfill only reclassified, never dropped rows; returning summary now exactly equals overview visitors (214 = 214 — F2 fixed, old 633≠637 inconsistency gone); top referrers → visitor counts + "(unknown)" bucket (F4); reconciliation bot split (F7); plan-conversion (F6 humans-only).
- 0 errors, 0 nondeterministic across both runs.
- F9 RPCs verified exact vs raw GROUP BY (top searches 10/10 rows, top tools 8/8, refresh mix 6701=6701 / 715=715); old caps proven lossy (search_logs 5,552 > 2,000 cap).
- Fix-status ledger: F1 ✓ wired · F2 ✓ · F3 ✓ (navbar+homepage; ~10 plain /plan content links flagged for surface-enum follow-up) · F4 ✓ · F5 → Phase 4 (by design) · F6 ✓ · F7 ✓ (backfill + nightly classifier) · F8 ✓ honest display (full instrumentation deferred — zero recordTokens call sites exist) · F9 ✓ · F10 ✓ · F11 ✓ · F12 ✓ · F13 → when payments go live. Bonus root-causes: search_result_clicked already wired (low traffic is real); tool_saved zero is TRUE data (no saves since mirror began 2026-05-20).

---

# Audit 2026-06-28 — invariant-driven deep pass (Opus 4.8)

Owner asked for a full re-audit ("numbers not matching across screens"). The system's own nightly
invariant suite (`run_tracking_invariants` → `tracking_health`) was already flagging the bugs; root-caused
each on the live DB and fixed all three. **Result: 13/13 invariants PASS (verified twice).**

### ❌→✅ I9 schema_violation_rate — was 12.24% (FAIL, threshold 5%)
Root cause: the Clarity bridge registers `clarity_playback_url` as a super-prop (alongside
`clarity_session_id`), so it rides in `properties` on every event — but it was missing from
`BASE_CONTEXT_PROP_KEYS`, so it reached each event's STRICT schema and tripped `Unrecognized key`. Hit
`engaged_time_heartbeat`/`scroll_depth_reached`/`page_viewed`/`web_vitals`/etc. Second mismatch:
`signup_method_selected.method` enum lacked `linkedin`+`guest` (added to the emitter in Bug-3.4).
Fix: `lib/analytics-schema.ts` (commit `af011a7`). Verified by replaying 1,000 real invalid rows → 1000/1000
pass. Backfilled 2,341 stale `schema_valid=false` tags (precise: only rows whose issues were entirely the
two fixed errors). I9 → 0.00%. Residual ~0.05% (12 rows/30d) of unrelated edge cases (`form_id` sent as an
object on 2 rows) — sub-threshold, noted for later.

### ❌→✅ I13a/I13b rollup reconciliation — was 8 divergent days (FAIL)
Root cause: `compute_event_rollups` recomputed only the trailing 3 IST days hourly, but the recon checks
30; any in-window raw change older than 3 days left the frozen rollup stale (raw was LOWER — early-era
dedup/corrections). `cleanup-user-events` deletes at 90d (outside the window, not the cause). Fix
(migration 176): widen the hourly recompute 3→33 days + make the DAU rollup DELETE+INSERT idempotent (was
upsert-only) + one-time rebuild. I13a/I13b → 0. NOTE: only `/admin/resources/trust` reads the rollup;
the KPI dashboards read raw `user_events`, so this never produced a wrong number on a metric screen.

### ⚠️→✅ I4 funnel_monotonicity — was 1 (WARN)
Root cause (NOT a missing fire): a visitor who logs in MID-journey gets a new Mixpanel distinct_id (anon
`$device:…` → user_id), so `plan_started` landed under the anon id and `plan_completed` under the user_id
— a funnel grouped by raw distinct_id splits one journey. Happens for EVERY anon→known conversion. Fix
(migration 175): session-stitch identity (the per-tab `session_id` survives the Mixpanel identify swap) in
BOTH `run_tracking_invariants` (I4) and `insights_funnel_users`. I4 → 0; funnel returns monotonic.

### "Numbers don't match across screens" — the by-design part (NOT bugs)
- **Mixpanel UI vs /admin**: structural — Mixpanel strips ~20% more as bots + loses 20-40% to ad-blockers;
  admin reads the more-complete Supabase mirror. `/admin/insights/reconciliation` explains this.
- **Retroactive bot reclassification** (`bot-behavioral-classifier`, nightly): the same past window shows a
  lower human count tomorrow than today.
- **"Right Now" pulse** is now-anchored to IST midnight and IGNORES the filter bar — a filtered "today"
  card legitimately differs.

### Healthy (confirmed): dedup (0 dup/null insert_id), server-resolved user_id, DAU/IST-boundary recon,
session coverage, no orphan event names.
