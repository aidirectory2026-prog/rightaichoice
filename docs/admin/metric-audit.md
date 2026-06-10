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
