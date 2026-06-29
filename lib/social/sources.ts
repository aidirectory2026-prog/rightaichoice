// Phase 13 Social — research/sources layer (the "research first" step).
//
// Builds a ranked pool of POSTABLE candidates from our LIVE, verified data
// (the same data behind the GEO report). Every candidate carries the exact facts
// AND a pre-filled graphic spec drawn from real numbers — so graphics are
// guaranteed truthful and the brain only writes the surrounding copy (it cannot
// invent a stat). Truth-only: every candidate carries at least one source URL.

import { buildStateOfAI, type StateOfAI } from '../geo/state-of-ai'
import { loadDataset, type Dataset, type DatasetTool } from '../geo/llms-dataset'
import type { GraphicData, GraphicTemplate } from './graphics/templates'
import type { PostKind, SourceRef } from './types'

export const REPORT_URL = 'https://rightaichoice.com/state-of-ai-tools'
export const SITE = 'https://rightaichoice.com'

export type Candidate = {
  key: string
  kind: PostKind
  topic: string // short description of the angle (fed to the brain + content_hash)
  facts: string // the verified facts the brain MUST ground its copy in
  graphic_template: GraphicTemplate | null
  graphic_data: Record<string, unknown>
  link_url: string | null
  sources: SourceRef[]
  freshness: number // 0..1 — how time-sensitive
  novelty: number // 0..1 — how fresh an angle (vs evergreen)
  strategicFit: number // 0..1 — how well it serves "help pick AI tools"
  score: number // weighted rank
}

function scoreOf(c: Pick<Candidate, 'freshness' | 'novelty' | 'strategicFit'>): number {
  // Insights-driven expectedPerformance is added in S7; for now weight the
  // signals we have. (Appendix A1 formula, minus the not-yet-available term.)
  return +(0.4 * c.freshness + 0.3 * c.novelty + 0.3 * c.strategicFit).toFixed(4)
}

function topToolsForSpotlight(ds: Dataset, n: number): DatasetTool[] {
  return ds.tools
    .filter((t) => t.website_url && t.tagline && (t.viability_score ?? 0) >= 60)
    .sort((a, b) => (b.viability_score ?? 0) - (a.viability_score ?? 0))
    .slice(0, n)
}

function freshestTools(ds: Dataset, n: number): DatasetTool[] {
  return ds.tools
    .filter((t) => t.last_verified_at)
    .sort((a, b) => (b.last_verified_at! < a.last_verified_at! ? -1 : 1))
    .slice(0, n)
}

/** Build the candidate pool from live data. Pass cached dataset/state to avoid re-reads. */
export async function buildCandidatePool(opts?: { dataset?: Dataset; state?: StateOfAI }): Promise<Candidate[]> {
  const ds = opts?.dataset ?? (await loadDataset())
  const d = opts?.state ?? (await buildStateOfAI(ds))
  const out: Candidate[] = []
  const push = (c: Omit<Candidate, 'score'>) => out.push({ ...c, score: scoreOf(c) })

  // ── Stat cards from the State-of-AI report (citable, current) ──────────────
  const statSource: SourceRef[] = [{ title: 'RightAIChoice — State of AI Tools', url: REPORT_URL }]

  push({
    key: 'stat-freshness',
    kind: 'stat_card',
    topic: `${d.verified7dPct}% of our ${d.totalPublished} tracked AI tools were re-verified in the last 7 days`,
    facts: `We re-verified ${d.verified7d} of ${d.totalPublished} tools in the last 7 days (${d.verified7dPct}%). Most AI directories scrape once and let data rot.`,
    graphic_template: 'stat_card',
    graphic_data: {
      stat: `${d.verified7dPct}%`,
      label: `of our ${d.totalPublished.toLocaleString()} tracked AI tools were re-verified this week`,
      sublabel: 'Most AI tool lists are already out of date',
      source: 'RightAIChoice',
    } satisfies GraphicData['stat_card'],
    link_url: REPORT_URL,
    sources: statSource,
    freshness: 0.9,
    novelty: 0.6,
    strategicFit: 0.7,
  })

  push({
    key: 'stat-pricing',
    kind: 'stat_card',
    topic: `${d.freeOrFreemiumPct}% of AI tools are free or freemium`,
    facts: `${d.freeOrFreemiumPct}% of AI tools are free or freemium. Full split: ${d.pricingMix.slice(0, 4).map((p) => `${p.label} ${p.pct}%`).join(', ')}.`,
    graphic_template: 'stat_card',
    graphic_data: {
      stat: `${d.freeOrFreemiumPct}%`,
      label: 'of AI tools are free or freemium',
      sublabel: `Across ${d.totalPublished.toLocaleString()} tools we track`,
      source: 'RightAIChoice',
    } satisfies GraphicData['stat_card'],
    link_url: REPORT_URL,
    sources: statSource,
    freshness: 0.5,
    novelty: 0.6,
    strategicFit: 0.85,
  })

  if (d.viability.avg != null) {
    push({
      key: 'stat-viability',
      kind: 'stat_card',
      topic: `${d.viability.strong.pct}% of scored AI tools rate "strong" on long-term viability`,
      facts: `We score every tool on survival risk. Average viability ${d.viability.avg}/100. ${d.viability.strong.pct}% score "strong", ${d.viability.atRisk.pct}% "at risk".`,
      graphic_template: 'stat_card',
      graphic_data: {
        stat: `${d.viability.strong.pct}%`,
        label: 'of AI tools we scored rate "strong" on long-term viability',
        sublabel: `Average viability ${d.viability.avg}/100 across ${d.viability.scored.toLocaleString()} scored tools`,
        source: 'RightAIChoice',
      } satisfies GraphicData['stat_card'],
      link_url: REPORT_URL,
      sources: statSource,
      freshness: 0.6,
      novelty: 0.8,
      strategicFit: 0.8,
    })
  }

  // ── Tool spotlights (top viability, with a real website to cite) ───────────
  for (const t of topToolsForSpotlight(ds, 3)) {
    const cat = t.categories[0] ?? 'AI Tool'
    push({
      key: `spotlight-${t.slug}`,
      kind: 'tool_spotlight',
      topic: `Tool spotlight: ${t.name} (${cat})`,
      facts: `${t.name} — ${cat}. ${t.tagline}. Pricing: ${t.pricing_type ?? 'see site'}. Viability ${t.viability_score}/100${t.github_stars ? `, ${t.github_stars.toLocaleString()} GitHub stars` : ''}.`,
      graphic_template: 'tool_spotlight',
      graphic_data: {
        tool: t.name,
        category: cat,
        tagline: t.tagline ?? '',
        pricing: t.pricing_type ?? undefined,
      } satisfies GraphicData['tool_spotlight'],
      link_url: t.website_url,
      sources: [{ title: `${t.name} (official)`, url: t.website_url! }],
      freshness: 0.4,
      novelty: 0.7,
      strategicFit: 0.9,
    })
  }

  // ── News roundup from the freshest catalog movement (real names) ───────────
  const fresh = freshestTools(ds, 4)
  if (fresh.length >= 3) {
    push({
      key: 'roundup-fresh',
      kind: 'news_roundup',
      topic: 'Recently verified / updated AI tools this week',
      facts: `Freshly re-verified this week: ${fresh.map((t) => t.name).join(', ')}.${d.addedLast30d > 0 ? ` ${d.addedLast30d} tools added in the last 30 days.` : ''}`,
      graphic_template: 'news_roundup',
      graphic_data: {
        headline: 'Freshly verified this week',
        items: fresh.map((t) => `${t.name} — ${t.categories[0] ?? 'AI tool'}`),
        date: `As of ${new Date(d.generatedAt).toISOString().slice(0, 10)}`,
      } satisfies GraphicData['news_roundup'],
      link_url: REPORT_URL,
      sources: statSource,
      freshness: 0.95,
      novelty: 0.7,
      strategicFit: 0.6,
    })
  }

  // ── Milestone quote ────────────────────────────────────────────────────────
  push({
    key: 'quote-mission',
    kind: 'quote',
    topic: 'Why we re-verify the whole AI-tool catalog continuously',
    facts: `We track ${d.totalPublished} AI tools and re-verify them continuously so recommendations stay true.`,
    graphic_template: 'quote',
    graphic_data: {
      quote: 'The best AI tool is the one that still does what it promised last month.',
      attribution: 'RightAIChoice',
    } satisfies GraphicData['quote'],
    link_url: SITE,
    sources: [{ title: 'RightAIChoice', url: SITE }],
    freshness: 0.2,
    novelty: 0.4,
    strategicFit: 0.55,
  })

  return out.sort((a, b) => b.score - a.score)
}
