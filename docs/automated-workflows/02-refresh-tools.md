# Workflow 2: Refresh Tools (Data Freshness Pipeline)

## Purpose
Re-analyzes existing tools to keep their data current. Fetches fresh website content, re-runs Claude AI analysis, updates GitHub stars, and stamps `last_verified_at` so the platform never serves stale information.

## Schedule
- **When:** Every 3 days at 4:00 AM UTC
- **Cron expression:** `0 4 */3 * *`
- **Batch size:** 15 tools per run
- **Full cycle:** With 500+ tools, all tools are refreshed approximately every 100 days (500 / 15 tools per run * 3 days between runs). As the tool count grows, consider increasing batch size or frequency.

## How It Works — Step by Step

### Step 1: Select the stalest tools
**File:** `lib/cron/refresh.ts`

```sql
SELECT id, slug, name, website_url, github_url
FROM tools
WHERE is_published = true
ORDER BY last_verified_at ASC NULLS FIRST
LIMIT 15
```

Tools with `NULL` `last_verified_at` (never refreshed) are prioritized first. After that, the oldest-refreshed tools get picked.

### Step 2: For each tool, fetch fresh data

#### A. Website scraping
- Fetches the tool's `website_url`
- Strips HTML, scripts, and styles
- Returns first 8000 characters of clean text
- If the site is down or blocked, continues with just the tool name

#### B. GitHub stars (if applicable)
- If the tool has a `github_url`, calls the GitHub API:
  ```
  GET https://api.github.com/repos/{owner}/{repo}
  ```
- Extracts `stargazers_count`
- If the API call fails (rate limited, repo deleted), skips this field

### Step 3: Re-analyze with Claude AI
Sends the tool name, website URL, and fresh website content to `claude-sonnet-4-6` with this prompt structure:

Claude returns updated JSON for:
- `description` — Fresh 2-4 paragraph description
- `pricing_type` — Current pricing model
- `features` — Updated feature list
- `integrations` — Current integrations
- `best_for` — Ideal use cases
- `not_for` — Anti-use-cases
- `editorial_verdict` — Updated opinionated take

The response is validated against a Zod schema before being applied.

### Step 4: Update the database
```sql
UPDATE tools SET
  description = <new>,
  pricing_type = <new>,
  features = <new>,
  integrations = <new>,
  best_for = <new>,
  not_for = <new>,
  editorial_verdict = <new>,
  last_verified_at = now(),
  updated_at = now(),
  github_stars = <new>,         -- only if github_url exists
  last_github_sync = now()      -- only if github_url exists
WHERE id = <tool_id>
```

### Step 5: Log the result
Each tool refresh is logged to `refresh_logs`:

```sql
INSERT INTO refresh_logs (run_id, tool_id, tool_slug, status, fields_updated, duration_ms)
VALUES (<run_id>, <tool_id>, <slug>, 'refreshed', ARRAY['description', 'pricing_type', ...], <ms>)
```

## Data Flow Diagram

```
tools table (15 stalest)
    |
    v
Fetch website HTML ──> Strip to text (8000 chars)
    |
    v (if github_url exists)
GitHub API ──> stargazers_count
    |
    v
Claude Sonnet ──> Structured JSON (Zod-validated)
    |
    v
UPDATE tools SET ... WHERE id = <id>
    |
    v
refresh_logs (success/failure per tool)
```

## Database Tables Used

### `tools` (read + write)
Reads the 15 stalest tools, updates their metadata.

### `refresh_logs` (write)
```sql
CREATE TABLE refresh_logs (
  id uuid PRIMARY KEY,
  run_id uuid NOT NULL,
  tool_id uuid NOT NULL REFERENCES tools(id),
  tool_slug text NOT NULL,
  status text NOT NULL,       -- "refreshed", "failed"
  fields_updated text[],      -- e.g. ["description", "pricing_type", "github_stars"]
  error_message text,
  duration_ms int,            -- How long this tool took to refresh
  created_at timestamptz
);
```

## Key Files

| File | Purpose |
|------|---------|
| `app/api/cron/refresh-tools/route.ts` | API endpoint |
| `lib/cron/refresh.ts` | Refresh logic (select -> scrape -> analyze -> update) |
| `lib/cron/scrape.ts` | Website fetching |
| `supabase/migrations/024_refresh_logs.sql` | Creates refresh_logs table |

## Fields That Get Updated
- `description` — Full tool description
- `pricing_type` — free / freemium / paid / contact
- `features` — Array of features
- `integrations` — Array of integrations
- `best_for` — Ideal use cases
- `not_for` — When not to use
- `editorial_verdict` — Short opinionated take
- `github_stars` — Current star count (if github_url exists)
- `last_verified_at` — Timestamp of this refresh
- `last_github_sync` — Timestamp of GitHub data sync

## What Does NOT Get Updated
- `name`, `slug`, `website_url` — These are identity fields and never change
- `tagline` — Set once during ingestion
- `pricing_details` — Complex pricing tiers not re-analyzed (would need dedicated prompt)
- `tutorial_videos`, `our_views`, `tool_faqs` — Handled by separate pipelines
