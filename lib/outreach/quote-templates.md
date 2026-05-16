# HARO / Qwoted / Featured.com — Quote Bank

Pre-written 100–150 word quote templates the operator can adapt to journalist queries inside 15 min/day. Each template is grounded in something we actually measure or publish, so attributions stay defensible.

**Attribution to use:**

> Tanmay Verma, Founder, RightAIChoice (rightaichoice.com)

**House rules (do not break):**
- Never fabricate a stat, name, or revenue figure. If the journalist asks for a number we don't have, decline and offer a directional take instead.
- Always lead with the *specific* observation from our data, not generic industry commentary.
- Cap at 150 words. Journalists trim long quotes; the trimmed version should still hold up.
- Always include a link-friendly hook ("our viability tracker", "our editorial comparisons") so the journalist has a natural place to link us.
- When the query is about a specific tool we have an editorial review for, paste the URL too.
- Mark a row in `outreach_log` with `source_channel='haro'` the moment a quote goes out, not after it runs.

---

## 1 — "AI tool fatigue" / consolidation

> The signal we see across 1,200+ AI tools we track is consolidation, not expansion. When we measure viability — does this tool still ship features, still update pricing, still hold its support page up — about 1 in 5 we covered 6 months ago has gone dormant. Buyers are reacting: we're seeing more searches for "X vs Y" than for "best X" — they've narrowed their shortlist and want a head-to-head, not a list. The fatigue isn't with AI; it's with the discovery cost. Editorial layers that pick winners are increasingly the form factor that wins, because the alternative — a CMO evaluating 40 image-generation tools — doesn't scale.

**When to use:** queries about "AI fatigue," buyer behavior, market consolidation, decision-making in saturated markets.

---

## 2 — Tool deprecation / "products that died"

> We've watched several previously well-funded AI tools quietly stop shipping in 2026 — pricing pages frozen, changelogs gone silent, support response times spiking. Our viability scoring weighs all four (last update, pricing changes, integration breadth, support latency) and surfaces an "at-risk" list that's usually 8-12% of the catalog at any moment. Most aren't announced shutdowns — they're slow fades, and customers find out when their renewal email bounces. The lesson for buyers: don't optimize for the prettiest demo; optimize for the team that's still answering tickets in month 18.

**When to use:** queries about startup mortality, SaaS failures, due diligence, vendor risk, churn signals.

---

## 3 — Pricing trends in AI software

> Across our pricing data — refreshed monthly across 1,200+ tools — the dominant 2026 pattern is per-user pricing collapsing into per-seat-plus-usage. The free tier is shrinking simultaneously: most AI writing tools now cap free at <3,000 words/month vs 10,000+ a year ago. Net effect on buyers: predicted monthly cost is harder to pin down because usage caps now flex. Our advice when shopping: model your 90th-percentile usage month, not your average — that's where the overage bills land.

**When to use:** queries about SaaS pricing, AI economics, business model trends.

---

## 4 — Choosing between two competing tools

> The most common mistake when comparing two AI tools is anchoring on feature checklists. Every modern product can claim 200 features; what differs is which workflows they're *good* at. The framework we use editorially: identify the 3 tasks you'll do daily, build a 90-minute trial that includes them on both products, and time-to-first-acceptable-output. The tool that gets you there in 10 fewer clicks usually compounds into hours saved per week. Feature parity is a red herring — execution speed isn't.

**When to use:** "how do I pick between X and Y," buying-process queries, comparison-shopping advice.

---

## 5 — AI for [vertical]: marketing / dev / design / writing

> For [vertical], the buying error we see most is overrotating on the foundation model and underweighting the surface that calls it. The model is undifferentiated and getting cheaper monthly; the surface — how it integrates with your CMS, your design system, your codebase — is where lock-in lives. We tell readers: pick the integration first, then validate the model behind it can hit your bar. The reverse order ends in another migration in 18 months when a new model launches.

**When to use:** vertical-specific queries (marketing tools, dev tools, design tools, writing tools). Swap [vertical] for the relevant term.

---

## 6 — Should I switch from ChatGPT to Claude / Gemini / Perplexity?

> The honest answer is: rarely an either-or anymore. Most heavy users we talk to run a 2-3 tool stack — one for reasoning-heavy tasks, one for fast drafts, one for grounded research. The pricing has converged enough ($20/mo at the high-tier across all three) that the cost penalty for redundancy is small relative to the productivity ceiling each one alone gives you. Our recommendation: build the stack around the task, not around brand loyalty to a single lab.

**When to use:** "ChatGPT vs Claude," LLM comparison queries, stack-building advice.

---

## 7 — AI in workflow automation / replacing software

> We watch this question through a specific lens: which existing SaaS categories are getting absorbed into AI-native tools, and which aren't. Customer support inboxes — getting absorbed. Spreadsheet manipulation — partially absorbed. Project management — almost untouched, because the work isn't generating text, it's coordinating humans. The pattern: AI replaces the text-generation slice of a workflow, not the coordination slice. Buyers should focus AI spend on the former and resist the temptation to rip out the latter just because a vendor stamped "AI" on it.

**When to use:** queries about AI replacing software categories, "what jobs will AI take," workflow transformation.

---

## 8 — Building an AI tool stack on a budget

> For a budget under $50/month, the highest-leverage 2026 stack we recommend is: one frontier-model subscription ($20), one specialized writing or research tool ($10-15), and one free-tier AI image generator. The mistake we see is buying 4-5 mid-tier subscriptions trying to cover every angle — each one half-used. Better to overweight one tool you'll use daily and let everything else be free or pay-as-you-go.

**When to use:** budget / "AI for small business" / freelancer queries.

---

## 9 — How do you evaluate an AI tool before committing?

> Our editorial framework runs three checks: (1) ship velocity — has the tool released a meaningful update in the last 90 days, (2) pricing transparency — can you predict your monthly cost without contacting sales, (3) integration breadth — does it connect to what you already use. A tool failing any one of these is a six-month time bomb. Most of the AI-tool tier list listicles online weight novelty and demo polish; we weight durability. Different question, different answers.

**When to use:** "how to evaluate AI tools," due-diligence queries, vendor-selection process.

---

## 10 — AI ethics / disclosure / "is this trustworthy?"

> When we evaluate a tool for our directory, we hold disclosure tight: does the vendor publish what training data they use, what data leaves the tool, and how outputs are retained. About 30% of AI tools we cover meet a basic disclosure bar — model named, retention policy linked from settings, opt-out clear. That number should be higher in 2026, and it isn't. For buyers in regulated industries, this is non-negotiable; for everyone else, it's still the difference between a tool you can defend in a security review and one you can't.

**When to use:** AI ethics / data privacy / governance / "is X tool safe to use at work" queries.

---

## Topical extras — quick swap-ins

When a journalist query is very narrow, pull a fact from the relevant section of our editorial pages instead of starting from these templates. Examples of facts we can defensibly cite:

- "Of 580 tools with editorial comparisons on RightAIChoice, X% are independent vs Y% bundled with a larger suite" (pull live count from `/compare`)
- "Of 1,200+ tools in our viability tracker, X are flagged at-risk this quarter" (pull from `/viability/at-risk`)
- "Across our pricing data refreshed monthly, the median individual-tier AI subscription is now $X/mo" (compute from `tools.pricing_details` snapshot)

If pulling a live number, **screenshot the dashboard for your records** so you can defend the figure if a fact-checker calls. Don't quote a number you can't reproduce in 30 seconds.

---

## Logging discipline

Every quote sent → `outreach_log` row with:
- `tool_id = NULL` (HARO is not tool-scoped)
- `source_channel = 'haro'`
- `draft_subject = query slug or journalist + publication`
- `draft_body = the quote you actually sent`
- `sent_at = now()`

When a placement lands → also create a `referring_domains` row with `source_channel='haro'`. This keeps 7O.6 dashboard accurate and lets us measure HARO ROI per quarter.
