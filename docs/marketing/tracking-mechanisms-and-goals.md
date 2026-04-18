# Tracking Mechanisms and Goals — Full Runbook

Single source of truth for how RightAIChoice measures what matters. If the team changes hands tomorrow, this document alone is enough for the successor to understand the entire analytics stack — what's tracked, why, where it's configured, how to read the dashboards, and how to extend or repair it.

The layered picture:

```
Browser ──► MixpanelProvider (client init, replay, super props)
         ─► lib/analytics.ts (typed event surface)
         ─► /mp/* reverse-proxy route (defeats ad-blockers)
         ─► Mixpanel EU ingestion

Server actions ──► lib/mixpanel-server.ts (/track API, $insert_id dedup)
                  ─► Mixpanel EU ingestion

Sentry errors ──► beforeSend hook attaches mixpanel_distinct_id
               ─► Sentry events link 1:1 to Mixpanel user profiles

Mixpanel project ─► Lexicon (event + property descriptions)
                  ─► Boards (6 dashboards)
                  ─► Funnels + Goals (12 funnels with monthly thresholds)
                  ─► Cohorts (7 managed cohorts)
                  ─► Retention reports (5 report templates)
                  ─► Session Replay (5% of sessions, masked)
```

---

## 0. Quick map — where everything lives

| Concern | File / Location |
|---|---|
| Client SDK init, Session Replay, super properties | `components/providers/mixpanel-provider.tsx` |
| Typed client event surface (every method calls capture()) | `lib/analytics.ts` |
| Server-side event surface (/track API) | `lib/mixpanel-server.ts` |
| Reverse proxy (ad-blocker bypass) | `app/mp/[...path]/route.ts` |
| Identity stitching + super-props on login | `components/providers/auth-provider.tsx` |
| Sentry ↔ Mixpanel link | `sentry.client.config.ts` |
| Env validation | `lib/env.ts` |
| Secrets | `.env.local` (gitignored); `MIXPANEL_SERVICE_ACCOUNT_*` + `MIXPANEL_PROJECT_ID` |
| Event catalog (source of truth) | `scripts/mixpanel/config/events.ts` |
| Cohort definitions | `scripts/mixpanel/config/cohorts.ts` |
| Funnel + Goal definitions | `scripts/mixpanel/config/funnels.ts` |
| Board (dashboard) definitions | `scripts/mixpanel/config/boards.ts` |
| Retention report definitions | `scripts/mixpanel/config/retention.ts` |
| Lexicon provisioning script | `scripts/mixpanel/provision-lexicon.ts` |
| Verification smoke test | `scripts/mixpanel/verify.ts` |
| UI click-through playbook (fallback) | `docs/marketing/mixpanel-playbook.md` |

Run commands:
- `npm run mixpanel:verify` — auth + ingestion smoke test
- `npm run mixpanel:lexicon:dry` — Lexicon dry-run (shows what would be written)
- `npm run mixpanel:lexicon` — apply Lexicon descriptions to the live project

---

## 1. Platform configuration

- **Tool:** Mixpanel (Starter / free tier — 20M events/mo, unlimited Boards/Funnels/Retention, Session Replay up to 5k sessions/mo, Lexicon, Service Accounts).
- **Data residency:** EU. Ingestion host `api-eu.mixpanel.com`, app host `eu.mixpanel.com`.
- **Project ID:** `4014921`.
- **Project token (public):** set via `NEXT_PUBLIC_MIXPANEL_TOKEN`.
- **Service account (write access):** `rightaichoice-claude-provisioner.0644ad.mp-service-account`. Rotate every 90 days. Never commit the secret.
- **Reverse proxy:** `/mp/*` on our domain forwards to `api-eu.mixpanel.com`. `NEXT_PUBLIC_MIXPANEL_PROXY_PATH=/mp` is **enabled in all environments (local + production)** so uBlock/Brave shields can't silently drop events — previously unset, which caused ~20–40% event loss and was the reason tracking appeared broken during manual QA. Set the same var on Vercel (Project → Settings → Environment Variables) for production.
- **Identity stitching:** `analytics.identify(userId, traits)` runs from `auth-provider.tsx` on every mount where a user is present. This collapses anonymous and known sessions into one user.
- **Super properties:** `app`, `app_version`, `env`, `viewport`, `first_touch_utm_*`, `last_touch_utm_*`, `first_touch_referrer`, `first_touch_landing`, `user_plan`, `is_admin`. Attached to every event.
- **Group Analytics:** one group key — `user_plan`. Enables per-plan breakdown on every report.
- **Session Replay:** 5% sampling. Recording disabled on `/auth`, `/login`, `/signup`, `/account`, `/admin`, `/api`. All inputs masked via `record_mask_text_selector`. Elements flagged `data-private` or `data-mp-block` always masked/blocked.
- **CSP:** `connect-src` already allows `api-eu.mixpanel.com` + `api-js.mixpanel.com`. Updating the reverse proxy path does not require CSP changes because `/mp` is same-origin.

---

## 2. Adding, renaming, removing an event

1. **Add a method** in `lib/analytics.ts` (or `lib/mixpanel-server.ts` if server-authoritative).
2. **Wire the call site** in the feature component/action.
3. **Append an entry** to `scripts/mixpanel/config/events.ts`.
4. **Add a `### Event: <name>` section** to §4 of this document with trigger, payload, why-it-matters, and the board/funnel it feeds.
5. Run `npm run mixpanel:lexicon` to push the description into Mixpanel's Lexicon UI. (Falls back to the playbook if free-tier blocks the Lexicon write API.)
6. Update `scripts/mixpanel/config/boards.ts` or `funnels.ts` if the new event should appear on a dashboard.

No event ships without steps 1–4.

Renaming: add the new event first, dual-fire for ≥14 days so historical reports keep working, then retire the old one in a cleanup PR. Mark the old name in this document with `**Deprecated — removed <date>**`.

---

## 3. Success metrics — the North Star

These four numbers override everything else. A green month = all four tracking to target. Missing one is OK. Missing two means stop shipping features and investigate.

| # | Metric | Definition (Mixpanel query) | Jun | Jul | Aug | Sep |
|---|---|---|---|---|---|---|
| 1 | **WAU** | Unique `distinct_id` firing `page_viewed` in last 7 days | 500 | 1,000 | 1,800 | 2,500 |
| 2 | **Activation rate** | New users (first `page_viewed`) firing any `activation_milestone` within 24h | 20% | 30% | 40% | 50% |
| 3 | **Week-2 retention** | % of new-user cohort returning in week 2 (retention report `new_user_weekly`) | 15% | 20% | 25% | 30% |
| 4 | **Affiliate clicks / WAU** | `tool_visit_clicked` ÷ WAU for the same 7-day window | 0.8 | 1.1 | 1.3 | 1.5 |

All four live on Board `01 — North Star`.

---

## 4. Event catalog — one section per event

Each section is the contract for that event. If any of trigger / payload / consumers / target drift from this section, update the code AND this doc in the same PR.

Event categories (same as `scripts/mixpanel/config/events.ts`): identity, tool, compare, plan, workflow, stack, ai_chat, community, auth, nav, content, search, discovery, strategic, performance, system.

### 4.1 Identity

#### Event: `identify`
- **Category:** identity (not a track event — a Mixpanel method)
- **Source:** client
- **Trigger:** `AuthProvider` mount when a user is present.
- **Payload:** `user_id` (Supabase uuid), `$email`, `plan`.
- **Consumers:** required for retention, cohorts, and any funnel that spans anonymous → known.
- **Target:** Known-user share of MAU — 15% Jun → 30% Sep.
- **Failure mode:** without this, the same human shows up as multiple anon users across devices; retention curves understate.

#### Event: `reset`
- **Category:** identity
- **Source:** client
- **Trigger:** `AuthProvider` mount when user is null (sign-out).
- **Payload:** n/a.
- **Consumers:** none directly — this is hygiene, not measurement.
- **Failure mode:** missing this causes the next anonymous session on a shared device to be attributed to the prior user.

---

### 4.2 Tool interactions — the core decision surface

#### Event: `tool_page_viewed`
- **Source:** client
- **Trigger:** mount of `/tools/[slug]`.
- **Payload:** `tool_id`, `tool_slug`.
- **Consumers:** Discovery board; funnel `discovery_tool_visit`; saves/visits denominators.
- **Target:** volume follows WAU; no absolute floor. Watch the `tool_page_viewed → tool_visit_clicked` conversion (target 4% Jun → 10% Sep).

#### Event: `tool_saved` / `tool_unsaved`
- **Source:** client
- **Trigger:** Save / Unsave button on any tool card or detail page.
- **Payload:** `tool_id`, `tool_name`.
- **Consumers:** Discovery board; activation milestone (first tool save); Retention overlay.
- **Target:** `tool_saved` per `tool_page_viewed` — 2% Jun → 5% Sep.

#### Event: `tool_visit_clicked` (client)
- **Source:** client
- **Trigger:** "Visit Website" CTA on tool card/detail.
- **Payload:** `tool_id`, `tool_slug`, `source`.
- **Consumers:** Revenue-proxy board; funnel `discovery_tool_visit`; North Star metric #4.
- **Target:** 400 → 3,500 clicks/month.

#### Event: `tool_visit_redirected` (server)
- **Source:** server (`/api/tools/[slug]/visit`)
- **Trigger:** server redirect handler, before issuing the 302.
- **Payload:** `tool_slug`, `referrer_path`, `source=server`.
- **Consumers:** Revenue-proxy board (authoritative) — watch the delta vs. client `tool_visit_clicked` to quantify ad-blocker loss.

---

### 4.3 Compare flow — the differentiator

#### Event: `compare_tool_added` / `compare_tool_removed`
- **Source:** client
- **Trigger:** Compare tray add/remove buttons.
- **Payload:** `tool_slug`, `tray_count`.
- **Consumers:** Discovery board (tray depth histogram); funnel `compare_share`.
- **Target:** average tray count before `comparison_viewed` — 2.4 Jun → 3.0 Sep.

#### Event: `comparison_viewed`
- **Source:** client
- **Trigger:** mount of `/compare` with ≥2 tools.
- **Payload:** `tools` (comma-separated slugs), `count`.
- **Consumers:** activation cohort; Retention report `comparison_user_retention`.
- **Target:** % of WAU firing this — 8% Jun → 18% Sep.

#### Event: `compare_share_clicked`
- **Source:** client
- **Trigger:** share CTA on `/compare`.
- **Payload:** `tools`.
- **Consumers:** funnel `compare_share`; viral loop dashboard.
- **Target:** shares per 100 comparisons — 3 Jun → 10 Sep.

---

### 4.4 Plan / Recommendation flow

#### Event: `plan_started`
- **Source:** client
- **Trigger:** plan wizard mount.
- **Payload:** `source`.
- **Consumers:** funnel `plan_wizard` (step 0).

#### Event: `plan_step_completed`
- **Source:** client
- **Trigger:** each wizard step transition.
- **Payload:** `step`, `step_index`.
- **Consumers:** funnel `plan_wizard` (all interior steps, filtered by `step_index`).
- **Target:** each step's drop should be <15% (i.e. step-to-step rate ≥85%).

#### Event: `plan_completed`
- **Source:** client
- **Trigger:** final step submit.
- **Payload:** `use_case`, `tool_count`.
- **Consumers:** activation milestone; Retention report `plan_completer_retention`; Revenue-proxy board.
- **Target:** 80 → 900 completions/month.

#### Event: `plan_abandoned`
- **Source:** client
- **Trigger:** wizard unmount before completion.
- **Payload:** `last_step`.
- **Consumers:** funnel leak dashboard. Prioritise UX fixes on the most-common `last_step`.

#### Event: `recommendation_requested`
- **Source:** client
- **Trigger:** `/recommend` form submit (single-shot alternative to wizard).
- **Payload:** `use_case`, `budget`, `level`.
- **Consumers:** demand signal; input to weekly review.

---

### 4.5 Workflow builder

#### Event: `workflow_generated`
- **Source:** client
- **Trigger:** AI generation response received.
- **Payload:** `goal`, `step_count`.
- **Consumers:** funnel `workflow_usage`.

#### Event: `workflow_saved`
- **Source:** client
- **Trigger:** Save button on a generated workflow.
- **Payload:** `workflow_id`.
- **Consumers:** funnel `workflow_usage`.
- **Target:** `workflow_saved / workflow_generated` — 30% Jun → 50% Sep.

#### Event: `workflow_shared`
- **Source:** client
- **Trigger:** share CTA.
- **Payload:** `workflow_id`, `channel`.
- **Consumers:** viral loop; weekly report.

#### Event: `workflow_voted`
- **Source:** client
- **Trigger:** up/down vote.
- **Payload:** `workflow_id`, `direction`.
- **Consumers:** community health.

---

### 4.6 Stacks

#### Event: `stack_viewed`
- **Source:** client; trigger: stack page mount; payload `stack_slug`. Feeds SEO quality dashboard.

#### Event: `stack_saved`
- **Source:** client; trigger: Save on stack; payload `stack_slug`. Stickiness signal.

#### Event: `stack_exported`
- **Source:** client; trigger: export CTA; payload `stack_slug`, `format`. Highest-intent signal.
- **Target:** `stack_exported / stack_viewed` ≥ 3% by Sep.

---

### 4.7 AI chat

#### Event: `ai_chat_message`
- **Source:** client; trigger: chat send; payload `intent`. Volume + intent clustering.

#### Event: `ai_chat_tool_suggested`
- **Source:** client; trigger: model response parsed for tool mentions; payload `tool_slug`. Model quality check.

#### Event: `ai_chat_tool_clicked`
- **Source:** client; trigger: click on a tool link in chat; payload `tool_slug`. Recommendation → action conversion.
- **Target:** `tool_clicked / tool_suggested` — 15% Jun → 30% Sep. Below 10% means the recommendations aren't useful.

---

### 4.8 Community

#### Event: `review_submitted`
- **Source:** both (client fires on submit; server mirrors from `actions/reviews.ts` for the authoritative count).
- **Payload:** `tool_id`, `rating`.
- **Consumers:** UGC volume dashboard; SEO long-tail signal.
- **Target:** monthly volume 30 → 80 → 180 → 400.

#### Event: `question_asked` / `question_answered`
- **Source:** client; payloads `category` / `question_id`.
- **Consumers:** community health ratio. Target answer-to-ask ≥ 1.2 by Sep.

#### Event: `discussion_replied`
- **Source:** client; payload `discussion_id`. Retention proxy.

---

### 4.9 Auth funnel

#### Event: `signup_started`
- **Source:** client; trigger: signup form/modal open; payload `source`. Top of funnel.

#### Event: `signup_completed`
- **Source:** both (server-authoritative via `lib/mixpanel-server.ts`).
- **Payload:** `method`.
- **Consumers:** funnel `signup_activation`; Growth board.
- **Target:** `signup_started → signup_completed` — 60% Jun → 75% Sep; new signups 120 → 1,500/month.

#### Event: `login_completed`
- **Source:** both; payload `method`. Return-visit signal.

---

### 4.10 Navigation, hero, and content CTAs

#### Event: `nav_cta_clicked`
- **Source:** client; payload `cta`, `source`. Reveals which persistent CTA earns clicks.

#### Event: `hero_cta_clicked`
- **Source:** client; payload `cta`, `variant`. A/B input for homepage.
- **Target:** hero CTR ≥ 8% by Sep.

---

### 4.11 Content / blog / SEO

#### Event: `blog_post_viewed`
- **Source:** client; payload `slug`. Baseline for content depth.

#### Event: `blog_internal_link_clicked`
- **Source:** client; payload `from_slug`, `to_path`. Content-to-product conversion input.

#### Event: `best_page_viewed` / `role_page_viewed`
- **Source:** client; payload `slug`. SEO landing performance.

---

### 4.12 Search

#### Event: `search_query_submitted`
- **Source:** client; payload `query` (100-char slice), `result_count`, `source`. Demand signal.

#### Event: `search_result_clicked`
- **Source:** client; payload `query`, `tool_slug`, `position`. CTR per position.

#### Event: `search_no_results`
- **Source:** client; payload `query`, `source`. Content-gap detector (top empty queries = next tools to ingest).
- **Target:** rate of `search_no_results / search_query_submitted` — <15% Jun → <8% Sep.

#### Event: `empty_search`
- **Source:** client; legacy alias kept for back-compat. Prefer `search_no_results` for new dashboards.

---

### 4.13 Discovery

#### Event: `filter_applied`
- **Source:** client; payload `filter_type`, `value`, `source`. Which filters are actually used.

#### Event: `filter_no_results`
- **Source:** client; payload `filters`, `source`. Inventory gaps.

#### Event: `category_viewed`
- **Source:** client; payload `slug`. SEO surface health per category.

#### Event: `collection_viewed`
- **Source:** client; payload `slug`. Editorial lift measurement.

---

### 4.14 Strategic / high-level

#### Event: `activation_milestone`
- **Source:** both (client fires first; server backs up critical milestones through `serverAnalytics.activationMilestoneServer`).
- **Payload:** `milestone` (`first_tool_saved`, `three_tools_compared`, `first_plan_completed`, `first_workflow_saved`), `value` optional.
- **Consumers:** North Star metric #2; Retention overlay; activated cohort.
- **Target:** % of new users hitting ≥1 milestone — 20% Jun → 50% Sep.

#### Event: `onboarding_step_completed` / `onboarding_completed`
- **Source:** client; payloads `step`, `step_index` / `path`. Separates curious visitor from setup user.

#### Event: `pricing_viewed`
- **Source:** client; payload `source`. Monetisation intent.

#### Event: `upgrade_clicked`
- **Source:** client; payload `plan`, `source`. Pre-revenue conversion.

#### Event: `newsletter_subscribed`
- **Source:** client; payload `source`. Cheapest re-engagement channel.

#### Event: `external_link_clicked`
- **Source:** client; payload `url`, `entity`, `entity_id`. Leak-tracking.

#### Event: `share_clicked`
- **Source:** client; payload `entity`, `entity_id`, `channel`. Cross-surface virality.

---

### 4.15 Page / content behaviour

#### Event: `page_viewed`
- **Source:** client; trigger: every pathname/searchParams change; payload `path`, `url`, `referrer`.
- **Consumers:** WAU/MAU; funnel starts; retention.

#### Event: `scroll_depth_reached`
- **Source:** client; wired in `components/providers/mixpanel-provider.tsx` → `EngagementCapture`. A passive `scroll` listener computes depth as `scrollY / (scrollHeight - clientHeight)` and fires the event at 25/50/75/100% exactly once per page (depths reset on every pathname change). Payload `path`, `depth`.
- **Consumers:** Content-quality board; correlates with `tool_visit_clicked` to grade page effectiveness.

#### Event: `time_on_page`
- **Source:** client; wired in `components/providers/mixpanel-provider.tsx` → `EngagementCapture`. Fires on `pagehide`, `visibilitychange → hidden`, and on route change (unmount). Payload `path`, `seconds`, `bucket` (`<5s`, `5-15s`, `15-30s`, `30-60s`, `1-3min`, `>3min`).
- **Consumers:** Engagement board; filter bucket ≥ `30-60s` for the "engaged page view" proxy metric.

---

### 4.16 Performance / errors

#### Event: `perf_mark`
- **Source:** client; trigger: explicit `analytics.perfMark()`; payload `marker`, `duration_ms`, `context`.
- **Usage:** mark AI-chat first-token latency, plan LLM response time, etc. Always set chart aggregation to p95.

#### Event: `error_encountered`
- **Source:** client; trigger: error boundary catch; payload `boundary`, `message` (200-char slice).
- **Consumers:** Quality board. Via `mixpanel_distinct_id` tag on Sentry events, click-through to stack trace is 1:1.

---

## 5. Cohorts

All 7 cohorts are defined in `scripts/mixpanel/config/cohorts.ts`. Each must be re-created in the Mixpanel UI (see `mixpanel-playbook.md §3`) and refreshed on the cadence listed there.

| Cohort | Definition summary | Refresh |
|---|---|---|
| `activated_users` | Fired any `activation_milestone` ever | 1h |
| `power_users_14d` | ≥3 `tool_saved` in 14 days | 1h |
| `comparison_users` | Fired `comparison_viewed` ever | 1h |
| `plan_completers` | Fired `plan_completed` ever | 1h |
| `ai_chat_users` | Fired `ai_chat_message` in last 30 days | 1h |
| `at_risk` | Active days 14–28 ago, silent last 14 days | 6h |
| `high_intent_leavers` | `pricing_viewed` but no `upgrade_clicked` in 30 days | 6h |

---

## 6. Funnels + Goals

All 12 funnels live in `scripts/mixpanel/config/funnels.ts`. Each has a monthly Goal tied to a conversion rate or volume threshold. Full step-by-step recreation in `mixpanel-playbook.md §4`.

Top-level summary of Goals we care about most:

| Funnel | Metric | Jun | Jul | Aug | Sep | Alert if below |
|---|---|---|---|---|---|---|
| Discovery (page→visit) | CR | 4% | 6% | 8% | 10% | 75% of target |
| Plan wizard | CR | 25% | 35% | 45% | 55% | 70% |
| Signup → activation 24h | CR | 20% | 30% | 40% | 50% | 70% |
| AI chat suggestion quality | CR | 15% | 22% | 26% | 30% | 65% |
| New user activation 24h | CR | 20% | 30% | 40% | 50% | 70% |

---

## 7. Retention reports

All 5 reports in `scripts/mixpanel/config/retention.ts`. Read weekly on the North Star + Growth boards.

| Report | Cohort event | Return event | Window |
|---|---|---|---|
| `new_user_weekly` | `page_viewed` (first_session) | `page_viewed` | 12 weeks |
| `activated_vs_not` | same, overlay by activation_milestone | `page_viewed` | 12 weeks |
| `plan_completer_retention` | `plan_completed` | `page_viewed` | 8 weeks |
| `comparison_user_retention` | `comparison_viewed` | `page_viewed` | 8 weeks |
| `ai_chat_user_retention` | `ai_chat_message` | `page_viewed` | 8 weeks |

---

## 8. Boards (dashboards)

Six Boards, all in `scripts/mixpanel/config/boards.ts`. Build them from the playbook in order — Board 01 is the only one reviewed daily.

1. **01 — North Star** — 4 charts, the four metrics from §3.
2. **02 — Growth** — signup trend/sources, UTM breakdown, signup→activation funnel, at-risk cohort trend.
3. **03 — Discovery** — tool view top-20, save rate, empty search feed, filter no-results, compare tray depth.
4. **04 — Revenue proxy** — client-vs-server affiliate delta, top affiliate earners, discovery funnel, pricing→upgrade funnel, high-intent leavers.
5. **05 — Content & SEO** — top posts, avg scroll depth, time-on-page buckets, content→product funnel, /best and /for views.
6. **06 — Quality** — errors by boundary, empty search rate, plan wizard drop-off, filter no-results trend, perf markers (p95).

---

## 9. Review cadence + alerting

- **Daily (if time):** check North Star board for obvious breakage.
- **Weekly (Mondays):** empty-search + filter-no-results feeds, funnel drop-off deltas, top `error_encountered` boundaries, at-risk cohort size.
- **Monthly (1st):** compare actuals vs. Goals in §6. Adjust next-month targets if baseline shifted.
- **Quarterly:** prune events with 0 volume in the last 90 days; update Lexicon.

Alerts: Mixpanel's free tier includes Goal-based email alerts. Set each of the funnels flagged with `alertBelow` in §6 to email the owner if the conversion rate drops below that percentage of target for 3 consecutive days.

---

## 10. Data quality + incident playbook

If numbers look wrong, work this list top-to-bottom:

1. **Run `npm run mixpanel:verify`.** If service-account auth or ingestion fails, stop everything — credentials rotated or project was moved.
2. **Check the /mp reverse-proxy route.** In production, hit `https://rightaichoice.com/mp/track?ip=1` — should return 200.
3. **Check super properties.** Open Chrome devtools on any page → `window.mixpanel.super_properties` should have `app`, `env`, and UTM properties if the URL had them.
4. **Compare `tool_visit_clicked` (client) vs `tool_visit_redirected` (server).** A divergence >50% means ad-blocker loss has spiked OR server handler is failing.
5. **Check Lexicon.** If descriptions are missing, run `npm run mixpanel:lexicon`.
6. **Check identity stitching.** In Mixpanel → Users, your own user should have only one profile. If you see two, `identify()` isn't firing.

---

## 11. Access and secrets rotation

- **Owner:** `tanmayverma321@gmail.com`. This account owns the Mixpanel project and all Boards.
- **Service Account:** rotate every 90 days via Mixpanel → Organization Settings → Service Accounts. Replace `MIXPANEL_SERVICE_ACCOUNT_SECRET` in `.env.local` and in production env (Vercel or wherever secrets live).
- **Project Token:** public; safe to expose. Rotate only if abuse is detected.
- **Deleting a Service Account** immediately invalidates the secret. Do this if the laptop running provisioning scripts is lost.
- **Successor handover:** this doc + `scripts/mixpanel/` + `docs/marketing/mixpanel-playbook.md` is the full knowledge transfer. No hidden state.

---

## 12. Free-tier limits and upgrade triggers

Upgrade to Growth (~$25/mo for 100k tracked users) when **any** of:

- Event volume hits 15M/mo (free cap 20M — leave headroom).
- You need the **Cohorts/Funnels/Boards provisioning APIs** (we already have the config-as-code — upgrade means `npm run mixpanel:provision:all` becomes possible instead of the UI playbook).
- Session Replay quota (5k/mo) runs out — increase sampling or upgrade.
- You need Feature Flags / Experiments inside Mixpanel (we don't today).

Everything in this doc — tracking, Boards, Funnels, Goals, Cohorts, Retention — works identically on free and paid. Only the provisioning surface differs.

---

## 13. Changelog

Append-only. Newest at top. Every analytics change must land a line here.

- **2026-04-18 — Tracking fix + engagement beacons.**
  - Root cause of "events not appearing in Mixpanel during QA": `NEXT_PUBLIC_MIXPANEL_PROXY_PATH` was unset, so the SDK hit `api-eu.mixpanel.com` directly and Brave/uBlock silently dropped requests. Enabled `/mp` proxy path in `.env.local`. **Action required on production:** set `NEXT_PUBLIC_MIXPANEL_PROXY_PATH=/mp` in Vercel env vars (all environments) and redeploy.
  - `scroll_depth_reached` and `time_on_page` were defined in `lib/analytics.ts` but never called. Added `EngagementCapture` to `components/providers/mixpanel-provider.tsx` — emits scroll-depth at 25/50/75/100% once per page and time-on-page on `pagehide` / `visibilitychange:hidden` / route-change.
  - Re-ran `npm run mixpanel:lexicon` — 60/60 event descriptions now live in Mixpanel UI.
  - Follow-up QA: hard-refresh any page with adblocker on → Mixpanel Live View should show `page_viewed`, `scroll_depth_reached (25)`, `tool_saved`, `time_on_page` within ~10s (batch flush interval).
