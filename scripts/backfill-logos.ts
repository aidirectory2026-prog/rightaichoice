/**
 * Backfill real logos for published tools missing a `logo_url`.
 *
 * The runtime fallback (lib/tool-logo.ts -> Google favicon -> letter avatar)
 * already works, so a broken logo_url would be a REGRESSION. This script is
 * therefore CONSERVATIVE: it only writes a logo_url after downloading the
 * candidate image and VERIFYING it is a real, non-trivial raster image, then
 * re-hosting it durably in our own `tool-logos` Supabase Storage bucket.
 *
 * Source preference (per tool) — parsed from the site's OWN homepage HTML:
 *   1. <link rel="apple-touch-icon">   (largest sizes attr wins; 180x180 std)
 *   2. og:image                         (only if it measures near-square)
 *   3. <link rel="icon">                (largest sizes attr wins)
 * Plus well-known fallback paths (/apple-touch-icon.png, /favicon.svg, ...).
 *
 * NOTE: Clearbit's logo API is deliberately NOT used — it became unreliable
 * post-HubSpot acquisition and frequently returns 404 / stale marks.
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

import sharp from 'sharp'
import { getAdminClient } from '../lib/cron/supabase-admin'

const BUCKET = 'tool-logos'
// MIME types the tool-logos bucket accepts. Anything else (ICO/GIF) is
// converted to PNG with sharp before upload so it still lands in the bucket.
const BUCKET_MIME = new Set<string>(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

// Hosts whose images are known to be bad logo material (wide marketing
// screenshots etc). Mirrors lib/tool-logo.ts BAD_LOGO_HOSTS.
const BAD_LOGO_HOSTS = new Set<string>(['cdn.futurepedia.io'])

const MIN_BYTES = 512 // anything smaller is almost certainly a 1x1 / placeholder
const FETCH_TIMEOUT_MS = 8000 // short per-request timeout so we never hang
const DEFAULT_CONCURRENCY = 8

type Source = 'apple-touch-icon' | 'og:image' | 'icon' | 'well-known'

interface VerifiedImage {
  source: Source
  url: string
  buffer: Buffer
  contentType: string
  ext: string
}

const args = process.argv.slice(2)
const isProbe = args.includes('--probe')
const isApply = args.includes('--apply')
const sampleArg = args.find((a) => a.startsWith('--sample='))
const limitArg = args.find((a) => a.startsWith('--limit='))
const concArg = args.find((a) => a.startsWith('--concurrency='))
const SAMPLE = sampleArg ? parseInt(sampleArg.split('=')[1], 10) : 25
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity
const CONCURRENCY = concArg ? Math.max(1, parseInt(concArg.split('=')[1], 10)) : DEFAULT_CONCURRENCY

function domainOf(websiteUrl: string): string | null {
  try {
    let u = websiteUrl.trim()
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u
    const host = new URL(u).hostname.toLowerCase()
    return host.replace(/^www\./, '')
  } catch {
    return null
  }
}

async function timedFetch(url: string, accept?: string): Promise<Response | null> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        ...(accept ? { Accept: accept } : {}),
      },
      signal: ctrl.signal,
      redirect: 'follow',
    })
    return res
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

function extFromContentType(ct: string): string | null {
  const c = ct.toLowerCase().split(';')[0].trim()
  switch (c) {
    case 'image/png':
      return 'png'
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg'
    case 'image/webp':
      return 'webp'
    case 'image/svg+xml':
      return 'svg'
    case 'image/x-icon':
    case 'image/vnd.microsoft.icon':
      return 'ico'
    case 'image/gif':
      return 'gif'
    default:
      return null
  }
}

interface ImgCheck {
  ok: boolean
  w?: number
  h?: number
}

/**
 * Validate that a buffer is a real, non-trivial image and (where possible)
 * extract pixel dimensions. Rejects: HTML masquerading as an image, tiny
 * 1x1 trackers, and corrupt/unknown formats.
 *
 * Dimensions are returned so the caller can enforce an aspect-ratio guard:
 * the runtime renders logos in a square box with object-cover, so a wide
 * banner (a common og:image) would be center-cropped into garbage -- exactly
 * the "absurd images" regression BAD_LOGO_HOSTS was created to prevent.
 */
function validateImage(buf: Buffer, ext: string): ImgCheck {
  if (buf.length < MIN_BYTES) return { ok: false }

  // Reject HTML masquerading as an image.
  const head = buf.subarray(0, 256).toString('utf8').toLowerCase()
  if (head.includes('<!doctype html') || head.includes('<html')) return { ok: false }

  if (ext === 'svg') {
    // SVG is resolution-independent; treat as square-safe.
    return head.includes('<svg') ? { ok: true } : { ok: false }
  }

  if (ext === 'png') {
    if (!(buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)) return { ok: false }
    // IHDR width/height are big-endian uint32 at offsets 16 and 20.
    const w = buf.readUInt32BE(16)
    const h = buf.readUInt32BE(20)
    if (!(w > 1 && h > 1)) return { ok: false }
    return { ok: true, w, h }
  }
  if (ext === 'jpg') {
    if (!(buf[0] === 0xff && buf[1] === 0xd8)) return { ok: false }
    const dims = jpegDimensions(buf)
    if (dims) {
      if (!(dims.w > 1 && dims.h > 1)) return { ok: false }
      return { ok: true, w: dims.w, h: dims.h }
    }
    return { ok: true } // valid SOI but couldn't parse SOF -- accept, dims unknown
  }
  if (ext === 'gif') {
    if (head.slice(0, 6) !== 'gif87a' && head.slice(0, 6) !== 'gif89a') return { ok: false }
    const w = buf.readUInt16LE(6)
    const h = buf.readUInt16LE(8)
    if (!(w > 1 && h > 1)) return { ok: false }
    return { ok: true, w, h }
  }
  if (ext === 'webp') {
    if (!(buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP'))
      return { ok: false }
    const dims = webpDimensions(buf)
    return dims ? { ok: true, w: dims.w, h: dims.h } : { ok: true }
  }
  if (ext === 'ico') {
    // ICO header: 0,0, type=1. Icons are inherently square.
    return buf[0] === 0 && buf[1] === 0 && buf[2] === 1 ? { ok: true } : { ok: false }
  }
  return { ok: false }
}

/** Extract dimensions from VP8 / VP8L / VP8X WEBP chunks. */
function webpDimensions(buf: Buffer): { w: number; h: number } | null {
  try {
    const fmt = buf.subarray(12, 16).toString('ascii')
    if (fmt === 'VP8 ') {
      const w = buf.readUInt16LE(26) & 0x3fff
      const h = buf.readUInt16LE(28) & 0x3fff
      return { w, h }
    }
    if (fmt === 'VP8L') {
      const b = buf.readUInt32LE(21)
      const w = (b & 0x3fff) + 1
      const h = ((b >> 14) & 0x3fff) + 1
      return { w, h }
    }
    if (fmt === 'VP8X') {
      const w = (buf[24] | (buf[25] << 8) | (buf[26] << 16)) + 1
      const h = (buf[27] | (buf[28] << 8) | (buf[29] << 16)) + 1
      return { w, h }
    }
  } catch {}
  return null
}

function jpegDimensions(buf: Buffer): { w: number; h: number } | null {
  let off = 2
  while (off < buf.length - 9) {
    if (buf[off] !== 0xff) {
      off++
      continue
    }
    const marker = buf[off + 1]
    // SOF0..SOF15 (excluding DHT/DAC/RST markers) carry dimensions.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const h = buf.readUInt16BE(off + 5)
      const w = buf.readUInt16BE(off + 7)
      return { w, h }
    }
    const len = buf.readUInt16BE(off + 2)
    off += 2 + len
  }
  return null
}

async function fetchAndVerify(url: string, source: Source): Promise<VerifiedImage | null> {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '')
    if (BAD_LOGO_HOSTS.has(host) || BAD_LOGO_HOSTS.has('www.' + host)) return null
  } catch {
    return null
  }
  const res = await timedFetch(url, 'image/*')
  if (!res || !res.ok) return null
  const ct = res.headers.get('content-type') || ''
  if (!ct.toLowerCase().startsWith('image/')) return null
  const ext = extFromContentType(ct)
  if (!ext) return null
  const ab = await res.arrayBuffer()
  const buffer = Buffer.from(ab)
  const chk = validateImage(buffer, ext)
  if (!chk.ok) return null

  // Aspect-ratio guard. The runtime crops logos into a square box; wide/tall
  // banners would be mangled. apple-touch-icon, icon and ico are inherently
  // square so we accept them even when dims are unknown. og:image is frequently
  // a 1200x630 social banner, so it MUST measure near-square.
  if (chk.w && chk.h) {
    const ratio = Math.max(chk.w, chk.h) / Math.min(chk.w, chk.h)
    const maxRatio = source === 'og:image' ? 1.4 : 2.5
    if (ratio > maxRatio) return null
  } else if (source === 'og:image') {
    // og:image with undeterminable dimensions is too risky -- reject.
    return null
  }

  return { source, url, buffer, contentType: ct.split(';')[0].trim(), ext }
}

interface HomepageIcons {
  appleTouchIcon?: string
  ogImage?: string
  icon?: string
}

/** Parse apple-touch-icon, og:image and rel=icon absolute URLs from a homepage. */
async function parseHomepageIcons(domain: string): Promise<HomepageIcons> {
  const base = `https://${domain}`
  const res = await timedFetch(base, 'text/html')
  if (!res || !res.ok) return {}
  const ct = (res.headers.get('content-type') || '').toLowerCase()
  if (!ct.includes('text/html')) return {}
  let html: string
  try {
    html = (await res.text()).slice(0, 200000)
  } catch {
    return {}
  }
  const finalUrl = res.url || base
  const out: HomepageIcons = {}

  const linkRe = /<link\b[^>]*>/gi
  let bestApple: { href: string; size: number } | null = null
  let bestIcon: { href: string; size: number } | null = null
  let m: RegExpExecArray | null
  while ((m = linkRe.exec(html))) {
    const tag = m[0]
    const rel = /\brel\s*=\s*["']?([^"'>]+)/i.exec(tag)?.[1]?.toLowerCase().trim()
    if (!rel) continue
    const href = /\bhref\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]
    if (!href) continue
    const sizeStr = /\bsizes\s*=\s*["']?(\d+)/i.exec(tag)?.[1]
    const size = sizeStr ? parseInt(sizeStr, 10) : 0

    if (rel.includes('apple-touch-icon')) {
      if (!bestApple || size > bestApple.size) bestApple = { href, size }
    } else if (rel === 'icon' || rel === 'shortcut icon' || rel.split(/\s+/).includes('icon')) {
      // Prefer the largest declared size; treat unsized as 0.
      if (!bestIcon || size > bestIcon.size) bestIcon = { href, size }
    }
  }
  if (bestApple) {
    try {
      out.appleTouchIcon = new URL(bestApple.href, finalUrl).toString()
    } catch {}
  }
  if (bestIcon) {
    try {
      out.icon = new URL(bestIcon.href, finalUrl).toString()
    } catch {}
  }

  // og:image
  const metaRe = /<meta\b[^>]*>/gi
  while ((m = metaRe.exec(html))) {
    const tag = m[0]
    const prop = (
      /\bproperty\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1] ||
      /\bname\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1] ||
      ''
    ).toLowerCase()
    if (prop !== 'og:image' && prop !== 'og:image:url' && prop !== 'og:image:secure_url') continue
    const content = /\bcontent\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]
    if (!content) continue
    try {
      out.ogImage = new URL(content, finalUrl).toString()
      break
    } catch {}
  }
  return out
}

/**
 * Try every source in priority order; return the first VERIFIED image.
 * Sources, in order: apple-touch-icon (HTML) -> og:image (HTML) ->
 * icon (HTML) -> well-known static paths.
 */
async function findLogo(domain: string): Promise<VerifiedImage | null> {
  const icons = await parseHomepageIcons(domain)

  if (icons.appleTouchIcon) {
    const v = await fetchAndVerify(icons.appleTouchIcon, 'apple-touch-icon')
    if (v) return v
  }
  if (icons.ogImage) {
    const v = await fetchAndVerify(icons.ogImage, 'og:image')
    if (v) return v
  }
  if (icons.icon) {
    const v = await fetchAndVerify(icons.icon, 'icon')
    if (v) return v
  }

  // Well-known static paths as a final attempt (many sites omit the <link> tags
  // but still serve these at the conventional location).
  const wellKnown = [
    `https://${domain}/apple-touch-icon.png`,
    `https://${domain}/apple-touch-icon-precomposed.png`,
    `https://${domain}/favicon.svg`,
  ]
  for (const url of wellKnown) {
    const v = await fetchAndVerify(url, 'well-known')
    if (v) return v
  }

  return null
}

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
    const { data, error } = await sb
      .from('tools')
      .select('id, slug, website_url, logo_url')
      .eq('is_published', true)
      .or('logo_url.is.null,logo_url.eq.')
      .not('website_url', 'is', null)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)
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
  // Deterministic spread across the set rather than just the first N.
  const step = Math.max(1, Math.floor(tools.length / SAMPLE))
  const sample = tools.filter((_, i) => i % step === 0).slice(0, SAMPLE)

  const perSource: Record<Source, number> = {
    'apple-touch-icon': 0,
    'og:image': 0,
    icon: 0,
    'well-known': 0,
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
  for (const s of Object.keys(perSource) as Source[]) {
    const n = perSource[s]
    console.log(`  ${s.padEnd(18)} ${n} (${total ? ((100 * n) / total).toFixed(0) : 0}%)`)
  }
  console.log(`  ${'ANY (success)'.padEnd(18)} ${wins} (${total ? ((100 * wins) / total).toFixed(0) : 0}%)`)
}

async function runApply(sb: ReturnType<typeof getAdminClient>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
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
  const sourceTally: Record<Source, number> = {
    'apple-touch-icon': 0,
    'og:image': 0,
    icon: 0,
    'well-known': 0,
  }

  await pool(tools, CONCURRENCY, async (t) => {
    done++
    const domain = t.website_url ? domainOf(t.website_url) : null
    if (!domain) {
      skipped++
      return
    }
    const v = await findLogo(domain)
    if (!v) {
      skipped++
      if (done % 50 === 0) console.log(`  [${done}/${tools.length}] filled=${filled} skipped=${skipped}`)
      return
    }

    // EVERY stored logo_url MUST be re-hosted in our Supabase Storage bucket:
    // it is the only external host allowed by next.config.ts image
    // remotePatterns AND the CSP img-src. Writing an arbitrary vendor URL would
    // render as a broken image (next/image rejects un-allowlisted hosts) -- a
    // regression. The bucket only accepts png/jpeg/webp/svg, so ICO/GIF
    // candidates are converted to PNG with sharp before upload. If anything in
    // this path fails, we SKIP (leave null -> favicon fallback) rather than
    // write an un-renderable URL.
    let buffer = v.buffer
    let ext = v.ext
    let contentType = v.contentType
    if (!BUCKET_MIME.has(contentType)) {
      try {
        buffer = await sharp(v.buffer).png().toBuffer()
        ext = 'png'
        contentType = 'image/png'
        converted++
      } catch {
        skipped++
        if (done % 50 === 0) console.log(`  [${done}/${tools.length}] filled=${filled} skipped=${skipped}`)
        return
      }
    }

    const key = `tools/${(t.slug || t.id).replace(/[^a-z0-9._-]/gi, '-')}.${ext}`
    const { error: upErr } = await sb.storage.from(BUCKET).upload(key, buffer, {
      contentType,
      upsert: true,
      cacheControl: '604800',
    })
    if (upErr) {
      console.log(`  ! upload failed ${t.slug ?? t.id}: ${upErr.message}`)
      skipped++
      return
    }
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${key}`

    // Only update rows still null/empty (idempotent at write time too).
    const { error: updErr, count } = await sb
      .from('tools')
      .update({ logo_url: publicUrl }, { count: 'exact' })
      .eq('id', t.id)
      .or('logo_url.is.null,logo_url.eq.')
    if (updErr) {
      console.log(`  ! db update failed ${t.slug ?? t.id}: ${updErr.message}`)
      skipped++
    } else if (!count) {
      // Row already had a logo (race) -- leave it.
      skipped++
    } else {
      filled++
      sourceTally[v.source]++
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
