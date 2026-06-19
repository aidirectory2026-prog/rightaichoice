# 10 — Community-Data Sources Playbook

**Last updated: 2026-06-13 (Fable-5 review, sentiment workstream).**
Internal reference: where RightAIChoice gets community/sentiment data, why each source is in the mix, what each costs, how it fails, and how to verify it. Read this before touching anything in `lib/scrapers/`.

---

## Why this architecture exists

Our sentiment and viability reports are a trust product. The promise to the user is: **"this is what real people actually say about this tool"** — with quotes, counts, and links. Two principles follow:

1. **Panel of independent sources, not one firehose.** No single platform covers all voices (developers ≠ consumers ≠ early adopters). Each source fails independently; a report is built from whatever subset responded. One source dying never blanks the feature.
2. **Never fabricate.** If zero sources return data for a tool, we store a `failed` row and retry later — we do NOT let the LLM synthesize "community buzz" from the tool's own marketing copy. (This happened historically: 11 of 30 cached reports were data-free fiction. The honesty gate in `app/api/cron/scrape-sentiment/route.ts` prevents it.)

History lesson (why we're paranoid): the original mix (Apify Twitter/Quora/G2) **never returned a single post** — one actor didn't exist, others were misconfigured — and nobody noticed for months because every scraper "fails gracefully" into an empty result. **Graceful failure hides death.** Hence the verification commands at the bottom; run them after any change.

---

## The source panel (lib/scrapers/)

| Source | File | Whose voice / why it's in | Cost | Auth | Known failure modes |
|---|---|---|---|---|---|
| **HackerNews** | `hn.ts` | Developers & technical founders; the most brutally honest takes on dev tools. Searches stories via Algolia. | Free | None | Very reliable. Generic tool names can pull off-topic stories. |
| **YouTube** | `youtube.ts` | Everyday users in comments under review/demo videos; biggest consumer voice. | Free (quota 10k units/day) | `YOUTUBE_API_KEY` | `429` when quota burns (e.g. repeated local testing); key must exist in **Vercel** for the cron, not just locally. |
| **Product Hunt** | `producthunt.ts` | Early adopters at launch + aggregate star rating (`reviewsRating`/`reviewsCount`). Resolves by slugified name via `post(slug:)`. | Free | `PRODUCTHUNT_TOKEN` | GraphQL schema drift (the original `reviews` field never existed — silent empty for months). Slug mismatch → empty for tools whose PH slug ≠ slugified name. |
| **App Store** | `appstore.ts` | Consumers with star ratings, for tools that ship a mobile app. iTunes Search API → customer-reviews RSS. | Free | None | Apple returns a bare object (not array) when an app has exactly 1 review — normalized. Name-match guard skips tools without an app (expected, not an error). |
| **Bluesky** | `bluesky.ts` | Twitter-style real-time chatter; tech crowd. Replaces the retired Apify Twitter source. | Free | Optional `BLUESKY_IDENTIFIER` + `BLUESKY_APP_PASSWORD` (free account, Settings → App Passwords, no approval) | Anonymous endpoint 403s from many datacenter/residential IPs — auth session is effectively required in practice. |
| **Stack Overflow** | `stackoverflow.ts` | Dev Q&A — real problems, workarounds, praise. **Our free Quora substitute** (Quora has no API and hard-blocks scraping; same intent, better signal for dev tools). | Free | Optional `STACKEXCHANGE_KEY` (keyless = 300 req/day/IP; with key = 10k) | Generic names match unrelated questions — query is `"<name>" ai` to stay on-topic. Always-gzipped responses (fetch handles it). |
| **GitHub** | `github-signals.ts` | Ground truth for open-source tools: star count = adoption proof; most-commented issues = the community's loudest real complaints/requests. | Free | `GITHUB_REPO_TOKEN` / `GITHUB_TOKEN` (5k req/hr); falls back keyless (60/hr) on 401 | **Wrong-repo risk**: near-exact name match only (`cursor` must not match `cursorrules`). Returns empty for closed-source tools — expected. |
| **Lemmy** | `lemmy.ts` | Federated Reddit-style forums (lemmy.world). Partial Reddit stand-in while our Reddit application is pending; independent forum voice after. | Free | None | Single-instance dependency (lemmy.world); smaller volume than Reddit. |
| **Reddit** | `reddit.ts` | The biggest opinion forum on the internet. OAuth-ready. | Free (non-commercial tier) | `REDDIT_CLIENT_ID` + `REDDIT_CLIENT_SECRET` — **pending Reddit's manual approval** (Responsible Builder Policy, Nov 2025; 2–4 weeks). Application submitted; plugs back in automatically when creds land. | Tokenless endpoints 403 from datacenter IPs since 2026-06-01 (this silently killed ingestion for 11 days — see build log). |
| **Trustpilot** | `dataforseo.ts` | B2B/consumer review scores. | **Paid** (DataForSEO pay-as-you-go, cents/lookup, no subscription) | `DATAFORSEO_LOGIN`/`PASSWORD` — not configured | Dormant until creds exist. Optional future spend. |
| Twitter / Quora / G2 | `twitter.ts`, `quora.ts`, `g2.ts` | **RETIRED.** Apify-based; the Twitter actor no longer exists, account unsubscribed, Quora/G2 are hard-walled. Kept only so legacy columns keep compiling. | — | — | Do not revive without a budget decision. |

---

## How the data flows

```
tool name (+ website)
      │
      ▼
lib/scrapers/index.ts → scrapeAllSources()
      │  all 9 live sources in parallel, each with a time budget
      │  (one slow source can't stall the rest; failures → tagged empty)
      ▼
AllScrapeResults { all[], totalPosts, sourcesSucceeded, sourcesFailed }
      │
      ├── totalPosts === 0 → honesty gate: store status='failed', NO synthesis
      ▼
lib/ai/synthesize-report.ts (DeepSeek) — verdict, pros/cons, themes,
      │  sentiment score… built ONLY from the scraped posts
      ▼
tool_sentiment_cache (status='ready', mention_count, sources_scraped,
      │  7-day expiry)
      ▼
/tools/[slug]/sentiment page + viability inputs
```

**Callers of `scrapeAllSources`:** the daily `scrape-sentiment` cron (04:00 UTC, top-100 tools, 240s time budget, refreshes expired cache), onboarding SOP step 9, and on-demand report generation.

**Related but separate:** `lib/cron/traction-probe.ts` (ingest gate) uses HN + Reddit only — lightweight buzz *counts* for new-tool admission, not report content. While Reddit creds are absent, ingestion runs in degraded mode (2-of-4 criteria, drafts still SOP-gated — see `lib/cron/ingest.ts`).

---

## Env keys checklist (where each must exist)

| Key | Vercel | GitHub Actions | Status 2026-06-13 |
|---|---|---|---|
| `YOUTUBE_API_KEY` | ✅ required | — | exists locally; **verify in Vercel** |
| `PRODUCTHUNT_TOKEN` | ✅ required | — | exists locally; **verify in Vercel** |
| `BLUESKY_IDENTIFIER` / `BLUESKY_APP_PASSWORD` | ✅ | optional | **founder to create** (2 min, free) |
| `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` | ✅ | ✅ (ingest job) | pending Reddit approval |
| `GITHUB_REPO_TOKEN` | ✅ | ✅ | exists; local `GITHUB_TOKEN` is stale (keyless fallback covers it) |
| `STACKEXCHANGE_KEY` | optional | — | not needed at current volume |

---

## How to verify the panel is alive (run after ANY scraper change)

```bash
# From the repo root — hits the real APIs with local keys:
npx tsx --env-file=.env.local -e "
import('./lib/scrapers/index.js').then(async ({scrapeAllSources}) => {
  const r = await scrapeAllSources('LangChain', { website: 'https://langchain.com', budgetMs: 30000 })
  for (const s of r.all) console.log(s.source, s.posts.length, s.error ?? '')
  console.log('TOTAL', r.totalPosts)
})"
```

Healthy baseline (verified 2026-06-13): popular dev tool ≈ **60–85 posts** across HN(30) + SO(15) + Lemmy(±15) + PH(1–16) + YouTube(±25 when not rate-limited) + GitHub(1–8) + AppStore(0–20).

Production check (SQL, after a cron run):

```sql
SELECT sources_scraped, COUNT(*), AVG(mention_count)::int
FROM tool_sentiment_cache
WHERE synthesized_at >= now() - interval '2 days'
GROUP BY 1 ORDER BY 2 DESC;
```

Red flags: many rows with `sources_scraped = []` (gate should now prevent), a previously-listed source vanishing from every row (silent death — check its error in the cron logs), or `mention_count` collapsing.

## Rules for adding a source

1. Official/public API only — no fragile HTML scraping, no ToS-gray paid actors without a budget decision.
2. Must fail into an error-tagged empty result, never throw.
3. Guard against entity mismatch (wrong repo/app/product is worse than nothing).
4. Verify with real tools (popular + niche) before merging; paste the numbers in the PR.
5. Add it to this playbook's table.
