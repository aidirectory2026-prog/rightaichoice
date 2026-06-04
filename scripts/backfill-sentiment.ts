/**
 * Phase 9 — Workstream S1. Backfill sentiment for tools whose `tool_sentiment_cache`
 * is missing/failed/stale — primarily the 26 new D2 platforms whose sentiment
 * soft-warned while Anthropic was out of credit. Now that synthesizeReport()
 * runs on DeepSeek (lib/ai/synthesize-report.ts), this just re-runs the same
 * scrape→synthesize→upsert the onboard SOP's step 9 (refreshSentiment) does.
 * Idempotent: skips tools that already have a fresh `ready` cache row.
 *
 *   tsx --env-file=.env.local scripts/backfill-sentiment.ts --slugs=vercel,linear
 *   tsx --env-file=.env.local scripts/backfill-sentiment.ts --d2          # the 26 D2 platforms
 *   tsx --env-file=.env.local scripts/backfill-sentiment.ts --missing --limit=50
 */
export {}
import { getAdminClient } from '../lib/cron/supabase-admin'
import { scrapeAllSources } from '../lib/scrapers'
import { synthesizeReport } from '../lib/ai/synthesize-report'

type Tool = {
  id: string
  slug: string
  name: string
  tagline: string | null
  description: string | null
  pricing_type: string | null
  skill_level: string | null
  features: string[] | null
  website_url: string | null
}

const D2_SLUGS = [
  'vercel', 'linear', 'datadog',
  'netlify', 'firebase', 'railway', 'render', 'fly-io', 'neon', 'planetscale',
  'cloudflare', 'sentry', 'postman', 'sketch', 'adobe-express', 'penpot', 'jira',
  'miro', 'power-bi', 'looker', 'amplitude', 'lm-studio', 'figma', 'notion',
  'tableau', 'airtable',
]

const args = process.argv.slice(2)
const slugsArg = args.find((a) => a.startsWith('--slugs='))
const limitArg = args.find((a) => a.startsWith('--limit='))
const wantD2 = args.includes('--d2')
const wantMissing = args.includes('--missing')
const FORCE = args.includes('--force')
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity
const CONCURRENCY = 3 // Apify-bound; keep modest to avoid rate limits

const FRESH_MS = 7 * 24 * 60 * 60 * 1000

async function resolveSlugs(sb: ReturnType<typeof getAdminClient>): Promise<string[]> {
  if (slugsArg) return slugsArg.split('=')[1].split(',').map((s) => s.trim()).filter(Boolean)
  if (wantD2) return D2_SLUGS
  if (wantMissing) {
    // published tools with no fresh ready cache row
    const { data, error } = await sb
      .from('tools')
      .select('slug, tool_sentiment_cache(status, expires_at)')
      .eq('is_published', true)
      .order('view_count', { ascending: false })
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as unknown as { slug: string; tool_sentiment_cache: { status: string; expires_at: string }[] }[]
    return rows
      .filter((r) => {
        const c = r.tool_sentiment_cache?.[0]
        if (!c) return true
        if (c.status !== 'ready') return true
        return new Date(c.expires_at).getTime() < Date.now()
      })
      .map((r) => r.slug)
  }
  return D2_SLUGS // default
}

async function pool<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let next = 0
  const run = async () => {
    for (;;) {
      const i = next++
      if (i >= items.length) return
      await worker(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run))
}

async function backfillOne(sb: ReturnType<typeof getAdminClient>, tool: Tool): Promise<'ok' | 'skip' | 'fail'> {
  // idempotency: skip if a fresh ready row exists
  const { data: existing } = await sb
    .from('tool_sentiment_cache')
    .select('status, expires_at')
    .eq('tool_id', tool.id)
    .maybeSingle()
  const ex = existing as { status: string; expires_at: string } | null
  if (!FORCE && ex && ex.status === 'ready' && new Date(ex.expires_at).getTime() > Date.now()) return 'skip'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anySb = sb as any
  await anySb.from('tool_sentiment_cache').upsert(
    { tool_id: tool.id, status: 'generating', scraped_at: new Date().toISOString() },
    { onConflict: 'tool_id' },
  )
  try {
    const scrape = await scrapeAllSources(tool.name, { website: tool.website_url, budgetMs: 60_000 })
    const report = await synthesizeReport(
      {
        name: tool.name,
        tagline: tool.tagline ?? '',
        description: tool.description ?? '',
        pricing_type: tool.pricing_type ?? 'unknown',
        pricing_details: null,
        skill_level: tool.skill_level ?? 'beginner',
        features: tool.features ?? undefined,
      },
      scrape,
    )
    const now = new Date().toISOString()
    const expiresAt = new Date(Date.now() + FRESH_MS).toISOString()
    await anySb.from('tool_sentiment_cache').upsert(
      {
        tool_id: tool.id,
        ai_verdict: report.ai_verdict,
        pros: report.pros,
        cons: report.cons,
        sentiment_score: report.sentiment_score,
        sentiment_breakdown: report.sentiment_breakdown,
        themes: report.themes,
        best_for: report.best_for,
        not_for: report.not_for,
        pricing_analysis: report.pricing_analysis,
        community_buzz: report.community_buzz,
        learning_curve: report.learning_curve,
        integration_insights: report.integration_insights,
        raw_reddit: scrape.reddit.posts,
        raw_twitter: scrape.twitter.posts,
        raw_quora: scrape.quora.posts,
        raw_g2: scrape.g2.posts,
        mention_count: scrape.totalPosts,
        sources_scraped: scrape.sourcesSucceeded,
        status: 'ready',
        scraped_at: now,
        synthesized_at: now,
        expires_at: expiresAt,
      },
      { onConflict: 'tool_id' },
    )
    console.log(`  ✓ ${tool.slug} — ${scrape.totalPosts} posts, ${report.sentiment_score}, sources=[${scrape.sourcesSucceeded.join(',')}]`)
    return 'ok'
  } catch (e) {
    await anySb.from('tool_sentiment_cache').upsert(
      { tool_id: tool.id, status: 'failed', scraped_at: new Date().toISOString() },
      { onConflict: 'tool_id' },
    )
    console.error(`  ✗ ${tool.slug} — ${e instanceof Error ? e.message : 'err'}`)
    return 'fail'
  }
}

async function main() {
  const sb = getAdminClient()
  let slugs = await resolveSlugs(sb)
  if (LIMIT !== Infinity) slugs = slugs.slice(0, LIMIT)

  const { data, error } = await sb
    .from('tools')
    .select('id, slug, name, tagline, description, pricing_type, skill_level, features, website_url')
    .in('slug', slugs)
  if (error) throw new Error(error.message)
  const tools = (data ?? []) as unknown as Tool[]

  console.log(`[backfill-sentiment] ${tools.length} tools (DeepSeek synthesis); concurrency=${CONCURRENCY}`)
  let ok = 0, skip = 0, fail = 0
  await pool(tools, CONCURRENCY, async (t) => {
    const r = await backfillOne(sb, t)
    if (r === 'ok') ok++
    else if (r === 'skip') skip++
    else fail++
  })
  console.log(`[backfill-sentiment] DONE: ok=${ok}, skipped=${skip}, failed=${fail}, of ${tools.length}`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
