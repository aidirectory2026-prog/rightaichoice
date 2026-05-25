/**
 * Fetch real <title> + meta-description for every tutorial_url; write
 * tutorial_links jsonb [{url, title, description}]. Handles errors
 * defensively — a single hanging fetch never kills the run.
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const CONCURRENCY = 6
const FETCH_TIMEOUT_MS = 7000

process.on('unhandledRejection', (e) => console.error('UNHANDLED:', e?.message ?? e))

async function fetchMeta(url) {
  try {
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS)
    const res = await fetch(url, {
      signal: ac.signal,
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 (rightaichoice-backfill/1.0)',
        accept: 'text/html,application/xhtml+xml',
      },
    })
    clearTimeout(t)
    if (!res.ok) return null
    const text = (await res.text()).slice(0, 80000)
    const get = (re) => {
      const m = text.match(re)
      return m ? m[1] : ''
    }
    const clean = (s) => s.replace(/\s+/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim()
    const ogTitle = clean(get(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i))
    const tagTitle = clean(get(/<title[^>]*>([\s\S]*?)<\/title>/i))
    const ogDesc = clean(get(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i))
    const metaDesc = clean(get(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i))
    return {
      title: (ogTitle || tagTitle).slice(0, 200),
      description: (ogDesc || metaDesc).slice(0, 280),
    }
  } catch {
    return null
  }
}

function dropBrand(title, toolName) {
  if (!title || !toolName) return title
  const esc = toolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return title
    .replace(new RegExp(`\\s*[\\|\\-—:·]\\s*${esc}.*$`, 'i'), '')
    .replace(new RegExp(`^${esc}\\s*[\\|\\-—:·]\\s*`, 'i'), '')
    .trim() || title
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

async function pool(items, fn) {
  let next = 0
  const out = new Array(items.length)
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (true) {
        const i = next++
        if (i >= items.length) return
        try {
          out[i] = await fn(items[i], i)
        } catch (e) {
          out[i] = null
        }
      }
    }),
  )
  return out
}

async function main() {
  // Pull tools that have tutorial_urls but no tutorial_links yet
  let from = 0
  const PAGE = 50
  let totalProcessed = 0
  let totalScanned = 0
  while (true) {
    const { data, error } = await db
      .from('tools')
      .select('id,slug,name,tutorial_urls,tutorial_links')
      .eq('is_published', true)
      .order('id')
      .range(from, from + PAGE - 1)
    if (error) { console.error(error); break }
    if (!data?.length) break
    totalScanned += data.length

    for (const tool of data) {
      const urls = Array.isArray(tool.tutorial_urls) ? tool.tutorial_urls.filter((u) => typeof u === 'string' && u.startsWith('http')) : []
      const existing = Array.isArray(tool.tutorial_links) ? tool.tutorial_links : []
      if (urls.length === 0) continue
      if (existing.length >= urls.length) continue  // already done

      const links = await pool(urls, async (url) => {
        const m = await fetchMeta(url)
        const title = m?.title ? dropBrand(m.title, tool.name) : urlPathTitle(url)
        const description = m?.description || ''
        return { url, title: title.slice(0, 200), description }
      })
      const safe = links.filter((l) => l && l.url)
      if (safe.length === 0) continue
      const { error: upErr } = await db.from('tools').update({ tutorial_links: safe }).eq('id', tool.id)
      if (upErr) { console.error(`${tool.slug}: ${upErr.message}`); continue }
      totalProcessed++
      console.log(`[${tool.slug}] ${safe.length} links`)
    }
    console.log(`  --- scanned=${totalScanned} processed=${totalProcessed} ---`)
    if (data.length < PAGE) break
    from += PAGE
    // Keep-alive ping every batch to keep the parent log file fresh
    process.stderr.write(`[heartbeat] cursor=${from}\n`)
  }
  console.log(`\nDONE. scanned=${totalScanned} processed=${totalProcessed}`)
}
main().catch((e) => { console.error('FATAL:', e); process.exit(1) })
