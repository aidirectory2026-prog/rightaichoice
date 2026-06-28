/**
 * Pre-flight remediation: fetch + upload missing tool logos to Supabase Storage.
 *
 * Targets: the 6 priority-program tools whose logo_url is NULL plus Kit
 * (re-uploaded so the live URL points at our own Storage instead of
 * media.kit.com — which isn't in next.config.ts remotePatterns).
 *
 * Strategy per slug:
 *   1. If OVERRIDES[slug] is set, fetch that exact URL.
 *   2. Else try <website_url>/apple-touch-icon.png (180x180 industry standard).
 *   3. Else try <website_url>/favicon.svg.
 *   4. Skip + log to console if all fail (no fabricated logos).
 *
 * Then upload to bucket "tool-logos" at key "<slug>.<ext>", upsert=true,
 * and UPDATE tools.logo_url to the public Storage URL.
 *
 * Usage:
 *   tsx --env-file=.env.local scripts/preflight/fetch-and-upload-logos.ts            # all targets
 *   tsx --env-file=.env.local scripts/preflight/fetch-and-upload-logos.ts --dry-run  # report only
 *   tsx --env-file=.env.local scripts/preflight/fetch-and-upload-logos.ts --slug=kit # one slug
 *
 * Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
export {}

import { getAdminClient } from '../../lib/cron/supabase-admin'

const BUCKET = 'tool-logos'

type Override = { url: string; ext?: string }

// Known canonical brand-asset URLs. Where set, these win over auto-discovery.
// Reasoning: vendor brand pages often host higher-quality marks than the
// favicon/apple-touch-icon path.
const OVERRIDES: Record<string, Override> = {
  kit: { url: 'https://media.kit.com/images/logos/kit-logo-warm-white.svg', ext: 'svg' },
}

const TARGET_SLUGS = [
  'kit',           // re-upload (current clearbit URL isn't in CSP / remotePatterns)
  'systeme-io',    // re-upload (current clearbit URL isn't in CSP / remotePatterns)
  'customgpt-ai',
  'teachable',
  'thinkific',
  'kajabi',
  'hubspot',
  'beehiiv',       // added 2026-05-04 — newly seeded by 061_seed_beehiiv.sql
  'convertbox',    // added 2026-05-04 — newly seeded by 062_seed_convertbox.sql
  'reclaim-ai',    // batch 1 (064)
  'token-metrics', // batch 1 (064)
  'flowith',       // batch 1 (064)
  'foxit',         // batch 1 (064)
  'pinecone',      // batch 2 (058 backfill)
  'hume-ai',       // batch 2 (065)
  'synthflow-ai',  // batch 2 (065)
  'manychat',      // batch 2 (065)
  'laxis',         // batch 2 (065)
  'trainual',      // batch 3 (066)
  'brand24',       // batch 3 (066)
  'landbot',       // batch 3 (066)
  'demodesk',      // batch 3 (066)
  'filevine',      // batch 3 (066)
  'aisdr',         // batch 4 (067)
  'pangram-labs',  // batch 4 (067)
  'niural-ai',     // batch 4 (067)
  'treble-ai',     // batch 5 (068)
  'spiky-ai',      // batch 5 (068)
  'smartli',       // batch 5 (068)
  'closely',       // batch 5 (068)
  'typewise',      // batch 5 (068)
  'amplemarket',   // batch 6 (069)
  'sanebox',       // batch 6 (069)
  'soona',         // batch 6 (069)
  'corecruit',     // batch 6 (069)
  'brevo',         // batch 7 (070)
  'drip',          // batch 7 (070)
  'aweber',        // batch 7 (070)
] as const

const argv = process.argv.slice(2)
const DRY_RUN = argv.includes('--dry-run')
const ONE_SLUG = argv.find((a) => a.startsWith('--slug='))?.split('=')[1]
// BUG-11 (Phase 13): --missing dynamically targets EVERY published tool whose
// logo_url is null/empty (the live 381-gap), instead of the stale hardcoded
// TARGET_SLUGS. Supports --limit + djb2 sharding so the sweep can be chunked.
const MISSING = argv.includes('--missing')
const getNum = (flag: string, def: number) => {
  const a = argv.find((x) => x.startsWith(`${flag}=`))
  return a ? Number(a.split('=')[1]) : def
}
const LIMIT = getNum('--limit', Infinity)
const SHARD = getNum('--shard', 0)
const SHARDS = getNum('--shards', 1)

// djb2 — same stable shard hash used by the other sharded scripts.
function hash(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i)
  return h >>> 0
}

type FetchedLogo = {
  buffer: Buffer
  contentType: string
  ext: string
  sourceUrl: string
}

type ToolRow = {
  slug: string
  name: string
  website_url: string | null
  logo_url: string | null
}

const EXT_BY_MIME: Record<string, string> = {
  'image/svg+xml': 'svg',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
}

// BUG-11: the "tool-logos" bucket only accepts these MIME types, so reject
// anything else (notably image/x-icon from favicon.ico) at fetch time — it
// would fail the Storage upload anyway, and a 16×16 .ico is a poor logo. A
// favicon.ico URL that's actually served as image/png still passes here.
const ALLOWED_MIME = new Set(Object.keys(EXT_BY_MIME))

const FETCH_TIMEOUT_MS = 6000

async function tryFetch(url: string, expectedExtHint?: string): Promise<FetchedLogo | null> {
  // BUG-11: bound each candidate fetch so a hanging server can't stall the
  // whole sweep (the old default-timeout fetch could block for minutes).
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'RightAIChoice-Preflight/1.0' },
      signal: ctrl.signal,
    })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? ''
    if (!ALLOWED_MIME.has(contentType)) return null
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 200) return null
    const ext = expectedExtHint ?? EXT_BY_MIME[contentType] ?? 'png'
    return { buffer, contentType, ext, sourceUrl: url }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function discoverLogo(slug: string, websiteUrl: string | null): Promise<FetchedLogo | null> {
  const override = OVERRIDES[slug]
  if (override) {
    const got = await tryFetch(override.url, override.ext)
    if (got) return got
    console.warn(`  ! override URL failed for ${slug}: ${override.url}`)
  }
  // Guard: a tool with no website has no origin to probe (auto-discovery only
  // works off the brand's own domain). The render-time monogram covers it.
  if (!websiteUrl || !/^https?:\/\//i.test(websiteUrl)) return null
  let origin: string
  try {
    origin = new URL(websiteUrl).origin
  } catch {
    return null
  }
  // Highest-quality first: apple-touch-icon (180×180) → svg → favicon.png.
  // favicon.ico is kept LAST and only succeeds if the server serves it as a
  // supported MIME (png) — pure image/x-icon is rejected in tryFetch.
  const candidates = [
    `${origin}/apple-touch-icon.png`,
    `${origin}/apple-touch-icon-precomposed.png`,
    `${origin}/favicon.svg`,
    `${origin}/favicon.png`,
    `${origin}/favicon.ico`,
  ]
  for (const candidate of candidates) {
    const got = await tryFetch(candidate)
    if (got) return got
  }
  return null
}

async function main() {
  const supabase = getAdminClient()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  let rows: ToolRow[]
  if (MISSING) {
    // BUG-11: every published tool with no logo, paginated (PostgREST caps a
    // single select at 1,000 rows; the gap is ~381 but the catalog is ~2,000).
    const all: ToolRow[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from('tools')
        .select('slug, name, website_url, logo_url')
        .eq('is_published', true)
        .or('logo_url.is.null,logo_url.eq.')
        .order('slug', { ascending: true })
        .range(from, from + 999)
      if (error) {
        console.error('DB read failed:', error.message)
        process.exit(1)
      }
      const batch = (data ?? []) as unknown as ToolRow[]
      all.push(...batch)
      if (batch.length < 1000) break
    }
    let filtered = all.filter((t) => hash(t.slug) % SHARDS === SHARD % SHARDS)
    if (Number.isFinite(LIMIT)) filtered = filtered.slice(0, LIMIT)
    rows = filtered
    console.log(`\n${DRY_RUN ? '[DRY-RUN] ' : ''}--missing: ${all.length} tools lack a logo; ${rows.length} in shard ${SHARD}/${SHARDS}${Number.isFinite(LIMIT) ? ` (limit ${LIMIT})` : ''}\n`)
  } else {
    const slugs = ONE_SLUG ? [ONE_SLUG] : (TARGET_SLUGS as readonly string[])
    console.log(`\n${DRY_RUN ? '[DRY-RUN] ' : ''}Processing ${slugs.length} slug(s)\n`)
    const { data, error } = await supabase
      .from('tools')
      .select('slug, name, website_url, logo_url')
      .in('slug', slugs as string[])
    if (error) {
      console.error('DB read failed:', error.message)
      process.exit(1)
    }
    rows = (data ?? []) as unknown as ToolRow[]
  }
  if (rows.length === 0) {
    console.error('No matching tools found.')
    process.exit(MISSING ? 0 : 1)
  }

  let ok = 0
  let skipped = 0
  let failed = 0
  const failures: string[] = []

  // BUG-11: process one tool end-to-end (discover → upload → UPDATE). Logs are
  // batched into one string so concurrent runs don't interleave per-tool output.
  async function processTool(row: ToolRow): Promise<'ok' | 'skipped' | 'failed'> {
    const slug = row.slug
    const lines = [`[${slug}] ${row.name}`, `  current logo_url: ${row.logo_url ?? '(null)'}`]
    const flush = (extra: string) => console.log([...lines, extra].join('\n'))

    const logo = await discoverLogo(slug, row.website_url)
    if (!logo) {
      flush('  ✗ no usable logo found — leaving NULL')
      failures.push(slug)
      return 'failed'
    }

    const key = `${slug}.${logo.ext}`
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${key}`
    lines.push(`  source:   ${logo.sourceUrl} (${logo.contentType}, ${logo.buffer.length} bytes)`)
    lines.push(`  new logo_url: ${publicUrl}`)

    if (DRY_RUN) {
      flush('  [dry-run] skipping upload + UPDATE')
      return 'skipped'
    }

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(key, logo.buffer, {
        contentType: logo.contentType,
        upsert: true,
        cacheControl: '604800', // 7 days
      })
    if (upErr) {
      flush(`  ✗ Storage upload failed: ${upErr.message}`)
      failures.push(slug)
      return 'failed'
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateBuilder = (supabase.from('tools') as any).update({
      logo_url: publicUrl,
      last_verified_at: new Date().toISOString(),
    })
    const { error: updErr } = await updateBuilder.eq('slug', slug)
    if (updErr) {
      flush(`  ✗ DB update failed: ${updErr.message}`)
      failures.push(slug)
      return 'failed'
    }

    flush('  ✓ done')
    return 'ok'
  }

  // Bounded concurrency so 380 tools don't run serially (each does up to 5
  // candidate fetches) but we don't hammer hosts / Storage either.
  const CONCURRENCY = 8
  let idx = 0
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, rows.length) }, async () => {
      while (idx < rows.length) {
        const outcome = await processTool(rows[idx++])
        if (outcome === 'ok') ok++
        else if (outcome === 'skipped') skipped++
        else failed++
      }
    }),
  )

  console.log('\n──────────────────────────────────────────')
  console.log(`Result: ${ok} updated, ${skipped} dry-run-skipped, ${failed} failed`)
  if (failures.length > 0) {
    console.log(`Failed slugs (need manual logo): ${failures.join(', ')}`)
  }
  console.log('──────────────────────────────────────────\n')

  // In --missing bulk mode, per-tool failures are EXPECTED (many sites have no
  // discoverable brand asset → render-time monogram covers them), so don't fail
  // the run. The targeted-list mode keeps its strict exit for CI/preflight use.
  process.exit(failed > 0 && !DRY_RUN && !MISSING ? 1 : 0)
}

main().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})
