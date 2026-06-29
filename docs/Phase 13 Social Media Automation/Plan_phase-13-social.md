# Plan — Phase 13: Social Media Automation · Opus 4.8 (1M)

> Authoritative plan. Progress tracked in `build-log.md` (same folder). CODE in worktree `../rac-social`
> (branch `phase13-social`), integrated to `main` via squash PR. DOCS live in the main repo. New
> automations also documented in `docs/automated-pipelines/`. Follows the GEO/SEO section rules (dated
> docs, log every activity, verify-then-log).

## Objective
A professional, **in-house** social-media automation tool (admin-panel-style, like our other engines)
that gives RightAIChoice consistent presence on **LinkedIn, X/Twitter, Instagram, Reddit** — with a
**smart "brain"** that researches what's worth posting, drafts platform-tailored **text + branded
graphics**, follows **strict, smart SOPs**, and **posts on schedule from the cloud (even when the laptop
is off)** — pending a **one-tap human approval**.

## Locked decisions (founder)
1. **All four platforms** (LinkedIn, X, Instagram, Reddit).
2. **Smart approval gate** — brain auto-drafts everything + schedules; founder approves in `/admin/social`;
   then it auto-posts. Nothing posts unapproved.
3. **X enabled with a hard monthly budget cap** (X has no free API tier in 2026 — pay-per-use ~$0.015/post,
   $0.20/post-with-link; brain auto-pauses X at the cap).
4. In-house + free where possible (graphics from code via `next/og`; text via DeepSeek). Only X costs (capped).

## Platform reality (researched 2026)
- **LinkedIn** (company page): free; needs Community Management API `w_organization_social` — **2–4 wk
  review** + app verification; 60-day token + 1-yr refresh.
- **Instagram** (Business/Creator): free; needs Business acct + linked FB Page + Meta app + **App Review
  2–4 wk**; `instagram_content_publish`; **publish needs a PUBLIC image URL**; 50 posts/24h.
- **X/Twitter**: **paid** pay-per-use (~$0.015/post · $0.20 with a link); OAuth2; instant (no review).
- **Reddit**: free; OAuth (read creds exist); posting needs a user token + an aged/karma'd account;
  **high ban-risk for promo → strict SOP + always manual-approve**.

The *tool* is assembly from existing pieces; the lead-time is **platform access** (approvals + X billing),
which is operator setup running in parallel.

## Architecture — the "Social Brain" (platform-agnostic, pluggable publishers)
- **Sources** `lib/social/sources.ts` — postable pool from `lib/geo/state-of-ai.ts`,
  `lib/geo/llms-dataset.ts`, `lib/cron/latest-updates.ts`, `lib/cron/scrape-{news,hn,reddit,twitter}.ts`.
- **Brain** `lib/social/brain.ts` — DeepSeek (`lib/plan/deepseek.ts`): selects topics, writes
  platform-tailored copy (voice: `lib/copy/editorial-voice.ts`), picks a graphic template, assigns a slot.
- **Graphics (free)** `lib/social/graphics/*` — `next/og` `ImageResponse` (proven in
  `app/opengraph-image.tsx`, `app/api/og/stack/route.tsx`): stat card · tool spotlight · news roundup ·
  comparison · quote/milestone, at per-platform sizes; public render route `app/api/social/graphic/[id]`.
- **Queue + DB** — `social_posts` (draft→approved→scheduled→posted→failed→cancelled), `social_accounts`
  (tokens + refresh), `social_metrics` (engagement). Migrations 178–180.
- **Admin** `/admin/social` — approval queue with live text+graphic preview, schedule view,
  approve/edit/reject/reschedule, per-platform connection + token health, X budget meter, insights.
- **Publishers** `lib/social/publishers/{linkedin,instagram,x,reddit}.ts` — common
  `publish()`/`fetchMetrics()`; engine-agnostic; platforms light up as creds/approvals land.
- **Crons** (cloud, laptop-off): `social-draft` (daily), `social-publish` (15-min),
  `social-metrics` (6-hr), `social-approval-digest` (daily email/Slack), `social-token-refresh` (daily).
- **CLI** `scripts/social.ts` (`social:draft|status|preview`), `runScriptedPipeline`-logged.

## Smart + strict SOPs — `lib/social/sops.ts` (brained into every automation)
Truth-only sourcing (cite or reject) · platform-fit rules (LI professional/data-led; X ≤280 hook-first,
link cost-gated; IG graphic-mandatory + link-in-bio; Reddit value-first, never an ad) · **Reddit
ban-avoidance** (subreddit allowlist + rules, account age/karma, never same link across subs, rolling-rate
+ backoff, always manual-approve, per-sub weekly cap) · **X budget governor** (per-post cost tracking, cap,
prefer no-link near cap, auto-pause) · scheduling intelligence (windows, spacing, daily caps, timezone) ·
brand-voice gate · variety/dedup (no repeat angle within N days) · mandatory approval gate · failure
handling (retry/backoff, pause platform on auth/cap failure, log to `pipeline_runs`) · insights feedback
loop (weight future drafts by what performed).

## Build sequence
S0 worktree+docs+baseline · S1 DB+SOP config · S2 graphics engine · S3 sources+brain+draft · S4 admin ·
S5 publishers (X budget-capped + Reddit careful first; LI+IG on approval) · S6 scheduler+digest+metrics+
token-refresh crons · S7 insights loop + operator-setup checklist. Each: build→verify→upgrade→document→
report→commit.

## Operator setup (parallel; exact checklist to be written in S7)
LinkedIn app + Community Mgmt API review · Instagram Business+FB Page+Meta app review · X dev acct +
billing cap + OAuth2 · Reddit posting app + aged account. I provide each platform's exact steps + env keys.

## Reuse (verified paths)
`app/opengraph-image.tsx`, `app/api/og/stack/route.tsx` (ImageResponse) · `lib/plan/deepseek.ts` ·
`lib/pipelines/with-logging.ts` · `lib/admin/{require-admin,nav}.ts` · `app/admin/authority/{page,actions}.ts`
· `scripts/pr-pitch.ts` + `lib/pr/*` + `175_pr_pitches.sql` (queue pattern) ·
`app/api/cron/{new-signup-alert,alert-failed-pipelines}/route.ts` (Resend+Slack) ·
`lib/geo/state-of-ai.ts`, `lib/geo/llms-dataset.ts`, `lib/cron/latest-updates.ts`, `lib/cron/scrape-*.ts`
· `lib/copy/editorial-voice.ts` · `lib/cron/supabase-admin.ts` · `lib/env.ts`.

## Verification
Graphics eyeballed per platform size · brain drafts on-voice/cited/varied · admin queue+preview+actions
work · publish loop posts a real approved item (X capped / Reddit test sub) + records id/cost + metrics ·
SOP unit tests (budget cap, Reddit dedup, variety, voice) · crons run server-side in prod · all logged to
`pipeline_runs`; approval digest emails the founder.
