// Phase 13 D2.1 — the submission kit.
//
// Most directories are CAPTCHA-gated human forms (and their ToS forbids
// bot submission), so the engine's job is to make the operator's manual
// submission trivial: produce the exact, CONSISTENT copy to paste — same
// name, same descriptions, same category everywhere. Consistency across
// sources is precisely what builds the entity/consensus signal LLMs cite.
//
// Brand values are the canonical ones from lib/seo/json-ld.ts; kept here as
// the single source for outreach/listing copy.

export const BRAND = {
  name: 'RightAIChoice',
  altNames: ['Right AI Choice', 'rightaichoice.com', 'RAC'],
  url: 'https://rightaichoice.com',
  logo: 'https://rightaichoice.com/logo-512.png',
  tagline: 'Pick the right AI stack — backed by data, not opinions.',
  // Multiple lengths because directories cap fields differently.
  shortDesc: 'Independent AI-tool decision engine — comparisons, viability scores, real-user sentiment, and a goal-based finder across 2,000+ continuously-verified AI tools.',
  mediumDesc:
    'RightAIChoice is an independent directory and decision engine for AI tools. We help founders, builders, and teams choose the exact AI tools for their workflow — backed by sentiment-aggregated user reviews, side-by-side editorial comparisons, viability scores, and an interactive tool-finder. Uniquely, every tool is re-verified on a continuous automated cycle, so pricing and features stay current.',
  longDesc:
    "RightAIChoice (rightaichoice.com) is the decision engine for picking the right AI stack. We index 2,000+ AI tools across 15 categories and keep every tool's data current via a continuous automated verification cycle — so what you read reflects today's pricing, features, and momentum, not a one-time scrape. We don't sell tools and aren't paid by vendors: recommendations are grounded in aggregated user sentiment, hands-on editorial review, head-to-head comparisons that end in a clear verdict, viability scores that flag tools at risk of shutting down, and an interactive planner that turns a plain-language goal into a complete tool stack with costs and tradeoffs.",
  categorySuggestions: ['AI Tools', 'Software Discovery', 'Developer Tools', 'Productivity', 'SaaS Directory'],
  founder: 'Tanmay Verma',
  socials: {
    twitter: 'https://twitter.com/rightaichoice',
    linkedin: 'https://www.linkedin.com/in/tanmayverma99',
    github: 'https://github.com/aidirectory2026-prog/rightaichoice',
    wikidata: 'https://www.wikidata.org/wiki/Q139970688',
  },
}

/** Plain-text kit the operator pastes into a directory's listing form. */
export function buildSubmissionKit(): string {
  const b = BRAND
  return [
    `NAME: ${b.name}`,
    `URL:  ${b.url}`,
    `LOGO: ${b.logo}`,
    `TAGLINE (≤60): ${b.tagline}`,
    ``,
    `SHORT DESCRIPTION (≤160):`,
    b.shortDesc,
    ``,
    `MEDIUM DESCRIPTION (≤400):`,
    b.mediumDesc,
    ``,
    `LONG DESCRIPTION:`,
    b.longDesc,
    ``,
    `CATEGORIES: ${b.categorySuggestions.join(', ')}`,
    `FOUNDER: ${b.founder}`,
    `SOCIALS: ${Object.values(b.socials).join(' · ')}`,
    `PRICING: Free`,
    ``,
    `CONSISTENCY RULE: paste these values verbatim everywhere — identical name +`,
    `description across directories is what builds the entity/consensus signal LLMs cite.`,
  ].join('\n')
}
