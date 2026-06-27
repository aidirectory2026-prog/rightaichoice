/**
 * Phase 12 Bug-4.6 (2026-06-27) — Resources & Guides link-health checker.
 *
 * Probes every published tool's EXTERNAL resource links (docs, changelog,
 * github, website, tutorial_urls, tutorial_links[].url, community_links.*url)
 * and records the dead ones in tools.dead_links. The tool page filters those
 * out of Resources & Guides + the sidebar; if a tool has no live resources the
 * section is skipped. Self-healing both ways: a link that comes back to life is
 * dropped from dead_links on the next run.
 *
 * CONSERVATIVE on purpose — we only mark a link dead on a clear 404/410 or a
 * DNS/connection failure on BOTH HEAD and GET. 401/403/429/timeouts/5xx are
 * treated as "unknown" (bot-blocking / transient) and the link is kept, so we
 * never hide a working link.
 *
 * ENV: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * USAGE:
 *   npx tsx scripts/check-link-health.ts --dry            # report only
 *   npx tsx scripts/check-link-health.ts                  # probe + write
 *   npx tsx scripts/check-link-health.ts --shard=0 --shards=3
 *   npx tsx scripts/check-link-health.ts --limit=50
 */
export {}

import { getAdminClient } from '../lib/cron/supabase-admin'

const args = process.argv.slice(2)
const DRY = args.includes('--dry')
const getNum = (flag: string, def: number) => {
  const a = args.find((x) => x.startsWith(`${flag}=`))
  return a ? Number(a.split('=')[1]) : def
}
const SHARD = getNum('--shard', 0)
const SHARDS = getNum('--shards', 1)
const LIMIT = getNum('--limit', Infinity)
const CONCURRENCY = 6
const TIMEOUT_MS = 8000
const UA = 'Mozilla/5.0 (compatible; RightAIChoiceBot/1.0; +https://rightaichoice.com)'

type ToolRow = {
  id: string
  slug: string
  docs_url: string | null
  changelog_url: string | null
  github_url: string | null
  website_url: string | null
  tutorial_urls: string[] | null
  tutorial_links: Array<{ url?: string | null }> | null
  community_links: Record<string, unknown> | null
  dead_links: string[] | null
}

// djb2 — same stable shard hash used by the other sharded scripts.
function hash(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i)
  return h >>> 0
}

function gatherUrls(t: ToolRow): string[] {
  const urls = new Set<string>()
  const add = (u: unknown) => {
    if (typeof u === 'string' && /^https?:\/\//i.test(u.trim())) urls.add(u.trim())
  }
  add(t.docs_url)
  add(t.changelog_url)
  add(t.github_url)
  add(t.website_url)
  for (const u of t.tutorial_urls ?? []) add(u)
  for (const it of t.tutorial_links ?? []) add(it?.url)
  const cl = (t.community_links ?? {}) as Record<string, unknown>
  for (const [k, v] of Object.entries(cl)) {
    if (k.toLowerCase().endsWith('url')) add(v)
  }
  return [...urls]
}

type Verdict = 'live' | 'dead' | 'unknown'

async function probeOnce(url: string, method: 'HEAD' | 'GET'): Promise<Verdict | 'retry'> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method,
      redirect: 'follow',
      headers: { 'User-Agent': UA, Accept: '*/*' },
      signal: ctrl.signal,
    })
    const s = res.status
    if (s >= 200 && s < 400) return 'live'
    if (s === 404 || s === 410) return 'dead'
    if (s === 401 || s === 403 || s === 429) return 'unknown' // bot-blocked → keep
    // 5xx or odd 4xx (e.g. 405 to HEAD): ambiguous on HEAD, retry with GET
    return 'retry'
  } catch (e) {
    const err = e as { name?: string; cause?: { code?: string } }
    if (err?.name === 'AbortError') return 'unknown' // timeout → ambiguous
    const code = err?.cause?.code
    if (code === 'ENOTFOUND' || code === 'ECONNREFUSED' || code === 'EAI_AGAIN') return 'dead'
    return 'retry'
  } finally {
    clearTimeout(timer)
  }
}

async function probe(url: string): Promise<Verdict> {
  const head = await probeOnce(url, 'HEAD')
  if (head !== 'retry') return head
  const get = await probeOnce(url, 'GET')
  return get === 'retry' ? 'unknown' : get
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (it: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let idx = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (idx < items.length) {
        const i = idx++
        out[i] = await fn(items[i])
      }
    })
  )
  return out
}

async function main() {
  const sb = getAdminClient()
  const runStart = Date.now()
  console.log(`[link-health] shard ${SHARD}/${SHARDS} dry=${DRY}`)

  const { data, error } = await sb
    .from('tools')
    .select('id, slug, docs_url, changelog_url, github_url, website_url, tutorial_urls, tutorial_links, community_links, dead_links')
    .eq('is_published', true)
  if (error) throw error

  let tools = (data as unknown as ToolRow[]).filter((t) => hash(t.slug) % SHARDS === SHARD % SHARDS)
  if (Number.isFinite(LIMIT)) tools = tools.slice(0, LIMIT)
  console.log(`[link-health] ${tools.length} tools in shard`)

  let runRowId: string | null = null
  if (!DRY) {
    try {
      const { data: row } = await sb
        .from('pipeline_runs')
        .insert({
          source: 'gh_actions',
          pipeline_key: 'check-link-health',
          external_id: process.env.GITHUB_RUN_ID ?? null,
          started_at: new Date(runStart).toISOString(),
          status: 'running',
          metadata: { shard: SHARD, shards: SHARDS, planned: tools.length },
        } as never)
        .select('id')
        .single()
      runRowId = (row as { id?: string } | null)?.id ?? null
    } catch (e) {
      console.error('pipeline_runs start-log failed (non-fatal):', e instanceof Error ? e.message : e)
    }
  }

  let processed = 0
  let changed = 0
  let totalDead = 0

  for (const t of tools) {
    const urls = gatherUrls(t)
    if (urls.length === 0) {
      processed++
      continue
    }
    const verdicts = await mapLimit(urls, CONCURRENCY, async (u) => ({ u, v: await probe(u) }))
    const dead = verdicts.filter((x) => x.v === 'dead').map((x) => x.u).sort()
    totalDead += dead.length

    const prev = (t.dead_links ?? []).slice().sort()
    const same = prev.length === dead.length && prev.every((u, i) => u === dead[i])

    if (dead.length > 0) {
      console.log(`  ${t.slug}: ${dead.length} dead / ${urls.length} — ${dead.join(', ')}`)
    }

    if (!DRY) {
      try {
        await sb
          .from('tools')
          .update({ dead_links: dead, links_checked_at: new Date().toISOString() } as never)
          .eq('id', t.id)
      } catch (e) {
        console.error(`  update failed for ${t.slug}:`, e instanceof Error ? e.message : e)
      }
    }
    if (!same) changed++
    processed++
    if (processed % 50 === 0) console.log(`  …${processed}/${tools.length}`)
  }

  console.log(`[link-health] done: ${processed} tools, ${changed} changed, ${totalDead} dead links total`)

  if (!DRY) {
    const finalRow = {
      source: 'gh_actions',
      pipeline_key: 'check-link-health',
      external_id: process.env.GITHUB_RUN_ID ?? null,
      started_at: new Date(runStart).toISOString(),
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - runStart,
      status: 'success',
      items_processed: processed,
      items_succeeded: processed,
      items_failed: 0,
      metadata: { shard: SHARD, shards: SHARDS, changed, dead_links: totalDead },
    }
    try {
      if (runRowId) await sb.from('pipeline_runs').update(finalRow as never).eq('id', runRowId)
      else await sb.from('pipeline_runs').insert(finalRow as never)
    } catch (e) {
      console.error('pipeline_runs log failed (non-fatal):', e instanceof Error ? e.message : e)
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
