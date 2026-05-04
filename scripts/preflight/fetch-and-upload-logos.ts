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
] as const

const argv = process.argv.slice(2)
const DRY_RUN = argv.includes('--dry-run')
const ONE_SLUG = argv.find((a) => a.startsWith('--slug='))?.split('=')[1]

type FetchedLogo = {
  buffer: Buffer
  contentType: string
  ext: string
  sourceUrl: string
}

const EXT_BY_MIME: Record<string, string> = {
  'image/svg+xml': 'svg',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
}

async function tryFetch(url: string, expectedExtHint?: string): Promise<FetchedLogo | null> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'RightAIChoice-Preflight/1.0' },
    })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type')?.split(';')[0]?.trim() ?? ''
    if (!contentType.startsWith('image/')) return null
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 200) return null
    const ext = expectedExtHint ?? EXT_BY_MIME[contentType] ?? 'png'
    return { buffer, contentType, ext, sourceUrl: url }
  } catch {
    return null
  }
}

async function discoverLogo(slug: string, websiteUrl: string): Promise<FetchedLogo | null> {
  const override = OVERRIDES[slug]
  if (override) {
    const got = await tryFetch(override.url, override.ext)
    if (got) return got
    console.warn(`  ! override URL failed for ${slug}: ${override.url}`)
  }
  const origin = new URL(websiteUrl).origin
  const candidates = [
    `${origin}/apple-touch-icon.png`,
    `${origin}/apple-touch-icon-precomposed.png`,
    `${origin}/favicon.svg`,
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

  const slugs = ONE_SLUG ? [ONE_SLUG] : (TARGET_SLUGS as readonly string[])
  console.log(`\n${DRY_RUN ? '[DRY-RUN] ' : ''}Processing ${slugs.length} slug(s)\n`)

  const { data: rows, error } = await supabase
    .from('tools')
    .select('slug, name, website_url, logo_url')
    .in('slug', slugs)

  if (error) {
    console.error('DB read failed:', error.message)
    process.exit(1)
  }
  if (!rows || rows.length === 0) {
    console.error('No matching tools found.')
    process.exit(1)
  }

  let ok = 0
  let skipped = 0
  let failed = 0
  const failures: string[] = []

  for (const row of rows) {
    const slug = row.slug as string
    const websiteUrl = row.website_url as string
    console.log(`[${slug}] ${row.name}`)
    console.log(`  current logo_url: ${row.logo_url ?? '(null)'}`)

    const logo = await discoverLogo(slug, websiteUrl)
    if (!logo) {
      console.log(`  ✗ no usable logo found — leaving NULL`)
      failures.push(slug)
      failed++
      continue
    }

    const key = `${slug}.${logo.ext}`
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${key}`
    console.log(`  source:   ${logo.sourceUrl} (${logo.contentType}, ${logo.buffer.length} bytes)`)
    console.log(`  upload:   ${BUCKET}/${key}`)
    console.log(`  new logo_url: ${publicUrl}`)

    if (DRY_RUN) {
      console.log(`  [dry-run] skipping upload + UPDATE`)
      skipped++
      continue
    }

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(key, logo.buffer, {
        contentType: logo.contentType,
        upsert: true,
        cacheControl: '604800', // 7 days
      })
    if (upErr) {
      console.log(`  ✗ Storage upload failed: ${upErr.message}`)
      failures.push(slug)
      failed++
      continue
    }

    const { error: updErr } = await supabase
      .from('tools')
      .update({ logo_url: publicUrl, last_verified_at: new Date().toISOString() })
      .eq('slug', slug)
    if (updErr) {
      console.log(`  ✗ DB update failed: ${updErr.message}`)
      failures.push(slug)
      failed++
      continue
    }

    console.log(`  ✓ done\n`)
    ok++
  }

  console.log('\n──────────────────────────────────────────')
  console.log(`Result: ${ok} updated, ${skipped} dry-run-skipped, ${failed} failed`)
  if (failures.length > 0) {
    console.log(`Failed slugs (need manual logo): ${failures.join(', ')}`)
  }
  console.log('──────────────────────────────────────────\n')

  process.exit(failed > 0 && !DRY_RUN ? 1 : 0)
}

main().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})
