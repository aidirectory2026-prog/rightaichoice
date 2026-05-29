/**
 * Backfill real <title> + meta-description for every tutorial_url and
 * latest_updates url across the catalog. Transforms broken latest_updates
 * shape ({date, headline, source_path}) into proper shape
 * ({date, source, type, title, url, summary}).
 *
 * Run: node scripts/backfill-link-titles.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const CONCURRENCY = 8
const TIMEOUT_MS = 8000

async function fetchPageMeta(url) {
  try {
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), TIMEOUT_MS)
    const res = await fetch(url, {
      signal: ac.signal,
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 (rightaichoice-backfill/1.0; +https://rightaichoice.com)',
        'accept': 'text/html,application/xhtml+xml',
      },
    })
    clearTimeout(t)
    if (!res.ok) return null
    const text = await res.text()
    const head = text.slice(0, 60000)
    const titleMatch = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const ogTitleMatch = head.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    const ogDescMatch = head.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
    const descMatch = head.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    const cleanText = (s) => s.replace(/\s+/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim()
    const title = cleanText(ogTitleMatch?.[1] || titleMatch?.[1] || '').slice(0, 200)
    const description = cleanText(ogDescMatch?.[1] || descMatch?.[1] || '').slice(0, 280)
    return { title, description }
  } catch {
    return null
  }
}

function dropToolBrand(title, toolName) {
  if (!title || !toolName) return title
  const escaped = toolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Strip " | Tool", " - Tool", " — Tool", "Tool: ", etc.
  return title
    .replace(new RegExp(`\\s*[\\|\\-—:·]\\s*${escaped}.*$`, 'i'), '')
    .replace(new RegExp(`^${escaped}\\s*[\\|\\-—:·]\\s*`, 'i'), '')
    .trim() || title
}

function deriveSourceFromUrl(url) {
  const u = url.toLowerCase()
  if (u.includes('changelog') || u.includes('releases') || u.includes('release-notes') || u.includes('whats-new') || u.includes("what's-new")) return 'changelog'
  if (u.includes('news') || u.includes('press')) return 'news'
  if (u.includes('reddit.com')) return 'reddit'
  if (u.includes('news.ycombinator')) return 'hackernews'
  if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter'
  return 'blog'
}

async function pool(items, fn, concurrency = CONCURRENCY) {
  const results = new Array(items.length)
  let next = 0
  async function worker() {
    while (true) {
      const i = next++
      if (i >= items.length) return
      results[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  return results
}

async function processBatch(tools) {
  for (const tool of tools) {
    const baseUrl = tool.website_url || ''
    const baseOrigin = (() => { try { return new URL(baseUrl).origin } catch { return '' } })()

    // --- Tutorial URLs → tutorial_links jsonb [{url, title, description}] ---
    const tutorialUrls = Array.isArray(tool.tutorial_urls) ? tool.tutorial_urls.filter((u) => typeof u === 'string') : []
    let tutorialLinks = []
    if (tutorialUrls.length > 0) {
      const fetched = await pool(tutorialUrls, async (url) => {
        const meta = await fetchPageMeta(url)
        const title = meta?.title ? dropToolBrand(meta.title, tool.name) : ''
        const description = meta?.description || ''
        return { url, title: title || urlPathTitle(url), description }
      })
      tutorialLinks = fetched
    }

    // --- latest_updates: transform old shape OR fetch fresh titles ---
    const rawUpdates = Array.isArray(tool.latest_updates) ? tool.latest_updates : []
    let updates = []
    if (rawUpdates.length > 0) {
      // Determine if old shape (has headline + source_path) or new shape (has title + url)
      const needsRebuild = rawUpdates.some((u) => u && typeof u === 'object' && (u.headline || u.source_path) && !u.url)
      if (needsRebuild) {
        // Old shape — rebuild URL from source_path, fetch real title+description
        const enriched = await pool(rawUpdates, async (u) => {
          if (!u || typeof u !== 'object') return null
          const headline = u.headline || u.title || ''
          if (!headline) return null
          const sourcePath = u.source_path || ''
          const fullUrl = sourcePath.startsWith('http') ? sourcePath : (baseOrigin + (sourcePath.startsWith('/') ? sourcePath : '/' + sourcePath))
          if (!fullUrl || !fullUrl.startsWith('http')) return null
          const meta = await fetchPageMeta(fullUrl)
          const realTitle = meta?.title ? dropToolBrand(meta.title, tool.name) : ''
          const source = deriveSourceFromUrl(fullUrl)
          return {
            date: u.date || '',
            source,
            type: source === 'changelog' ? 'changelog' : 'news',
            title: (realTitle || headline).slice(0, 200),
            url: fullUrl,
            summary: (meta?.description || headline).slice(0, 280),
          }
        })
        updates = enriched.filter(Boolean).filter((u) => u.title && u.url && u.date).slice(0, 5)
      } else {
        // New shape — still want to ensure title/description are real. Skip refetch
        // if title is already substantial (>30 chars and not just a date).
        updates = rawUpdates.filter((u) => u && u.title && u.url).slice(0, 5)
      }
    }

    // --- Write back ---
    const update = {}
    if (tutorialLinks.length > 0) update.tutorial_links = tutorialLinks
    if (updates.length > 0) update.latest_updates = updates
    if (Object.keys(update).length === 0) continue

    const { error } = await db.from('tools').update(update).eq('id', tool.id)
    if (error) console.error(`[${tool.slug}] update failed: ${error.message}`)
    else console.log(`[${tool.slug}] tut=${tutorialLinks.length} lu=${updates.length}`)
  }
}

function urlPathTitle(url) {
  try {
    const u = new URL(url)
    const segs = u.pathname.split('/').filter(Boolean)
    if (segs.length === 0) return u.hostname.replace(/^www\./, '')
    const last = decodeURIComponent(segs[segs.length - 1]).replace(/\.[a-z]{2,4}$/i, '').replace(/[-_]+/g, ' ').trim()
    return last.replace(/\b\w/g, (c) => c.toUpperCase()) || u.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

const ONLY_NEW = process.argv.includes('--only-new')
const SLUG = process.argv.find((a) => a.startsWith('--slug='))?.split('=')[1]
const PAGE_SIZE = 50

async function main() {
  let from = 0
  let total = 0
  for (;;) {
    let q = db
      .from('tools')
      .select('id,slug,name,website_url,tutorial_urls,latest_updates,tutorial_links')
      .eq('is_published', true)
      .order('id')
      .range(from, from + PAGE_SIZE - 1)

    if (ONLY_NEW) q = q.gte('created_at', '2026-05-25T19:00:00Z')
    if (SLUG) q = db.from('tools').select('id,slug,name,website_url,tutorial_urls,latest_updates,tutorial_links').eq('slug', SLUG)

    const { data, error } = await q
    if (error) { console.error(error); break }
    if (!data?.length) break

    // Skip tools that already have BOTH tutorial_links AND new-shape latest_updates AND no broken data
    const todo = data.filter((t) => {
      const hasTutorialUrls = Array.isArray(t.tutorial_urls) && t.tutorial_urls.length > 0
      const hasTutorialLinks = Array.isArray(t.tutorial_links) && t.tutorial_links.length > 0
      const updates = Array.isArray(t.latest_updates) ? t.latest_updates : []
      const hasBrokenUpdates = updates.some((u) => u && typeof u === 'object' && (u.headline || u.source_path) && !u.url)
      const needsTutorial = hasTutorialUrls && !hasTutorialLinks
      return needsTutorial || hasBrokenUpdates
    })

    if (todo.length > 0) {
      await processBatch(todo)
      total += todo.length
    }
    console.log(`progress: scanned ${from + data.length}, processed total ${total}`)
    if (SLUG || data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  console.log(`\nDONE. processed ${total} tools.`)
}
main()
