# Page & CTA Tracking — In-Depth Targets

Companion to `10-tracking-implementation.md`. This doc is the **page-by-page and CTA-by-CTA** map of what to track, which event fires, which KPI it feeds, and what target to hold each surface to.

Use this as the checklist for every new page or CTA you ship: if it's not here, add it before merging.

---

## How to read this doc

Each **page section** lists:
- **Purpose** — what the page is supposed to do in the funnel
- **Funnel position** — top / middle / bottom of the conversion funnel
- **Events fired** — automatic + manual, with properties
- **CTAs** — every button and link that matters, with the event it fires
- **Target metrics** — the numbers this page is held to
- **Short-term target (Day 30–90)** and **long-term target (Month 6–12)**

All event method names map to `lib/analytics.ts`. Automatic events (`$pageview`, `$pageleave`, `$autocapture`) are captured by PostHog without code.

---

## Global tracking (every page)

| Event | Source | Notes |
|-------|--------|-------|
| `$pageview` | auto | manual-fired via `PageViewCapture` for App Router transitions |
| `$pageleave` | auto | time-on-page derived in PostHog |
| `$autocapture` | auto | every click / form submit — safety net |
| `nav_cta_clicked` | `analytics.navCtaClicked(cta, source)` | persistent nav/footer CTAs |

**Global targets:**
- Bounce rate <65% (Day 30), <50% (Month 6)
- Avg time on page >60s (Day 30), >90s (Month 6)
- Pages per session >1.8 (Day 30), >2.5 (Month 6)

---

## 1. Homepage (`/`)

**Purpose:** convert cold visitors into product users (via `/plan`, `/tools`, or `/compare`).
**Funnel position:** top.

### Events

| Event | Fires when | Property examples |
|-------|-----------|-------------------|
| `$pageview` | Page load | — |
| `hero_cta_clicked` | Hero "Plan Your Stack" button | `cta: "plan_your_stack"`, `variant: "hero_primary"` |
| `hero_cta_clicked` | Hero "Browse Tools" button | `cta: "browse_tools"`, `variant: "hero_secondary"` |
| `search_query_submitted` | `GoalInput` submission | `source: "homepage_goal_input"` |
| `nav_cta_clicked` | Example stack card click | `cta: "example_stack"`, `source: "homepage"` |
| `tool_page_viewed` | Featured tool card click | — |

### CTAs to instrument

| CTA | Event call | Target CTR |
|-----|-----------|-----------|
| Hero "Plan Your Stack" button | `analytics.heroCtaClicked('plan_your_stack', 'hero_primary')` | 12% |
| Hero "Browse Tools" | `analytics.heroCtaClicked('browse_tools', 'hero_secondary')` | 6% |
| Goal input submit | `analytics.searchQuerySubmitted(query, resultCount, 'homepage_goal_input')` | 18% of visitors |
| Example stack cards (×4) | `analytics.navCtaClicked('example_stack_' + slug, 'homepage')` | 8% combined |
| Featured tool cards (×6) | natural `$pageview` on destination | 10% combined |
| Footer links | `analytics.navCtaClicked(name, 'footer')` | — |

### Targets

| Metric | Day 30 | Day 90 | Month 6 |
|--------|--------|--------|---------|
| Unique visitors / mo | 2,500 | 12,000 | 40,000 |
| Hero CTA CTR | 10% | 14% | 18% |
| Bounce rate | <70% | <60% | <50% |
| Homepage → decision action conversion | 6% | 10% | 15% |

---

## 2. Plan Your Stack (`/plan`)

**Purpose:** the single highest-intent funnel on the site. A user reaching this page is telling you they want a recommendation.
**Funnel position:** bottom.

### Events

| Event | Fires when | Properties |
|-------|-----------|-----------|
| `plan_started` | User focuses / starts filling step 1 | `source: "direct" \| "homepage" \| "navbar"` |
| `plan_step_completed` | Each wizard step submitted | `step`, `step_index` |
| `plan_completed` | Final recommendation shown | `use_case`, `tool_count` |
| `plan_abandoned` | `$pageleave` fires before `plan_completed` | `last_step` |
| `recommendation_requested` | Final submit (mirror of `plan_completed` for legacy compat) | `use_case`, `budget`, `level` |

### CTAs

| CTA | Event call |
|-----|-----------|
| "Get Started" / first field focus | `analytics.planStarted(source)` |
| Each "Next" button | `analytics.planStepCompleted(step, index)` |
| Final "Generate Plan" | `analytics.planCompleted(useCase, toolCount)` |
| Result tool cards (click through) | `analytics.toolVisitClicked(id, slug, 'plan_result')` |
| "Save this plan" (if authed) | `analytics.planCompleted` + save |
| "Share plan" | `analytics.shareClicked('plan', id, channel)` |

### Targets

| Metric | Day 30 | Day 90 | Month 6 |
|--------|--------|--------|---------|
| `/plan` sessions / mo | 400 | 2,000 | 8,000 |
| Plan started rate (of visitors) | 45% | 55% | 65% |
| Plan completion rate (started → completed) | 35% | 50% | 60% |
| Result → tool visit CTR | 25% | 30% | 40% |

### Funnel

Build in PostHog → Insights → Funnel:
1. `$pageview` on `/plan`
2. `plan_started`
3. `plan_step_completed` (any)
4. `plan_completed`
5. `tool_visit_clicked` with `source = "plan_result"`

Step 4 → Step 5 conversion is the single most important metric on the site. This is where intent becomes value.

---

## 3. Tool detail page (`/tools/[slug]`)

**Purpose:** give a visitor enough confidence to click through, save the tool, or compare it.
**Funnel position:** middle → bottom.

### Events

| Event | Fires when |
|-------|-----------|
| `tool_page_viewed` | Page load (fire from a client component) |
| `tool_visit_clicked` | "Visit Website" button click |
| `tool_saved` / `tool_unsaved` | Save button toggled |
| `compare_tool_added` | "Add to compare" button |
| `review_submitted` | Review form submit |
| `share_clicked` | Share button (native share / copy link) |
| `ai_chat_message` | Inline AI Q&A panel |

### CTAs

| CTA | Event call |
|-----|-----------|
| "Visit Website" (primary CTA) | `analytics.toolVisitClicked(id, slug, 'tool_page')` |
| Save toggle | `analytics.toolSaved(id, name)` / `toolUnsaved` |
| "Add to Compare" | `analytics.compareToolAdded(slug, count)` |
| "Write a Review" | `analytics.reviewSubmitted(id, rating)` on submit |
| Tutorial video play | `analytics.navCtaClicked('tutorial_play', 'tool_page')` |
| FAQ expand | `$autocapture` only (low priority) |
| "Similar tools" card click | natural `$pageview` |
| Share | `analytics.shareClicked('tool', id, channel)` |

### Targets

| Metric | Day 30 | Day 90 | Month 6 |
|--------|--------|--------|---------|
| Tool pageviews / mo | 3,000 | 15,000 | 80,000 |
| Visit website CTR | 18% | 25% | 32% |
| Save rate | 3% | 5% | 8% |
| Review submission rate | 0.2% | 0.5% | 1% |
| Bounce rate | <70% | <55% | <45% |

### Why `tool_visit_clicked` is tracked *twice*

The `/api/tools/[slug]/visit` endpoint already logs server-side (for affiliate attribution and rate limiting). We *also* fire `tool_visit_clicked` client-side because:
1. Server logs can't attribute the *source* page reliably
2. PostHog funnels need client-side events to stitch the user journey
3. Ad blockers may block PostHog but won't block the server log (and vice versa) — two sources = resilient

---

## 4. Compare page (`/compare`, `/compare/[slugs]`)

**Purpose:** help users make a decision between specific tools.
**Funnel position:** bottom.

### Events

| Event | Fires when |
|-------|-----------|
| `comparison_viewed` | Compare page renders with ≥2 tools |
| `compare_tool_added` | User adds a tool to the compare tray |
| `compare_tool_removed` | User removes one |
| `compare_share_clicked` | Share comparison URL button |
| `tool_visit_clicked` | Any "Visit Website" button with `source: "compare_page"` |

### CTAs

| CTA | Event call |
|-----|-----------|
| Tool search / "Add tool" | `analytics.compareToolAdded(slug, count)` |
| Remove pill | `analytics.compareToolRemoved(slug, count)` |
| Per-tool "Visit" | `analytics.toolVisitClicked(id, slug, 'compare_page')` |
| "Share this comparison" | `analytics.compareShareClicked(slugs)` |
| "Start over" | `analytics.navCtaClicked('compare_reset', 'compare_page')` |

### Targets

| Metric | Day 30 | Day 90 | Month 6 |
|--------|--------|--------|---------|
| Comparisons / mo | 500 | 3,000 | 15,000 |
| Visit CTR (from compare) | 25% | 35% | 45% |
| Avg tools per comparison | 2.3 | 2.6 | 2.8 |
| Share rate | 1% | 2% | 4% |

### Funnel

1. `$pageview` on `/compare/*`
2. `comparison_viewed`
3. `tool_visit_clicked` with `source = "compare_page"`

---

## 5. Workflow builder (`/workflows`)

**Purpose:** generate a step-by-step workflow for a user's goal.
**Funnel position:** bottom.

### Events

| Event | Fires when |
|-------|-----------|
| `workflow_generated` | Generate button returns steps |
| `workflow_saved` | Saved to profile |
| `workflow_shared` | Share button |
| `workflow_voted` | Up/downvote on a published workflow |

### CTAs

| CTA | Event call |
|-----|-----------|
| "Generate Workflow" | `analytics.workflowGenerated(goal, stepCount)` |
| Save | `analytics.workflowSaved(id)` |
| Share | `analytics.workflowShared(id, channel)` |
| Vote | `analytics.workflowVoted(id, direction)` |
| Step tool card click | `analytics.toolVisitClicked(id, slug, 'workflow')` |

### Targets

| Metric | Day 30 | Day 90 | Month 6 |
|--------|--------|--------|---------|
| Workflows generated / mo | 100 | 800 | 4,000 |
| Save rate | 15% | 25% | 35% |
| Avg steps generated | 5 | 6 | 7 |

---

## 6. AI Chat (`/ai-chat`)

**Purpose:** converse with an AI that recommends tools from our catalogue.
**Funnel position:** middle.

### Events

| Event | Fires when |
|-------|-----------|
| `ai_chat_message` | User sends a message |
| `ai_chat_tool_suggested` | Assistant mentions a tool |
| `ai_chat_tool_clicked` | User clicks an inline tool card |

### Targets

| Metric | Day 30 | Day 90 | Month 6 |
|--------|--------|--------|---------|
| Chats started / mo | 200 | 1,200 | 6,000 |
| Avg messages per chat | 3 | 5 | 6 |
| Tool click-through rate | 15% | 22% | 30% |

---

## 7. Stacks (`/stacks`, `/stacks/[slug]`)

**Purpose:** curated multi-tool setups for specific goals.
**Funnel position:** middle → bottom.

### Events

| Event | Fires when |
|-------|-----------|
| `stack_viewed` | Stack detail page load |
| `stack_saved` | Save to profile |
| `stack_exported` | Export to CSV / Notion / Markdown |
| `tool_visit_clicked` | Any in-stack "Visit" with `source: "stack_page"` |

### Targets

| Metric | Day 30 | Day 90 | Month 6 |
|--------|--------|--------|---------|
| Stack pageviews / mo | 1,000 | 5,000 | 20,000 |
| Stack save rate | 4% | 7% | 10% |
| Visit CTR from stack | 20% | 28% | 35% |

---

## 8. Blog (`/blog`, `/blog/[slug]`)

**Purpose:** acquire organic search traffic, then hand off to a product surface.
**Funnel position:** top.

### Events

| Event | Fires when |
|-------|-----------|
| `blog_post_viewed` | Post page load |
| `blog_internal_link_clicked` | Any in-body link to `/plan`, `/tools/*`, `/compare`, `/stacks/*` |
| `nav_cta_clicked` | Below-post CTA block |

### Targets

| Metric | Day 30 | Day 90 | Month 6 |
|--------|--------|--------|---------|
| Blog sessions / mo | 500 | 5,000 | 30,000 |
| Blog → product surface CTR | 8% | 12% | 20% |
| Avg read time | 90s | 120s | 150s |

### The blog's #1 job

Blog pages do not need to convert directly. Their job is to hand off to `/plan`, `/tools`, or `/compare`. The metric to watch: **blog → decision action conversion in the same session**. Build this as a funnel in PostHog:

1. `$pageview` on `/blog/*`
2. `$pageview` on `/plan` | `/tools/*` | `/compare*` | `/stacks/*`
3. Any decision action event

---

## 9. "Best For" pages (`/best/*`)

**Purpose:** rank-for-SEO hub pages that intercept "best X for Y" searches.
**Funnel position:** top → middle.

### Events

| Event | Fires when |
|-------|-----------|
| `best_page_viewed` | Page load |
| `tool_visit_clicked` | Any tool card visit with `source: "best_page"` |
| `compare_tool_added` | Add-to-compare from a best page |

### Targets

| Metric | Day 30 | Day 90 | Month 6 |
|--------|--------|--------|---------|
| Best-page sessions / mo | 800 | 6,000 | 30,000 |
| Tool visit CTR | 20% | 28% | 35% |
| Bounce rate | <70% | <55% | <45% |

---

## 10. Role pages (`/for/*`)

**Purpose:** SEO hub for "AI tools for [role]" searches.
**Funnel position:** top → middle.

### Events

| Event | Fires when |
|-------|-----------|
| `role_page_viewed` | Page load |
| `nav_cta_clicked` with `cta: "plan_for_role"` | CTA to `/plan?role=...` |

### Targets

| Metric | Day 30 | Day 90 | Month 6 |
|--------|--------|--------|---------|
| Role-page sessions / mo | 500 | 3,500 | 15,000 |
| Role → plan CTR | 10% | 15% | 22% |

---

## 11. Signup / Login (`/signup`, `/login`)

**Purpose:** capture the user so we can personalize and retain.
**Funnel position:** conversion.

### Events

| Event | Fires when |
|-------|-----------|
| `signup_started` | Signup page load or form focus | 
| `signup_completed` | Successful signup | 
| `login_completed` | Successful login | 

### CTAs

| CTA | Event call |
|-----|-----------|
| Email/password submit | `analytics.signupCompleted('email')` |
| Google OAuth | `analytics.signupCompleted('google')` |
| "Already have an account? Sign in" | natural nav |

### Targets

| Metric | Day 30 | Day 90 | Month 6 |
|--------|--------|--------|---------|
| Signups / mo | 50 | 300 | 1,500 |
| Signup page → completed | 30% | 45% | 55% |

Signup is intentionally NOT required to use core product surfaces. We want to maximize top-of-funnel engagement first and surface auth only when it unlocks personalization (save tool, save stack, save plan).

---

## 12. Dashboard (`/dashboard`)

**Purpose:** give returning users a reason to come back — saved tools, saved stacks, personalized feed.
**Funnel position:** retention.

### Events

| Event | Fires when |
|-------|-----------|
| `$pageview` on `/dashboard` | — |
| `nav_cta_clicked` | Any widget CTA |

### Targets

| Metric | Day 30 | Day 90 | Month 6 |
|--------|--------|--------|---------|
| Weekly active on dashboard | 15% of signups | 25% | 35% |
| Dashboard → decision action rate | 40% | 55% | 65% |

This page is the **retention lever**. Watch the retention cohort insight (from `10-tracking-implementation.md`) — if returning users aren't passing through here, the dashboard isn't earning its place.

---

## 13. Reviews / Questions / Discussions (`/reviews`, `/questions`, `/discussions`)

**Purpose:** user-generated content → SEO long tail + community network effects.
**Funnel position:** middle → retention.

### Events

| Event | Fires when |
|-------|-----------|
| `review_submitted` | Review posted |
| `question_asked` | Question posted |
| `question_answered` | Answer posted |
| `discussion_replied` | Discussion reply posted |

### Targets

| Metric | Day 30 | Day 90 | Month 6 |
|--------|--------|--------|---------|
| Reviews / mo | 20 | 200 | 1,000 |
| Questions / mo | 30 | 300 | 1,500 |
| Answer rate (questions with ≥1 answer) | 40% | 60% | 75% |

---

## PostHog dashboard checklist (page/CTA-specific)

In addition to the 5 dashboards in `10-tracking-implementation.md`, create:

### "CTA Performance" dashboard
- `hero_cta_clicked` breakdown by `cta` (which hero works?)
- `nav_cta_clicked` breakdown by `cta` + `source` (which nav items earn clicks?)
- `tool_visit_clicked` breakdown by `source` (which surface drives affiliate revenue?)
- Click-through rate per CTA (event count / pageview count on parent page)

### "Plan Funnel" dashboard
- Full 5-step plan funnel (`$pageview` → `plan_started` → `plan_step_completed` → `plan_completed` → `tool_visit_clicked`)
- Drop-off chart per step
- Plan abandonment reasons (`plan_abandoned.last_step` breakdown)
- Time-to-completion distribution

### "Compare Funnel" dashboard
- Pageviews → `comparison_viewed` → `tool_visit_clicked`
- Most-compared tool pairs (group `comparison_viewed.tools`)
- Avg tools per comparison (trend over time)

### "SEO Page Performance" dashboard
- Top pages by pageviews from organic traffic (filter by `$referring_domain` contains "google")
- Blog → product CTR
- Best-page → tool visit CTR
- Role-page → plan CTR

---

## Short-term priority order

If we instrument only **five things** in the next week, do them in this order:

1. **`tool_visit_clicked` on the Visit Website button** — directly attributed to affiliate revenue
2. **`plan_started` / `plan_completed` on `/plan`** — the highest-intent funnel on the site
3. **`hero_cta_clicked` on homepage** — proves the top of funnel is working
4. **`blog_internal_link_clicked` on blog posts** — proves SEO content is handing off to the product
5. **`nav_cta_clicked` on "Plan Your Stack" navbar link** — the persistent CTA that shows up on every page

Everything else is incremental. Start with the five above and build from there.

---

## Long-term additions (Month 3+)

- **Scroll depth tracking** on blog and best pages (50%, 75%, 100% scroll) — informs content length decisions
- **Heatmaps and session replay** enabled selectively for `/plan` and tool pages — debug UX friction
- **A/B testing via PostHog feature flags** on hero CTA copy, plan wizard steps, tool page layout
- **Revenue attribution** once affiliate data is plumbed back — join `tool_visit_clicked` with affiliate conversions to compute per-surface EPC (earnings per click)
- **Identified users** — call `posthog.identify(user.id)` after signup to stitch pre- and post-auth journeys. Requires privacy policy update.

---

## Maintenance

- [ ] **Every new page:** add a section to this doc before merging. Include events, CTAs, and targets.
- [ ] **Every new CTA:** add a row to the relevant page section and instrument the event in `lib/analytics.ts`.
- [ ] **Monthly:** review targets vs. actuals. Update targets if 3 consecutive months of ≥120% or ≤60% — means the target was wrong, not the page.
- [ ] **Quarterly:** audit event catalogue in `lib/analytics.ts`. Remove events no longer used, add gaps.

---

## Related Docs

- `08-metrics-and-kpis.md` — North Star + business-level KPIs
- `10-tracking-implementation.md` — PostHog architecture, setup, global events
- `09-indexed-pages-strategy.md` — SEO indexing goals (GSC-tracked, not PostHog)

---

*Last reviewed: 2026-04-13*
