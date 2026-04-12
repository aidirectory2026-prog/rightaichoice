# Tracking & Analytics Implementation

Single source of truth for how tracking works on rightaichoice.com. Pair with `08-metrics-and-kpis.md` (the *what* to measure) — this doc covers the *how*.

---

## Why PostHog

PostHog is the analytics tool behind every event captured on the site. We chose it over GA4, Plausible, and Vercel Analytics because:

| Need | PostHog | GA4 | Plausible | Vercel Analytics |
|------|---------|-----|-----------|------------------|
| Pageviews | ✅ | ✅ | ✅ | ✅ |
| Custom events | ✅ | ⚠️ clunky | ❌ | ⚠️ limited |
| Funnels & goal conversion | ✅ | ⚠️ hard | ❌ | ❌ |
| Session replay | ✅ | ❌ | ❌ | ❌ |
| Feature flags / A-B tests | ✅ | ❌ | ❌ | ❌ |
| Self-hostable later | ✅ | ❌ | ✅ | ❌ |
| Free tier | 1M events/mo | unlimited | paid only | basic free |
| Cookie banner required | optional | yes | no | no |

**Verdict:** PostHog is the only tool that handles everything we need — funnels, goal conversion, event-based metrics, and session replay — in one place. The 1M events/month free tier comfortably covers us through the first 12 months of traffic targets.

**What PostHog does *not* replace:**
- **Google Search Console** — still the source of truth for organic search, indexed pages, keyword rankings
- **Vercel Speed Insights** — Core Web Vitals measured at the edge, better than any JS tracker

We run PostHog + GSC + Vercel Speed Insights as a three-tool stack. That's the whole tracking layer.

---

## Architecture

```
Client (Next.js App Router)
  └── <PostHogProvider>          components/providers/posthog-provider.tsx
       ├── posthog.init(...)     initialized once on mount, guarded by env var
       ├── PageViewCapture        manual $pageview on route change
       └── analytics.*()          components/* call these wrappers
             └── lib/analytics.ts  thin wrapper, no-ops if env var missing
```

**Key design decisions:**

1. **Manual pageview capture.** `capture_pageview: false` in init — we fire `$pageview` ourselves on every App Router path change so we don't lose events to client-side navigation.
2. **No-op fallback.** If `NEXT_PUBLIC_POSTHOG_KEY` is not set (local dev, previews), every analytics call silently becomes a no-op. This means contributors don't need a PostHog key to run the app.
3. **Dynamic import.** `lib/analytics.ts` uses `import('posthog-js')` so the SDK is lazy-loaded — keeps the initial JS bundle lean.
4. **Thin typed wrapper.** Every event has a dedicated method (`analytics.toolSaved(...)`) — no free-form `.capture('random_event')` calls in feature code. This keeps the event schema consistent and auditable.

---

## Environment Variables

```bash
# Public — safe to expose, required for tracking to activate
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com  # default if omitted
```

Both are configured in Vercel project settings (Production + Preview). `NEXT_PUBLIC_` prefix is required — PostHog runs entirely client-side.

**To pull them locally:** `vercel env pull .env.local`

---

## Event Catalogue

All events are defined in `lib/analytics.ts`. Adding a new event = adding a new method there, never inline `.capture()` calls.

### Automatic events (no code needed)

| Event | Fires when | Properties |
|-------|-----------|------------|
| `$pageview` | Route changes (App Router) | `$current_url` |
| `$pageleave` | User leaves a page | time on page |
| `$autocapture` | Clicks, form submits | element, selector, text |

### Product events (manual via `analytics.*`)

| Method | Event | Properties | Fires from |
|--------|-------|------------|-----------|
| `toolSaved(id, name)` | `tool_saved` | `tool_id`, `tool_name` | `SaveToolButton` |
| `toolUnsaved(id, name)` | `tool_unsaved` | `tool_id`, `tool_name` | `SaveToolButton` |
| `reviewSubmitted(id, rating)` | `review_submitted` | `tool_id`, `rating` | review form |
| `workflowGenerated(goal, n)` | `workflow_generated` | `goal`, `step_count` | `WorkflowGenerator` |
| `workflowSaved(id)` | `workflow_saved` | `workflow_id` | workflow save action |
| `recommendationRequested(uc, b, l)` | `recommendation_requested` | `use_case`, `budget`, `level` | `/plan` form |
| `comparisonViewed(slugs)` | `comparison_viewed` | `tools`, `count` | compare page |
| `aiChatMessage(intent)` | `ai_chat_message` | `intent` | AI chat |

### Event naming rules

- **snake_case** for event names (`tool_saved`, not `toolSaved`)
- **Past tense** — events describe things that happened (`review_submitted`, not `submit_review`)
- **Properties are primitives only** — string, number, boolean, null. No nested objects.
- **No PII** — never pass email, full name, or raw user input as a property. IDs only.

---

## Goals & Funnels (configured in PostHog UI)

The KPI doc defines what we measure; these are the PostHog-side setups that compute it.

### North Star Funnel — Decision-Maker Journey

**Goal:** measure Monthly Active Decision-Makers (MADM).

Set up as an **Insight → Funnel** in PostHog with these steps:

1. `$pageview` on `/` or any landing page
2. `$pageview` on `/tools/*`, `/compare/*`, `/plan`, or `/stacks/*`
3. Any of: `recommendation_requested`, `comparison_viewed`, `workflow_generated`, `tool_saved`, `review_submitted`, `ai_chat_message`

Watch: **conversion from step 1 → step 3**. Target: 8% by Day 30, 15% by Day 90.

### Acquisition Funnel — Cold Visitor to Engaged

1. `$pageview` (first session)
2. Any second `$pageview`
3. Any product event (decision action)

Watch: **step 1 → step 2** tells you bounce rate. **step 2 → step 3** tells you activation rate.

### Retention Cohort

**Insight → Retention**, using `$pageview` as the activation event and any decision action as the retention event. Weekly cohorts, 8-week window. Target: >20% weekly retention by Day 90.

### Tool-Level Engagement

**Insight → Trends**, grouped by `tool_id` property on `tool_saved`, `review_submitted`, `comparison_viewed`. Surfaces which tools are driving engagement — feeds into editorial and SEO decisions.

---

## Dashboards (create in PostHog → Dashboards)

### 1. "Daily Health" (check every morning)
- Pageviews yesterday vs. 7-day average
- Unique visitors yesterday
- Top 10 pages by pageviews
- Top referrers
- Decision actions yesterday (sum of all product events)
- Error rate (from Sentry — linked panel)

### 2. "Goal Tracking" (check weekly)
- MADM — rolling 30-day count of users with ≥1 decision action
- Decision action breakdown (`recommendation_requested`, `comparison_viewed`, ...)
- North Star funnel conversion rate
- Week-over-week retention curve

### 3. "Acquisition" (check weekly)
- Traffic by source (direct, referral, organic — from `$referrer`)
- Top landing pages
- Top external referrers
- Bounce rate trend
- New vs. returning split

### 4. "Content Performance" (check weekly)
- Top blog posts by pageviews
- Top tool pages by pageviews
- Top comparison pages
- Average time on page by content type
- Blog → decision action conversion rate

### 5. "Tool-Level Engagement" (check monthly)
- Most-saved tools
- Most-compared tool pairs
- Most-reviewed tools
- Tools with highest `external_click_through` rate (once instrumented)

---

## Short-Term vs. Long-Term Targets

Full target tables live in `08-metrics-and-kpis.md`. The short version:

### Short-term (Day 1–90) — *activation & indexing*
- Prove organic SEO works (indexed pages, impressions, first clicks)
- Prove the product delivers value (decision actions per visitor)
- Get retention signal (are people coming back within 7 days?)
- Target MADM: 500 → 2,000 → 5,000

### Long-term (Month 3–12) — *compounding & monetization*
- Compound organic (50K+ monthly visits)
- Retention >20% weekly
- Revenue signal (affiliate, sponsorships, paid plans — instrument when applicable)
- Target MADM: 5,000 → 15,000 → 50,000

---

## Adding a New Event

Rule: every new tracked interaction goes through `lib/analytics.ts`. Never call `posthog.capture()` directly from a feature component.

Steps:

1. **Add a typed method** to `lib/analytics.ts`:
   ```ts
   externalClickThrough(toolId: string, source: string) {
     capture('external_click_through', { tool_id: toolId, source })
   }
   ```

2. **Call it from the client component** (event handler):
   ```tsx
   onClick={() => analytics.externalClickThrough(tool.id, 'tool_page')}
   ```

3. **Update this doc** — add the event to the catalogue table above.

4. **Surface it in PostHog** — add to a dashboard, funnel, or insight where relevant.

---

## Privacy & Compliance

- **No PII in events.** IDs only. Enforced by code review.
- **Cookie banner:** not currently required because PostHog is configured with `persistence: 'localStorage+cookie'` and we don't store PII. Revisit if we enable session replay or add identified users with email.
- **Privacy policy:** disclosed at `/privacy`. Must be updated whenever a new tracked event is added or session replay is enabled.
- **Opt-out:** users can disable tracking via browser DNT or by adding `?__posthog=disabled` to any URL.

---

## Maintenance Checklist

- [ ] **Weekly:** review Daily Health and Goal Tracking dashboards
- [ ] **Monthly:** review Content Performance + Tool-Level Engagement; update KPI doc with actual vs. target
- [ ] **Quarterly:** audit event catalogue — remove events no longer used, add gaps
- [ ] **Quarterly:** re-review PostHog pricing tier (upgrade at ~800K events/month to stay under free tier)
- [ ] **On every new feature:** confirm analytics events are added before merging

---

## Related Docs

- `08-metrics-and-kpis.md` — North Star, KPI targets, business metrics framework
- `09-indexed-pages-strategy.md` — SEO indexing goals, tracked via GSC (not PostHog)
- `07-execution-timeline.md` — when each metric should hit its target

---

*Last reviewed: 2026-04-13*
