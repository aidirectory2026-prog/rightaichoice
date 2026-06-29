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
import { fetchAllPages } from '../lib/data/_pagination'

const args = process.argv.slice(2)
const DRY = args.includes('--dry')
const getNum = (flag: string, def: number) => {
  const a = args.find((x) => x.startsWith(`${flag}=`))
  return a ? Number(a.split('=')[1]) : def
}
const SHARD = getNum('--shard', 0)
const SHARDS = getNum('--shards', 1)
const LIMIT = getNum('--limit', Infinity)
const CONCURRENCY = 16
const TIMEOUT_MS = 7000
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

// BUG-30: soft-404 detection. Many dead resource pages return HTTP 200 with a
// "Not Found" body (or 200-redirect a deep link to the bare homepage), so the
// status-only check above passes them. We confirm a 'live' verdict with ONE
// bounded GET and downgrade to 'dead' ONLY on a STRONG signal — staying as
// conservative as the rest of this script (never hide a genuinely live link):
//   (1) the <title> or first <h1> BEGINS with a not-found marker, or
//   (2) a deep link (≥1 path segment) lands on the bare site root after redirects.
// e.g. docs.anthropic.com/claude/guides → 200 "Not Found - Claude Platform Docs".
const SOFT_404_RE = /^\s*(?:404\b|not[\s-]*found|page not found|404 error|error 404|page (?:doesn'?t|does not) exist|page (?:no longer|not) available)/i

function firstTag(body: string, tag: 'title' | 'h1'): string {
  const m = body.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return (m?.[1] ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

async function isSoft404(url: string): Promise<boolean> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': UA, Accept: 'text/html,*/*' },
      signal: ctrl.signal,
    })
    if (!res.ok) return false // status-based path already handled this
    // Signal (2): deep link redirected to a bare homepage.
    try {
      const orig = new URL(url)
      const final = new URL(res.url)
      const origDeep = orig.pathname.replace(/\/+$/, '').split('/').filter(Boolean).length >= 1
      const finalRoot = final.pathname.replace(/\/+$/, '') === ''
      if (origDeep && finalRoot) return true
    } catch { /* unparseable URL → fall through to body check */ }
    // Signal (1): title / h1 not-found marker. Only inspect HTML, bounded slice.
    if (!/html/i.test(res.headers.get('content-type') ?? '')) return false
    const body = (await res.text()).slice(0, 24_000)
    return SOFT_404_RE.test(firstTag(body, 'title')) || SOFT_404_RE.test(firstTag(body, 'h1'))
  } catch {
    return false // ambiguous (timeout/abort) → keep the link (conservative)
  } finally {
    clearTimeout(timer)
  }
}

async function probe(url: string): Promise<Verdict> {
  const head = await probeOnce(url, 'HEAD')
  let verdict: Verdict
  if (head !== 'retry') verdict = head
  else {
    const get = await probeOnce(url, 'GET')
    verdict = get === 'retry' ? 'unknown' : get
  }
  // Confirm 'live' against soft-404s (one extra bounded GET per live link).
  if (verdict === 'live' && (await isSoft404(url))) return 'dead'
  return verdict
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

  // Paginate — PostgREST caps a single .select() at 1,000 rows, so without this
  // a >1,000-tool catalog is silently half-swept (the catalog is ~2,000).
  const allTools = await fetchAllPages<ToolRow>((from, to) =>
    sb
      .from('tools')
      .select('id, slug, docs_url, changelog_url, github_url, website_url, tutorial_urls, tutorial_links, community_links, dead_links')
      .eq('is_published', true)
      .order('slug', { ascending: true })
      .range(from, to)
  )

  let tools = allTools.filter((t) => hash(t.slug) % SHARDS === SHARD % SHARDS)
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
