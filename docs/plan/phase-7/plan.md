# Phase 7 — Conviction Layer

**North star:** Convince a user that *this is definitely the right pick for them.* Every piece of UI should make them think "yes, that's me" and "yes, this tool."

Phase 6 gave us the raw data (scraped sentiment, pros/cons, themes). Phase 7 puts it in front of the user, ties it to their personal profile, and frames it as a decision-ready answer — not a page of information.

---

## Workstream A — Fold Phase 6 data into the main tool page

**Problem:** Phase 6 data (pros/cons/sentiment/themes/learning curve/hidden costs) lives only on `/tools/[slug]/report`. Users have to click to see it, and most don't.

**Solution:** Inline a compact "Community & Market Signals" block on `/tools/[slug]`, placed **right after the "Our Views" section** (around line 423 of `app/tools/[slug]/page.tsx`).

### Contents of the block
1. **Market Sentiment strip** — 3-bar breakdown (positive / neutral / negative), total mention count, source chips (Reddit · X · Quora · G2).
2. **5 Pros / 5 Cons grid** — the synthesized pros/cons from `tool_sentiment_cache`.
3. **Top 3 themes** — compact cards (e.g., "Blazing fast", "Poor mobile UX"), with one-line context.
4. **Learning curve snapshot** — difficulty level + estimated time-to-productivity.
5. **Hidden costs callout** — if `pricing_analysis.hidden_costs` is non-empty, render as a yellow warning strip.
6. **Footer CTA** — "See the full deep-dive report →" linking to `/tools/[slug]/report`.

### Auto-generation logic
The server component queries `tool_sentiment_cache` directly:
- **Cache ready and not expired** → render the block server-side (fastest path).
- **No cache AND `view_count >= 10`** → render a client island that auto-triggers `/api/tools/[slug]/report/generate` on mount, then polls `/status` until ready. Shows a "🔍 Gathering community sentiment…" animated strip.
- **No cache AND `view_count < 10`** → render a dismissible "See what people are saying →" CTA card that triggers generation on click. Avoids wasting scraping quota on bot traffic.
- **Cache `failed`** → render a silent retry button.

### Files
- **New:** `components/tools/sentiment-block.tsx` (server) — renders from cached data
- **New:** `components/tools/sentiment-block-client.tsx` (client) — handles generating / polling states
- **Edit:** `app/tools/[slug]/page.tsx` — insert the block after Our Views, fetch cache server-side

---

## Workstream B — Personalized intake for Find My Stack

**Problem:** Every user with the same query gets the identical plan. No skill filter, no budget filter, no awareness of existing tools.

**Solution:** After the user submits the query on `/plan`, pop up a modal with 6 intake questions, note "We'll personalize your top picks based on your answers," and only run the planner once they've answered (or skipped).

### Intake fields (Option 2 from brainstorm)
1. **Skill level** — radio: Beginner / Intermediate / Expert
2. **Budget/month** — radio: Free only / Under $50 / $50–200 / $200+ / No limit
3. **Team size** — radio: Just me / 2–5 / 6–20 / 20+
4. **Industry/role** — dropdown: Marketing / Dev / Design / Sales / Education / Content / Other
5. **Primary goal type** — radio: Build / Automate / Learn / Create content / Research
6. **Existing tools** — free text (optional, comma-separated)

### UX
- Modal appears once the user hits "Plan my stack" and there is no saved profile in `localStorage`.
- "Skip & use defaults" button always visible in the modal footer for users in a hurry.
- Once answered, profile is saved to `localStorage.riac_user_profile` and the planner runs.
- On return visits, the profile is reused silently — no modal. A small "Personalization: Intermediate · $50 budget · Solo — Edit" chip appears above the query input so the user can change it.
- If the user edits the profile, we re-run the planner with the new values.

### Files
- **New:** `components/ai/intake-modal.tsx` — the 6-field modal
- **New:** `lib/plan/user-profile.ts` — types + localStorage helpers (`loadProfile`, `saveProfile`, `clearProfile`)
- **Edit:** `components/ai/project-planner.tsx` — hook the modal into `handleSubmit`, load profile on mount, pass profile to `/api/plan`
- **Edit:** `app/api/plan/route.ts` — accept `profile` in request body, pipe it into both the stage-decomposition prompt and the "why for you" prompt

---

## Workstream C — Conviction-layer enrichment on plan cards

**Problem:** Plan cards are generic. No proof this tool is right *for this user*.

**Solution:** For each matched tool, compute a **match score** (0–100%) against the user's profile, generate a short personalized rationale, and surface tangible integration/replacement callouts.

### Per-card additions
1. **Match score badge** — e.g., "92% match for you" (emerald) / "65% match" (amber) / "<50% match" (zinc). Computed deterministically from profile fields — no AI call.
2. **"Why this is your pick" paragraph (personalized)** — 2-sentence Claude-generated rationale referencing the user's profile. Replaces the current 15-word `whyThisStage` blurb.
3. **Integration callouts** — for each tool in the user's `existing_tools` list, show "✓ Works with Notion" or "⚠️ Overlaps with Canva (consider replacing)". Parses `tool.integrations` array.
4. **Budget fit chip** — "Free tier works for you" / "$20/mo — within budget" / "⚠️ $200/mo — over your $50 budget".
5. **Time-to-productivity estimate** — from `learning_curve.time_to_productivity` in `tool_sentiment_cache` (or Claude inference if missing).
6. **Sentiment badge** — already exists from Phase 6; keep.

### Match score formula
```
score = 0
+ 30 if pricing_type fits budget
+ 20 if skill_level fits tool difficulty
+ 15 if tool integrates with any of user's existing_tools
+ 15 if tool is not in user's existing_tools (avoid re-recommending)
+ 10 if tool's best_for includes user's role/industry
+ 10 if sentiment_score === 'positive'
= max 100
```

Simple, explainable, no API cost, deterministic per-profile. If the score is low, the card gets a "Heads up: limited fit" note instead of hiding it — user still sees alternatives but knows the caveat.

### Generation strategy
- **Match score** — pure function, computed server-side in `/api/plan` after tool search.
- **"Why this is your pick"** — Option 1 from brainstorm: single batched Claude call with the full plan + profile → map of `{toolName: "why for you"}`. Replaces the existing reason-generation call; same API cost.

### Files
- **New:** `lib/plan/match-score.ts` — pure function `computeMatchScore(tool, profile)` returning `{score, reasons, warnings}`
- **Edit:** `app/api/plan/route.ts` — accept profile, compute match scores, include profile in "why for you" prompt
- **Edit:** `components/ai/project-planner.tsx` — render new badges, integration callouts, budget chip on each tool card

---

## Jira ticket mapping

(Tickets to be created once Atlassian MCP reconnects; for now, mirrored in build log.)

- **KAN-15** — Phase 7.A.1: Server-side fetch of sentiment cache on tool page
- **KAN-16** — Phase 7.A.2: `SentimentBlock` component (cached + auto-generate variants)
- **KAN-17** — Phase 7.B.1: User profile types + localStorage helpers
- **KAN-18** — Phase 7.B.2: Intake modal component + planner integration
- **KAN-19** — Phase 7.B.3: `/api/plan` profile acceptance + prompt enrichment
- **KAN-20** — Phase 7.C.1: Match score function + scoring
- **KAN-21** — Phase 7.C.2: Plan card conviction UI (badge, callouts, budget chip)
- **KAN-22** — Phase 7.D: Testing, type check, build, deploy

---

## Success criteria
- Tool page feels "full" — a user scrolling the page sees pros/cons, sentiment, themes without clicking through
- Find My Stack asks personal questions once per user, then silently reuses the answers
- Every plan card answers "why for me specifically" in one glance
- Zero additional Claude API calls on `/api/plan` beyond today's baseline
- Type check + build still pass
