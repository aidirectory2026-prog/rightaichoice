# Build Log — Phase 13: Social Media Automation · Opus 4.8 (1M)

One dated entry per completed step. Format: **what / why / how / verification / residual risk** + a
plain-language note. A step is "done" only after it's verified and logged here. Per founder's section
rules: dated docs, **every activity recorded**, recurring engines email the founder.

- Plan: `Plan_phase-13-social.md` (same folder)
- Code worktree: `../rac-social` on branch `phase13-social` (integrate to `main` via squash PR)
- Governing SOP: Isolate → Implement → Verify → Re-verify → Upgrade → Log → Report → Commit

---

## Baseline snapshot (2026-06-30, before any build)

| Thing | State |
|---|---|
| Automated social posting | **None** — greenfield (founder posts manually / not at all) |
| LinkedIn | Company page exists (`linkedin.com/company/rightaichoice`, founded Apr 2026); no API posting |
| X / Twitter | No dev account / no API billing yet |
| Instagram | Not yet Business/Creator + FB-Page-linked |
| Reddit | `REDDIT_CLIENT_ID/SECRET` exist (read-only sentiment use); no posting app/account designated |
| Existing reusable infra | ✅ `next/og` graphics, DeepSeek, cron wrapper, admin panel + approval-queue pattern, scrapers, Resend/Slack |

**Targets (directional):** a live, approval-gated posting pipeline across all 4 platforms; branded
in-house graphics ($0); DeepSeek brain drafting on-voice posts; cloud scheduler (laptop-off); weekly
approval digest email; X spend under a hard cap.

---

## Progress log

### 2026-06-30 — SM-S0: setup (worktree + docs + baseline)
- **What:** Created the isolated code worktree `../rac-social` (branch `phase13-social`, based on the
  latest `main` incl. the merged GEO work) with symlinked `node_modules` + `.env.local`; created this
  Phase 13 Social Media Automation docs folder (Plan + build-log + README); captured the baseline above.
- **Why:** AGENTS.md mandates a dedicated worktree for a large stream; baseline makes later wins provable.
- **How:** `git worktree add ../rac-social -b phase13-social origin/main`; `ln -s` for env/node_modules;
  docs written in the main repo (staged by explicit path only — other sessions' files left untouched).
- **Verification:** `git worktree list` shows `../rac-social` on `phase13-social`; symlinks resolve.
- **Residual risk:** None. Platform credentials/approvals are operator setup (tracked in S7).
- _Plain language: set up a clean, isolated workspace for the social tool and wrote down where we're
  starting from (basically zero automation today)._
- **Status: done.**

### 2026-06-30 — SM-S1: database tables + SOP engine + unit tests
- **What:** The foundation — three Postgres tables and the rule engine that enforces "strict + smart
  SOPs."
  - Migration `178_social_automation.sql` (+ rollback): `social_posts` (the approval queue + audit log,
    22 cols), `social_accounts` (per-platform OAuth tokens, 11 cols), `social_metrics` (engagement over
    time, 9 cols). All RLS-enabled with **no anon policies** → admin/service-role only.
  - `lib/social/types.ts` — shared types (`Platform`, `SocialPost`, `DraftProposal`, `SourceRef`).
  - `lib/social/sops.ts` — the SOPs as **pure, testable functions**: `withinXBudget` (hard monthly cap;
    link posts at $0.20 blocked before $0.015 plain posts as the cap nears), `redditSafety` (allowlist +
    account age/karma minimums + no same-link cross-posting + weekly per-sub cap), `voiceGate` (rejects
    the editorial-voice banned phrases), `contentHash`/`isDuplicate` (variety window), `sourcingGate`
    (truth-only — uncited drafts rejected), `platformFit` (char/hashtag/graphic/link rules per platform),
    `canPublishNow`/`isOptimalHour` (daily caps, no-burst spacing, optimal windows), and a composite
    `preQueueGate`. Per-platform config table `PLATFORM_SOPS`.
  - `scripts/social/sops.test.ts` — 41 unit tests (`npm run test:social-sops`).
- **Why:** Every later layer (brain, publishers, crons) gates through these rules. Making them pure
  functions means the safety logic is deterministic and unit-tested, not buried in DB/network code.
- **How:** Migration applied live via Supabase MCP; SOP rules take state as inputs (existing hashes,
  month spend, account stats) so they stay side-effect-free.
- **Verification:**
  - `npm run test:social-sops` → **41 passed, 0 failed** (budget governor, Reddit gate, voice, dedup,
    sourcing, platform-fit, scheduling, composite gate, config sanity).
  - `npx tsc --noEmit` → **0 errors**.
  - Live DB: all 3 tables present, `rls_on=true`, column counts 22/11/9; a smoke test confirmed a valid
    row inserts, `platform='facebook'` is rejected by the check constraint, and cleanup left 0 rows.
- **Residual risk:** Token columns store OAuth secrets in plaintext (service-role-only, RLS-locked) —
  acceptable for now; can add column encryption later if required. Reddit allowlist + X monthly cap are
  passed in by callers (S3/S5 wire the real values).
- _Plain language: built the "filing cabinet" the tool will use (drafts, account logins, engagement
  numbers) and the rulebook that decides what's allowed to post — budget limits for X, anti-ban rules for
  Reddit, our banned buzzwords, no-repeat rules, and posting-time limits. Wrote 41 tests that all pass, so
  the rulebook is proven to work before anything can post._
- **Status: done.** Commit `8817b34` on `phase13-social`.

### 2026-06-30 — SM-S2: in-house graphics engine (templates + public render route)
- **What:** A code-rendered, on-brand graphics engine — **$0, no AI-image cost** — producing five post
  formats at three platform sizes.
  - `lib/social/graphics/templates.tsx` — five templates: **stat_card, tool_spotlight, news_roundup,
    comparison, quote**, each wrapped in a shared brand frame (dark `#09090b` + emerald `#34d399` +
    Geist, RightAIChoice mark top-left, rightaichoice.com footer). Sizes: `square` 1080×1080 (IG feed),
    `portrait` 1080×1350 (IG portrait), `landscape` 1200×675 (X/LinkedIn). Includes `SAMPLE_DATA` and a
    `PLATFORM_DEFAULT_SIZE` map.
  - `lib/social/graphics/render.tsx` — `renderGraphic()` wraps `next/og` `ImageResponse`; font is
    injected by the caller (route fetches Geist from origin, script reads from disk) and degrades to
    Satori's default on any blip (never 500s).
  - `app/api/social/graphic/[id]/route.tsx` — **public** PNG route (Instagram's publish API requires a
    publicly reachable image URL). Renders a queued post by UUID, or sample data via
    `/api/social/graphic/preview?t=<template>&size=<size>` for admin preview. Exposes only the rendered
    image — no DB fields leak.
  - `scripts/social/render-samples.ts` (`npm run social:render-samples`) — offline PNG renderer for
    eyeball QA.
- **Why:** Branded graphics are the free differentiator vs. text-only competitors; rendering from code
  (not an image API) keeps it on-brand and $0. A public route is mandatory for the Instagram publisher.
- **How:** Reused the proven `ImageResponse` + Geist pattern from `app/api/og/stack/route.tsx`. Kept all
  glyphs within Geist (replaced a `★` that was triggering an external Google-font fetch) so rendering has
  zero external font dependency.
- **Verification:**
  - Rendered all 5 templates across sizes → **7 sample PNGs eyeballed**: brand-correct, legible, well
    spaced, no tofu/missing glyphs after the star fix.
  - `npx tsc --noEmit` → **0 errors** (fixed the untyped-admin-client `never` types by casting the query
    result, matching the existing `pr_pitches` pattern).
- **Residual risk:** Long copy can overflow a fixed-size card; the brain (S3) must respect per-template
  length budgets, and the admin preview (S4) lets the founder catch any overflow before approving.
- _Plain language: built the picture-maker. It turns our data into clean, branded images — a big-number
  stat card, a tool spotlight, a weekly news roundup, a head-to-head comparison, and a quote card — in the
  three sizes Instagram/X/LinkedIn want, all in our colors, for free. I generated real samples and they
  look professional. You'll be able to preview every image in the admin panel before anything posts._
- **Status: done.** Commit `c24a33c` on `phase13-social`.

### 2026-06-30 — SM-S3: research sources + DeepSeek brain + drafting CLI
- **What:** The "smart brain" — it researches our live data first, then drafts platform-tailored posts.
  - `lib/social/sources.ts` — `buildCandidatePool()` turns our LIVE verified catalog into a ranked pool
    of postable candidates: State-of-AI stat cards (freshness, pricing, viability), top-viability **tool
    spotlights** (with the tool's real site as the source), a **freshest-tools roundup**, and a milestone
    **quote**. Every candidate carries the exact facts AND a pre-filled graphic spec built from real
    numbers — so a graphic can never show an invented stat. Ranked by `0.4·freshness + 0.3·novelty +
    0.3·strategicFit` (the insights term lands in S7).
  - `lib/social/prompts.ts` — system prompt = our editorial voice + the platform's SOP formatting +
    truth-only rules + a strict JSON contract; the model only writes copy around facts it's given.
  - `lib/social/brain.ts` — `draftPosts()`: research → rank/dedup (variety window) → DeepSeek copy →
    `preQueueGate` (SOPs) → optimal schedule slot → insert as a **DRAFT**. X draft-time budget gate; X
    hashtags folded into the 280-char body so the limit is real.
  - `scripts/social.ts` — operator CLI: `social:pool` (no cost), `social:draft [--dry] [--platforms=]
    [--limit=]`, `social:status`, `social:preview --id=` — all `runScriptedPipeline`-logged.
- **Why:** This is the engine that decides *what's worth posting* and writes it well, cheaply (~$0.001
  per draft via DeepSeek), grounded only in true data — the founder just approves.
- **How:** Reused `buildStateOfAI`/`loadDataset` (same data behind the GEO report), `callDeepSeek`,
  `EDITORIAL_VOICE`, and the `runScriptedPipeline` logging wrapper — no new external dependencies.
- **Verification (live):**
  - `social:pool` → **8 real candidates** off live data (1,998 tools tracked, **99.8% re-verified in 7
    days**, real tool names + source URLs).
  - Real draft of **1 X + 1 LinkedIn** post: both grounded strictly in the four real tool names,
    on-voice (passed the voice gate), platform-correct (X ~215 chars with hashtags folded in; LinkedIn
    professional, 3 hashtags), passed the full SOP gate, inserted as drafts with a suggested slot +
    graphic preview URL. (`social:status` shows 2 drafts.)
  - `npm run test:social-sops` → **41 passed**; `tsc --noEmit` → **0 errors**.
- **Residual risk:** With `--limit=1` every platform picks the same top candidate (legitimate
  cross-posting, but the founder should vary `--limit` / approve selectively). Model copy can drift
  slightly beyond the literal facts (e.g. "some shifted in rankings") — the human approval gate (S4) is
  the backstop; we can tighten the prompt if needed.
- _Plain language: built the brain. It reads our own up-to-date tool data, figures out what's worth
  posting, and writes a proper post for each platform — short and punchy for X, professional for LinkedIn
  — using only real facts, for about a tenth of a cent each. I generated two real posts and they read
  well and stayed truthful. They're sitting as drafts waiting for your approval (which is what S4 builds)._
- **Status: done.** Commit `5379656` on `phase13-social`.

### 2026-06-30 — SM-S4: admin approval panel (/admin/social)
- **What:** The control room where the founder reviews and one-tap-approves drafts.
  - `app/admin/social/page.tsx` — the queue in three groups (**Awaiting approval / Approved & scheduled
    / History**); each post shows a **live rendered graphic preview** (the public route), the copy, the
    char count, hashtags, link, and source domains. Plus an **X budget meter** (month-to-date spend vs.
    `X_MONTHLY_CAP_USD`, colour-coded), a **platform connection strip** (connected/not), and a
    queue-by-platform snapshot.
  - `app/admin/social/actions.ts` — gated server actions: **approve** (draft→approved), **un-approve**,
    **reject** (→cancelled, never deletes — keeps the audit row), **reschedule** (rejects past times),
    **edit** copy+hashtags (re-runs the voice + platform-fit gate; drafts only). Only legal status
    transitions are allowed.
  - `components/admin/social-post-card.tsx` — client card with the one-tap buttons + inline editor.
  - `lib/admin/nav.ts` — new **Social** entry under SEO & Growth (breadcrumb + sidebar resolve).
- **Why:** This is the human approval gate — the locked decision that nothing posts unapproved. It also
  surfaces the X spend and connection health so the founder always knows the state.
- **How:** `social_posts` is service-role-only, so the page reads via `getAdminClient` (the admin layout
  already redirects non-admins). Reused the `PageHeader` + zinc/emerald admin kit and the
  `useTransition` server-action pattern from the authority page.
- **Verification:**
  - **Graphic route, end-to-end (server-free harness):** real queued X draft renders via DB lookup →
    **HTTP 200 image/png** (eyeballed: the news_roundup card shows the real tool names — Autosana,
    Aembit, Plus AI, Google Cloud Vision AI); `/preview?t=…` modes → 200; bad id → **404**.
    (`npm run social:verify-route`.)
  - `npx tsc --noEmit` → **0 errors**.
- **Residual risk:** The admin page's *visual* render isn't yet eyeballed in a browser — Turbopack
  refuses to run against the worktree's out-of-root `node_modules` symlink, so the local dev server
  won't boot here. Its data layer + the embedded graphic route are fully verified and it typechecks; the
  live page confirms on the next preview/production deploy. Connection strip shows "not connected" until
  S5 wires accounts.
- _Plain language: built your dashboard. You'll see every drafted post with its picture, edit or
  reschedule it, and approve with one tap — and nothing goes out until you do. It also shows how much
  X is costing this month against your cap. I verified the post images load from the live data; the page
  itself will be visible the moment we deploy (a local preview tool won't run inside this isolated
  workspace, which is a workspace quirk, not a code problem)._
- **Status: done.** Commit `b30a613` on `phase13-social`.

### 2026-06-30 — SM-S5: pluggable publishers (all 4 platforms)
- **What:** The actual posting code, one module per platform behind a shared interface.
  - `lib/social/publishers/types.ts` — the `Publisher` contract: `isEnabled(account)` /
    `publish(post, account, opts)` / `fetchMetrics(post, account)`.
  - `x.ts` — X v2 tweet; records the pay-per-use **cost** at post time (so the admin meter is exact).
  - `reddit.ts` — `/api/submit` (self-post, or link-post if a link is set), real User-Agent;
    self-post title from the brain's suggested title.
  - `linkedin.ts` — `/rest/posts` to the **company page** (text + auto-unfurled link).
  - `instagram.ts` — the **2-step** Graph flow (create container with the **public graphic URL** →
    publish); caption = copy + hashtags (link-in-bio).
  - `util.ts` — retryable-status mapping (429/5xx retry, 4xx don't), token-expiry check, 280-char
    final clamp, bounded `postJson`.
  - `index.ts` — the registry + `publishOne(post)` orchestrator (loads the account, checks enabled,
    builds the graphic URL, calls the publisher) + `publicGraphicUrl()`.
- **Why:** Keeping the engine platform-agnostic means platforms can switch on one at a time as their
  credentials/approvals land, without touching the brain, the queue, or the cron.
- **How:** Each platform is **feature-flagged OFF by default** — `isEnabled()` returns false unless its
  env flag (`X_ENABLED` / `REDDIT_ENABLED` / `LINKEDIN_ENABLED` / `INSTAGRAM_ENABLED`) is `1` **and** a
  connected account with a non-expired token exists. So nothing can post until the operator wires it up
  (S7 checklist). Pure payload builders are exported separately so they're unit-testable without keys.
- **Verification:** `npm run test:social-publishers` → **28 passed** (payload builders for all 4, the
  retryable/clamp/token-expiry utils, and the enabled-gating: every platform is correctly *disabled*
  with no flag / no account / expired token). `tsc --noEmit` → **0 errors**. (Live network posting is
  intentionally not exercised — it needs the operator credentials from S7.)
- **Residual risk:** No live post has been made yet (no credentials) — that's the S7 operator step. X
  and LinkedIn post text+link only for now (native image upload to those two is a later enhancement;
  Instagram already posts the graphic, which is its whole point).
- _Plain language: wrote the "send" button for each network — but every one is switched OFF until you
  connect that account, so there's zero risk of an accidental post. I tested the message-formatting and
  the safety switches for all four (28 checks pass): each correctly refuses to post when it isn't
  connected. Turning them on is the account-setup step I'll hand you a checklist for._
- **Status: done.** Commit `fa3eb20` on `phase13-social`.

### 2026-06-30 — SM-S6: cloud crons (the "posts even when the laptop is off" layer)
- **What:** Five Vercel cron routes (run server-side, no laptop needed) + registered in `vercel.json`.
  - **`/api/cron/social-publish`** (every 15 min) — finds **approved** posts whose scheduled time has
    arrived; **re-checks the SOPs at the moment of posting** (X budget, daily cap + no-burst spacing,
    Reddit allowlist), then posts via the platform publisher and records the outcome (external id/url,
    cost, posted_at). Platforms not connected yet are **skipped** (left approved) — approving ahead of
    setup never causes a failure; transient errors stay approved to retry; only hard errors → `failed`.
  - **`/api/cron/social-draft`** (daily 05:00 UTC) — refills the queue from live data (X budget-gated).
  - **`/api/cron/social-metrics`** (every 6h) — appends per-post engagement to `social_metrics`.
  - **`/api/cron/social-approval-digest`** (daily 09:00 UTC) — **emails (Resend) + Slacks** the founder
    the posts awaiting approval, linking to `/admin/social`. No-op when nothing's pending.
  - **`/api/cron/social-token-refresh`** (daily 03:00 UTC) — refreshes OAuth tokens nearing expiry
    (refresh_token grant for X/LinkedIn/Reddit; long-lived refresh for Instagram); marks
    expired-and-unrefreshable accounts `error` so the admin strip shows they need reconnecting.
    (`lib/social/publishers/refresh.ts`.)
- **Why:** This is the locked "posts on schedule from the cloud" requirement. All five log to
  `pipeline_runs` (via `cronRoute`), so they show up in the existing pipeline-health dashboard + the
  failed-pipeline alerter — same observability as every other automation.
- **How:** Reused `cronRoute` (bearer-token auth + pipeline logging) and the Resend/Slack pattern from
  `new-signup-alert`. The publish cron computes month-to-date X spend once per run for the budget gate.
- **Verification (live):**
  - **End-to-end publish-cron test against the real DB** (`npm run social:verify-publish-cron`): approved
    a draft with a past schedule → ran the cron handler with `CRON_SECRET` auth → **HTTP 200**, found 1
    due post, **safely SKIPPED** it (X not connected) leaving it `approved` (`posted=0, failed=0`), then
    reverted. Proves the full query → SOP-recheck → publish-dispatch flow runs and the safe-skip
    guarantee holds.
  - `vercel.json` valid JSON, **25 crons** (under Pro's 40 limit).
  - `npm run test:social-publishers` → **30 passed** (added the token-refresh `selectExpiring` selector);
    `tsc --noEmit` → **0 errors**.
- **Residual risk:** Live posting + token refresh can't be exercised until platform credentials exist
  (S7). The crons are written to be safe no-ops until then (skip when unconnected). Once deployed, the
  schedules are live on Vercel.
- _Plain language: this is the part that makes it run on its own. Five robots on Vercel's servers:
  one checks every 15 minutes for approved posts whose time has come and posts them (and it double-checks
  every rule right before posting); one writes fresh drafts each morning; one collects likes/comments; one
  emails you each day what's waiting for approval; one keeps the account logins from expiring. They run in
  the cloud, so your laptop can be off. I proved the posting robot runs correctly against the real
  database and, crucially, refuses to post anything until an account is actually connected._
- **Status: done.** Commit `6d5ffcf` on `phase13-social`.

### 2026-06-30 — SM-S7: insights feedback loop + operator setup checklist
- **What:** The brain learns from results, plus the doc that lets the founder switch platforms on.
  - `lib/social/insights.ts` — `buildPerformanceModel()` reads `social_metrics` × `social_posts`, scores
    each post's engagement (comments ×3, shares ×5, weighted), takes the **latest** snapshot per post, and
    aggregates by platform / format / platform×format / hour. `expectedPerformance(...)` → 0..1, with a
    **neutral 0.5 fallback** until enough signal accrues.
  - `sources.ts` now ranks with the **full Appendix A1 formula** (0.30 freshness + 0.25 novelty + 0.30
    expectedPerformance + 0.15 strategicFit); `brain.ts` loads the model each run so high-performing
    formats/angles get drafted more. `scripts/social.ts` gains **`social:insights`** (prints the model).
  - **`operator-setup.md`** — exact click-by-click to connect each platform (Reddit, X, LinkedIn,
    Instagram): app creation, scopes, the `social_accounts` insert SQL, the `*_ENABLED` flags, and a
    per-platform "verify it's live" check + the daily rhythm. Names every env key (never values).
  - `docs/automated-pipelines/README.md` — added the Phase 13 social-cron inventory (the project SOP:
    every automation documented in the playbook).
- **Why:** This is the "smart brain that analyses everything" closing the loop, and the only remaining
  path to live posting (credentials) is now a written checklist the founder can follow.
- **How:** Pure model + scoring functions (DB-read split from computation) so the loop is unit-tested;
  empty-data path returns neutral so nothing changes until real engagement exists.
- **Verification:** `npm run test:social-insights` → **13 passed** (engagement weighting,
  latest-snapshot-wins, high-vs-low performer ranking, neutral fallback); `social:insights` live shows the
  neutral model (no posts yet); pool re-ranks cleanly under the new formula. `tsc --noEmit` → **0 errors**.
- **Residual risk:** The loop has no real engagement to learn from until posting goes live (operator
  credentials) — by design it's neutral until then.
- _Plain language: the tool now gets smarter over time — once posts go out and we see likes/comments, it
  favours the formats and angles that actually worked. And I wrote you a plain step-by-step to switch on
  each network (Reddit and X take minutes; LinkedIn and Instagram need a 2–4 week app review, so start
  those early). The moment an account is connected, it starts posting on schedule._
- **Status: done.** Insights commit `d657581`; docs this commit.

---

## ✅ Phase 13 acceptance (2026-06-30) — built + verified

| Requirement | Status |
|---|---|
| 4 platforms (LinkedIn/X/Instagram/Reddit) | ✅ publishers + SOPs for all 4 |
| Smart approval gate (nothing posts unapproved) | ✅ draft→approve→post; publish cron only posts `approved` |
| Research-first brain (DeepSeek) | ✅ live pool (8 candidates) → on-voice drafts, verified |
| Graphics **and** text, in-house ($0) | ✅ 5 `next/og` templates × 3 sizes, eyeballed |
| Strict + smart SOPs brained in | ✅ X budget cap · Reddit ban-avoidance · voice · variety · scheduling |
| Posts even when laptop off (cloud) | ✅ 5 Vercel crons; publish cron verified vs live DB |
| X enabled with hard budget cap | ✅ governor + meter + auto-skip near cap |
| Insights loop ("analyses everything") | ✅ engagement model weights future drafts |
| Everything documented | ✅ Plan + this build-log (every step) + README + operator-setup + playbook |

**Test totals:** 41 (SOP) + 30 (publishers) + 13 (insights) = **84 unit tests pass; `tsc` 0 errors.**
**Live-verified:** candidate pool, DeepSeek drafting, graphic route (DB→PNG), publish-cron safe-skip.
**Remaining to post live:** platform credentials only — the `operator-setup.md` checklist (intentionally
left to the founder; engine is safe-OFF until then). **Next: open a squash PR `phase13-social → main`.**

---

## 📖 In plain language — everything we built this phase (for a non-technical read)

This section explains, with zero jargon, exactly what this phase produced and how it all works together.

### The problem we set out to solve
RightAIChoice needs a steady, professional presence on **LinkedIn, X (Twitter), Instagram, and Reddit** —
but without hiring an agency, paying for a scheduling tool (Buffer/Hootsuite), or you hand-posting every
day. So we built our **own** tool, in-house, that does the heavy lifting and only asks you for a one-tap
yes/no before anything goes out.

### The simplest way to picture it
Think of it as a **small newsroom that runs itself**:
1. A **researcher** reads our own up-to-date data every day and finds things worth posting.
2. A **writer** turns each into a proper post — short and punchy for X, professional for LinkedIn, etc.
3. A **designer** makes a clean branded image to go with it (free, made from code — no paid image tools).
4. A **safety editor** checks every post against strict rules before it's allowed near the queue.
5. **You** are the editor-in-chief: you see everything in a dashboard and approve with one tap.
6. A **dispatch desk** (running on the internet, not your laptop) posts approved items at the right time.
7. An **analyst** watches what got likes/comments and tells the writer what to make more of.

Nothing is ever posted without your approval, and no platform can post at all until you connect its
account — so there is no risk of an accidental or rogue post.

### What each piece actually is
- **The filing cabinet (database).** Three lists the tool keeps: every post (draft → approved → posted,
  with its image, schedule, cost, and the live link once posted); the login for each connected account; and
  the likes/comments numbers collected over time. All locked to admin-only access.
- **The rulebook (the "SOPs").** The strict, smart conditions baked into every action:
  - *Truth-only:* a post with no real source is rejected — it can't make up statistics.
  - *Brand voice:* auto-rejects our banned buzzwords ("game-changer", "seamless", "unlock", etc.).
  - *No repeats / no bursts:* won't reuse an angle or post too often or too close together; knows each
    platform's good posting hours.
  - *Platform manners:* X's 280-character limit, LinkedIn's ≤3 hashtags, Instagram needs an image, Reddit
    uses no hashtags.
  - *Reddit anti-ban:* only approved subreddits, only from an aged/credible account, never the same link
    across subreddits, max one post per subreddit per week, and always a manual approval.
  - *X money cap:* X is the only paid platform; the tool tracks spend against a hard monthly cap you set,
    blocks the pricier link-posts first as it nears the cap, and stops X entirely at the cap.
- **The designer (graphics).** Five branded image styles — a big-number stat card, a tool spotlight, a
  weekly news roundup, a head-to-head comparison, and a quote card — each produced in the three sizes
  Instagram/X/LinkedIn want, in our colours, **for free**. (We generated real samples and they look
  professional.)
- **The brain (the writer + researcher).** Reads our live tool data (we track ~2,000 AI tools, re-verified
  continuously), picks what's worth posting, and writes the copy in our voice using **only true facts** —
  for about a tenth of a cent per post (it uses DeepSeek, a low-cost AI). We tested it live: it wrote a
  real X post and a real LinkedIn post about freshly-verified tools, both accurate and on-brand.
- **Your dashboard (the frontend).** A page at **`/admin/social`** (in the admin panel, under "SEO &
  Growth → Social"). It shows the queue split into *Awaiting approval*, *Approved & scheduled*, and
  *History*; each post displays its image, text, character count, hashtags, link, and sources. You can
  **Approve, Edit, Reschedule, or Reject** each one, watch the **X spend meter**, and see which platforms
  are **connected**. *(It becomes clickable in your browser once we deploy the branch.)*
- **The "send" buttons (publishers).** The actual posting code for each of the four networks, each one
  **switched OFF until you connect that account** — so nothing can post by accident.
- **The cloud robots (the schedulers).** Five automated jobs running on Vercel's servers (so your laptop
  can be off): one posts approved items every 15 minutes (re-checking every rule first), one writes fresh
  drafts each morning, one collects engagement numbers, one **emails you each day** what's waiting for
  approval, and one keeps the account logins from expiring.
- **The analyst (insights).** Once posts are live and we see real engagement, the tool learns which formats
  and angles performed and quietly favours them in future drafts.

### What it costs
Almost nothing. The images are free (made from code). The writing is ~$0.001 per post. The only paid piece
is X, and that's protected by a hard monthly cap you control. LinkedIn, Instagram, and Reddit are free.

### Is it finished?
The **tool itself is finished and verified** — 84 automated checks pass, and we proved the live pieces work
(it researched real data, wrote real posts, generated real images from the database, and the posting robot
correctly refused to post because no account is connected yet). The **only** thing left is connecting the
accounts, which is a setup task on each platform's website. We wrote you a step-by-step for that in
`operator-setup.md` — Reddit and X take minutes; LinkedIn and Instagram need a 2–4 week approval from those
companies, so they're worth starting now. The moment an account is connected, the tool starts posting on
its schedule, pending your approvals.

### How you'll use it day-to-day
Each morning you get an email listing what's waiting. You open `/admin/social`, glance at each post and its
image, and approve, tweak, reschedule, or reject. That's it — the cloud robots do the rest.

---

# ROUND 2 — Hardening, Smart Upgrades & Documentation (2026-06-30)

> After the tool shipped, we ran a deep read-only audit of all 23 files, researched how the big
> professional tools (Buffer/Hootsuite/Sprout/SocialBee) work in 2026, and did a round of **bug fixes +
> smart upgrades + documentation**. Founder decision: **build everything now**, including native images on
> X/LinkedIn. Worktree `../rac-social` on `phase13-social-r2`. Migration **179** (`publish_started_at`).

### 2026-06-30 — R1: correctness & robustness fixes (every audited bug)
- **What / why / how:**
  - **Double-post race (CRITICAL).** The publish cron selected approved+due rows with no lock, so two
    overlapping runs could post the same row twice. Fixed with an **atomic claim** (migration 179 adds
    `publish_started_at`): the cron sets it `where status='approved' and (publish_started_at is null or
    < now-10min) returning id` and only posts if a row came back. A crashed run's claim is reclaimable
    after 10 min. (`app/api/cron/social-publish/route.ts`.)
  - **LinkedIn false success.** `(200||201) && (json?.id || true)` always reported success. Now requires a
    real post id (from the `x-restli-id` header — `postJson` now returns headers — or the body); a 200
    with no id is treated as retryable, never silently "done". (`publishers/linkedin.ts`, `util.ts`.)
  - **DeepSeek malformed JSON** now retries once with a strict-JSON nudge before wasting a candidate.
  - **Token refresh:** flags an account `error` when an *expiring* token (<25h) fails to refresh (not only
    after full expiry), without crying wolf days early; `tokenUsable` margin 60s→300s.
  - **Instagram** pre-checks the graphic URL is publicly reachable (clear error vs. an opaque container fail).
  - **Reddit** re-runs the FULL safety check at post time (allowlist + age/karma + cross-post + weekly cap),
    not just the allowlist.
  - **Budget realism:** the draft cron now counts approved+scheduled (not-yet-posted) X cost too, so
    approvals can't silently overcommit the cap.
- **Verification:** `tsc` 0; existing suites pass; **atomic claim verified live** (`social:verify-claim` —
  first run claims the row, second gets nothing → no double-post). Commit `7e64ff7`.
- _Plain language: I fixed the one genuinely serious bug (it was theoretically possible for the same post
  to go out twice if two cloud jobs overlapped — now impossible, and I proved it on the real database) plus
  several smaller robustness gaps. Nothing in how you use it changes; it's just safer._

### 2026-06-30 — R2: smart upgrades (professional-grade, in-house, $0)
- **What:** **Best-time scheduling** (the brain now schedules each post in the hour that has historically
  performed best, learned from engagement data); **UTM tagging** on every link (so Google Analytics shows
  exactly how much traffic each platform drives) with X-aware length counting (a long tracking link counts
  as 23 chars, the way X actually counts, so it never falsely trips the 280 limit); **global dedup** (won't
  re-share the same destination link on the same platform, ignoring tracking tags — cross-platform is still
  allowed); a **per-platform pause switch**; **evergreen recycling** (re-queues a top-performing old post,
  reworded by AI, never a verbatim repost); and **A/B variants** (two takes on a post to compare).
- **Why / how:** These are the standard features of the big paid tools — built in-house for free. Recycling
  + A/B are env-gated (`SOCIAL_RECYCLE`, `SOCIAL_AB_VARIANTS`) and off by default. (`lib/social/util.ts`,
  `brain.ts`, `sops.ts`, `social-draft` cron.)
- **Verification:** +19 unit tests (`social:test:social-upgrades`) covering UTM, canonicalisation,
  X-length, link dedup, best-time slot selection, recycle ranking; live dry-run draft clean. Commit `fa749d6`.
- _Plain language: the tool got noticeably smarter — it learns the best time to post, tags links so you can
  see what social is actually driving, won't repeat itself, can pause a network with one click, and can
  recycle your best posts. All free._

### 2026-06-30 — R3: native images, threads, first-comment (every platform fully featured)
- **What:** **X** now uploads the branded image natively (chunked upload) and can post **threads**;
  **LinkedIn** uploads the image as a proper asset; **Instagram** posts the link as the **first comment**
  (IG allows no caption links); **Reddit** posts thread continuations as a top comment. So every platform
  now carries the branded graphic, not just Instagram.
- **Why / how:** Visual posts get far more engagement; this was the biggest remaining gap. Built against
  each platform's documented media flow. (`publishers/{x,linkedin,instagram,reddit}.ts`.)
- **Verification:** payload-builder + thread + media-attach unit tests pass; `tsc` 0. **Note:** the live
  API calls (actual uploads) can only be exercised once the platform accounts are connected — they're
  built and unit-tested now, and verified end-to-end at connect time. Commit `fa749d6`.
- _Plain language: every network now posts your branded picture (before, only Instagram did), and X/Reddit
  can post multi-part threads. The actual uploads get a final real-world test the moment you connect each
  account._

### 2026-06-30 — R4: admin dashboard upgrades
- **What:** **Approve-all** button (clear the queue in one tap), **character-count vs. each platform's
  limit** on every card (green/amber/red), **pause/resume** buttons per platform in the connection strip,
  and the Approved list **grouped by day** so you can see your posting schedule at a glance.
- **Verification:** `tsc` 0. (Live page render confirms on deploy — Turbopack can't run in the worktree.)
  Commit `03550f5`.
- _Plain language: the dashboard is easier to run — approve everything at once, see at a glance if a post
  is too long, pause a network, and view what's going out which day._
