# Day 1 Homepage Copy Patch — Ready to Ship

> Apply Day 1 morning, AFTER the brand SERP audit is complete (so we know
> what we're up against). Isolating from today's foundation work makes the
> Day-7 GSC effect measurable on a single variable.

## Why ship this as one patch

- All three changes (title, meta, H1+sub) target the same decision-engine intent
- Shipping them on different days makes attribution impossible
- One commit → one Day-7 measurement → one revert path if it backfires

## Patch 1 — Site-wide default title + description (`app/layout.tsx`)

**Find:**

```ts
title: {
  default: "RightAIChoice — Build Anything with AI",
  template: "%s | RightAIChoice",
},
description:
  "Tell us your goal. Get the exact AI tool stack with costs, tradeoffs, and alternatives. The decision engine for AI tools.",
```

**Replace with:**

```ts
title: {
  default: "RightAIChoice — Find the Right AI Stack for Your Workflow",
  template: "%s | RightAIChoice",
},
description:
  "Stop guessing which AI tools to use. Get a personalized AI stack in 60 seconds — compare 2,000+ tools by feature, price, and real user sentiment.",
```

**Char counts:** title 58 (under 60 SERP truncation); description 154 (under 155).

## Patch 2 — Homepage H1 + subheadline (`app/page.tsx`)

**Find:**

```tsx
<h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
  <span className="hero-shimmer">Build anything</span> with AI.
  <br />
  We&apos;ll give you the exact stack.
</h1>

<p className="mt-5 text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
  Tell us your goal. Get a complete tool stack with costs, tradeoffs, and alternatives for every stage.
</p>
```

**Replace with:**

```tsx
<h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
  Pick the <span className="hero-shimmer">right AI stack</span>
  <br />
  in 60 seconds, not 6 weeks.
</h1>

<p className="mt-5 text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
  We compare 2,000+ AI tools on what actually matters: real user sentiment, side-by-side features, and total cost. Tell us your goal — we&apos;ll give you the exact stack.
</p>
```

## What we are NOT changing in this patch

- The `GoalInput` component below the H1 — unchanged. The CTA rewrite from
  "Plan My Stack" → "Find My AI Stack" + sub-text + social proof is doc-13 Part 4
  and ships **Day 3** (not Day 1) so we can isolate H1/title effect from CTA effect.
- The pill above the H1 ("AI-powered decision engine") — keep. Already on-message.
- Hero scroll hint, aurora, fonts, newsletter form — keep.
- Below-the-fold sections — Day-1 ships H1+meta only. Architecture rewrite
  (Tool Finder Quiz above the fold, "Built for {persona}" pills, stack pillar
  showcase) is Week 2 per doc 12.

## Measurement plan

| When     | Check                                                                    |
| :------- | :----------------------------------------------------------------------- |
| Day 1 +5min | Live verify: view-source on homepage shows new title + meta            |
| Day 1 +1hr  | Google Search Console → URL Inspection → "Request indexing" on /     |
| Day 3       | Brand SERP re-check incognito "rightaichoice" — did we move to #1?   |
| Day 7       | GSC Performance for homepage URL — impressions + position delta       |
| Day 14      | If position worsened, revert. If flat or improved, keep + iterate.    |

## Revert path

```bash
git revert <commit-sha>   # one-commit revert; redeploys automatically
```

Hold the brand-SERP audit findings adjacent to this patch — if the #1
result for "rightaichoice" is a parked/squatter domain, we may need a
DMCA or trademark-claim path in parallel to the on-page work.
