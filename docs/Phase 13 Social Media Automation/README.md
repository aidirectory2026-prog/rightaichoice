# Phase 13 — Social Media Automation

> An **in-house** social-media automation tool (admin-panel-style) that gives RightAIChoice consistent,
> professional presence on **LinkedIn, X/Twitter, Instagram, and Reddit** — a smart "brain" that researches
> what to post, drafts platform-tailored **text + branded graphics**, follows **strict smart SOPs**, and
> **posts on schedule from the cloud (even with the laptop off)** — pending a one-tap human approval.

> **Separate folder** from `docs/GEO AND SEO upgrades and updates/` — same plan + build-log + conventions.

## Files
- **`Plan_phase-13-social.md`** — the strategy: architecture, smart SOPs, build sequence, platform reality, reuse.
- **`build-log.md`** — baseline + one dated, verified entry per shipped step (every activity recorded).
- **`README.md`** (this file) — overview + resume checkpoint.

New automations also documented in `docs/automated-pipelines/` (the playbook).

## 60-second picture
Nearly all of this is **assembly** of what we already have — the `next/og` graphics engine, DeepSeek, the
cron infra, the admin panel + approval-queue pattern, the AI-news scrapers, and existing Reddit creds. The
real lead-time is **platform access** (LinkedIn/Instagram app reviews ~2–4 wks; X's paid API; Reddit
posting account) — operator setup that runs in parallel while we build the engine.

## Locked decisions
1. All 4 platforms · 2. Smart approval gate (nothing posts unapproved) · 3. X enabled with a hard monthly
budget cap · 4. In-house + free (only X costs, capped).

## Build sequence (status)
- [x] **S0** — worktree `../rac-social` + docs + baseline (2026-06-30)
- [x] **S1** — DB (`social_posts`/`social_accounts`/`social_metrics`, RLS, live) + SOP engine + 41 tests (2026-06-30)
- [ ] **S2** — in-house graphics engine (templates + public render route)
- [ ] **S3** — sources + brain + `social:draft`
- [ ] **S4** — admin `/admin/social` (queue, preview, approve/edit/reschedule, budget meter, insights)
- [ ] **S5** — pluggable publishers (X capped + Reddit first; LinkedIn + Instagram on approval)
- [ ] **S6** — scheduler + approval-digest + metrics + token-refresh crons (laptop-off layer)
- [ ] **S7** — insights feedback loop + operator-setup checklist
- [ ] Operator: platform credentials/approvals (LinkedIn/IG reviews, X billing cap, Reddit account)
