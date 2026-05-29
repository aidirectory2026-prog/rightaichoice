/**
 * 1.1 freshness-cascade — one-time backfill for pages_freshness.
 *
 * Per locked decision #6, the initial last_changed_at for each URL is the
 * *real* timestamp from the underlying source row — NOT NOW(). That way
 * Google sees an honest distribution of page ages instead of a 3,000-URL
 * spike on backfill day.
 *
 * Sources:
 *   /tools/<slug>              → MAX(last_full_refresh_at, last_verified_at, updated_at, created_at)
 *   /compare/<slug>            → MAX(last_reviewed_at, published_at, created_at)
 *   /categories/<slug>         → MAX(updated_at) of any tool in that category
 *   /best/<slug>, /for/<slug>, /stacks/<slug>
 *                              → MAX(updated_at) of any tool mentioned on that page
 *                                (via page_tool_mentions — must be synced first)
 *   /blog/<slug>               → frontmatter publishedAt or file mtime
 *
 * Uses ON CONFLICT (page_path) DO NOTHING so any rows that real-time
 * triggers have already populated stay untouched.
 *
 * USAGE
 *   npm run backfill:freshness -- --dry-run
 *   npm run backfill:freshness
 *
 * Prerequisite: page_tool_mentions table must be populated first (run
 * sync_page_tool_mentions_db() in SQL and `npm run sync:mentions:code` +
 * `npm run sync:mentions:blog`).
 */
import 'dotenv/config'
import { readFile, readdir, stat } from 'fs/promises'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'

const BLOG_DIR = join(process.cwd(), 'content', 'blog')

type Row = {
  page_path: string
  page_type: string
  last_changed_at: string
  change_source: 'backfill'
  source_tool_slug?: string | null
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function pickLatestIso(candidates: Array<string | null | undefined>): string | null {
  let bestMs = -Infinity
  let best: string | null = null
  for (const c of candidates) {
    if (!c) continue
    const ms = Date.parse(c)
    if (!Number.isFinite(ms)) continue
    if (ms > bestMs) {
      bestMs = ms
      best = new Date(ms).toISOString()
    }
  }
  return best
}

async function buildToolRows(
  supabase: ReturnType<typeof getSupabase>
): Promise<Row[]> {
  const rows: Row[] = []
  const PAGE = 1000
  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .from('tools')
      .select('slug, updated_at, created_at, last_full_refresh_at, last_verified_at')
      .eq('is_published', true)
      .range(offset, offset + PAGE - 1)

    if (error) throw new Error(`tools fetch failed: ${error.message}`)
    if (!data || data.length === 0) break

    for (const t of data as Array<{
      slug: string
      updated_at: string | null
      created_at: string | null
      last_full_refresh_at: string | null
      last_verified_at: string | null
    }>) {
      const iso = pickLatestIso([
        t.last_full_refresh_at,
        t.last_verified_at,
        t.updated_at,
        t.created_at,
      ])
      if (!iso) continue
      rows.push({
        page_path: `/tools/${t.slug}`,
        page_type: 'tool',
        last_changed_at: iso,
        change_source: 'backfill',
        source_tool_slug: t.slug,
      })
    }

    if (data.length < PAGE) break
    offset += PAGE
  }

  return rows
}

async function buildCompareRows(
  supabase: ReturnType<typeof getSupabase>
): Promise<Row[]> {
  const { data, error } = await supabase
    .from('tool_comparisons')
    .select('slug, last_reviewed_at, published_at, created_at')
    .limit(5000)

  if (error) throw new Error(`tool_comparisons fetch failed: ${error.message}`)

  return (data ?? [])
    .map((c) => {
      const r = c as {
        slug: string
        last_reviewed_at: string | null
        published_at: string | null
        created_at: string | null
      }
      const iso = pickLatestIso([r.last_reviewed_at, r.published_at, r.created_at])
      if (!iso) return null
      return {
        page_path: `/compare/${r.slug}`,
        page_type: 'compare',
        last_changed_at: iso,
        change_source: 'backfill' as const,
      }
    })
    .filter((r): r is Row => r !== null)
}

async function buildMentionDerivedRows(
  supabase: ReturnType<typeof getSupabase>,
  pageType: 'best' | 'role' | 'stack' | 'category'
): Promise<Row[]> {
  // For each page of this type, pick MAX(tools.updated_at) across mentioned tools.
  const { data, error } = await supabase
    .from('page_tool_mentions')
    .select('page_path, tool_slug')
    .eq('page_type', pageType)
    .limit(50000)

  if (error) throw new Error(`page_tool_mentions(${pageType}) fetch failed: ${error.message}`)

  const byPage = new Map<string, string[]>()
  for (const row of data ?? []) {
    const r = row as { page_path: string; tool_slug: string }
    const list = byPage.get(r.page_path) ?? []
    list.push(r.tool_slug)
    byPage.set(r.page_path, list)
  }

  if (byPage.size === 0) return []

  // Bulk fetch updated_at for every referenced slug.
  const allSlugs = [...new Set([...byPage.values()].flat())]
  const slugToTs = new Map<string, string>()
  const CHUNK = 500
  for (let i = 0; i < allSlugs.length; i += CHUNK) {
    const { data: tools, error: tErr } = await supabase
      .from('tools')
      .select('slug, updated_at, last_full_refresh_at')
      .in('slug', allSlugs.slice(i, i + CHUNK))
    if (tErr) throw new Error(`tools meta fetch failed: ${tErr.message}`)
    for (const t of tools ?? []) {
      const r = t as {
        slug: string
        updated_at: string | null
        last_full_refresh_at: string | null
      }
      const iso = pickLatestIso([r.last_full_refresh_at, r.updated_at])
      if (iso) slugToTs.set(r.slug, iso)
    }
  }

  const rows: Row[] = []
  for (const [pagePath, slugs] of byPage) {
    const iso = pickLatestIso(slugs.map((s) => slugToTs.get(s) ?? null))
    if (!iso) continue
    rows.push({
      page_path: pagePath,
      page_type: pageType,
      last_changed_at: iso,
      change_source: 'backfill',
    })
  }
  return rows
}

async function buildBlogRows(): Promise<Row[]> {
  const files = (await readdir(BLOG_DIR).catch(() => [])).filter((f) =>
    f.endsWith('.mdx')
  )
  const rows: Row[] = []
  for (const file of files) {
    const fullPath = join(BLOG_DIR, file)
    let publishedAt: string | null = null
    try {
      const raw = await readFile(fullPath, 'utf8')
      const m = raw.match(/publishedAt:\s*["']?([0-9TZ:.\-+]+)["']?/)
      if (m) publishedAt = new Date(m[1]).toISOString()
    } catch {
      /* fall back to mtime */
    }
    if (!publishedAt) {
      try {
        const s = await stat(fullPath)
        publishedAt = s.mtime.toISOString()
      } catch {
        continue
      }
    }
    rows.push({
      page_path: `/blog/${file.replace(/\.mdx$/, '')}`,
      page_type: 'blog',
      last_changed_at: publishedAt,
      change_source: 'backfill',
    })
  }
  return rows
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const supabase = getSupabase()

  console.log('[backfill:freshness] gathering source timestamps…')
  const [tools, compares, bests, roles, stacks, categories, blogs] = await Promise.all([
    buildToolRows(supabase),
    buildCompareRows(supabase),
    buildMentionDerivedRows(supabase, 'best'),
    buildMentionDerivedRows(supabase, 'role'),
    buildMentionDerivedRows(supabase, 'stack'),
    buildMentionDerivedRows(supabase, 'category'),
    buildBlogRows(),
  ])

  const all: Row[] = [...tools, ...compares, ...bests, ...roles, ...stacks, ...categories, ...blogs]

  console.log(
    `[backfill:freshness] candidates: tools=${tools.length}, compare=${compares.length}, ` +
      `best=${bests.length}, role=${roles.length}, stack=${stacks.length}, ` +
      `category=${categories.length}, blog=${blogs.length}, total=${all.length}`
  )

  // Distribution preview — assert we're not collapsing to one date.
  const byDay = new Map<string, number>()
  for (const r of all) {
    const day = r.last_changed_at.slice(0, 10)
    byDay.set(day, (byDay.get(day) ?? 0) + 1)
  }
  const sortedDays = [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 10)
  console.log('[backfill:freshness] top 10 most recent days:')
  for (const [day, n] of sortedDays) console.log(`  ${day}: ${n}`)

  if (dryRun) {
    console.log('[backfill:freshness] --dry-run, skipping writes')
    return
  }

  // ON CONFLICT (page_path) DO NOTHING — never clobber rows the triggers
  // have already populated since deploy. Supabase exposes this via upsert
  // with ignoreDuplicates=true.
  const CHUNK = 500
  let inserted = 0
  for (let i = 0; i < all.length; i += CHUNK) {
    const batch = all.slice(i, i + CHUNK)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('pages_freshness')
      .upsert(batch, { onConflict: 'page_path', ignoreDuplicates: true })
      .select('page_path')
    if (error) {
      throw new Error(`backfill upsert failed at offset ${i}: ${error.message}`)
    }
    inserted += (data as { page_path: string }[] | null)?.length ?? 0
  }

  console.log(`[backfill:freshness] inserted=${inserted} (existing rows preserved)`)
}

main().catch((err) => {
  console.error('[backfill:freshness] FAILED:', err)
  process.exit(1)
})
