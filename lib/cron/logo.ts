/**
 * Reusable logo resolve -> verify -> re-host pipeline.
 *
 * Extracted from scripts/backfill-logos.ts (Phase 9 D2) so BOTH the nightly
 * backfill CLI and the new-tool onboard SOP (lib/cron/onboard.ts) run the
 * EXACT same conservative logic -- no divergence, no second implementation to
 * keep in sync.
 *
 * Conservative by design: a stored logo_url MUST be re-hosted in our own
 * `tool-logos` Supabase Storage bucket (the only external host allowed by
 * next.config image remotePatterns + the CSP img-src). We only write a
 * logo_url after downloading the candidate, VERIFYING it is a real,
 * non-trivial, near-square raster/SVG image, and uploading it durably. If any
 * step fails we leave logo_url null and the runtime favicon fallback
 * (lib/tool-logo.ts) covers the tool -- never an un-renderable URL.
 *
 * Source preference (parsed from the site's OWN homepage HTML):
 *   1. <link rel="apple-touch-icon">  (largest sizes attr wins; 180x180 std)
 *   2. og:image                        (only if it measures near-square)
 *   3. <link rel="icon">               (largest sizes attr wins)
 *   plus well-known static paths (/apple-touch-icon.png, /favicon.svg, ...).
 *
 * Clearbit is deliberately NOT used (unreliable post-HubSpot).
 */
import sharp from 'sharp'
import type { SupabaseClient } from '@supabase/supabase-js'

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

export type LogoSource = 'apple-touch-icon' | 'og:image' | 'icon' | 'well-known'

export interface VerifiedImage {
  source: LogoSource
  url: string
  buffer: Buffer
  contentType: string
  ext: string
}

export function domainOf(websiteUrl: string): string | null {
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
 * extract pixel dimensions. Rejects HTML masquerading as an image, tiny
 * 1x1 trackers, and corrupt/unknown formats.
 */
function validateImage(buf: Buffer, ext: string): ImgCheck {
  if (buf.length < MIN_BYTES) return { ok: false }

  const head = buf.subarray(0, 256).toString('utf8').toLowerCase()
  if (head.includes('<!doctype html') || head.includes('<html')) return { ok: false }

  if (ext === 'svg') {
    return head.includes('<svg') ? { ok: true } : { ok: false }
  }
  if (ext === 'png') {
    if (!(buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)) return { ok: false }
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
    return { ok: true }
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

async function fetchAndVerify(url: string, source: LogoSource): Promise<VerifiedImage | null> {
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
 * apple-touch-icon (HTML) -> og:image (HTML) -> icon (HTML) -> well-known.
 */
export async function findLogo(domain: string): Promise<VerifiedImage | null> {
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

export type ResolveLogoResult =
  | { status: 'set'; logoUrl: string; source: LogoSource; converted: boolean }
  | { status: 'already'; logoUrl: string }
  | { status: 'skipped'; reason: string }

/**
 * Resolve, verify, re-host and store a real logo for a single tool.
 *
 * - Idempotent: if the row already has a logo_url it is a no-op ('already').
 * - Only writes logo_url after a successful bucket upload; otherwise 'skipped'
 *   (leaving the runtime favicon fallback in place).
 * - The DB update is guarded (`logo_url IS NULL`) so a concurrent writer never
 *   gets clobbered.
 *
 * Shared by scripts/backfill-logos.ts and lib/cron/onboard.ts.
 */
export async function resolveAndStoreLogo(
  sb: SupabaseClient,
  tool: { id: string; slug: string | null; website_url: string | null; logo_url: string | null },
): Promise<ResolveLogoResult> {
  if (tool.logo_url && tool.logo_url.trim()) {
    return { status: 'already', logoUrl: tool.logo_url }
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return { status: 'skipped', reason: 'NEXT_PUBLIC_SUPABASE_URL missing' }

  const domain = tool.website_url ? domainOf(tool.website_url) : null
  if (!domain) return { status: 'skipped', reason: `bad website_url: ${tool.website_url ?? 'null'}` }

  const v = await findLogo(domain)
  if (!v) return { status: 'skipped', reason: 'no verifiable logo found' }

  let buffer = v.buffer
  let ext = v.ext
  let contentType = v.contentType
  let converted = false
  if (!BUCKET_MIME.has(contentType)) {
    try {
      buffer = await sharp(v.buffer).png().toBuffer()
      ext = 'png'
      contentType = 'image/png'
      converted = true
    } catch {
      return { status: 'skipped', reason: 'sharp conversion failed' }
    }
  }

  const key = `tools/${(tool.slug || tool.id).replace(/[^a-z0-9._-]/gi, '-')}.${ext}`
  const { error: upErr } = await sb.storage.from(BUCKET).upload(key, buffer, {
    contentType,
    upsert: true,
    cacheControl: '604800',
  })
  if (upErr) return { status: 'skipped', reason: `upload failed: ${upErr.message}` }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${key}`
  const { error: updErr, count } = await sb
    .from('tools')
    .update({ logo_url: publicUrl } as never, { count: 'exact' })
    .eq('id', tool.id)
    .or('logo_url.is.null,logo_url.eq.')
  if (updErr) return { status: 'skipped', reason: `db update failed: ${updErr.message}` }
  if (!count) return { status: 'already', logoUrl: publicUrl } // race: another writer won

  return { status: 'set', logoUrl: publicUrl, source: v.source, converted }
}
