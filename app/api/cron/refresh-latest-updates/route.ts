/**
 * Phase 8.next Stage 8 / Tier 4 (2026-05-13): daily latest-updates delta refresh.
 *
 * Picks the 25 stalest tools by `latest_updates_at ASC NULLS FIRST`
 * and re-runs the per-tool latest-updates pipeline (changelog + blog +
 * news + HN + Twitter via Apify). Safe to fire daily — cookie + Apify
 * accept duplicate writes.
 *
 * Cap is 25 per fire because each tool takes ~10-15 sec serial
 * (parallel-fetch all sources + DeepSeek synthesis + DB write); 25
 * tools at concurrency=5 ≈ 60 sec, fits under Vercel's free-tier
 * cron timeout. For full-catalog refresh, run `npm run latest:apply`
 * manually overnight.
 *
 * Schedule (vercel.json): "0 2 * * *" — daily at 02:00 UTC.
 */
import { NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cron/auth'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { discoverChangelog, discoverBlog } from '@/lib/cron/scrape-changelog'
import { fetchNewsMentions } from '@/lib/cron/scrape-news'
import { searchHN } from '@/lib/cron/scrape-hn'
import { discoverTwitterHandle, fetchTweets } from '@/lib/cron/scrape-twitter'
import { synthesizeLatestUpdates, type SignalInput } from '@/lib/cron/latest-updates'

export const maxDuration = 300 // 5 min — plenty of headroom for 25 tools at 5x concurrency

const BATCH_SIZE = 25
const CONCURRENCY = 5

type ToolRow = {
  id: string
  slug: string
  name: string
  website_url: string | null
  changelog_url: string | null
  blog_url: string | null
  twitter_handle: string | null
}

async function pMap<T, R>(items: T[], concurrency: number, fn: (it: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let i = 0
  async function worker() {
    while (true) {
      const idx = i++
      if (idx >= items.length) return
      out[idx] = await fn(items[idx], idx)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  return out
}

async function processOne(tool: ToolRow): Promise<{ ok: boolean; error?: string }> {
  const supa = getAdminClient()
  const [changelog, blog] = await Promise.all([
    discoverChangelog(tool.website_url, tool.changelog_url).catch(() => null),
    discoverBlog(tool.website_url, tool.blog_url).catch(() => null),
  ])
  let twitterHandle = tool.twitter_handle
  if (!twitterHandle) {
    twitterHandle = await discoverTwitterHandle(tool.slug, tool.website_url).catch(() => null)
  }
  const [news, hn, tweets] = await Promise.all([
    fetchNewsMentions(tool.name, 8).catch(() => []),
    searchHN(tool.name, 30).catch(() => []),
    fetchTweets(tool.name, twitterHandle, 5, 30).catch(() => []),
  ])
  const signal: SignalInput = {
    changelog_text: changelog?.text,
    changelog_url: changelog?.url,
    blog_text: blog?.text,
    blog_url: blog?.url,
    news,
    hn,
    tweets,
  }
  const result = await synthesizeLatestUpdates(tool.name, signal)
  if (!result) return { ok: false, error: 'synthesis_failed' }

  const updates: Record<string, unknown> = {
    latest_updates: result.items,
    latest_updates_at: new Date().toISOString(),
  }
  if (changelog?.url && changelog.url !== tool.changelog_url) updates.changelog_url = changelog.url
  if (blog?.url && blog.url !== tool.blog_url) updates.blog_url = blog.url
  if (twitterHandle && twitterHandle !== tool.twitter_handle) updates.twitter_handle = twitterHandle

  const { error } = await supa.from('tools').update(updates as never).eq('id', tool.id)
  if (error) return { ok: false, error: `db_update: ${error.message}` }
  return { ok: true }
}

export async function POST(request: Request) {
  const authError = validateCronSecret(request)
  if (authError) return authError

  const supa = getAdminClient()
  const { data, error } = await supa
    .from('tools')
    .select('id, slug, name, website_url, changelog_url, blog_url, twitter_handle')
    .eq('is_published', true)
    .order('latest_updates_at', { ascending: true, nullsFirst: true })
    .limit(BATCH_SIZE)
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  const tools = (data ?? []) as unknown as ToolRow[]
  if (tools.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: 'no tools to refresh' })
  }

  let succeeded = 0
  let failed = 0
  const failures: Array<{ slug: string; error: string }> = []

  await pMap(tools, CONCURRENCY, async (tool) => {
    const result = await processOne(tool).catch((err) => ({
      ok: false as const,
      error: err instanceof Error ? err.message : String(err),
    }))
    if (result.ok) succeeded++
    else {
      failed++
      failures.push({ slug: tool.slug, error: result.error ?? 'unknown' })
    }
  })

  return NextResponse.json({
    ok: true,
    batch_size: tools.length,
    succeeded,
    failed,
    failures: failures.slice(0, 5),
  })
}
