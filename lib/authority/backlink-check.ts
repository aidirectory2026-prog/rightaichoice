// Phase 13 D2.1 — detect whether a page links back to rightaichoice.com.
//
// Used to verify a directory listing went live with an actual link (closing the
// loop from "submitted" → confirmed backlink → referring_domains). Regex scan of
// href attributes — no DOM dependency; good enough for link presence.

export type BacklinkResult = { ok: boolean; found: boolean; hrefs: string[]; status: number | null }

export async function detectBacklink(pageUrl: string): Promise<BacklinkResult> {
  try {
    const r = await fetch(pageUrl, {
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
      headers: { 'user-agent': 'RightAIChoiceBot/1.0 (+https://rightaichoice.com)' },
    })
    if (!r.ok) return { ok: false, found: false, hrefs: [], status: r.status }
    const html = await r.text()
    const hrefs = Array.from(html.matchAll(/href=["']([^"']+)["']/gi))
      .map((m) => m[1])
      .filter((h) => /rightaichoice\.com/i.test(h))
    const unique = Array.from(new Set(hrefs))
    return { ok: true, found: unique.length > 0, hrefs: unique, status: r.status }
  } catch {
    return { ok: false, found: false, hrefs: [], status: null }
  }
}
