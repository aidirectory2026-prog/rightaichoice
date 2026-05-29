/**
 * Focused retry for tools with empty latest_updates. Tries a wider scrape
 * (changelog/blog/releases/news/press/research/announcements + GitHub
 * releases if github_url present) and asks DeepSeek for ONLY latest_updates
 * with a tight prompt. Cheaper + faster than re-running full SOP.
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY
if (!DEEPSEEK_KEY) { console.error('DEEPSEEK_API_KEY missing'); process.exit(1) }
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions'

const CONCURRENCY = 4
const FETCH_TIMEOUT_MS = 8000

process.on('unhandledRejection', (e) => console.error('UNHANDLED:', e?.message ?? e))

async function fetchPage(url) {
  try {
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS)
    const res = await fetch(url, {
      signal: ac.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (rightaichoice-retry/1.0)', accept: 'text/html,application/xhtml+xml' },
    })
    clearTimeout(t)
    if (!res.ok) return ''
    const html = await res.text()
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 6000)
      .trim()
  } catch {
    return ''
  }
}

async function fetchGithubReleases(githubUrl) {
  try {
    // Expect format https://github.com/owner/repo
    const m = githubUrl.match(/github\.com\/([^/]+)\/([^/?#]+)/)
    if (!m) return ''
    const owner = m[1]; let repo = m[2]
    repo = repo.replace(/\.git$/, '')
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS)
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=5`, { signal: ac.signal, headers: { accept: 'application/vnd.github+json' } })
    clearTimeout(t)
    if (!res.ok) return ''
    const data = await res.json()
    if (!Array.isArray(data)) return ''
    return data.slice(0, 5).map((r) => `RELEASE ${r.tag_name} (${(r.published_at || '').slice(0, 10)}): ${r.name || ''}\n${(r.body || '').slice(0, 800)}\nurl: ${r.html_url}`).join('\n\n').slice(0, 5000)
  } catch {
    return ''
  }
}

async function scrapeBundle(websiteUrl, githubUrl) {
  let origin = ''
  try { origin = new URL(websiteUrl).origin } catch { return '' }
  const candidates = [
    `${origin}/changelog`,
    `${origin}/release-notes`,
    `${origin}/releases`,
    `${origin}/whats-new`,
    `${origin}/whats_new`,
    `${origin}/updates`,
    `${origin}/blog`,
    `${origin}/news`,
    `${origin}/press`,
    `${origin}/announcements`,
    `${origin}/research`,
  ]
  const chunks = []
  await Promise.all(candidates.map(async (url) => {
    const text = await fetchPage(url)
    if (text && text.length > 200) chunks.push(`### Source: ${url}\n${text}`)
  }))
  if (githubUrl) {
    const gh = await fetchGithubReleases(githubUrl)
    if (gh) chunks.push(`### GitHub Releases\n${gh}`)
  }
  return chunks.join('\n\n')
}

async function synthesize(tool, scraped) {
  const sys = `You produce a STRICT JSON array of up to 5 most-recent dated updates from the scraped content. Today is ${new Date().toISOString().slice(0, 10)}.`
  const user = `Tool: ${tool.name}
Website: ${tool.website_url}

Scraped multi-source content (each section starts with "### Source: <url>"):
"""
${scraped.slice(0, 12000)}
"""

Return a JSON object {"latest_updates": [...]} where each item is {date, source, type, title, url, summary}:
- date: YYYY-MM-DD (skip items with no real date — don't invent)
- source: "changelog" | "blog" | "news"
- type: "feature" | "pricing" | "launch" | "changelog" | "news"
- title: <=200 char headline as worded on the page
- url: absolute URL to the specific entry (NOT section index — include the slug)
- summary: 1-2 sentence (<=280 char) plain-language summary

Sort newest-first. Empty array ONLY if literally no dated content exists. Strict JSON, no prose, no code fences.`
  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${DEEPSEEK_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      max_tokens: 2048,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
    }),
  })
  if (!res.ok) return []
  const json = await res.json()
  const text = json.choices?.[0]?.message?.content ?? ''
  let parsed
  try { parsed = JSON.parse(text) } catch { return [] }
  const items = Array.isArray(parsed?.latest_updates) ? parsed.latest_updates : []
  const validSource = new Set(['changelog', 'blog', 'news', 'reddit', 'hackernews', 'twitter'])
  const validType = new Set(['feature', 'pricing', 'launch', 'discussion', 'news', 'changelog'])
  return items
    .filter((u) => u && typeof u === 'object')
    .map((u) => ({
      date: typeof u.date === 'string' ? u.date.slice(0, 40) : '',
      source: validSource.has(u.source) ? u.source : 'blog',
      type: validType.has(u.type) ? u.type : 'news',
      title: typeof u.title === 'string' ? u.title.slice(0, 200) : '',
      url: typeof u.url === 'string' && /^https?:\/\//.test(u.url) ? u.url.slice(0, 500) : '',
      summary: typeof u.summary === 'string' ? u.summary.slice(0, 280) : '',
    }))
    .filter((u) => u.title && u.url && u.date)
    .slice(0, 5)
}

async function pool(items, fn, concurrency = CONCURRENCY) {
  let next = 0
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (true) {
      const i = next++
      if (i >= items.length) return
      try { await fn(items[i], i) } catch (e) { console.error(`[${items[i]?.slug}] worker error: ${e?.message ?? e}`) }
    }
  }))
}

async function main() {
  let from = 0
  const PAGE = 500
  const todo = []
  while (true) {
    const { data, error } = await db
      .from('tools')
      .select('id, slug, name, website_url, github_url, latest_updates')
      .eq('is_published', true)
      .order('id')
      .range(from, from + PAGE - 1)
    if (error) { console.error(error); break }
    if (!data?.length) break
    for (const t of data) {
      const lu = Array.isArray(t.latest_updates) ? t.latest_updates : []
      if (lu.length === 0) todo.push(t)
    }
    if (data.length < PAGE) break
    from += PAGE
  }
  console.log(`Found ${todo.length} tools with empty latest_updates to retry`)

  let processed = 0
  let filled = 0
  await pool(todo, async (tool, idx) => {
    const bundle = await scrapeBundle(tool.website_url, tool.github_url)
    if (!bundle || bundle.length < 200) {
      processed++
      if (processed % 20 === 0) console.log(`[progress] ${processed}/${todo.length} processed, ${filled} filled`)
      return
    }
    const updates = await synthesize(tool, bundle)
    if (updates.length === 0) {
      processed++
      if (processed % 20 === 0) console.log(`[progress] ${processed}/${todo.length} processed, ${filled} filled`)
      return
    }
    const { error } = await db.from('tools').update({
      latest_updates: updates,
      latest_updates_at: new Date().toISOString(),
    }).eq('id', tool.id)
    if (error) console.error(`[${tool.slug}] update failed: ${error.message}`)
    else {
      filled++
      console.log(`[${tool.slug}] +${updates.length} updates`)
    }
    processed++
    if (processed % 20 === 0) console.log(`[progress] ${processed}/${todo.length} processed, ${filled} filled`)
  })

  console.log(`\nDONE. processed=${processed} filled=${filled}`)
}
main().catch((e) => { console.error('FATAL:', e); process.exit(1) })
