const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

export async function fetchPageText(url: string, timeoutMs = 10000, maxChars = 8000): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
      redirect: 'follow',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    return extractText(html, maxChars)
  } finally {
    clearTimeout(timer)
  }
}

function extractText(html: string, maxChars = 8000): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxChars)
}

export async function fetchHTML(url: string, timeoutMs = 10000): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
      redirect: 'follow',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

// Phase 8.h (2026-05-25) — multi-page scrape for richer enrichment context.
// Tries homepage + common high-signal paths (/pricing, /changelog, /features,
// /about, /blog, /docs, /releases). Each fetched in parallel with short
// timeouts; failures are swallowed (some sites won't have those paths).
//
// Returns a single concatenated string with section headers per path so the
// LLM can attribute claims to specific pages.
export async function fetchToolPagesBundle(
  baseUrl: string,
  options: { perPageTimeoutMs?: number; maxCharsPerPage?: number; maxTotalChars?: number } = {},
): Promise<string> {
  const perPageTimeoutMs = options.perPageTimeoutMs ?? 8000
  const maxCharsPerPage = options.maxCharsPerPage ?? 4000
  const maxTotalChars = options.maxTotalChars ?? 24000

  // Normalize base URL → origin
  let origin: string
  try {
    origin = new URL(baseUrl).origin
  } catch {
    origin = baseUrl.replace(/\/$/, '')
  }

  const candidatePaths = [
    '', // homepage
    '/pricing',
    '/changelog',
    '/whats-new',
    '/features',
    '/about',
    '/blog',
    '/docs',
    '/releases',
    '/integrations',
  ]

  const results = await Promise.allSettled(
    candidatePaths.map(async (path) => {
      const url = path ? `${origin}${path}` : baseUrl
      const text = await fetchPageText(url, perPageTimeoutMs, maxCharsPerPage)
      return { path: path || '/', text }
    }),
  )

  const sections: string[] = []
  let totalChars = 0
  for (const r of results) {
    if (r.status !== 'fulfilled') continue
    const { path, text } = r.value
    if (!text || text.length < 80) continue // skip useless pages (empty/error/login walls)
    const sec = `\n\n=== Page: ${path} ===\n${text}`
    if (totalChars + sec.length > maxTotalChars) break
    sections.push(sec)
    totalChars += sec.length
  }

  return sections.join('').trim()
}
