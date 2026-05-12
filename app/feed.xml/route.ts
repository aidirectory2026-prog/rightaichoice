/**
 * Phase 7B.seo (2026-05-13): RSS 2.0 feed at /feed.xml.
 *
 * Lists the most recent editorial content (compare pages + tool pages)
 * for content aggregators (Feedly, NewsBlur, AI-tool newsletters,
 * IFTTT triggers) to auto-pick up. Each pickup is effectively a free
 * inbound link signal and helps with discovery + indexing.
 *
 * Refreshes hourly via Next.js route revalidate. Source data: 50 most
 * recent editorial /compare pages + 50 most recent tool pages by
 * updated_at.
 */
import { getAdminClient } from '@/lib/cron/supabase-admin'

export const revalidate = 3600
export const runtime = 'nodejs'

const SITE = 'https://rightaichoice.com'
const FEED_URL = `${SITE}/feed.xml`
const FEED_TITLE = 'RightAIChoice — AI Tool Comparisons & Reviews'
const FEED_DESC =
  'Independent, in-depth AI tool comparisons, reviews, and recommendations. Updated weekly with new compare pages and refreshed tool data.'

type CompareRow = {
  slug: string
  verdict: string | null
  published_at: string | null
  last_reviewed_at: string | null
  tool_ids: string[] | null
}

type ToolRow = {
  slug: string
  name: string
  tagline: string | null
  updated_at: string | null
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function rfc822(d: Date): string {
  return d.toUTCString()
}

export async function GET() {
  const supa = getAdminClient()

  const [compareRes, toolRes] = await Promise.all([
    supa
      .from('tool_comparisons')
      .select('slug, verdict, published_at, last_reviewed_at, tool_ids')
      .eq('is_editorial', true)
      .order('published_at', { ascending: false })
      .range(0, 49),
    supa
      .from('tools')
      .select('slug, name, tagline, updated_at')
      .eq('is_published', true)
      .order('updated_at', { ascending: false })
      .range(0, 49),
  ])

  const compares = (compareRes.data ?? []) as unknown as CompareRow[]
  const tools = (toolRes.data ?? []) as unknown as ToolRow[]

  const items: Array<{
    title: string
    link: string
    description: string
    pubDate: string
    guid: string
  }> = []

  for (const c of compares) {
    const slug = c.slug
    const titleParts = slug.split('-vs-').map((s) => s.replace(/-/g, ' '))
    // Title-case each tool name segment for display in RSS reader UIs.
    const titleCased = titleParts.map((p) =>
      p
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    )
    const title = `${titleCased.join(' vs ')} — In-depth Comparison (2026)`
    const link = `${SITE}/compare/${slug}`
    const desc = (c.verdict ?? '').slice(0, 500)
    const pub = new Date(c.last_reviewed_at ?? c.published_at ?? Date.now())
    items.push({
      title: escapeXml(title),
      link: escapeXml(link),
      description: escapeXml(desc),
      pubDate: rfc822(pub),
      guid: escapeXml(link),
    })
  }

  for (const t of tools) {
    const link = `${SITE}/tools/${t.slug}`
    const desc = (t.tagline ?? '').slice(0, 500)
    items.push({
      title: escapeXml(`${t.name} — AI Tool Review (2026)`),
      link: escapeXml(link),
      description: escapeXml(desc),
      pubDate: rfc822(new Date(t.updated_at ?? Date.now())),
      guid: escapeXml(link),
    })
  }

  // Sort merged set newest first, take 100 most recent across both types
  items.sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate))
  const recent = items.slice(0, 100)
  const lastBuildDate = recent[0]?.pubDate ?? rfc822(new Date())

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${escapeXml(SITE)}</link>
    <description>${escapeXml(FEED_DESC)}</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${escapeXml(FEED_URL)}" rel="self" type="application/rss+xml"/>
    <generator>RightAIChoice editorial</generator>
${recent
  .map(
    (i) => `    <item>
      <title>${i.title}</title>
      <link>${i.link}</link>
      <guid isPermaLink="true">${i.guid}</guid>
      <pubDate>${i.pubDate}</pubDate>
      <description>${i.description}</description>
      <dc:creator>RightAIChoice Editorial Team</dc:creator>
    </item>`
  )
  .join('\n')}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
    },
  })
}
