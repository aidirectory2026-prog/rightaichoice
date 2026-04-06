const INDEXNOW_KEY = '1ddd347878cead47f293292da0707a19'
const BASE_URL = 'https://rightaichoice.com'

/**
 * Submit one or more URLs to IndexNow (Bing + Yandex + others).
 * Fire-and-forget — failures are logged but never throw.
 */
export async function submitToIndexNow(urls: string | string[]) {
  const urlList = Array.isArray(urls) ? urls : [urls]
  if (urlList.length === 0) return

  const payload = {
    host: 'rightaichoice.com',
    key: INDEXNOW_KEY,
    keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: urlList.map((u) => (u.startsWith('http') ? u : `${BASE_URL}${u}`)),
  }

  // IndexNow: submit to one engine, all participating engines get it
  // Bing is the primary IndexNow endpoint
  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      console.error(`IndexNow submit failed: ${res.status} ${await res.text()}`)
    }
  } catch (err) {
    console.error('IndexNow submit error:', err)
  }
}
