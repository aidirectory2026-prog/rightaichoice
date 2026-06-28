// Phase 13 D2.2b — newsworthy PR angles derived from our LIVE data.
//
// Journalists and newsletters link to original data, not to "we exist" pitches.
// We turn our continuously-verified catalog into concrete, current statistics —
// each a story angle with a headline, the hard number, supporting detail, and the
// beat it suits. Every figure is computed live, so pitches are always fresh + true.

import { buildStateOfAI, type StateOfAI } from '../geo/state-of-ai'

export const REPORT_URL = 'https://rightaichoice.com/state-of-ai-tools'

export type StoryAngle = {
  key: string
  headline: string // the hook, with the real number
  stat: string // the single citable figure
  detail: string // supporting context for the pitch
  beat: string // which kind of outlet/journalist it suits
}

export async function buildStoryAngles(s?: StateOfAI): Promise<StoryAngle[]> {
  const d = s ?? (await buildStateOfAI())
  const topCat = d.topCategories[0]
  const angles: StoryAngle[] = [
    {
      key: 'freshness',
      headline: `We re-verified ${d.verified7d.toLocaleString()} of ${d.totalPublished.toLocaleString()} AI tools in the last 7 days — here's why most "AI tool lists" are already wrong`,
      stat: `${d.verified7dPct}% of our ${d.totalPublished.toLocaleString()} tracked AI tools were re-verified within 7 days`,
      detail:
        'Most AI directories scrape a tool once and let the data rot. We run a continuous automated verification cycle, so we can speak to how fast the AI-tool landscape actually changes and how stale typical listings get.',
      beat: 'AI / tech journalists, productivity newsletters, data-driven reporters',
    },
    {
      key: 'pricing',
      headline: `${d.freeOrFreemiumPct}% of AI tools are free or freemium — the real pricing breakdown across ${d.totalPublished.toLocaleString()} tools`,
      stat: `${d.freeOrFreemiumPct}% of AI tools are free or freemium`,
      detail:
        `Full split: ${d.pricingMix
          .slice(0, 4)
          .map((p) => `${p.label} ${p.pct}%`)
          .join(', ')}. A clean, citable pricing landscape of the AI-tool market.`,
      beat: 'business/startup press, founder newsletters, "is AI free" explainer pieces',
    },
    {
      key: 'viability',
      headline: `Which AI tools will still exist next year? We scored ${d.viability.scored.toLocaleString()} of them`,
      stat: `Average AI-tool viability score is ${d.viability.avg}/100; ${d.viability.strong.pct}% score "strong," ${d.viability.atRisk.pct}% "at risk"`,
      detail:
        'We score every tool on survival risk (momentum, adoption, wrapper-vs-original). Strong "tool deathwatch" / "don\'t build on a tool that\'s about to die" angle.',
      beat: 'startup/VC press, developer newsletters, risk/trend reporters',
    },
  ]
  if (topCat) {
    angles.push({
      key: 'categories',
      headline: `AI tools are clustering in ${topCat.label} — the category breakdown of ${d.totalPublished.toLocaleString()} tools`,
      stat: `${topCat.label} is the largest AI-tool category (${topCat.count} tools)`,
      detail: `Top categories: ${d.topCategories
        .slice(0, 5)
        .map((c) => `${c.label} (${c.count})`)
        .join(', ')}. Shows where AI-tool building is concentrated.`,
      beat: 'vertical/industry newsletters (marketing, design, dev), trend pieces',
    })
  }
  if (d.topByStars.length) {
    angles.push({
      key: 'opensource',
      headline: `The most-starred open-source AI tools right now (${d.totalStars.toLocaleString()} GitHub stars across our catalog)`,
      stat: `Top open-source AI tool by stars: ${d.topByStars[0].name} (${d.topByStars[0].stars.toLocaleString()}★)`,
      detail: `Leaders: ${d.topByStars
        .slice(0, 5)
        .map((t) => `${t.name} (${t.stars.toLocaleString()}★)`)
        .join(', ')}.`,
      beat: 'developer media, open-source newsletters, GitHub-trend reporters',
    })
  }
  return angles
}
