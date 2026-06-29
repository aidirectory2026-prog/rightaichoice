# Plan — Phase 13: Social Media Automation · Opus 4.8 (1M)

> Authoritative, in-depth plan. Progress in `build-log.md` (same folder). CODE in worktree
> `../rac-social` (branch `phase13-social`) → `main` via squash PR. DOCS in the main repo. New automations
> also documented in `docs/automated-pipelines/`. Section rules: dated docs, **log every activity**,
> verify-then-log, recurring engines email the founder.

---

## 1. Objective & Definition of Done
A professional, **in-house** social automation tool (admin-panel-style) for **LinkedIn, X/Twitter,
Instagram, Reddit**, with a smart "brain" that researches what to post, drafts platform-tailored **text +
branded graphics**, enforces **strict smart SOPs**, and **posts on schedule from the cloud (laptop off)** —
pending a **one-tap approval**.

**Definition of Done (acceptance — the phase is complete only when ALL are true):**
1. From `/admin/social`, a draft (text + rendered graphic) can be **approved + scheduled in one flow**, and
   the cloud scheduler **actually posts it** to a live platform, recording the post URL + cost + metrics.
2. The **brain auto-fills the queue daily** with on-voice, cited, varied, platform-correct drafts.
3. **In-house graphics** render correctly at every platform size (verified by eye + in production).
4. **All four publishers exist and pass an integration test** (X live-capped, Reddit to a test sub,
   LinkedIn + Instagram verified against their APIs once approvals land — gated behind a feature flag until then).
5. **SOPs are enforced + unit-tested** (X budget cap pauses X; Reddit dedup/age/karma blocks unsafe posts;
   variety/voice gates work; nothing posts unapproved).
6. **Weekly approval-digest email** lands; every cron/script logs to `pipeline_runs`; `/admin/social` shows
   queue + schedule + connection health + budget meter + insights.
7. Everything documented (build-log + `docs/automated-pipelines/`), code merged to `main`, verified live.

## 2. Locked decisions
All 4 platforms · smart approval gate (nothing posts unapproved) · X with a hard monthly budget cap ·
in-house + free (only X costs, capped) · feature-flag each publisher so the tool ships before all approvals land.

## 3. Platform reality (researched 2026) — drives sequencing
| Platform | Cost | Setup / lead time | Publish mechanics | Risk |
|---|---|---|---|---|
| LinkedIn (org page) | Free | Community Mgmt API `w_organization_social` — 2–4 wk review + verified app; token 60d + refresh 1yr | `POST /rest/posts`, author = org URN, `LinkedIn-Version` header | Low post-approval |
| Instagram (Business) | Free | Business/Creator + linked FB Page + Meta app + App Review 2–4 wk; `instagram_content_publish` | 2-step: `POST /{ig-user}/media` (needs PUBLIC image URL) → `/{ig-user}/media_publish`; ≤50 posts/24h | Low |
| X / Twitter | **Paid** ~$0.015/post · $0.20 w/link | X dev acct + billing + OAuth2; instant | `POST /2/tweets` (+ media upload) | Cost only |
| Reddit | Free | OAuth (read creds exist); posting needs user token + aged/karma'd account | `POST /api/submit` | **High ban-risk** → strict SOP, always manual-approve |

---

## 4. Architecture — the "Social Brain" (platform-agnostic core, pluggable publishers)
```
SOURCES ─► BRAIN (DeepSeek) ─► drafts ─► SOP GATE ─► social_posts(draft)
 (live data + news)              │                         │
                          GRAPHICS template pick      ADMIN /admin/social: approve/edit/schedule
                                                            │
                          social-publish cron (15m) ◄── approved+scheduled
                                                            │
                          PUBLISHER[platform].publish() ─► live post + external_id + cost
                                                            │
                          social-metrics cron (6h) ─► social_metrics ─► INSIGHTS ─► back into BRAIN
```
All new code: `lib/social/*`, `app/admin/social/*`, `app/api/cron/social-*`, `app/api/social/*`,
`scripts/social.ts`.

---

## 5. Data model (migration 178 `social_automation.sql` — 3 tables, RLS service-role-only, + rollback)
**`social_posts`** — the queue + audit log:
`id · platform (li|x|ig|reddit) · kind (stat_card|tool_spotlight|news_roundup|comparison|quote|text) ·
status (draft|approved|scheduled|posted|failed|cancelled) · copy text · hashtags text[] · link_url ·
graphic_template text · graphic_data jsonb · graphic_size text · subreddit text (reddit) ·
source_refs jsonb (what data/news it's built from) · content_hash text (variety/dedup) · brain_meta jsonb
(angle, why-chosen, performance-prediction) · scheduled_at · posted_at · external_post_id · external_url ·
cost_usd numeric · error text · created_at · updated_at`. Indexes: (status, scheduled_at), (platform,
content_hash). 
**`social_accounts`** — per-platform connection: `platform unique · display_name · access_token ·
refresh_token · token_expires_at · scope · external_account_id (org URN / ig-user-id / reddit user) ·
status (connected|disconnected|error) · meta jsonb · updated_at`. (Service-role only; tokens not exposed to
client.)
**`social_metrics`** — engagement over time: `id · post_id fk · captured_at · impressions · likes ·
comments · shares · clicks · raw jsonb`. Index (post_id, captured_at).

---

## 6. The Brain — `lib/social/brain.ts` (the "smart" part, detailed)
A deterministic pipeline wrapping DeepSeek (`callDeepSeek`, JSON mode):
1. **Gather** candidate material from `lib/social/sources.ts` (see §8 sources).
2. **Score & shortlist** candidates by: freshness, novelty vs recent `social_posts` (dedup by
   `content_hash`), and past performance of similar angles (from `social_metrics`).
3. **Per platform**, build a DeepSeek prompt with: the candidate facts (+ source URLs), the platform's SOP
   rules (§9), the brand voice (`lib/copy/editorial-voice.ts`), and 2–3 few-shot examples. DeepSeek returns
   JSON: `{ kind, copy, hashtags[], link_url?, graphic_template, graphic_data, schedule_hint }`.
4. **Validate** each draft against the SOP gate (truth/cite, length, hashtag count, link policy, voice,
   variety). Reject + regenerate (max 2 retries) on failure.
5. **Assign a schedule slot** per platform windows.
6. **Insert** as `social_posts(status=draft)`. Never auto-approves.
Prompt design lives in `lib/social/prompts.ts` (per-platform system prompts + few-shots). Cost ≈ $0.001/draft.

## 7. Graphics engine — `lib/social/graphics/*` (in-house, $0)
- `lib/social/graphics/render.tsx` — shared `ImageResponse` renderer; brand tokens (`#10b981`/`#34d399`,
  `#09090b`, Geist font from `/public/fonts`).
- Templates (each a function `(data, size) => JSX`): **stat_card** (one big number + label + source),
  **tool_spotlight** (logo/name/tagline/viability), **news_roundup** (3–5 headlines), **comparison**
  (A vs B), **quote/milestone**.
- Sizes: `1080x1080` (IG square), `1080x1350` (IG portrait), `1200x675` (X/LinkedIn), `1200x630` (link OG).
- **Public render route** `app/api/social/graphic/[id]/route.tsx` — renders the PNG for a `social_posts` row
  (Instagram requires a public image URL; this provides it). Cached.

## 8. Sources — `lib/social/sources.ts`
Returns a ranked `Candidate[]` (`{ topic, facts[], sources[], suggestedKind, freshnessTs }`) from:
`buildStateOfAI`/`buildStateOfCategory` (stat cards), `loadDataset` (top/new/viability-mover tools →
spotlights), `latest-updates` + `scrape-{news,hn,reddit}` (news roundups), comparisons table (head-to-head).
Every candidate carries verifiable facts + source URLs (truth-only SOP).

## 9. SOP engine — `lib/social/sops.ts` (strict + smart; config + enforced functions)
- **Per-platform config:** char limits (X 280; LI ~3000; IG caption ~2200), hashtag policy (X ≤2, LI ≤3,
  IG ≤10–15, Reddit 0), link policy (LI/Reddit text-link; IG link-in-bio; X link cost-gated),
  graphic-required (IG yes), posting windows (per platform, timezone-aware), max/day, min spacing.
- **`withinXBudget(costThisMonth, postCost)`** — hard monthly cap; prefer no-link as cap nears; auto-pause.
- **Reddit safety:** subreddit allowlist + per-sub rule notes; account age/karma minimums; **never same
  link across >1 sub** (checked vs history); rolling-window rate + exponential backoff; per-sub weekly cap;
  **always manual-approve**.
- **`voiceGate(text)`** — bans clichés per `editorial-voice.ts`; enforces name/positioning/CTA.
- **`isDuplicate(content_hash, days)`** — variety: no repeat angle/graphic within N days.
- **`canPublishNow(post)`** — composite gate the publish-cron calls before any send.
Each rule is unit-tested in S1/S5.

## 10. Publishers — `lib/social/publishers/{x,reddit,linkedin,instagram}.ts`
Common interface `{ id, isEnabled(), publish(post): {externalId,url,costUsd}, fetchMetrics(post) }`.
Per-platform: OAuth/token from `social_accounts`, media upload (X/IG), the post call, rate-limit handling,
cost accounting (X). Each behind a **feature flag** (`isEnabled()` = creds present) so the tool ships and
each platform switches on when its creds/approval land. Registry `lib/social/publishers/index.ts`.

## 11. Crons (cloud — the laptop-off layer) + Admin + CLI
- **Crons** (cronRoute + vercel.json): `social-draft` (daily — brain fills queue), `social-publish`
  (every 15 min — posts approved+scheduled whose time ≤ now, via `canPublishNow` + publisher),
  `social-metrics` (6-hourly), `social-approval-digest` (daily — Resend email + Slack of pending drafts),
  `social-token-refresh` (daily — LinkedIn/IG/X refresh).
- **Admin** `/admin/social` (+ `actions.ts`, nav entry): queue with live text + graphic preview;
  approve/edit/reject/reschedule; calendar; per-platform connection + token-health strip; **X budget
  meter**; insights (engagement by platform/format/time).
- **CLI** `scripts/social.ts`: `social:draft`, `social:status`, `social:preview` (renders a sample graphic).

---

## 12. Step-by-step build plan (each step: build → verify ×N → upgrade → document → report → commit)

**S0 — Setup ✅ (done 2026-06-30):** worktree `../rac-social`, docs folder, baseline.

**S1 — Data + SOP foundation.**
- 1a migration 178 (`social_posts`, `social_accounts`, `social_metrics` + rollback); apply live; verify columns.
- 1b `lib/social/sops.ts` (configs + rule fns) + `lib/social/types.ts`.
- 1c unit tests for SOP rules (budget cap, Reddit dedup, variety, voice, window). Verify: `tsc` + tests pass.

**S2 — Graphics engine.**
- 2a `render.tsx` + 5 templates; 2b public route `/api/social/graphic/[id]`; 2c `social:preview` CLI.
- Verify: render each template × each size → eyeball PNGs (brand-correct, legible, no overflow).

**S3 — Sources + Brain + draft.**
- 3a `sources.ts` (candidate pool from live data); 3b `prompts.ts` + `brain.ts` (DeepSeek drafts + SOP
  validate + slot); 3c `scripts/social.ts social:draft` → inserts drafts. Verify: drafts are on-voice,
  cited, varied, platform-correct, with a graphic spec; appear in `social_posts(draft)`.

**S4 — Admin panel.**
- 4a `/admin/social/page.tsx` (queue + live preview + calendar + budget meter + connection health +
  insights); 4b `actions.ts` (approve/edit/reject/reschedule, requireAdmin); 4c nav entry. Verify: approve
  flips status + sets scheduled_at; preview renders the graphic; edit persists.

**S5 — Publishers (pluggable).**
- 5a interface + registry; 5b **X** (budget-capped) + **Reddit** (manual-approve, safety SOP) — prove the
  loop end-to-end with a real post (X capped / Reddit test sub); 5c **LinkedIn** + **Instagram** adapters
  written + feature-flagged (verified against API once approvals land). Verify: integration test posts +
  records external_id/url/cost.

**S6 — Scheduler + crons.**
- 6a `social-publish` (15-min) + `social-draft` (daily); 6b `social-metrics` (6h) + `social-token-refresh`;
  6c `social-approval-digest` email/Slack; 6d vercel.json entries. Verify: an approved post auto-publishes
  server-side at its slot; digest email lands; metrics populate; all log to `pipeline_runs`.

**S7 — Insights loop + operator setup.**
- 7a feed `social_metrics` performance back into brain scoring; 7b write the per-platform operator-setup
  checklist doc (exact clicks + env keys). Verify: brain weights by past performance; checklist complete.

## 13. Operator setup (parallel; exact checklist delivered in S7)
LinkedIn app + Community Mgmt API review (~2–4 wk) · Instagram Business + FB Page + Meta app review (~2–4 wk)
· X dev acct + billing + monthly cap + OAuth2 keys · Reddit posting OAuth app + aged/karma'd account.
Env keys added to `lib/env.ts`: `LINKEDIN_*`, `META_*`/`INSTAGRAM_*`, `X_*`, `REDDIT_*` (posting).

## 14. End-to-end verification (acceptance)
Run the §1 Definition-of-Done checklist: graphics eyeballed per size; `social:draft` yields valid drafts;
admin approve→schedule works; the publish cron posts a real approved item (X capped or Reddit test sub) and
records id/cost; metrics cron populates; SOP unit tests green (budget cap, Reddit dedup, variety, voice);
crons run server-side in prod (laptop-off); approval digest email received; everything in `pipeline_runs`.

## 15. Reuse (verified paths)
`app/opengraph-image.tsx`, `app/api/og/stack/route.tsx` (ImageResponse) · `lib/plan/deepseek.ts` ·
`lib/pipelines/with-logging.ts` (cronRoute/runScriptedPipeline) · `lib/admin/{require-admin,nav}.ts` ·
`app/admin/authority/{page,actions}.ts` · `scripts/pr-pitch.ts` + `lib/pr/*` + `supabase/migrations/175_pr_pitches.sql`
(queue pattern) · `app/api/cron/{new-signup-alert,alert-failed-pipelines}/route.ts` (Resend+Slack) ·
`lib/geo/state-of-ai.ts`, `lib/geo/llms-dataset.ts`, `lib/cron/latest-updates.ts`, `lib/cron/scrape-*.ts`
· `lib/copy/editorial-voice.ts` · `lib/cron/supabase-admin.ts` · `lib/env.ts`.

---

# Appendix A — Research-first SOPs + the Brain (in depth)

## A0. RESEARCH-FIRST PRINCIPLE (applies to EVERY automation — non-negotiable)
**No automation acts blind. Each runs a RESEARCH PASS first, then acts on the evidence it gathered.**
Concretely, per automation:
- **`social-draft` (the brain):** before writing anything, research → (a) **what's new/trending** in AI
  (`latest-updates` + `scrape-news/hn/reddit`), (b) **our freshest data** (`state-of-ai`, `llms-dataset` —
  new tools, viability movers, stat shifts), (c) **what we've already posted** (dedup vs `social_posts`),
  (d) **what has performed** (`social_metrics` — which kinds/angles/times won). Output is evidence-led, not
  generic. Each draft stores its `source_refs` + `brain_meta.why`.
- **scheduler (slotting):** before assigning a time, research the best window from (a) the per-platform
  config windows **and** (b) **our own best-performing post times** (`social_metrics`). Smart, not fixed.
- **Reddit publish → SUBREDDIT RECON (mandatory):** before any Reddit post, fetch `/r/{sub}/about.json` +
  `/r/{sub}/about/rules.json` + recent top posts → confirm self/link posts are allowed, required flair,
  title rules, self-promo tolerance, and that our post genuinely fits. **Abort if rules forbid.** Never
  the same link to >1 sub.
- **publish (all platforms):** immediately before sending, re-run `canPublishNow` research (budget left,
  rate-window clear, not a duplicate, token healthy).
- **`social-metrics`:** research engagement, **attribute** it to kind/angle/time, and **write learnings**
  the brain reads next cycle (closing the loop).
This principle is enforced in code — each automation's first phase is a `research()` call whose result is
logged to `pipeline_runs.metadata` so we can see *what it knew* before it acted.

## A1. Brain candidate scoring (selection before drafting)
`score = 0.30·freshness + 0.25·novelty(1 − maxSimilarityToRecentPosts) + 0.30·expectedPerformance(prior
metrics for this kind/angle) + 0.15·strategicFit(drives to money pages / showcases our data edge)`.
Take top-N per platform per day (N from SOP config). Ties broken by freshness.

## A2. DeepSeek prompt structure (`lib/social/prompts.ts`)
- **System prompt:** role ("social editor for RightAIChoice") + brand voice rules (from
  `editorial-voice.ts`, ban-list included) + the target platform's hard rules (chars/hashtags/link/graphic)
  + **truth-only** ("use ONLY the provided facts; cite a source; never invent numbers") + the JSON output
  schema instruction.
- **User prompt:** the chosen candidate's facts + source URLs + platform + `recentPostsToAvoid` (titles/
  hashes from history) + the target schedule window + which graphic templates are available.
- **Output JSON schema:** `{ kind, copy, hashtags[], link_url?, graphic_template, graphic_data{}, schedule_hint, why }`.
- **Few-shot:** 2–3 exemplary posts per platform (good shapes) embedded.
- **Validation loop:** parse JSON → run the SOP gate (A3) → on failure, re-prompt with the specific
  violation (max 2 retries) → else reject the candidate and move on. All via `callDeepSeek` (JSON mode).

## A3. Full SOP rule table (thresholds — `lib/social/sops.ts`)
| Rule | LinkedIn | X / Twitter | Instagram | Reddit |
|---|---|---|---|---|
| Max copy chars | ~3,000 | 280 | ~2,200 caption | 300 title / self-text body |
| Hashtags | ≤3 | ≤2 | 8–15 curated | 0 (looks spammy) |
| Link in post | yes | **cost-gated** ($0.20) — prefer in 1st comment near cap | no (link-in-bio) | sparing, never same link to >1 sub |
| Graphic | optional | optional (boosts) | **required** | optional (often text/discussion) |
| Posting windows (IST-aware) | Tue–Thu 9–11am, 5–6pm | 8–10am, 12pm, 5–7pm | 11am–1pm, 7–9pm | sub-dependent; off-peak avoided |
| Max/day | 1–2 | 2–3 | 1 | **≤1 per sub, ≤2 total/day** |
| Min spacing | 4h | 2h | — | 24h/sub |
| Approval | gate | gate | gate | **gate (always manual)** |
- **X budget governor:** monthly cap `X_MONTHLY_BUDGET_USD` (default $10); per-post cost = $0.20 (link) or
  $0.015 (no link); track month-to-date in `social_posts.cost_usd`; **prefer no-link / pause X** as cap nears;
  hard-stop at cap; meter shown in admin.
- **Reddit safety (hard):** subreddit allowlist (config) + per-sub rule notes; **account age ≥30d, comment
  karma ≥100** (precheck); never same `link_url` across >1 sub (history check); rolling-window rate + exp
  backoff; per-sub ≤1 post/week; recon must pass.
- **Voice gate:** `voiceGate(text)` rejects clichés + enforces name/positioning; **Variety:** `isDuplicate
  (content_hash, 14d)`; **Failure:** retry+backoff, on auth/cap failure pause that platform + alert.

---

# Appendix B — Per-platform technical specs (verified via research; exact payloads re-confirmed against live docs in S5)

## B1. LinkedIn (organization page)
- **Auth:** OAuth 2.0, 3-legged; scope `w_organization_social` (+ `r_organization_social` for metrics);
  app needs *Sign In with LinkedIn (OpenID)* + *Share on LinkedIn* + **Community Management API** approval
  (2–4 wk). Token: 60-day access + 1-year refresh → `social-token-refresh` cron renews.
- **Post:** `POST https://api.linkedin.com/rest/posts` with headers `LinkedIn-Version: YYYYMM` +
  `X-Restli-Protocol-Version: 2.0.0`; body `{ author: "urn:li:organization:{ID}", commentary, visibility:
  "PUBLIC", distribution, lifecycleState: "PUBLISHED" }`. **Image:** register upload (Images API) → PUT the
  PNG → reference the returned asset URN in `content.media`.
- **Cost:** free. **Metrics:** organizationalEntityShareStatistics.

## B2. X / Twitter
- **Auth:** OAuth 2.0 PKCE, user-context, scope `tweet.write tweet.read users.read offline.access`; token
  via `POST https://api.x.com/2/oauth2/token`; refresh token (offline.access).
- **Post:** `POST https://api.x.com/2/tweets` body `{ text, media?: { media_ids: [...] } }`. **Image:**
  v2 chunked upload (INIT → APPEND ≤5MB → FINALIZE) → `media_id`.
- **Cost (2026, pay-per-use):** **$0.015/post, $0.20/post-with-link**, reads $0.005 (cap 2M/mo). Budget
  governor (A3) enforces the cap; prefer no-link posts.
- **Metrics:** post `public_metrics` (likes/retweets/replies/impressions) via GET (read cost applies).

## B3. Instagram (Business/Creator via Graph API)
- **Auth:** Business/Creator IG **linked to a Facebook Page** + Meta app + App Review for
  `instagram_content_publish` (+ `instagram_basic`); long-lived token 60-day (refreshed by cron).
- **Publish (2-step):** `POST /{ig-user-id}/media?image_url={PUBLIC_PNG}&caption={...}` → `creation_id`;
  then `POST /{ig-user-id}/media_publish?creation_id={...}`. **The image MUST be a public URL** → served by
  our `app/api/social/graphic/[id]` route.
- **Limits:** ≤50 published posts / 24h; 200 calls/hr. **Cost:** free. **Metrics:** `/media/{id}/insights`.

## B4. Reddit
- **Auth:** OAuth2; scope **`submit`** (+ `read`, `flair`, `identity`); **user-context** token (script app
  password grant for our own account, or web-app code flow). Posting account must meet age/karma SOP.
- **Recon (research-first):** `GET /r/{sub}/about.json` + `GET /r/{sub}/about/rules.json` + recent posts →
  validate rules/flair/self-promo allowance before posting.
- **Post:** `POST https://oauth.reddit.com/api/submit` body `{ sr, kind: "self"|"link", title,
  text|url, flair_id?, flair_text?, sendreplies, nsfw:false, spoiler:false, api_type:"json" }`.
- **Limits:** ~100 QPM/client; rolling-window — use backoff. **Cost:** free. **Metrics:** post `score`,
  `num_comments` via the post's `.json`.

> Build note (S5): each publisher's exact payloads/headers are re-verified against the live official docs
> at implementation time; the above is the researched contract the adapters target.
