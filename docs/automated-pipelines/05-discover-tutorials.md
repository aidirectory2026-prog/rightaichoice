# Workflow 5: Discover Tutorials (YouTube Learning Pipeline)

## Purpose
Finds relevant YouTube tutorial videos for each AI tool and stores them in the database. These tutorials appear on every tool page as a video grid with thumbnails, titles, and channel names — giving users immediate access to learning content.

## Schedule
- **When:** Every Tuesday and Friday at 7:00 AM UTC
- **Cron expression:** `0 7 * * 2,5`
- **Batch size:** 30 tools per run

## How It Works — Step by Step

### Step 1: Select tools to process
**File:** `lib/cron/tutorials.ts`

**Priority 1 — Tools with no tutorials:**
```sql
SELECT id, name, slug, tutorial_videos FROM tools
WHERE is_published = true
  AND (tutorial_videos IS NULL OR tutorial_videos = '[]')
LIMIT 30
```

**Priority 2 — If all tools have tutorials, refresh the oldest-updated:**
```sql
SELECT id, name, slug FROM tools
WHERE is_published = true
ORDER BY updated_at ASC
LIMIT 30
```

### Step 2: Search YouTube (no API key needed)
For each tool, the pipeline scrapes YouTube search results:

**URL:** `https://www.youtube.com/results?search_query={toolName}+tutorial`

**Extraction method 1 — ytInitialData JSON (preferred):**
YouTube embeds search results as a JSON blob in the page HTML:
```javascript
var ytInitialData = { ... };
```
The pipeline:
1. Regex-extracts this JSON
2. Parses it
3. Navigates to `contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents`
4. For each `videoRenderer`, extracts:
   - `videoId`
   - `title.runs[0].text`
   - `ownerText.runs[0].text` (channel name)

**Extraction method 2 — Regex fallback:**
If the JSON approach fails, falls back to regex:
```regex
/\/watch\?v=([a-zA-Z0-9_-]{11})/g
```
Extracts video IDs from all watch links in the HTML. Titles default to `"{toolName} Tutorial"` and channel is empty.

**Output:** Up to 6 tutorials per tool:
```json
[
  {
    "title": "ChatGPT Tutorial for Beginners",
    "youtube_url": "https://www.youtube.com/watch?v=abc123",
    "channel": "TechWithTim",
    "video_id": "abc123"
  }
]
```

### Step 3: Save to database
```sql
UPDATE tools SET tutorial_videos = <json_array>
WHERE id = <tool_id>
```

The `tutorial_videos` column is `jsonb` — stores the full array of tutorial objects.

### Step 4: Tutorials appear on tool pages
**File:** `components/tools/tutorial-videos.tsx`

The UI renders:
- A grid of video cards
- Each card shows the YouTube thumbnail from `img.youtube.com/vi/{videoId}/mqdefault.jpg`
- Video title and channel name
- Clicking opens the YouTube video in a new tab
- Shows 3 videos by default, expandable to all 6

## Data Flow Diagram

```
tools table (30 tools: no tutorials first, then stalest)
    |
    v
For each tool:
    YouTube search: "{toolName} tutorial"
        |
        v
    Parse ytInitialData JSON
    (fallback: regex video ID extraction)
        |
        v
    Up to 6 tutorials [{title, youtube_url, channel, video_id}]
        |
        v
    UPDATE tools SET tutorial_videos = <json>
        |
        v
    Tool page renders video grid with thumbnails
```

## Database Changes

### `tools` table — column used
```sql
ALTER TABLE tools ADD COLUMN IF NOT EXISTS tutorial_videos jsonb DEFAULT '[]';
```

**JSON shape:**
```json
[
  {
    "title": "How to Use Midjourney - Complete Tutorial",
    "youtube_url": "https://www.youtube.com/watch?v=abc123",
    "channel": "Matt Wolfe",
    "video_id": "abc123"
  }
]
```

## Key Files

| File | Purpose |
|------|---------|
| `app/api/cron/discover-tutorials/route.ts` | API endpoint |
| `lib/cron/tutorials.ts` | YouTube scraping + discovery logic |
| `lib/cron/scrape.ts` | HTML fetching |
| `components/tools/tutorial-videos.tsx` | Video grid UI component |
| `supabase/migrations/025_tutorials_and_faqs.sql` | Adds tutorial_videos column |
| `next.config.ts` | Allows `img.youtube.com` and `i.ytimg.com` image domains |

## No API Key Required
This pipeline uses YouTube search page scraping, not the YouTube Data API. This means:
- **Zero cost** — No API key or quota needed
- **Trade-off** — YouTube may change their HTML structure, breaking the parser
- **Mitigation** — Two extraction methods (JSON + regex fallback) provide redundancy

## Thumbnail Loading
Thumbnails are loaded from YouTube's CDN:
```
https://img.youtube.com/vi/{videoId}/mqdefault.jpg
```
This URL format is stable and doesn't require authentication. The `next.config.ts` file includes these domains in `remotePatterns` for Next.js Image optimization.
