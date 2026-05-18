const INDEXNOW_KEY = '1ddd347878cead47f293292da0707a19'
const BASE_URL = 'https://rightaichoice.com'

// IndexNow accepts up to 10k URLs per submission; we use 1000 to keep each
// POST fast and resilient to api.indexnow.org slow-responses. Daily delta
// pings typically have <100 URLs so this only matters for full-sitemap runs.
const CHUNK_SIZE = 1000

// Per-request abort. Vercel function timeout is 60s; sequential chunks
// each get their own clock. 25s is generous — IndexNow usually responds
// in <2s; this catches the upstream-hang case that caused the 504 in
// d.1 audit (run 26015605460).
const REQUEST_TIMEOUT_MS = 25_000

/**
 * Submit one or more URLs to IndexNow (Bing + Yandex + others).
 * Fire-and-forget — failures are logged but never throw. Large URL lists
 * are chunked and submitted sequentially, each with its own abort timeout.
 */
export async function submitToIndexNow(urls: string | string[]) {
  const urlList = Array.isArray(urls) ? urls : [urls]
  if (urlList.length === 0) return

  const normalized = urlList.map((u) => (u.startsWith('http') ? u : `${BASE_URL}${u}`))

  for (let i = 0; i < normalized.length; i += CHUNK_SIZE) {
    const chunk = normalized.slice(i, i + CHUNK_SIZE)
    await submitChunk(chunk)
  }
}

async function submitChunk(urlList: string[]) {
  const payload = {
    host: 'rightaichoice.com',
    key: INDEXNOW_KEY,
    keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`,
    urlList,
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    if (!res.ok) {
      console.error(`IndexNow submit failed: ${res.status} ${await res.text()}`)
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error(`IndexNow submit aborted after ${REQUEST_TIMEOUT_MS}ms (chunk of ${urlList.length})`)
    } else {
      console.error('IndexNow submit error:', err)
    }
  } finally {
    clearTimeout(timeoutId)
  }
}
