# 10 — Link Magnets & Distribution

> **Goal:** Earn backlinks at scale through assets people want to link
> to (original research, calculators, embeddable widgets), plus active
> distribution (Reddit, HARO, newsletter, communities). Backlinks are
> the single biggest authority lever and the slowest to compound, so
> the work starts now.

## Why backlinks still rule

Despite Google's "we don't rely on backlinks" PR, every credible SEO
study and every leaked Google rank-factor doc says: links from
authoritative domains are the strongest off-site ranking signal.

For RAC specifically, our domain is young → low link equity → ranking
ceiling at pos 30–50 for most queries. Even if Tier 1 + 2 content
work is perfect, we hit a wall without external authority.

## The four-pillar link-earning model

| Pillar               | Strategy                              | Volume target (Year 1) |
| :------------------- | :------------------------------------ | ---------------------: |
| Original research    | Annual + quarterly data reports       | 20–40 referring domains|
| Interactive widgets  | Calculators, finders, embeddable tools| 30–60 referring domains|
| HARO / journalist quotes | Daily pitches on relevant requests| 50–100 mentions        |
| Community presence   | Reddit, IH, HN, niche forums          | 100+ citations         |

## Pillar 1 — Original research

### Annual "State of AI Tools" report

A 30–50 page PDF + web report published once a year (target: early
January). Covers:

- Top 50 most-used tools (by RAC sentiment data)
- Pricing trends across categories
- New tool launch volume vs prior year
- Sentiment shifts (winners and losers)
- Predictions for next year

Why this works:
- Journalists love data — they cite reports in stories
- Newsletter writers link to it
- Bloggers re-use stats with attribution
- 3+ year compounding asset

We already have the data — `tool_sentiment_cache` (migration 035) and
the freshness cascade have everything we need.

### Quarterly themed reports

Smaller, faster (4–8 pages):

- Q1: "AI Coding Tools Benchmark" — comparing top 10 on cost/speed/quality
- Q2: "AI Image Generator Quality Showdown" — blind taste test
- Q3: "AI Agent Reliability Report" — what actually finishes the task
- Q4: "AI Pricing Watch" — who raised prices, who cut them

Each report is a landing page + PDF + 1 supporting blog post.
Distributed via Pillar 4 (community + newsletter).

### Production workflow

Quarterly cadence — one report every 90 days. Per report:

- Week 1: data extraction + chart generation
- Week 2: written narrative
- Week 3: design (Figma → PDF)
- Week 4: launch on landing page + outreach push

## Pillar 2 — Interactive widgets

People link to tools that solve a problem in 30 seconds. Build a few.

> **Promotion from doc 13:** The **AI Tool Finder Quiz** is no longer a
> peripheral widget — it is the **core decision-engine surface** that
> embodies our positioning. It lives on the homepage (above the fold
> or one click away), powers the rewritten "Find My AI Stack" CTA, and
> doubles as the embeddable link magnet described here.

### Widget candidates (priority order)

1. **AI Tool Finder Quiz / "Find My AI Stack"** (`/find-your-stack`) — **FLAGSHIP**
   - 5–7 questions: goal, persona, budget, team size, integrations
   - Returns recommended stack (3–8 tools) with rationale + total cost
   - No signup required to see results (per [doc 13](./13-homepage-positioning-and-brand-defense.md) CTA fix)
   - Stack result is shareable via URL + saveable to an account (opt-in)
   - Embeddable via iframe + JS snippet with "Powered by RightAIChoice" attribution
   - Embedded on homepage hero AND every cornerstone AND every comparison page footer

2. **Tool Cost Calculator** (`/tools/{slug}/cost-calculator`)
   - User inputs usage volume
   - Calculator returns monthly cost projection
   - Built-in comparison to 2 alternatives
   - Embeddable

3. **AI vs Human Cost Comparison** (`/calculators/ai-vs-human`)
   - User picks task type + volume
   - Compares cost of AI tool vs hiring/contracting
   - Industry benchmarks

4. **Switch Cost Estimator** (`/calculators/switch-cost`)
   - User picks current tool + target tool
   - Returns estimated migration cost + ROI timeline

5. **API Cost Comparator** (`/calculators/api-costs`)
   - Compare per-token / per-request pricing across LLM APIs
   - Live-updates as providers change pricing

### Implementation pattern

- Standalone React component, server-rendered shell
- Embeddable widget = iframe + JS snippet with attribution
- Domain promotes embedded version: "Powered by RightAIChoice" link

### Distribution

- Submit each widget to Product Hunt, Hacker News, IH
- Reach out to newsletters in the space
- Embed on our own blog posts + cornerstone pages

## Pillar 3 — HARO / Help A Reporter Out (rebranded as Connectively)

Journalists post daily queries needing expert quotes. Respond well, get
quoted, get a link from major publications.

### Workflow

- Subscribe to relevant categories (Technology, AI, Business)
- Daily 15-minute review of incoming queries
- Pitch on 3–5 relevant queries per week
- Use our brand voice: "RightAIChoice editorial team" with founder
  attribution

### Pitch template

```
Hi [Reporter],

Re: [query topic]

[2-sentence direct answer to their question]

[Specific data point from RAC: "Our sentiment data across 12,000 user
reviews shows X..."]

Happy to elaborate or share charts.

— [Name], [Title]
RightAIChoice — [URL]
```

Expected: 1 in 5 pitches lands; 1 in 3 landed pitches generates a link.
So ~4 pitches/week → ~1 backlink/2 weeks. Compounds fast.

## Pillar 4 — Community presence

### Reddit (already covered in [08-ai-search](./08-ai-search-aeo-geo.md))

- Weekly cadence (Tuesday + Friday)
- Helpful answers, occasional links
- Target subs: r/SaaS, r/ChatGPTPro, r/LocalLLaMA, niche-specific

### Hacker News

- Submit our best original research / calculators
- Comment thoughtfully on AI tooling discussions
- Goal: 1 HN front-page hit per quarter

### Indie Hackers

- Post our reports + behind-the-scenes
- Engage in tool-discussion threads
- Goal: established voice in the community

### Niche Discords + forums

- AI Discord servers (AnthropicAI, OpenAI, MidJourney, etc.)
- Indie founder forums
- Language-learning forums (for Loora/Duolingo pages)

### Twitter/X

- Not a backlink source, but a discovery channel
- Post: data snippets from reports, new tool reviews, weekly digest
- Goal: 1 post/day, builds over months

### Newsletter (owned channel)

- Weekly digest of: 5 new tools added, 1 comparison highlight, 1
  research nugget
- Build to 5,000 subs in Year 1
- Each issue = backlink to ~5 RAC pages

## Pillar 5 (bonus) — Citation outreach

When a relevant article is published *without* citing us, reach out:

- "Hey, I noticed your piece on [topic]. We have a data set on this
  that might be useful for an update — [link]."

Low-key, high conversion if pitched well. Targets: blog posts,
newsletters, news articles less than 6 months old.

## Tooling

| Tool / sheet                         | Purpose                                    |
| :----------------------------------- | :----------------------------------------- |
| `seo/backlink-log.csv`               | Track every earned link: domain, URL, date, source |
| `/admin/backlinks` (optional view)    | Surface link log + DR if we ever buy Ahrefs |
| `scripts/generate-report-data.ts`    | Pull research-report stats from Supabase   |
| `components/widgets/*`               | Embeddable calculators                     |

## Timeline

| Week | Activity                                                                |
| ---: | :---------------------------------------------------------------------- |
|    1 | Backlink log set up; subscribe to HARO categories                       |
|    2 | First HARO pitches; first Reddit cadence                                |
|  3–4 | Build AI Tool Finder Quiz; launch on PH + HN                           |
|  5–6 | First quarterly report (Q1 2026 — "AI Coding Tools Benchmark")         |
|  7–8 | Build Tool Cost Calculator; launch                                      |
|  9–12 | Newsletter launch (Week 9); citation outreach (Week 10+)                |
| Quarterly | New themed report; new widget                                       |
| Annual | "State of AI Tools" full report                                         |

## Definition of done (Phase 9 portion)

- Backlink log live and being updated weekly
- HARO subscription active; ≥3 pitches/week
- Reddit cadence proven (≥10 helpful comments/month)
- AI Tool Finder Quiz live
- First Tool Cost Calculator live
- First quarterly report drafted
- Newsletter subscriber form on every page

## Risks

- **Slow to compound** — backlinks take 30–90 days to register in
  rankings. Don't expect Tier 1/2 lifts from links in Phase 9 itself.
- **Outreach burnout** — HARO + Reddit require daily attention.
  Mitigation: 30 min/day blocks, not ad-hoc.
- **Widget upkeep** — calculators using live pricing data break when
  providers change. Mitigation: pricing data lives in our tools table
  already, calculators read from there.

## When this is in flight, move to:

- [08-ai-search](./08-ai-search-aeo-geo.md) — original research is prime AI citation bait
- [11-kpis](./11-kpis-and-feedback-loops.md) — track referring domains + brand mentions
