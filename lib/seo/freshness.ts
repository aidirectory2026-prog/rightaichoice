/**
 * 1.1 freshness-cascade — read/write helpers for pages_freshness.
 *
 * Read API (server-only — service-role queries):
 *   getLastChangedAt(path)              → Date          // single URL
 *   getLastChangedAtBatch(paths[])      → Map<path,Date> // sitemap-style bulk
 *
 * Write API:
 *   bumpFreshness(path, opts)           → upserts one row, sets NOW()
 *   propagateFreshness(toolSlug, opts)  → calls the SQL function;
 *                                          fans out to every page mentioning
 *                                          the tool. Used by the admin button
 *                                          and any code path that needs to
 *                                          cascade without a real DB UPDATE.
 *
 * All reads return a fallback (the tool's `updated_at`, then `created_at`,
 * then `new Date(0)`) when no pages_freshness row exists yet — this lets
 * us deploy the read path before the backfill finishes.
 */
import { getAdminClient } from '@/lib/cron/supabase-admin'

export type FreshnessChangeSource =
  | 'tool_update'
  | 'compare_update'
  | 'admin_manual'
  | 'cron_sweep'
  | 'backfill'

export type FreshnessPageType =
  | 'tool'
  | 'compare'
  | 'best'
  | 'category'
  | 'role'
  | 'stack'
  | 'blog'

export interface BumpFreshnessOpts {
  pageType: FreshnessPageType
  source: FreshnessChangeSource
  event?: string
  reason?: string
  sourceToolSlug?: string
}

export interface PropagateFreshnessOpts {
  source: FreshnessChangeSource
  event?: string
  reason?: string
}

/**
 * Look up the last-changed timestamp for a single canonical path.
 * Falls back to the source row's `updated_at` (then `created_at`) when no
 * pages_freshness row exists — so pages render correct-ish dates before
 * the backfill runs.
 */
export async function getLastChangedAt(path: string): Promise<Date> {
  // pages_freshness isn't in the generated Supabase types yet (added in
  // migration 103); cast around it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getAdminClient() as any

  const { data, error } = await supabase
    .from('pages_freshness')
    .select('last_changed_at')
    .eq('page_path', path)
    .maybeSingle()

  const row = data as { last_changed_at?: string } | null
  if (!error && row?.last_changed_at) {
    return new Date(row.last_changed_at)
  }

  return getFallbackTimestamp(path)
}

/**
 * Bulk variant for sitemap generation. Returns a Map keyed by exact path.
 * Missing entries are NOT auto-filled with fallbacks — the caller decides
 * what to do (sitemaps typically skip the URL or omit `<lastmod>`).
 */
export async function getLastChangedAtBatch(
  paths: string[]
): Promise<Map<string, Date>> {
  const result = new Map<string, Date>()
  if (paths.length === 0) return result

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getAdminClient() as any
  const CHUNK = 500

  for (let i = 0; i < paths.length; i += CHUNK) {
    const chunk = paths.slice(i, i + CHUNK)
    const { data, error } = await supabase
      .from('pages_freshness')
      .select('page_path, last_changed_at')
      .in('page_path', chunk)

    if (error) {
      console.warn('[freshness] batch read failed:', error.message)
      continue
    }

    for (const row of data ?? []) {
      const p = (row as { page_path: string }).page_path
      const t = (row as { last_changed_at: string }).last_changed_at
      if (p && t) result.set(p, new Date(t))
    }
  }

  return result
}

/**
 * Upsert a single pages_freshness row at NOW(). Use when you've made an
 * out-of-DB change to a page (e.g., editorial polish that didn't touch any
 * trigger column) and want the cascade to pick it up.
 */
export async function bumpFreshness(
  path: string,
  opts: BumpFreshnessOpts
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getAdminClient() as any
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('pages_freshness')
    .upsert(
      {
        page_path: path,
        page_type: opts.pageType,
        last_changed_at: now,
        change_source: opts.source,
        change_reason: opts.reason ?? null,
        source_tool_slug: opts.sourceToolSlug ?? null,
        source_event: opts.event ?? null,
        updated_at: now,
      },
      { onConflict: 'page_path' }
    )

  if (error) {
    throw new Error(`bumpFreshness(${path}) failed: ${error.message}`)
  }
}

/**
 * Call the SQL function `propagate_freshness(tool_slug, source, event, reason)`
 * which fans out across every page mentioning the tool. Used by the admin
 * "Bump freshness" button and by repair scripts.
 *
 * Returns the number of rows touched. Returns 0 (not throw) on RPC error —
 * the function itself is exception-safe.
 */
export async function propagateFreshness(
  toolSlug: string,
  opts: PropagateFreshnessOpts
): Promise<number> {
  // propagate_freshness RPC not in generated types yet (migration 103).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getAdminClient() as any

  const { data, error } = await supabase.rpc('propagate_freshness', {
    p_tool_slug: toolSlug,
    p_source: opts.source,
    p_event: opts.event ?? null,
    p_reason: opts.reason ?? null,
  })

  if (error) {
    console.warn(
      `[freshness] propagate_freshness(${toolSlug}) failed: ${error.message}`
    )
    return 0
  }

  return typeof data === 'number' ? data : 0
}

/**
 * Max last_changed_at per page_type — used by the static sitemap to give
 * section-index URLs (`/tools`, `/compare`, `/blog`, …) an honest `lastmod`
 * equal to the freshest content inside that section. Returns an empty map
 * when pages_freshness hasn't been backfilled yet; callers then omit lastmod
 * rather than emitting a fake `new Date()`.
 */
export async function getSectionFreshness(): Promise<
  Map<FreshnessPageType, Date>
> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getAdminClient() as any
  const out = new Map<FreshnessPageType, Date>()

  const { data, error } = await supabase
    .from('pages_freshness')
    .select('page_type, last_changed_at')
    .order('last_changed_at', { ascending: false })

  if (error) {
    console.warn('[freshness] section read failed:', error.message)
    return out
  }

  for (const row of (data ?? []) as Array<{
    page_type: FreshnessPageType
    last_changed_at: string
  }>) {
    // rows are sorted newest-first, so the first seen per type is the max
    if (row.page_type && row.last_changed_at && !out.has(row.page_type)) {
      out.set(row.page_type, new Date(row.last_changed_at))
    }
  }

  return out
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/**
 * Best-effort fallback for paths with no pages_freshness row yet.
 * Recognises the canonical path shapes; returns epoch zero for anything else.
 */
async function getFallbackTimestamp(path: string): Promise<Date> {
  const supabase = getAdminClient()

  // /tools/<slug>
  const toolMatch = path.match(/^\/tools\/([^/]+)$/)
  if (toolMatch) {
    const slug = toolMatch[1]
    const { data } = await supabase
      .from('tools')
      .select('updated_at, created_at, last_full_refresh_at, last_verified_at')
      .eq('slug', slug)
      .maybeSingle()

    return pickLatestDate([
      (data as Record<string, string | null> | null)?.last_full_refresh_at,
      (data as Record<string, string | null> | null)?.last_verified_at,
      (data as Record<string, string | null> | null)?.updated_at,
      (data as Record<string, string | null> | null)?.created_at,
    ])
  }

  // /compare/<slug>
  const compareMatch = path.match(/^\/compare\/([^/]+)$/)
  if (compareMatch) {
    const slug = compareMatch[1]
    const { data } = await supabase
      .from('tool_comparisons')
      .select('last_reviewed_at, published_at, created_at')
      .eq('slug', slug)
      .maybeSingle()

    return pickLatestDate([
      (data as Record<string, string | null> | null)?.last_reviewed_at,
      (data as Record<string, string | null> | null)?.published_at,
      (data as Record<string, string | null> | null)?.created_at,
    ])
  }

  // /categories/<slug>: latest tool update in that category
  const categoryMatch = path.match(/^\/categories\/([^/]+)$/)
  if (categoryMatch) {
    const slug = categoryMatch[1]
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    const categoryId = (cat as { id: string } | null)?.id
    if (!categoryId) return new Date(0)

    const { data: tools } = await supabase
      .from('tool_categories')
      .select('tools(updated_at)')
      .eq('category_id', categoryId)
      .limit(1000)

    const latest = (tools ?? [])
      .map((row) => {
        const t = (row as { tools?: { updated_at?: string } | null }).tools
        return t?.updated_at ?? null
      })
      .filter((v): v is string => !!v)
      .sort()
      .pop()

    return pickLatestDate([latest])
  }

  // Best/role/stack/blog fallbacks are page-type specific and currently
  // not in the DB schema; the backfill script writes their pages_freshness
  // rows from code-config sources. Until then, return epoch zero.
  return new Date(0)
}

function pickLatestDate(candidates: Array<string | null | undefined>): Date {
  let best: Date | null = null
  for (const c of candidates) {
    if (!c) continue
    const d = new Date(c)
    if (Number.isNaN(d.getTime())) continue
    if (!best || d > best) best = d
  }
  return best ?? new Date(0)
}
