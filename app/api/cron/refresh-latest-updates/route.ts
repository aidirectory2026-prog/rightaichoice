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
import { cronRoute, withRetry } from '@/lib/pipelines/with-logging'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { discoverChangelog, discoverBlog } from '@/lib/cron/scrape-changelog'
import { fetchNewsMentions } from '@/lib/cron/scrape-news'
import { searchHN } from '@/lib/cron/scrape-hn'
import { searchReddit } from '@/lib/cron/scrape-reddit'
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
  // Each source is independently retried on transient failures (Apify/news
  // 5xx/429, network blips) before falling back to an empty list, so one
  // flaky vendor call doesn't silently drop a whole signal channel.
  const [news, hn, reddit] = await Promise.all([
    withRetry(() => fetchNewsMentions(tool.name, 8)).catch(() => []),
    withRetry(() => searchHN(tool.name, 30)).catch(() => []),
    withRetry(() => searchReddit(tool.name, 5, 30)).catch(() => []),
  ])
  const signal: SignalInput = {
    changelog_text: changelog?.text,
    changelog_url: changelog?.url,
    blog_text: blog?.text,
    blog_url: blog?.url,
    news,
    hn,
    reddit: reddit.map((r) => ({
      title: r.title,
      url: r.permalink,
      subreddit: r.subreddit,
      score: r.score,
      created_utc: r.created_utc,
    })),
  }
  // Retry the DeepSeek synthesis on transient (5xx/429/timeout) failures.
  // A null return is a clean "no signal" outcome, not an error, so it isn't
  // retried — it falls through to the synthesis_failed permanent path.
  const result = await withRetry(() => synthesizeLatestUpdates(tool.name, signal))
  if (!result) return { ok: false, error: 'synthesis_failed' }

  const updates: Record<string, unknown> = {
    latest_updates: result.items,
    latest_updates_at: new Date().toISOString(),
  }
  if (changelog?.url && changelog.url !== tool.changelog_url) updates.changelog_url = changelog.url
  if (blog?.url && blog.url !== tool.blog_url) updates.blog_url = blog.url

  const { error } = await supa.from('tools').update(updates as never).eq('id', tool.id)
  if (error) return { ok: false, error: `db_update: ${error.message}` }
  return { ok: true }
}

export const POST = cronRoute({ pipelineKey: 'refresh-latest-updates' }, async (ctx) => {
  const supa = getAdminClient()
  const { data, error } = await supa
    .from('tools')
    .select('id, slug, name, website_url, changelog_url, blog_url, twitter_handle')
    .eq('is_published', true)
    .order('latest_updates_at', { ascending: true, nullsFirst: true })
    .limit(BATCH_SIZE)
  if (error) {
    throw new Error(`fetch tools failed: ${error.message}`)
  }
  const tools = (data ?? []) as unknown as ToolRow[]
  if (tools.length === 0) {
    ctx.recordItems({ processed: 0, succeeded: 0, failed: 0 })
    return { ok: true, processed: 0, message: 'no tools to refresh' }
  }

  let succeeded = 0
  let failed = 0
  const failures: Array<{ slug: string; error: string }> = []
  const refreshedSlugs: string[] = []

  await pMap(tools, CONCURRENCY, async (tool) => {
    const result = await processOne(tool).catch((err) => ({
      ok: false as const,
      error: err instanceof Error ? err.message : String(err),
    }))
    if (result.ok) {
      succeeded++
      refreshedSlugs.push(tool.slug)
    } else {
      failed++
      failures.push({ slug: tool.slug, error: result.error ?? 'unknown' })
    }
  })

  ctx.recordItems({ processed: tools.length, succeeded, failed })
  ctx.recordMetadata({
    batch_size: tools.length,
    refreshed_slugs: refreshedSlugs.slice(0, 20),
    failures: failures.slice(0, 10),
  })
  if (failed > 0 && succeeded > 0) ctx.setStatus('partial')

  return {
    ok: true,
    batch_size: tools.length,
    succeeded,
    failed,
    failures: failures.slice(0, 5),
  }
})
