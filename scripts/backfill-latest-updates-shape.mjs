/**
 * Pure transformation: convert OLD-shape latest_updates
 * ({date, headline, source_path}) to NEW-shape
 * ({date, source, type, title, url, summary}) using the tool's website_url
 * to build absolute URLs. No HTTP fetches — synthesizes summary from the
 * headline itself. Fast.
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

function deriveSourceFromPath(path) {
  const p = (path || '').toLowerCase()
  if (p.includes('changelog') || p.includes('release-notes') || p.includes('releases')) return 'changelog'
  if (p.includes('news') || p.includes('press')) return 'news'
  if (p.includes('reddit.com')) return 'reddit'
  if (p.includes('news.ycombinator')) return 'hackernews'
  if (p.includes('twitter.com') || p.includes('x.com')) return 'twitter'
  return 'blog'
}

function buildUrl(baseUrl, sourcePath) {
  if (!sourcePath) return null
  if (sourcePath.startsWith('http://') || sourcePath.startsWith('https://')) return sourcePath
  try {
    const origin = new URL(baseUrl).origin
    return origin + (sourcePath.startsWith('/') ? sourcePath : '/' + sourcePath)
  } catch {
    return null
  }
}

async function main() {
  let from = 0
  let scanned = 0
  let updated = 0
  let skipped = 0
  const PAGE = 500
  while (true) {
    const { data, error } = await db
      .from('tools')
      .select('id,slug,website_url,latest_updates')
      .eq('is_published', true)
      .order('id')
      .range(from, from + PAGE - 1)
    if (error) { console.error(error); break }
    if (!data?.length) break
    for (const tool of data) {
      scanned++
      const items = Array.isArray(tool.latest_updates) ? tool.latest_updates : []
      if (items.length === 0) { skipped++; continue }
      // Detect old shape: has `headline` and no `url`
      const isOldShape = items.some((u) => u && typeof u === 'object' && (u.headline || u.source_path) && !u.url)
      if (!isOldShape) { skipped++; continue }
      const next = items.map((u) => {
        if (!u || typeof u !== 'object') return null
        const headline = u.headline || u.title || ''
        if (!headline) return null
        const url = buildUrl(tool.website_url, u.source_path)
        if (!url) return null
        const source = deriveSourceFromPath(u.source_path || url)
        return {
          date: u.date || '',
          source,
          type: source === 'changelog' ? 'changelog' : 'news',
          title: String(headline).slice(0, 200),
          url,
          summary: String(headline).slice(0, 280),
        }
      }).filter(Boolean).filter((u) => u.title && u.url && u.date).slice(0, 5)
      if (next.length === 0) { skipped++; continue }
      const { error: upErr } = await db.from('tools').update({ latest_updates: next }).eq('id', tool.id)
      if (upErr) { console.error(`${tool.slug}: ${upErr.message}`); continue }
      updated++
    }
    console.log(`scanned ${scanned} · updated ${updated} · skipped ${skipped}`)
    if (data.length < PAGE) break
    from += PAGE
  }
  console.log(`\nDONE. scanned=${scanned} updated=${updated} skipped=${skipped}`)
}
main().catch((e) => { console.error('FATAL:', e); process.exit(1) })
