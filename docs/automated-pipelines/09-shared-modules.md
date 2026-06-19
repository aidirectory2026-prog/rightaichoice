# Shared Modules — Infrastructure Used by All Pipelines

## `lib/cron/auth.ts` — Request Authentication

**Purpose:** Validates that incoming requests have the correct CRON_SECRET token.

**How it works:**
1. Reads the `Authorization` header from the request
2. Strips the `Bearer ` prefix to get the raw token
3. Reads `process.env.CRON_SECRET` at runtime (NOT cached at build time)
4. If the token matches, returns `null` (no error)
5. If it doesn't match or the secret is missing, returns a 401 JSON response

**Used by:** Every `/api/cron/*` route as the first check before running any pipeline logic.

**Why runtime `process.env`:** Vercel evaluates imported modules at build time. If CRON_SECRET was imported from a centralized env config, it would be cached as `undefined` (since it wasn't set during build). Reading `process.env` directly forces runtime evaluation on every request.

---

## `lib/cron/supabase-admin.ts` — Service-Role Database Client

**Purpose:** Creates a Supabase client that bypasses Row Level Security (RLS).

**How it works:**
- Uses `SUPABASE_SERVICE_ROLE_KEY` (not the public anon key)
- The service role has full read/write access to all tables, regardless of RLS policies
- The client is created as a singleton (cached in a module-level variable) so it's reused across the same function execution
- Auth features (token refresh, session persistence) are disabled since this isn't a user session

**Used by:** Every pipeline to read tools, write logs, update data.

**Security note:** The service-role key is extremely sensitive — it has full database access. It's only available server-side in Vercel env vars and never exposed to the browser.

---

## `lib/cron/scrape.ts` — Web Scraping Utility

**Purpose:** Fetches web pages and extracts clean text content.

### `fetchPageText(url, timeoutMs = 10000)`
1. Sends HTTP GET with a Chrome-like User-Agent header
2. Follows redirects automatically
3. Strips `<script>` and `<style>` tags
4. Strips all remaining HTML tags
5. Collapses whitespace
6. Returns first 8000 characters of clean text
7. Aborts after `timeoutMs` milliseconds

### `fetchHTML(url, timeoutMs = 10000)`
1. Same as above but returns raw HTML without stripping
2. Used by discovery (ProductHunt, GitHub) and tutorial (YouTube) pipelines that need to parse HTML structure

**User-Agent:** Mimics Chrome on macOS to avoid bot-detection blocking:
```
Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36
```

**Timeout handling:** Uses `AbortController` — if the fetch doesn't complete within the timeout, the request is aborted and an error is thrown. This prevents a single slow website from stalling the entire pipeline.

---

## `lib/cron/dedup.ts` — Deduplication Logic

**Purpose:** Prevents duplicate tools from being inserted during ingestion.

**Three dedup checks:**

1. **Slug match:** Converts tool name to URL slug (lowercase, replace non-alphanumeric with hyphens) and checks against existing `tools.slug` values
2. **Domain match:** Normalizes URLs by stripping `www.` and lowercasing, then checks against existing `tools.website_url` domains
3. **Batch dedup:** Tracks names within the current batch to prevent the same tool appearing twice from different sources

**How it queries:**
```sql
SELECT slug, website_url FROM tools
```
Builds two `Set` objects in memory for O(1) lookups. With 500+ tools this is still very fast.

---

## `lib/cron/enrich.ts` — Claude AI Enrichment

**Purpose:** Takes a raw tool (name + URL + description) and generates complete structured metadata using Claude AI.

**Process:**
1. Fetches the tool's website text (up to 8000 chars)
2. Sends a detailed prompt to `claude-sonnet-4-6`
3. Asks for a specific JSON structure with 12 fields
4. Parses the response as JSON
5. Validates against a Zod schema
6. Returns the validated data or `null` on failure

**Zod schema ensures:**
- `tagline` max 120 chars
- `description` max 2000 chars
- `pricing_type` is one of: free, freemium, paid, contact
- `skill_level` is one of: beginner, intermediate, advanced
- `platforms` are valid enum values
- Arrays don't exceed max lengths (15 features, 15 integrations, 5 best_for, 5 not_for)

**Cost per call:** ~$0.005-0.01 (Sonnet input + output tokens)

---

## `lib/utils/slugify.ts` — URL Slug Generator

**Purpose:** Converts tool names to URL-safe slugs.

```typescript
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}
```

Examples:
- `"ChatGPT"` → `"chatgpt"`
- `"Stable Diffusion XL"` → `"stable-diffusion-xl"`
- `"DALL·E 3"` → `"dall-e-3"`

**Used by:** Ingestion pipeline (generating slugs for new tools) and dedup (matching against existing slugs).

---

## How These Modules Connect

```
API Route
  ├── auth.ts (validate CRON_SECRET)
  ├── supabase-admin.ts (get DB client)
  └── pipeline logic
       ├── scrape.ts (fetch websites)
       ├── dedup.ts (prevent duplicates)
       ├── enrich.ts (Claude AI analysis)
       └── slugify.ts (URL slug generation)
```

Every pipeline follows this same pattern. The shared modules eliminate code duplication and ensure consistent behavior across all 5 workflows.
