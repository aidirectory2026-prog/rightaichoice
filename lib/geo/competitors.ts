// Phase 13 D3.4 — who we measure ourselves against in AI answers.
//
// OUR_DOMAIN is the canonical host we look for in engine citations. COMPETITORS
// are the AI-tool directories / review sites that currently win the citations we
// want — tracking their presence gives a share-of-voice baseline and a target list.

export const OUR_DOMAIN = 'rightaichoice.com'

// Known AI-tool directories + review platforms LLMs tend to cite for
// "best AI tool…" / "AI tool directory" style prompts. Keep lowercase, bare host.
export const COMPETITOR_DOMAINS: string[] = [
  'futurepedia.io',
  'theresanaiforthat.com',
  'toolify.ai',
  'aitoolsdirectory.com',
  'g2.com',
  'capterra.com',
  'producthunt.com',
  'saashub.com',
  'topai.tools',
  'aixploria.com',
  'insidr.ai',
  'aitools.fyi',
  'futuretools.io',
]

/** Normalize any URL/host to a bare lowercase registrable-ish host (strips www, path, protocol). */
export function hostOf(urlOrHost: string): string {
  if (!urlOrHost) return ''
  let h = urlOrHost.trim().toLowerCase()
  h = h.replace(/^https?:\/\//, '').replace(/^www\./, '')
  h = h.split('/')[0].split('?')[0].split('#')[0]
  return h
}

export function isOurs(urlOrHost: string): boolean {
  const h = hostOf(urlOrHost)
  return h === OUR_DOMAIN || h.endsWith('.' + OUR_DOMAIN)
}

export function matchedCompetitor(urlOrHost: string): string | null {
  const h = hostOf(urlOrHost)
  for (const c of COMPETITOR_DOMAINS) {
    if (h === c || h.endsWith('.' + c)) return c
  }
  return null
}
