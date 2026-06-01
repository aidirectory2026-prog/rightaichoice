/**
 * Backfill real logos for published tools missing a `logo_url`.
 *
 * The resolve -> verify -> re-host logic now lives in lib/cron/logo.ts so the
 * nightly onboard SOP and this CLI share ONE implementation (Phase 9 D2). This
 * script keeps the batch orchestration: probe (sample + report, no writes) and
 * apply (full run via resolveAndStoreLogo).
 *
 * MODES:
 *   tsx --env-file=.env.local scripts/backfill-logos.ts --probe   # sample ~25, report. NO writes.
 *   tsx --env-file=.env.local scripts/backfill-logos.ts --apply   # full run: download+verify+upload+set. Idempotent.
 *   flags: --sample=N  --limit=N  --concurrency=N
 *
 * REQUIRED ENV (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Only ever modifies tools.logo_url for rows that were null/empty, and uploads
 * objects to the tool-logos bucket. Nothing else is touched.
 */
export {}

import { getAdminClient } from '../lib/cron/supabase-admin'
import { domainOf, findLogo, resolveAndStoreLogo, type LogoSource } from '../lib/cron/logo'

const args = process.argv.slice(2)
const isProbe = args.includes('--probe')
const isApply = args.includes('--apply')
const sampleArg = args.find((a) => a.startsWith('--sample='))
const limitArg = args.find((a) => a.startsWith('--limit='))
const concArg = args.find((a) => a.startsWith('--concurrency='))
const slugsArg = args.find((a) => a.startsWith('--slugs='))
const SAMPLE = sampleArg ? parseInt(sampleArg.split('=')[1], 10) : 25
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity
const CONCURRENCY = concArg ? Math.max(1, parseInt(concArg.split('=')[1], 10)) : 8
// --slugs=a,b,c → re-resolve logos for exactly these slugs (ignores the
// "missing only" filter so it also re-does favicon-fallback placeholders).
const SLUGS = slugsArg ? slugsArg.split('=')[1].split(',').map((s) => s.trim()).filter(Boolean) : null

interface ToolRow {
  id: string
  slug: string | null
  website_url: string | null
  logo_url: string | null
}

async function fetchMissingTools(sb: ReturnType<typeof getAdminClient>): Promise<ToolRow[]> {
  const pageSize = 1000
  let from = 0
  const all: ToolRow[] = []
  for (;;) {
    let q = sb
      .from('tools')
      .select('id, slug, website_url, logo_url')
      .eq('is_published', true)
      .not('website_url', 'is', null)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)
    // Scoped mode: exact slugs regardless of current logo (re-does favicons too).
    // Default mode: only tools with a null/empty logo.
    q = SLUGS ? q.in('slug', SLUGS) : q.or('logo_url.is.null,logo_url.eq.')
    const { data, error } = await q
    if (error) throw new Error(error.message)
    const rows = (data || []) as unknown as ToolRow[]
    all.push(...rows)
    if (rows.length < pageSize) break
    from += pageSize
  }
  return all
}

async function coverage(sb: ReturnType<typeof getAdminClient>) {
  const { count: pub } = await sb
    .from('tools')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true)
  const { count: withLogo } = await sb
    .from('tools')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true)
    .not('logo_url', 'is', null)
    .neq('logo_url', '')
  return { published: pub || 0, withLogo: withLogo || 0 }
}

/** Simple promise pool: run `worker` over `items` with bounded concurrency. */
async function pool<T>(items: T[], concurrency: number, worker: (item: T, index: number) => Promise<void>) {
  let next = 0
  const runners: Promise<void>[] = []
  const run = async () => {
    for (;;) {
      const i = next++
      if (i >= items.length) return
      await worker(items[i], i)
    }
  }
  for (let k = 0; k < Math.min(concurrency, items.length); k++) runners.push(run())
  await Promise.all(runners)
}

async function runProbe(sb: ReturnType<typeof getAdminClient>) {
  const tools = await fetchMissingTools(sb)
  console.log(`[probe] ${tools.length} published tools missing logo_url (with website). Sampling ${SAMPLE}.`)
  const step = Math.max(1, Math.floor(tools.length / SAMPLE))
  const sample = tools.filter((_, i) => i % step === 0).slice(0, SAMPLE)

  const perSource: Record<LogoSource, number> = {
    'apple-touch-icon': 0,
    'og:image': 0,
    icon: 0,
    'well-known': 0,
    'logo-api': 0,
  }
  let wins = 0
  let total = 0
  const lines: string[] = []

  await pool(sample, CONCURRENCY, async (t) => {
    const domain = t.website_url ? domainOf(t.website_url) : null
    if (!domain) {
      lines.push(`  - ${t.slug ?? t.id}: SKIP (bad website_url: ${t.website_url})`)
      return
    }
    total++
    const v = await findLogo(domain)
    if (v) {
      perSource[v.source]++
      wins++
      lines.push(`  - ${t.slug ?? t.id} (${domain}): ${v.source} ${v.buffer.length}B ${v.contentType}`)
    } else {
      lines.push(`  - ${t.slug ?? t.id} (${domain}): none`)
    }
  })

  for (const l of lines) console.log(l)
  console.log('\n[probe] results over', total, 'tools with a parseable domain:')
  for (const s of Object.keys(perSource) as LogoSource[]) {
    const n = perSource[s]
    console.log(`  ${s.padEnd(18)} ${n} (${total ? ((100 * n) / total).toFixed(0) : 0}%)`)
  }
  console.log(`  ${'ANY (success)'.padEnd(18)} ${wins} (${total ? ((100 * wins) / total).toFixed(0) : 0}%)`)
}

async function runApply(sb: ReturnType<typeof getAdminClient>) {
  const before = await coverage(sb)
  console.log(
    `[apply] BEFORE coverage: ${before.withLogo}/${before.published} = ${(
      (100 * before.withLogo) /
      Math.max(1, before.published)
    ).toFixed(1)}%`
  )
  let tools = await fetchMissingTools(sb)
  if (LIMIT !== Infinity) tools = tools.slice(0, LIMIT)
  console.log(`[apply] processing ${tools.length} missing-logo tools, concurrency=${CONCURRENCY}`)

  let filled = 0
  let skipped = 0
  let done = 0
  let converted = 0
  const sourceTally: Record<LogoSource, number> = {
    'apple-touch-icon': 0,
    'og:image': 0,
    icon: 0,
    'well-known': 0,
    'logo-api': 0,
  }

  await pool(tools, CONCURRENCY, async (t) => {
    done++
    const res = await resolveAndStoreLogo(sb, t)
    if (res.status === 'set') {
      filled++
      sourceTally[res.source]++
      if (res.converted) converted++
    } else {
      skipped++
    }
    if (done % 50 === 0) console.log(`  [${done}/${tools.length}] filled=${filled} skipped=${skipped}`)
  })

  const after = await coverage(sb)
  console.log('\n[apply] DONE')
  console.log('  source breakdown:', sourceTally)
  console.log(`  filled=${filled} skipped=${skipped} (${converted} ICO/GIF converted to PNG)`)
  console.log(
    `  AFTER coverage: ${after.withLogo}/${after.published} = ${(
      (100 * after.withLogo) /
      Math.max(1, after.published)
    ).toFixed(1)}%`
  )
  console.log(`  delta: +${after.withLogo - before.withLogo} logos; left on fallback = ${after.published - after.withLogo}`)
}

async function main() {
  const sb = getAdminClient()
  if (isApply) {
    await runApply(sb)
  } else {
    if (!isProbe) console.log('(no --apply given -- running probe; pass --apply for the full run)')
    await runProbe(sb)
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
