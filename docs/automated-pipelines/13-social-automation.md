# Workflow 13: Social Media Automation (approval-gated, multi-platform)

> **Phase 13 (shipped 2026-06-30) + Round 2 hardening/upgrades (2026-06-30).** An in-house tool that
> researches what to post from our live data, drafts platform-tailored **text + branded graphics**, runs
> every draft through **strict SOPs**, waits for a **one-tap human approval**, then **posts from the cloud
> on schedule** (laptop can be off) across **LinkedIn / X / Instagram / Reddit**, and learns from
> engagement. Engine: **DeepSeek** (copy) + **`next/og`** (graphics, $0). Setup/credentials:
> [`../Phase 13 Social Media Automation/operator-setup.md`](../Phase%2013%20Social%20Media%20Automation/operator-setup.md).
> Design + build log: [`../Phase 13 Social Media Automation/`](../Phase%2013%20Social%20Media%20Automation/).

## Purpose
Give RightAIChoice a consistent, professional social presence — distribution + backlinks + brand — without
an agency, a paid scheduler, or the founder hand-posting. Every post is **drafted from verified live data**,
**branded**, **human-approved**, **posted on schedule from the cloud**, and **measured** so the brain favours
what works. **Safe-by-default: every platform is OFF until its `*_ENABLED` flag is set AND a connected,
non-paused account exists** — the publish cron simply skips unconnected platforms (never fails them).

## Schedule (Vercel crons — `vercel.json`)
| Path | Schedule (UTC) | What / why |
|---|---|---|
| `/api/cron/social-strategy` | `0 4 * * 1` | **Plan (weekly).** Per platform, crafts this week's strategy from last week + engagement, aligned to the two brand goals → `social_strategies`. Runs before the daily draft so drafting follows it. |
| `/api/cron/social-draft` | `0 5 * * *` | **Research → draft.** Fills the queue from live data, steered by this week's strategy; X budget-gated; optional A/B + evergreen recycling. |
| `/api/cron/social-publish` | `*/15 * * * *` | **Publish.** Posts approved+due items; re-checks SOPs at post time; **atomic claim** prevents double-posting; skips unconnected/paused platforms. |
| `/api/cron/social-metrics` | `0 */6 * * *` | **Measure.** Pulls per-post engagement → `social_metrics` (feeds insights). |
| `/api/cron/social-approval-digest` | `0 9 * * *` | **Nudge.** Emails (Resend) + Slacks the founder the pending-approval queue. |
| `/api/cron/social-token-refresh` | `0 3 * * *` | **Keep alive.** Refreshes OAuth tokens before expiry; flags dead refreshes. |

All six wrap `cronRoute()` → bearer-auth (`CRON_SECRET`) + a `pipeline_runs` row, so they appear in
`/admin/health` + the `alert-failed-pipelines` alerter like every other pipeline.

## How it works — step by step

### Step 0 — Plan the week (`lib/social/strategy.ts`, weekly)
**What:** each Monday, per platform, `buildWeeklyStrategy()` reads **last week's** posted content +
engagement (via the insights scorer) and DeepSeek crafts a brief — focus, themes, formats, cadence,
rationale, goal-alignment — explicitly tied to the two brand goals (**strong brand awareness** +
**more engagement & users**) → stored in `social_strategies`. **Why:** so posting is a goal-directed weekly
campaign, not just good one-off content. **How:** the brief is injected into Step 2's drafting prompt
(`strategyHint`), so each draft pursues the plan. No data yet → a sensible "establish presence" starter.
Shown per platform in the admin with a one-tap **Regenerate**.

### Step 1 — Research first (`lib/social/sources.ts`)
**What:** `buildCandidatePool()` turns our LIVE verified catalog into a ranked pool of postable candidates:
State-of-AI **stat cards** (freshness %, pricing mix, viability), top-viability **tool spotlights** (with
the tool's real site as the source), a **freshest-tools roundup**, and a milestone **quote**. **Why:** the
research-first principle (Appendix A0 of the plan) — no automation invents anything; every candidate carries
the exact facts AND a pre-filled graphic spec built from real numbers, so a graphic can never show a fake
stat. **How:** reuses `buildStateOfAI`/`loadDataset` (the same data behind the GEO report). Ranked by
`0.30·freshness + 0.25·novelty + 0.30·expectedPerformance + 0.15·strategicFit` (the expectedPerformance term
comes from the insights model — neutral until engagement data exists).

### Step 2 — Draft (`lib/social/brain.ts` + `prompts.ts`)
**What:** for each platform, the brain ranks/dedupes candidates, then DeepSeek writes **platform-tailored
copy** grounded only in the candidate's facts and our editorial voice. **How / smart bits:**
- **Best-time scheduling:** `nextSlot()` schedules each post in the platform's historically best-performing
  hour (from the insights `byHourUTC` model) when data exists, else a static optimal rotation.
- **UTM tagging:** every outbound link gets `utm_source/medium/campaign` (`lib/social/util.ts withUtm`) so
  GA attributes social traffic; the X length check counts URLs as 23 chars (t.co) so UTM links don't trip 280.
- **A/B variants** (`SOCIAL_AB_VARIANTS=1`): two distinct takes per candidate, tagged `brain_meta.variant_group`.
- **Evergreen recycling** (`SOCIAL_RECYCLE=1`): `recycleTopPerformers()` re-queues a top-quartile posted item
  >30d old, **rephrased by DeepSeek** (variation, never a verbatim repost).
- Retries the model call once on malformed JSON before giving up. Cost ≈ **$0.001 / draft**.

### Step 3 — SOP gate (`lib/social/sops.ts`) — runs BEFORE a draft enters the queue
`preQueueGate` composes: **sourcing** (must cite a real URL), **voice** (rejects banned AI-tell phrases),
**platform-fit** (char/hashtag/graphic/link rules per platform), **variety/dedup** (angle hash + global
cross-date link dedup). See **Strict SOPs** below. Drafts that fail are recorded, never queued.

### Step 4 — Human approval (`app/admin/social/page.tsx` + `actions.ts`)
**What:** the founder reviews the queue at **`/admin/social`** (groups: Awaiting / Approved & scheduled by
day / History), sees each post's text, **live graphic preview**, char-count-vs-limit, link + sources, and
**approves / edits / reschedules / rejects** — or **bulk-approves**, or **pauses a platform**. **Why:** the
locked decision — *nothing posts without approval*. Editing re-runs the voice + platform-fit gate; only legal
status transitions are allowed.

### Step 5 — Publish from the cloud (`app/api/cron/social-publish` + `lib/social/publishers/*`)
Every 15 min: select `approved` + due rows → for each: check the platform is connected/enabled/not-paused →
**re-check SOPs at post time** (X budget, daily cap/no-burst spacing, full Reddit safety) → **atomically
claim the row** (`publish_started_at`, migration 179) so overlapping runs can't double-post → call the
platform publisher → record `posted` + external id/url + cost, or leave `approved` on a transient error, or
`failed` on a hard error. Unconnected/paused platforms are skipped (left approved).

### Step 6 — Measure (`app/api/cron/social-metrics` + `lib/social/insights.ts`)
Every 6h: for recently posted items, each publisher's `fetchMetrics()` pulls engagement → appended to
`social_metrics` (time series).

### Step 7 — Learn (`lib/social/insights.ts`)
`buildPerformanceModel()` reads `social_metrics × social_posts`, scores engagement (comments ×3, shares ×5),
and aggregates by platform / format / hour. `expectedPerformance()` feeds Step 1's ranking and Step 2's
best-time scheduling — the loop that makes the brain "analyse everything." Neutral until data accrues.

## Per-platform process (auth · endpoints · media · limits · cost)
| Platform | Auth | Post endpoint | Media | Limits / notes | Cost |
|---|---|---|---|---|---|
| **LinkedIn** (company page) | OAuth2, scope `w_organization_social` (Community Mgmt API, ~2–4wk review) | `POST /rest/posts` (author = org URN) | Images API register-upload → asset URN → `content.media` | post id from `x-restli-id` header; 60-day token + ~1yr refresh | free |
| **X / Twitter** | OAuth2 user token (+`offline.access`) | `POST /2/tweets` (+`media.media_ids`, `reply.in_reply_to_tweet_id` for threads) | chunked v1.1 upload INIT/APPEND/FINALIZE | 280 chars (URL=23 via t.co); threads supported | **paid** ~$0.015/post · $0.20 w/link — hard monthly cap |
| **Instagram** (Business/Creator) | Long-lived Graph token (Meta App Review, ~2–4wk) | 2-step: `POST /{ig}/media` (container) → `/{ig}/media_publish` | needs a **public image URL** (our graphic route); link → **first comment** | image-mandatory; no inline caption links | free |
| **Reddit** | OAuth user token on an aged/karma'd account | `POST /api/submit` (self or link) | n/a (link/self) | strict ban-avoidance; thread → top comment via `/api/comment` | free |

The branded graphic is served at the **public** route `/api/social/graphic/[id]` (Instagram requires a
publicly reachable URL; the others fetch the PNG to upload natively).

## Strict SOPs (`lib/social/sops.ts` — pure, unit-tested functions)
1. **Truth-only sourcing** — a draft with no real source URL is rejected.
2. **Brand voice** — rejects the editorial-voice banned phrases (the #1 AI tells).
3. **Platform-fit** — per-platform char limit (X t.co-aware), hashtag cap, graphic requirement (IG), reddit-no-hashtags.
4. **Variety / dedup** — no repeated angle within the variety window; **global cross-date link dedup** per platform (UTM-stripped; cross-platform allowed).
5. **X budget governor** — hard monthly cap; blocks pricier link-posts first; the brain skips X drafts that
   would breach the cap (counting posted **and** approved/scheduled spend); the publish cron re-checks at post time.
6. **Reddit ban-avoidance** — allowlist-only subreddits, account age/karma minimums, never the same link
   across subs, ≤1 post/sub/week, **always manual-approve**; re-checked at post time.
7. **Scheduling intelligence** — per-platform optimal windows + min spacing (no bursts) + daily cap; best-time
   from engagement data when available.
8. **Approval gate (mandatory)** — draft → human approve → schedule → post. Nothing posts unapproved.
9. **Pause switch** — `social_accounts.meta.paused` stops a platform without disconnecting it.
10. **Failure handling** — retryable vs. hard errors; atomic claim prevents double-posts; everything logs to `pipeline_runs`.

## Data model (migrations 178 + 179 + 180)
- **`social_posts`** — the approval queue + audit log: platform, kind, status
  (`draft→approved→scheduled→posted|failed|cancelled`), copy, hashtags, link_url, graphic_template +
  graphic_data + graphic_size, subreddit, source_refs, content_hash, brain_meta (angle/score/variant/thread/
  title/recycledFrom), scheduled_at, posted_at, external_post_id/url, cost_usd, error, **publish_started_at**
  (R2 claim/lock). RLS, service-role only.
- **`social_accounts`** — per-platform OAuth connection: access/refresh tokens, expiry, scope,
  external_account_id (org URN / ig-user-id / reddit username), status (`connected|disconnected|error`),
  **meta.paused**. RLS, service-role only.
- **`social_metrics`** — per-post engagement time series (impressions/likes/comments/shares/clicks + raw).
- **`social_strategies`** — per-platform **weekly strategy** (one row per platform per week): focus, themes,
  post_types, cadence, rationale, goal_alignment, based_on (last-week summary). Drives the admin strategy
  card and feeds the drafting brain. RLS, service-role only.

## Key Files (every file in the system)
**Core engine (`lib/social/`)**
| File | Role |
|---|---|
| `types.ts` | shared types (Platform, SocialPost, SocialAccount, DraftProposal) |
| `sops.ts` | the SOP rulebook (budget, reddit safety, voice, platform-fit, dedup, scheduling) — pure |
| `sources.ts` | research layer — builds the ranked candidate pool from live data |
| `prompts.ts` | DeepSeek system/user prompts (voice + platform rules + JSON contract) |
| `brain.ts` | orchestration: research→rank→write→gate→best-time→queue; A/B; `recycleTopPerformers` |
| `insights.ts` | engagement model + `expectedPerformance` (the learning loop) |
| `strategy.ts` | per-platform **weekly strategy** engine (goal-aligned; from last week + insights; feeds the brain) |
| `util.ts` | UTM tagging, canonical link, X t.co length |
| `graphics/templates.tsx` | 5 branded templates × 3 sizes (stat_card, tool_spotlight, news_roundup, comparison, quote) |
| `graphics/render.tsx` | `next/og` ImageResponse wrapper + font loader |

**Publishers (`lib/social/publishers/`)**
| File | Role |
|---|---|
| `types.ts` | the common `Publisher` interface (isEnabled/publish/fetchMetrics) |
| `util.ts` | postJson (+headers), retryable mapping, token-usability, 280 clamp, `notPaused` |
| `x.ts` | X v2 tweet + chunked media upload + threads + cost |
| `reddit.ts` | `/api/submit` self/link + thread top-comment |
| `linkedin.ts` | `/rest/posts` to company page + image asset upload |
| `instagram.ts` | 2-step container→publish + first-comment link + URL pre-check |
| `refresh.ts` | OAuth refresh (X/LinkedIn/Reddit grant; IG long-lived) + `selectExpiring` |
| `index.ts` | registry `getPublisher`, `loadAccount`, `publicGraphicUrl`, `publishOne` |

**Routes & admin**
| File | Role |
|---|---|
| `app/api/social/graphic/[id]/route.tsx` | public PNG render route (DB row or `/preview`) |
| `app/api/cron/social-{strategy,draft,publish,metrics,approval-digest,token-refresh}/route.ts` | the 6 crons |
| `app/admin/social/page.tsx` | approval dashboard (queue, budget meter, connections, timeline) |
| `app/admin/social/actions.ts` | gated actions: approve/unapprove/cancel/reschedule/edit/bulkApprove/setPlatformPaused |
| `components/admin/social-post-card.tsx` | per-post card (preview, char-count, actions) |
| `components/admin/social-controls.tsx` | bulk-approve + pause/resume controls |

**CLI, tests, migrations**
| File | Role |
|---|---|
| `scripts/social.ts` | `social:pool` / `:draft` / `:status` / `:preview` / `:insights` / `:strategy` |
| `scripts/social/render-samples.ts` | offline PNG sample renderer |
| `scripts/social/{sops,publishers,insights,upgrades,strategy}.test.ts` | **123 unit tests** |
| `scripts/social/{verify-route,verify-publish-cron,verify-claim}.ts` | server-free live harnesses |
| `supabase/migrations/178_social_automation.sql` | tables + RLS |
| `supabase/migrations/179_social_round2.sql` | `publish_started_at` claim column + index |
| `supabase/migrations/180_social_strategies.sql` | `social_strategies` table (weekly plan) |

## Failure handling & recovery
| Symptom | Cause | Fix |
|---|---|---|
| Posts stuck `approved`, never publish | platform not connected / paused | connect via `operator-setup.md`; resume in `/admin/social` |
| `error: retryable: …` on a post | transient platform 5xx/429 | left approved; auto-retries next 15-min run |
| Account shows `error` in the strip | token refresh failed near expiry | reconnect that account (re-run its OAuth) |
| X drafts skipped | monthly cap reached | raise `X_MONTHLY_CAP_USD` or wait for next month; brain prefers no-link posts near the cap |
| Instagram container fails | graphic URL unreachable | check `SOCIAL_PUBLIC_ORIGIN` (must be public https) |
| Reddit post skipped | sub off allowlist / account too new | adjust `REDDIT_ALLOWLIST` / use an aged account |

## Cost & observability
- **Engine:** DeepSeek ≈ $0.001/draft; **graphics $0** (rendered from code). **Platforms:** free except X
  (pay-per-use, hard-capped + metered in `/admin/social`).
- **Logging:** every cron + CLI run → `pipeline_runs` (visible at `/admin/health`); failures alerted by
  `alert-failed-pipelines`; daily approval digest emails the founder.

## CLI & tests
```
npm run social:pool            # candidate pool (no cost)
npm run social:draft -- --dry  # plan; drop --dry to write drafts
npm run social:status          # queue counts
npm run social:preview -- --id=<uuid>
npm run social:insights        # performance model
npm run social:strategy -- --platform=x   # generate + print this week's strategy
npm run test:social-sops | test:social-publishers | test:social-insights | test:social-upgrades | test:social-strategy  # 123 tests
npm run social:verify-claim    # proves the atomic claim blocks double-posting (live)
```

## References
- Operator setup / credentials: [`../Phase 13 Social Media Automation/operator-setup.md`](../Phase%2013%20Social%20Media%20Automation/operator-setup.md)
- Plan + build log: [`../Phase 13 Social Media Automation/`](../Phase%2013%20Social%20Media%20Automation/)
- Manual runs: [06-manual-runs.md](./06-manual-runs.md) · Ops runbook: [sop-pipelines-master.md](./sop-pipelines-master.md)
