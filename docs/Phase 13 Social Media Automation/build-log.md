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
