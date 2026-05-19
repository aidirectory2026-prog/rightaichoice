# Mixpanel — Plan (implementation, identity, dashboard, alerts, cost)

**One of two canonical Mixpanel docs.** The other is [mixpanel-events.md](mixpanel-events.md) (event catalog).

---

## Architecture (one paragraph)

Client SDK = `mixpanel-browser` initialized in [`components/providers/mixpanel-provider.tsx`](../../components/providers/mixpanel-provider.tsx). EU cluster (`https://api-eu.mixpanel.com`). Requests proxied through `/mp/[...path]` (route handler in [`app/mp/[...path]/route.ts`](../../app/mp/%5B...path%5D/route.ts)) to defeat ad-blockers. Client wrapper at [`lib/analytics.ts`](../../lib/analytics.ts) — 100+ typed methods, one per event. Server fires for ad-blocker-resilient revenue events via [`lib/mixpanel-server.ts`](../../lib/mixpanel-server.ts) (HTTP POST to `/track` with deterministic insert_id for de-dup). Session replay is **NOT Mixpanel** — handled by Microsoft Clarity (free, unlimited) via [`components/providers/clarity-provider.tsx`](../../components/providers/clarity-provider.tsx). All event definitions live in [`scripts/mixpanel/config/events.ts`](../../scripts/mixpanel/config/events.ts) (source of truth). Dashboard spec (cohorts/funnels/boards/alerts) in [`scripts/mixpanel/config/dashboard-spec.ts`](../../scripts/mixpanel/config/dashboard-spec.ts).

## Identity hygiene (the #1 fix from Phase 8.g.1)

**Mixpanel project setting:** Identity Merge mode MUST be `Simplified` (set in https://eu.mixpanel.com/project/4014921/settings → Identity Merge). Verified ✓.

With Simplified mode + our `identify()` call in AuthProvider, the same human = ONE Mixpanel profile across anon→known transition. No explicit `mixpanel.alias()` needed.

**Symptom if this is broken:** "each event = a different user" (every signup creates a phantom anon profile that never merges). If you see this in dashboards, re-check the project setting.

**Historical events fired BEFORE this was correctly configured cannot be retroactively de-duplicated.** Filter dashboards to "last 7d" once g.1 deploys for clean numbers. Drastic alternative: project reset (wipes all events; only do if pre-Phase-8.g data is genuinely useless).

## Super-properties (auto-attached to every event)

See [mixpanel-events.md → Super-properties](mixpanel-events.md#super-properties-auto-attached-to-every-event) for the full table. Key adds in Phase 8.g.1:
- `auth_state` — `anon` until identify(), then `known`. Every funnel can split logged-in vs anonymous.
- `device_type` — `mobile`/`tablet`/`desktop`.
- `page_path` — updated on every route change.
- `session_n` — per-tab counter.

## Server-side mirrors

For ad-blocker-resilient revenue events. Server fire uses **deterministic insert_id** (sha256(event|distinctId|payload) truncated to 32 hex chars) so client + server fires of the same logical action de-dup in Mixpanel within its 5-day insert_id window.

| Event | Server fire location | Why server |
|---|---|---|
| `signup_completed` | `app/auth/callback/route.ts` | revenue/activation |
| `login_completed` | `app/auth/callback/route.ts` | revenue/activation |
| `tool_visit_redirected` | `app/api/tools/[slug]/visit/route.ts` | affiliate revenue source-of-truth |
| `review_submitted` | `actions/reviews.ts` | community contribution authoritative |
| `tool_saved` | `actions/tools.ts` toggleSave | #1 retention signal, ad-block resilient |
| `newsletter_subscribed` | `app/api/newsletter/subscribe/route.ts` | email lead authoritative |
| `password_reset_completed` | `actions/auth.ts` updatePassword | fresh browser context, client SDK may not be loaded |
| `activation_milestone` | various | server-authoritative |

## In-house DB tracking (kept as verification harness)

Three Supabase tables fire IN ADDITION to Mixpanel — they are the audit harness for data quality:

| Table | Captures | Use |
|---|---|---|
| `page_views` | server-rendered hits (no JS required) | SEO ground truth — bot/crawler tracking |
| `click_logs` | affiliate clicks via `/api/tools/[slug]/visit` | Authoritative for `tool_visit_redirected`. Nightly audit: if Mixpanel delta > 5% → ingestion problem. |
| `search_logs` | search submissions | Fallback when Mixpanel ingestion fails |

**Do not drop these tables.** They are the verification harness for g.6.

## Microsoft Clarity (session replay, not Mixpanel)

Mounted via [`components/providers/clarity-provider.tsx`](../../components/providers/clarity-provider.tsx). Project ID via `NEXT_PUBLIC_CLARITY_PROJECT_ID` env var (`wtq115a7o7`). Loads on every non-excluded page; excluded paths: `/admin`, `/api`, `/auth`.

- Free forever, unlimited replays + heatmaps + rage-click detection
- No link to Mixpanel events (separate tools, separate IDs) — cross-reference manually if needed
- Replay dashboard: https://clarity.microsoft.com/projects/view/wtq115a7o7

## Dashboard (provisioned by `scripts/mixpanel/provision-dashboards.ts`)

The script + [`config/dashboard-spec.ts`](../../scripts/mixpanel/config/dashboard-spec.ts) is the source of truth. Re-running it produces / updates a manual-setup checklist (see [Manual setup](#manual-setup-because-free-tier-api-doesnt-cover-everything) below).

### 12 cohorts

| # | Cohort | Filter |
|---|---|---|
| 1 | Comparison power users | `comparison_viewed count >=3 in last 14 days` |
| 2 | Plan completers | `plan_completed count >=1 ever` |
| 3 | Multi-saved | `people.saves_count >=5` |
| 4 | High-intent leavers | `plan_started count >=1 AND plan_completed count =0 in last 7 days` |
| 5 | Category loyal | `tool_page_viewed grouped by category count >=10 in last 30 days` |
| 6 | Returning weekly | `distinct active days >=3 in last 14 days` |
| 7 | Ad-block users | `tool_visit_redirected source=server AND no matching tool_visit_clicked client` |
| 8 | AI-chat-engaged | `ai_chat_message count >=2` |
| 9 | Mobile-only | `super.device_type =mobile in last 30 days` |
| 10 | Affiliate clickers | `tool_visit_redirected count >=1 in last 30 days` |
| 11 | Reviewers | `review_submitted count >=1 ever` |
| 12 | **Existing-tool mentioner: {tool_slug}** | `people.existing_tools_history contains <tool_name>` — **VENDOR-TARGET TEMPLATE.** Instantiate per top-100 tool. |

### 10 funnels

| Funnel | Steps | Window |
|---|---|---|
| Acquisition: landing → tool visit | `page_viewed → search_query_submitted → tool_page_viewed → tool_visit_clicked` | 7d |
| Plan flow: start → completion → click-through | `plan_started → plan_intake_submitted → plan_completed → plan_results_tool_clicked` | 7d |
| Recommend: submit → click → visit | `recommendation_requested → recommendation_result_clicked → tool_visit_clicked` | 1d |
| Review submission abandonment | `review_form_opened → review_rating_set → review_submitted` | 30d |
| Signup → first save → D7 return | `signup_completed → tool_saved → page_viewed` | 7d |
| Compare → visit | `compare_tool_added → comparison_viewed → tool_visit_clicked` | 1d |
| Homepage hero → signup | `hero_cta_clicked → signup_started → signup_completed` | 1d |
| AI chat: message → suggested → clicked | `ai_chat_message → ai_chat_response_received → ai_chat_tool_clicked` | 7d |
| Saved list → revisit → visit | `tool_saved → saved_list_viewed → tool_visit_clicked` | 30d |
| Search typing → submit → click | `search_typing → search_query_submitted → search_result_clicked` | 1d |

### 10 boards

**8 operational** (audience: operator): North Star · Acquisition · Activation · Engagement · Retention · Content · Search Quality · Revenue Proxy

**2 vendor-pitch** (audience: vendor_pitch — THE salable artifacts):

- **Per-Tool Audience Snapshot ({tool_slug})** — parameterized per tool. 9 tiles: 30d unique viewers / saves + save rate / affiliate click-throughs / top 10 comparison co-occurrence / plan-inclusion rate / existing-tool mentioner segment / user segment breakdown / per-tool funnel / reviews this month. **Weekly cron exports each tool's tile data via JQL → CSV → S3 bucket per vendor (future automation).**
- **Category Heatmap** — tool_page_viewed unique users by category × week.

Full tile specs in [`scripts/mixpanel/config/dashboard-spec.ts`](../../scripts/mixpanel/config/dashboard-spec.ts).

### 6 alerts

| Alert | Trigger |
|---|---|
| Funnel conversion drop ±30% | day-over-day on every funnel |
| `tool_visit_redirected` drop >25% | revenue alarm |
| `error_encountered` spike | >50/day |
| Per-tool z-score >2 | `tool_page_viewed` for any tool z-score >2 vs 30d mean — vendor-opportunity alert |
| `signup_completed` server vs client delta >20% | identity stitching breakage |
| Search zero-result rate >15% | catalog gap |

## Manual setup (because free-tier API doesn't cover everything)

Mixpanel's free-tier API has programmatic create for events / lexicon entries / event imports — but **not** for cohorts with arbitrary selectors, funnel layouts, board layouts, or alerts. The provisioning script ([`scripts/mixpanel/provision-dashboards.ts`](../../scripts/mixpanel/provision-dashboards.ts)) generates a manual-setup checklist; run it whenever the spec changes:

```bash
npm run mixpanel:dashboards:dry   # preview, no writes
npm run mixpanel:dashboards       # writes the manual-setup checklist
```

Then follow the checklist UI links one section at a time. Each cohort/funnel/board entry has the exact filter / steps / tiles to recreate.

The Lexicon (event descriptions in the Mixpanel UI) IS programmatically updatable — push event docs with:

```bash
npm run mixpanel:lexicon:dry
npm run mixpanel:lexicon
```

## Verification (run after dashboard setup + 24h soak)

Use the audit cron script (`npm run mixpanel:verify` — already exists at [`scripts/mixpanel/verify.ts`](../../scripts/mixpanel/verify.ts)) to check:

| Check | Pass criterion |
|---|---|
| `tool_visit_redirected` Mixpanel vs `click_logs` table | delta < 5% (server-side, no ad-block risk) |
| `search_query_submitted` Mixpanel vs `search_logs` table | delta < 15% (client-side, ad-block expected) |
| `page_viewed` Mixpanel vs `page_views` table | delta < 25% |
| `signup_completed` server fires vs Supabase `auth.users` new rows | EXACTLY 1:1 |
| Distinct `distinct_id` count per known user | ≤2 (one pre-signup + one post-merge). >2 means identity stitching is broken — re-check project Identity Merge setting. |

Any failed audit = P0 per the project's "data quality is the business" rule.

## Cost — $0/mo

| Component | Free tier | Projected usage @ 30k MAU | Monthly cost |
|---|---|---|---|
| Mixpanel events | 20M / mo | ~200k events / mo (with max capture) | $0 |
| Mixpanel MTUs | 1M | ~30k | $0 |
| Mixpanel Boards / Funnels / Cohorts / Insights / Alerts | unlimited | — | $0 |
| Mixpanel Service Account API | unlimited | <1k/day | $0 |
| Mixpanel data retention | 12 months | — | $0 |
| Microsoft Clarity (session replay + heatmaps) | unlimited | all sessions | $0 |
| **Total** | | | **$0/mo** |

Triggers for Mixpanel upgrade: only at >1M MTU OR >20M events/mo. Both far beyond current scale.

## Env vars

| Var | Purpose | Required |
|---|---|---|
| `NEXT_PUBLIC_MIXPANEL_TOKEN` | client SDK token | yes |
| `NEXT_PUBLIC_MIXPANEL_PROXY_PATH` | proxy path (set to `/mp`) | yes |
| `NEXT_PUBLIC_MIXPANEL_API_HOST` | fallback if proxy missing (EU cluster URL) | optional |
| `MIXPANEL_PROJECT_ID` | server scripts | yes |
| `MIXPANEL_SERVICE_ACCOUNT_USERNAME` | provisioning + verify | yes |
| `MIXPANEL_SERVICE_ACCOUNT_SECRET` | provisioning + verify | yes |
| `MIXPANEL_API_HOST` | server-side host for /track | optional (defaults to EU) |
| `NEXT_PUBLIC_CLARITY_PROJECT_ID` | Clarity session replay | yes (set to `wtq115a7o7`) |

## Op runbook

**Weekly:**
- Review the Per-Tool Audience Snapshot boards for tools you might pitch to (high z-score on `tool_page_viewed` = sudden interest).
- Skim the alerts inbox. Any fired alert = investigate within 24h.

**Monthly:**
- Run `npm run mixpanel:verify` to confirm Mixpanel vs DB delta is within thresholds.
- Run `npm run mixpanel:lexicon` if events.ts has changed.

**On adding a new event:**
- See [mixpanel-events.md → Adding a new event](mixpanel-events.md#adding-a-new-event).

## Lineage

This implementation produced by Phase 8.g (sub-stages g.1 through g.6). See [`Phase8(site-overhaul-v2)/build-log.md`](../../../Phase8(site-overhaul-v2)/build-log.md) for the full commit history.

Replaced two previous docs (both removed in g.5):
- ~~`mixpanel-playbook.md`~~ — manual dashboard setup runbook, superseded by `provision-dashboards.ts` + this doc
- ~~`tracking-mechanisms-and-goals.md`~~ — event spec, superseded by [`mixpanel-events.md`](mixpanel-events.md)
