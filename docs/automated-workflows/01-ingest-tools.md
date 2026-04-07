# Workflow 1: Ingest Tools (Daily New-Tool Pipeline)

## Purpose
Automatically discovers new AI tools from multiple sources across the internet, deduplicates them against existing tools in the database, enriches them with structured metadata using Claude AI, and inserts them into the `tools` table — fully published and ready for users.

## Schedule
- **When:** Every day at 2:00 AM UTC
- **Cron expression:** `0 2 * * *`
- **Batch size:** 15 tools per run (to stay within Vercel's 300-second function timeout)

## How It Works — Step by Step

### Step 1: GitHub Actions triggers the pipeline
```
GitHub Actions fires at 2:00 AM UTC
  -> curl -X POST https://rightaichoice.com/api/cron/ingest-tools
     -H "Authorization: Bearer <CRON_SECRET>"
```

### Step 2: API route validates the request
**File:** `app/api/cron/ingest-tools/route.ts`

The route:
1. Reads the `Authorization` header
2. Extracts the Bearer token
3. Compares it against `process.env.CRON_SECRET` on the Vercel server
4. If mismatch → returns 401 Unauthorized
5. If valid → creates a Supabase admin client (service-role, bypasses RLS) and calls `runIngestion()`

### Step 3: Discover tools from 3 sources
**File:** `lib/cron/discover.ts`

Three discovery sources run in parallel using `Promise.allSettled` (so one failing doesn't kill the others):

#### Source 1: ProductHunt AI Topic
- Fetches `https://www.producthunt.com/topics/artificial-intelligence`
- Parses HTML to extract tool names, URLs, and descriptions
- Captures up to 80 tools

#### Source 2: GitHub Trending
- Fetches `https://github.com/trending?since=daily&spoken_language_code=en`
- Parses the trending page HTML
- **Filters by AI keywords:** Only includes repos whose description contains: `ai`, `llm`, `machine learning`, `deep learning`, `neural`, `gpt`, `transformer`, `diffusion`, `agent`, `chatbot`, `nlp`, `computer vision`, `generative`
- Captures up to 60 tools

#### Source 3: AI Aggregator Sites
- Fetches from `theresanaiforthat.com/new/` and `futurepedia.io/ai-tools?sort=newest`
- Uses generic HTML card extraction (looks for elements with class names containing "tool", "card", or "item")
- Captures up to 60 tools

**Output:** Array of `{ name, url, description, source }` objects

### Step 4: Deduplicate
**File:** `lib/cron/dedup.ts`

Three dedup checks:

1. **Slug match:** Generates a slug from the tool name (e.g., "ChatGPT" -> "chatgpt") and checks if it already exists in the `tools` table
2. **Domain match:** Normalizes the URL domain (strips `www.`, lowercases) and checks against existing `website_url` domains
3. **Within-batch dedup:** Prevents the same tool from being added twice within a single discovery run

**How it queries existing tools:**
```sql
SELECT slug, website_url FROM tools
```
Then builds two Sets (existingSlugs, existingDomains) and filters the discovered array.

### Step 5: Enrich with Claude AI
**File:** `lib/cron/enrich.ts`

For each unique tool (max 15 per run):

1. **Fetch website text:** Visits the tool's URL, strips HTML tags, returns first 8000 characters of clean text
2. **Send to Claude Sonnet:** Sends the tool name, URL, raw description, and website text to `claude-sonnet-4-6`
3. **Structured output:** Claude returns a JSON object with:
   - `tagline` (max 120 chars)
   - `description` (max 2000 chars)
   - `pricing_type` (free/freemium/paid/contact)
   - `pricing_details` (array of plans with prices and features)
   - `skill_level` (beginner/intermediate/advanced)
   - `has_api` (boolean)
   - `platforms` (web/mobile/desktop/api/plugin/cli)
   - `features` (max 15 items)
   - `integrations` (max 15 items)
   - `best_for` (max 5 ideal use cases)
   - `not_for` (max 5 anti-use-cases)
   - `editorial_verdict` (max 500 chars — opinionated take)
4. **Zod validation:** The response is validated against a strict Zod schema. If it doesn't match, the tool is marked as failed.

### Step 6: Insert into database
**File:** `lib/cron/ingest.ts`

Each enriched tool is inserted into the `tools` table with:
- All structured metadata from enrichment
- `is_published: true` (immediately visible to users)
- `last_verified_at: now()` (marks it as fresh data)

### Step 7: Log everything
Every tool is logged to the `ingestion_logs` table with one of these statuses:
- `discovered` — Found during discovery
- `duplicate` — Filtered out by dedup
- `inserted` — Successfully added to the database
- `failed` — Enrichment or insertion failed (with error message)

Each log entry includes a `run_id` (UUID) that groups all entries from a single pipeline execution.

## Data Flow Diagram

```
ProductHunt ─┐
GitHub       ─┤─> Discovered Tools ─> Dedup Filter ─> Claude Enrichment ─> DB Insert
Aggregators  ─┘   (up to 200)         (remove known)   (15 per run)        (tools table)
                                                                              |
                                                                              v
                                                                        ingestion_logs
```

## Database Tables Used

### `tools` (write)
The main tools table. Each ingested tool becomes a new row.

### `ingestion_logs` (write)
```sql
CREATE TABLE ingestion_logs (
  id uuid PRIMARY KEY,
  run_id uuid NOT NULL,        -- Groups entries from one pipeline run
  source text NOT NULL,        -- "producthunt", "github_trending", "aggregator"
  tool_name text NOT NULL,
  tool_slug text,
  status text NOT NULL,        -- "discovered", "duplicate", "inserted", "failed"
  error_message text,
  created_at timestamptz
);
```

## Key Files

| File | Purpose |
|------|---------|
| `app/api/cron/ingest-tools/route.ts` | API endpoint (auth + orchestration) |
| `lib/cron/ingest.ts` | Pipeline orchestrator (discover -> dedup -> enrich -> insert) |
| `lib/cron/discover.ts` | Discovers tools from 3 sources |
| `lib/cron/dedup.ts` | Deduplication logic |
| `lib/cron/enrich.ts` | Claude AI enrichment + Zod validation |
| `lib/cron/scrape.ts` | Web scraping utility |
| `supabase/migrations/023_ingestion_pipeline.sql` | Creates ingestion_logs table |

## Failure Handling
- If a discovery source fails, the others still run (`Promise.allSettled`)
- If website scraping fails, enrichment falls back to the raw description only
- If Claude returns invalid JSON, the tool is skipped (not inserted)
- If DB insert fails, the error is logged with the exact message
- The pipeline never crashes the entire run — each tool is processed independently

## What Gets Published
Every successfully enriched tool is immediately published (`is_published: true`). This means it shows up on the directory, search results, and tool pages within minutes of insertion (after Next.js ISR revalidates).
