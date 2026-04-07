# Workflow 3: Refresh FAQs (Community Intelligence Pipeline)

## Purpose
Generates and refreshes FAQ content for each tool based on real user pain points scraped from Reddit, ProductHunt, and G2. Claude AI synthesizes raw community discussions into structured, actionable Q&A pairs that appear on every tool page with SEO-optimized schema.org markup.

## Schedule
- **When:** Every 2 days at 6:00 AM UTC
- **Cron expression:** `0 6 */2 * *`
- **Batch size:** 20 tools per run

## How It Works — Step by Step

### Step 1: Select tools to process
**File:** `lib/cron/faq-generator.ts`

```sql
SELECT id, name, slug FROM tools
WHERE is_published = true
ORDER BY updated_at ASC
LIMIT 20
```

Prioritizes tools with the oldest `updated_at`, ensuring all tools eventually get fresh FAQs.

### Step 2: Gather pain points from 3 sources
**File:** `lib/cron/faq-sources.ts`

For each tool, three sources are queried in parallel:

#### Source 1: Reddit JSON API
- **URL:** `https://www.reddit.com/search.json?q={toolName}+AI+tool&sort=relevance&limit=10&type=link`
- **No API key required** — uses Reddit's public JSON endpoint
- **Filters:** Only includes posts with >2 comments and non-empty selftext
- **Extracts:** Post title + first 1000 chars of body text
- **Returns:** Up to 5 posts

#### Source 2: ProductHunt Search
- **URL:** `https://www.producthunt.com/search?q={toolName}`
- Fetches the HTML, strips to plain text
- Returns first 2000 chars of content

#### Source 3: G2 Search
- **URL:** `https://www.g2.com/search?query={toolName}`
- Fetches the HTML, strips to plain text
- Returns first 2000 chars of content

**Output:** Array of `{ source, content }` objects

### Step 3: Generate FAQs with Claude AI
Claude receives all gathered source data and generates 5-8 FAQs:

**Prompt focus areas:**
- Pricing confusion
- Feature limitations
- Comparison with alternatives
- Setup and onboarding issues
- Integration questions
- Common use cases

**Output format (Zod-validated):**
```json
[
  {
    "question": "Does ChatGPT have an API?",
    "answer": "Yes, OpenAI provides a REST API for ChatGPT...",
    "source": "reddit"
  }
]
```

If no external data was found, Claude generates FAQs based on its own knowledge (marked as `ai_generated`).

### Step 4: Replace FAQs in database
This is a **full replacement**, not an upsert:

```sql
-- Delete existing FAQs for this tool
DELETE FROM tool_faqs WHERE tool_id = <tool_id>

-- Insert fresh FAQs
INSERT INTO tool_faqs (tool_id, question, answer, source, sort_order, updated_at)
VALUES ...
```

Each FAQ gets a `sort_order` (0, 1, 2, ...) to maintain the order Claude generated them in.

### Step 5: FAQs appear on tool pages
**File:** `components/tools/faq-section.tsx`

The FAQ section renders as an accordion on the tool detail page with:
- Expandable question/answer pairs
- Schema.org `FAQPage` JSON-LD for Google rich results:
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Does ChatGPT have an API?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, OpenAI provides..."
      }
    }
  ]
}
```

## Data Flow Diagram

```
tools table (20 oldest-updated)
    |
    v
For each tool:
    Reddit API ──┐
    ProductHunt ─┤──> Raw pain points ──> Claude Sonnet ──> 5-8 FAQs (Zod-validated)
    G2 Search ───┘                                              |
                                                                v
                                                    DELETE + INSERT into tool_faqs
                                                                |
                                                                v
                                                    Tool page renders accordion
                                                    + schema.org JSON-LD for SEO
```

## Database Tables Used

### `tools` (read)
Selects tools to process.

### `tool_faqs` (delete + write)
```sql
CREATE TABLE tool_faqs (
  id uuid PRIMARY KEY,
  tool_id uuid NOT NULL REFERENCES tools(id),
  question text NOT NULL,
  answer text NOT NULL,
  source text,          -- "reddit", "g2", "producthunt", "ai_generated"
  sort_order int,       -- Display order
  created_at timestamptz,
  updated_at timestamptz
);
```

**RLS:** Public read access (anyone can see FAQs), service-role write access only.

## Key Files

| File | Purpose |
|------|---------|
| `app/api/cron/refresh-faqs/route.ts` | API endpoint |
| `lib/cron/faq-generator.ts` | Orchestrator (select tools -> gather -> generate -> insert) |
| `lib/cron/faq-sources.ts` | Fetches from Reddit, PH, G2 |
| `components/tools/faq-section.tsx` | Accordion UI + schema.org markup |
| `lib/data/faqs.ts` | Query: `getFaqsForTool(toolId)` |
| `supabase/migrations/025_tutorials_and_faqs.sql` | Creates tool_faqs table |

## SEO Impact
The FAQPage schema.org markup enables Google FAQ rich results — expandable Q&A directly in search results. This can significantly increase click-through rates for tool pages.
