# Phase 9 — Build Log

> Chronological record of what's actually been shipped against the Phase 9
> plan. Update this every time something deploys, so we can correlate
> changes to GSC/Bing movement later. New entries go at the top.

## Day 1 — 2026-05-27

**Commit:** `24e41b9` — Phase 9 Day-1 — decision-engine positioning + AI crawler manifest + E-E-A-T wiring
**Branch:** `main` → pushed to `origin/main` → Vercel auto-deploy completed.
**Files changed:** 28 (4,125 insertions, 7 deletions)

### What shipped — in plain English

**1. New homepage tagline and search-result snippet.**

Before, Google showed `RightAIChoice — Build Anything with AI` and a vague description. Now it shows:

> **RightAIChoice — Find the Right AI Stack for Your Workflow**
> Stop guessing which AI tools to use. Get a personalized AI stack in 60 seconds — compare 2,000+ tools by feature, price, and real user sentiment.

The new copy says exactly what we do, names the count (2,000+), and frames the speed promise (60 seconds). Both lines fit under Google's truncation limits, so nothing gets cut with "…".

**2. New homepage headline.**

Before: *"Build anything with AI. We'll give you the exact stack."*
After: *"Pick the **right AI stack** in 60 seconds, not 6 weeks."*

The new line moves us from a generic "AI is cool" message to the concrete promise: we save you weeks of research. Same shimmer effect, same input box underneath — only the words changed.

**3. Made the site explain itself to AI assistants.**

ChatGPT, Claude, Perplexity, Google's AI Overviews, and the rest now have two new things they can read about us:

- **`llms.txt`** — a one-page summary at `rightaichoice.com/llms.txt` telling them who we are, what categories we cover, and where to find our best comparisons. Think of it like a "press kit for AI chatbots."
- **Updated `robots.txt`** — explicit "yes, you may read everything" to six more AI bots (Bytespider, DuckAssistBot, Diffbot, Amazonbot, MistralAI, Timpibot) on top of the existing four. We want to be cited; locking these out would be self-sabotage.

**4. Told Google we're a brand, not a directory.**

We expanded the hidden "Organization" markup that Google reads on every page. It now includes:
- Our slogan ("Pick the right AI stack — backed by data, not opinions")
- 12 topic areas we have expertise in (AI coding, image, writing, video, etc.)
- 5 social profiles (X, LinkedIn, GitHub, Product Hunt)
- A search action so Google can offer "search rightaichoice.com" directly from the SERP
- A separate "Service" entry that describes the decision engine itself

Net effect: when Google decides whether to give us a Knowledge Panel (the brand card on the right side of search), it has the raw data to do so.

**5. Started showing freshness signals on key pages.**

On blog posts, comparison pages, and tool-alternative pages, you'll now see two small badges:
- "Last updated [date]" (Clock icon)
- "Reviewed by our team" (Shield icon)

Google's E-E-A-T guidelines (Experience, Expertise, Authoritativeness, Trustworthiness) reward sites that show their work is current and editorially overseen. These badges aren't decorative — they pull from the freshness cascade we built in Phase 8, so the dates are real, not synthetic.

**6. Built two new automation scripts (not yet run end-to-end).**

- `npm run llms:full` — generates a giant text dump of every tool + every editorial comparison, written to `public/llms-full.txt`. AI assistants that want to ingest our full catalog have a single file to grab. Blocked today by the Supabase outage; will run as soon as it's stable.
- `npm run tier1:candidates` — pulls the 101 pages currently ranking on positions 1–30 in Google, buckets them into "earn the click" / "break onto page 1" / "push into top 20", and saves them to `candidates/tier1-candidates.json`. This is the input for the next ship (DeepSeek-assisted title rewrites).

### What's measurable from this ship

| When        | Check                                                                |
| :---------- | :------------------------------------------------------------------- |
| Today +5min | View-source on homepage shows new title + meta                       |
| Today +1hr  | GSC URL Inspection → Request Indexing on `/`                         |
| Day +3      | Brand SERP re-check: did we move on "rightaichoice"?                 |
| Day +7      | GSC homepage delta: impressions + position                           |
| Day +14     | If position worse, single `git revert 24e41b9`. If flat/better, keep |

### What did NOT ship today (and why)

- **`llms-full.txt` not generated yet** — Supabase REST was down most of the afternoon (DB compute stuck; resolved after a project restart + Pro upgrade). Run when stable.
- **Tier-1 candidate list not generated yet** — same Supabase blocker.
- **Homepage CTA not changed** — "Plan My Stack" rewrite is doc 13 Part 4. Held to Day 3 deliberately, so we can isolate the title/H1 effect on the Day-7 GSC delta from the CTA effect.
- **Below-the-fold architecture not rewritten** — Tool Finder Quiz above the fold, persona pills, stack pillar showcase are Week 2 per doc 12.

### Incident note — Supabase outage 2026-05-27

- **Symptom:** every REST query timed out at 8–15s; Postgres logs showed repeated `canceling statement due to statement timeout` even for `select 1 limit 1`.
- **Root cause:** DB compute was wedged — likely a runaway transaction or lock holding everything. Project status reported `ACTIVE_HEALTHY`, masking the issue.
- **Fix:** restart project from Supabase dashboard. Upgraded to Pro tier in parallel (not strictly required for the fix, but justified for longer-term needs: no auto-pause, larger compute, 8GB DB, daily backups, 15s statement timeout vs 8s on free).
- **Total downtime impact:** ~2 hours of script blockage; no user-facing site impact (Next.js ISR served cached pages throughout).
- **Lesson:** add a synthetic health check that does a real table query (not just the PostgREST root) and pages us when it times out. The control-plane status is not enough.

---

## Foundation work (completed before Day 1)

The following landed in earlier commits as scaffolding for Phase 9. Not part of the Day-1 commit but necessary for it.

| Commit           | What it gave us                                                            |
| :--------------- | :------------------------------------------------------------------------- |
| Phase 8 cascade  | `last_verified_at`, `last_reviewed_at`, `freshness_score` on tools/compare |
| Migration 093    | `gsc_snapshots`, `gsc_diffs`, `weekly_loop_actions` tables                 |
| `3820444`        | Weekly GSC snapshot + diff cron (feeds the Tier-1 candidates script)       |
| `c8c40f5`        | GSC snapshot scripts wired into package.json                               |
| `4822f15`        | Resources & Guides section + wider SOP URL extraction                      |

---

## Baseline (frozen — never edit)

Captured 2026-05-26, before any Phase 9 work landed. This is the "before" picture every metric in this log will be compared against.

| Bucket            | Pages |   Impr. | Clicks | Avg Pos |
| ----------------- | ----: | ------: | -----: | ------: |
| Pos 1–3           |     3 |      13 |      0 |     3.0 |
| Pos 4–10          |    30 |     983 |      2 |     8.1 |
| Pos 11–20         |    32 |     268 |      4 |    17.6 |
| Pos 21–30         |    36 |     346 |      0 |    25.8 |
| Pos 31–50         |   143 |   1,786 |      1 |    42.5 |
| Pos 51+           |   529 |  11,819 |      1 |    67.9 |
| Zero impressions  | ~1,330|       0 |      0 |       — |

**28d totals:** 15,215 impressions · 8 clicks · CTR 0.05% · avg pos ~40.
**Brand SERP:** rank #2 for "rightaichoice" (unknown what's at #1 — task #43).

---

## Open tasks blocking next ship

1. **#43 Brand SERP audit** — open incognito, search "rightaichoice", paste top-5 URLs back. 5 minutes. Tells us what to do for brand defense.
2. **#37 Apply pending migrations** — several `supabase/migrations/*.sql` files locally that haven't been applied to the live DB. Audit and apply.
3. **#47 Tier-1 rewrites** — needs the candidates script to run first (Supabase-blocked at the time of Day-1 ship). Then build the DeepSeek title rewriter and `/admin/tier1-review` UI.

---

## How to read this log

- **Each day's entry** = what shipped, what didn't, and why. The "why didn't" is as important as the "did".
- **Commits are the source of truth.** If a claim here disagrees with `git log`, trust git.
- **Don't backfill.** If something shipped before this log existed (pre-Day-1), summarize it in the "Foundation" section, not in a fake dated entry.
- **Update on the day of the ship**, not at the end of the week. Memory rots fast.
