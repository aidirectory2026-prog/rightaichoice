# 1.9 — sentiment-discovery — Discussion notes (parked)

> Captured from conversation 2026-05-19. Not yet a SPEC. Come back when ready.

## Why this exists

Tool pages currently show "0 reviews" widgets that kill trust. Manager wants to replace with a CTA that surfaces sentiment scraped from across the internet.

## Proposed architecture (hybrid)

| Layer | What it does | Free / Paid |
|---|---|---|
| A. Background pre-scrape | Cron every 7 days per tool. Scrapes Reddit, X, Quora, GitHub, ProductHunt, HackerNews, YouTube comments. Caches summary in `tool_sentiment_cache` (table already exists). | Always on |
| B. Free CTA + cached view | "See what real users say about [Tool]" button → reveals cached summary instantly + shows "Last scraped [date]" | Free for all visitors |
| C. On-demand refresh | "Refresh now (30s)" → live scrape → fresh summary | **Future paywall** — free during beta |

## CTA copy proposal

- **Button:** "See what real users say about [Tool name]"
- **Subtext:** "We scrape Reddit, X, Quora, GitHub, ProductHunt, HackerNews & YouTube to summarize honest opinions."
- **Note:** "Takes ~30 seconds. Free during beta — premium feature soon."

## Open questions to settle when we pick this up

1. **Sources to scrape** — confirm list: Reddit, X, Quora, GitHub (issues/discussions), ProductHunt, HackerNews, YouTube comments. Add LinkedIn? Medium? Twitter threads specifically?
2. **Cron cadence** — every 7 days per tool? Or vary by popularity (top-100 weekly, rest monthly)?
3. **Where on the page** — above features (high prominence)? Below pricing (mid)? Separate dedicated tab?
4. **Visible info before click** — show "47 mentions analyzed, mostly positive" teaser to entice the click? Or stay mysterious to drive curiosity?
5. **On-demand cost control** — rate-limit free refresh to 1/day per visitor (IP)? Otherwise scraping costs spike.
6. **LLM for summary** — Haiku for speed/cost (~$0.001/scrape). OK?
7. **Future paywall mechanism** — gate behind login (need auth) or Stripe payment directly? Plan now even if not built today.

## Connection to freshness-cascade (1.1)

When sentiment refreshes for a tool, freshness-cascade fires automatically (sentiment is user-visible content). One trigger entry; nothing else to wire here.
