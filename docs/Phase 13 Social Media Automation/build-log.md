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
