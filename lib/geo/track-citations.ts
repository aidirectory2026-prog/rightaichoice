// Phase 13 D3.4 — turn an engine's raw citations into a snapshot row.
//
// Given the cited/retrieved URLs an engine returned for a prompt, compute:
//   cited        — is rightaichoice.com in the answer's citations?
//   retrieved    — did the engine at least see us?
//   citation_rank— rank of our first cited URL among distinct cited domains
//   competitors  — which tracked competitors were cited/retrieved + their rank
//   share_of_voice — our cited-URL share of all cited sources
// Pure + deterministic, so it's unit-testable without any API call.

import { hostOf, isOurs, matchedCompetitor, COMPETITOR_DOMAINS } from './competitors'
import type { EngineResult, EngineId } from './citation-engines'

export type CompetitorStanding = {
  domain: string
  cited: boolean
  retrieved: boolean
  rank: number | null
}

export type CitationAnalysis = {
  cited: boolean
  retrieved: boolean
  citationRank: number | null
  ourUrls: string[]
  competitors: CompetitorStanding[]
  allSources: string[] // ordered distinct cited domains
  shareOfVoice: number
  answerExcerpt: string
  model: string
  tokensIn: number
  tokensOut: number
}

export function analyzeCitations(result: EngineResult): CitationAnalysis {
  const { citedUrls, retrievedUrls } = result

  // Ordered distinct domains among cited URLs.
  const citedDomains: string[] = []
  for (const u of citedUrls) {
    const h = hostOf(u)
    if (h && !citedDomains.includes(h)) citedDomains.push(h)
  }
  const retrievedDomains = new Set(retrievedUrls.map(hostOf).filter(Boolean))

  const ourUrls = [...citedUrls, ...retrievedUrls].filter(isOurs)
  const ourCitedRankDomain = citedDomains.findIndex(isOurs)
  const cited = ourUrls.some((u) => citedUrls.includes(u))
  const retrieved = ourUrls.length > 0

  const competitors: CompetitorStanding[] = COMPETITOR_DOMAINS.map((domain) => {
    const rankIdx = citedDomains.findIndex((d) => d === domain || d.endsWith('.' + domain))
    const wasRetrieved = [...retrievedDomains].some(
      (d) => d === domain || d.endsWith('.' + domain),
    )
    return {
      domain,
      cited: rankIdx >= 0,
      retrieved: wasRetrieved,
      rank: rankIdx >= 0 ? rankIdx + 1 : null,
    }
  }).filter((c) => c.cited || c.retrieved)

  const shareOfVoice =
    citedDomains.length > 0
      ? citedDomains.filter(isOurs).length / citedDomains.length
      : 0

  return {
    cited,
    retrieved,
    citationRank: ourCitedRankDomain >= 0 ? ourCitedRankDomain + 1 : null,
    ourUrls: Array.from(new Set(ourUrls)),
    competitors,
    allSources: citedDomains,
    shareOfVoice,
    answerExcerpt: result.answerExcerpt,
    model: result.model,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
  }
}

/** Shape written to the geo_citation_snapshots table. */
export type GeoSnapshotRow = {
  snapshot_date: string
  engine: EngineId
  model: string | null
  prompt_id: string
  prompt: string
  prompt_category: string | null
  cited: boolean
  retrieved: boolean
  citation_rank: number | null
  our_urls: string[]
  competitors: CompetitorStanding[]
  all_sources: string[]
  share_of_voice: number
  answer_excerpt: string
  error: string | null
}
