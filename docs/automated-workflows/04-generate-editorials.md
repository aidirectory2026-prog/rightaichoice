# Workflow 4: Generate Editorials ("Our Views" Content Pipeline)

## Purpose
Generates long-form editorial content for each tool — a 200-400 word opinionated analysis that appears as the "Our Views" section on every tool page. This is independent, honest editorial commentary covering what makes the tool stand out, who benefits most, limitations, and a clear recommendation.

## Schedule
- **When:** Every Monday at 5:00 AM UTC
- **Cron expression:** `0 5 * * 1`
- **Batch size:** 20 tools per run

## How It Works — Step by Step

### Step 1: Select tools to process
**File:** `lib/cron/editorial.ts`

**Priority 1 — Tools with no editorial yet:**
```sql
SELECT id, name, slug, website_url, tagline, description, pricing_type, features, best_for, not_for
FROM tools
WHERE is_published = true AND our_views IS NULL
LIMIT 20
```

**Priority 2 — If all tools have editorials, refresh the stalest:**
```sql
SELECT ... FROM tools
WHERE is_published = true
ORDER BY our_views_generated_at ASC NULLS FIRST
LIMIT 20
```

This ensures new tools get editorials first, then existing ones get refreshed over time.

### Step 2: Gather context
For each tool:
1. Reads the tool's existing structured data from the database (tagline, description, pricing, features, best_for, not_for)
2. Fetches fresh website text (first 3000 chars) via `scrape.ts`

### Step 3: Generate editorial with Claude AI
**Prompt instructs Claude to write in a professional, opinionated editorial voice covering:**

1. What makes this tool stand out (or not)
2. Who benefits most from it
3. Honest assessment of limitations
4. How it compares to the broader AI tools landscape
5. A clear recommendation

**Key prompt constraints:**
- 200-400 words
- Be specific, not generic — reference actual features
- Use short paragraphs
- Return ONLY the editorial text (no JSON, no headers)

**Model:** `claude-sonnet-4-6` with `max_tokens: 800`

### Step 4: Quality check and save
- If the editorial is shorter than 100 characters, it's rejected (likely a failed generation)
- If valid, updates the tool:

```sql
UPDATE tools SET
  our_views = <editorial text>,
  our_views_generated_at = now()
WHERE id = <tool_id>
```

### Step 5: Editorial appears on tool page
**File:** `app/tools/[slug]/page.tsx`

The "Our Views" section renders after the "Our Take" editorial verdict section on the tool detail page. It displays the full editorial text in a styled content block.

## Data Flow Diagram

```
tools table (20 tools: no editorial first, then stalest)
    |
    v
For each tool:
    DB metadata (tagline, description, features, pricing)
    + Website text (first 3000 chars)
        |
        v
    Claude Sonnet ──> 200-400 word editorial
        |
        v (if > 100 chars)
    UPDATE tools SET our_views = <text>, our_views_generated_at = now()
```

## Database Changes

### `tools` table — columns used
```sql
ALTER TABLE tools ADD COLUMN IF NOT EXISTS our_views text;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS our_views_generated_at timestamptz;
```

- `our_views` — The full editorial text (plain text, not HTML)
- `our_views_generated_at` — When this editorial was last generated/refreshed

## Key Files

| File | Purpose |
|------|---------|
| `app/api/cron/generate-editorials/route.ts` | API endpoint |
| `lib/cron/editorial.ts` | Editorial generation logic |
| `lib/cron/scrape.ts` | Website fetching |
| `supabase/migrations/025_tutorials_and_faqs.sql` | Adds our_views columns to tools |

## Editorial vs. Editorial Verdict
These are two different fields:
- **`editorial_verdict`** — Short 2-3 sentence take (set during ingestion/refresh, max 500 chars)
- **`our_views`** — Long-form 200-400 word editorial (set by this pipeline)

Both appear on the tool detail page in different sections.

## Content Quality
The editorial quality depends heavily on the context available:
- Tools with rich website content and detailed DB metadata get better editorials
- Tools with minimal info may get more generic content
- The `our_views_generated_at` timestamp lets you know when to manually review or regenerate
