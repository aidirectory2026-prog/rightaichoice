/**
 * Shared JSON-LD structured data builders for all page types.
 * Each function returns a plain object ready for JSON.stringify().
 */

const BASE_URL = 'https://rightaichoice.com'

const PUBLISHER = {
  '@type': 'Organization' as const,
  name: 'RightAIChoice',
  url: BASE_URL,
  logo: {
    '@type': 'ImageObject' as const,
    url: `${BASE_URL}/logo-512.png`,
    width: 512,
    height: 512,
  },
}

// ── Organization (root layout) ─────────────────────────────────────
//
// Phase 7F (2026-05-15): brand-level Organization schema in the global
// layout. Helps Google build the brand entity (knowledge-panel
// eligible once authority builds), and is the canonical
// `@type: Organization` ref that other helpers (Article.publisher,
// AggregateRating provider, etc.) point at via PUBLISHER below.

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'RightAIChoice',
    alternateName: [
      'Right AI Choice',
      'RightAI Choice',
      'Right-AI-Choice',
      'rightaichoice.com',
      'rightaichoice',
      'RAC',
    ],
    url: BASE_URL,
    // Phase 9c (2026-05-17): use PNG for the knowledge-panel logo. Google's
    // Organization-logo schema strongly prefers raster (SVG support is
    // partial). The full ImageObject shape (with dimensions) maximizes the
    // chance of the logo appearing in the SERP brand card. Hosted in
    // /public so /logo-512.png returns 200 (was 404 before this commit —
    // the JSON-LD pointed at /logo.svg which didn't exist on disk).
    logo: {
      '@type': 'ImageObject',
      url: `${BASE_URL}/logo-512.png`,
      width: 512,
      height: 512,
    },
    image: `${BASE_URL}/logo-512.png`,
    // Phase 9 (2026-05-27): tighter decision-engine description to push the
    // positioning into the brand entity itself, not just marketing copy.
    description:
      'RightAIChoice (rightaichoice.com) is the decision engine for picking the right AI stack. RightAIChoice helps founders, builders, and teams choose the exact AI tools for their workflow — backed by sentiment-aggregated user reviews, side-by-side editorial comparisons, and an interactive tool-finder.',
    slogan: 'Pick the right AI stack — backed by data, not opinions.',
    knowsAbout: [
      'AI coding tools',
      'AI image generators',
      'AI writing tools',
      'AI video and audio tools',
      'AI voice and speech tools',
      'AI marketing and SEO tools',
      'AI automation and agents',
      'AI research and education tools',
      'AI productivity tools',
      'AI design and UI tools',
      'AI tool stacks',
      'AI tool comparisons',
    ],
    // Phase 9 (2026-05-27): only verifiable, live profiles. Unclaimed or 404
    // sameAs URLs hurt entity verification more than they help — Google checks
    // these and downgrades the Organization trust score when they don't
    // resolve. github.com/rightaichoice + producthunt.com/@rightaichoice
    // removed until claimed; add them back the same day the handle is live.
    sameAs: [
      'https://x.com/rightaichoice',
      'https://twitter.com/rightaichoice',
      'https://www.linkedin.com/company/rightaichoice',
      'https://github.com/aidirectory2026-prog/rightaichoice',
      'https://www.wikidata.org/wiki/Q139970688',
    ],
    founder: {
      '@type': 'Person',
      name: 'Tanmay Verma',
      url: 'https://www.linkedin.com/in/tanmayverma99',
      sameAs: ['https://www.linkedin.com/in/tanmayverma99'],
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/tools?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    foundingDate: '2026',
  }
}

// ── Service (homepage) ─────────────────────────────────────────────
//
// Phase 9 (2026-05-27): emit Service schema on the homepage to make the
// decision-engine positioning machine-readable. Anchored to the brand
// Organization via `provider` so Google reads it as a first-party offering,
// not a generic page about a service. Pair with the AI Tool Finder / Plan
// surface — both are different framings of the same Service.

export function decisionEngineServiceJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'AI Stack Decision Engine',
    serviceType: 'AI Tool Recommendation',
    provider: {
      '@type': 'Organization',
      name: 'RightAIChoice',
      url: BASE_URL,
    },
    areaServed: 'Worldwide',
    description:
      'Tell us your goal, persona, and budget. Get a complete recommended AI stack — tools, costs, tradeoffs, and alternatives for every stage of your workflow. Independent, editorial, free to use.',
    audience: {
      '@type': 'Audience',
      audienceType: [
        'Founders',
        'Builders',
        'Product teams',
        'Marketing teams',
        'Content creators',
        'Developers',
      ],
    },
    url: BASE_URL,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
  }
}

// ── Person: founder (root layout) ──────────────────────────────────
//
// Phase 9 (2026-05-27): emit a standalone Person entity for the founder,
// linked to the Organization via `worksFor`. Two-entity binding (Org +
// Person) gives Google a verifiable real human to anchor the brand to —
// the single strongest entity-recognition signal for an early-stage site
// that doesn't have a Wikipedia page yet. Both ends of the link
// (Organization.founder + Person.worksFor) are intentional — Google reads
// both directions when building the knowledge graph.

export function founderPersonJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Tanmay Verma',
    jobTitle: 'Founder',
    url: 'https://www.linkedin.com/in/tanmayverma99',
    sameAs: ['https://www.linkedin.com/in/tanmayverma99'],
    worksFor: {
      '@type': 'Organization',
      name: 'RightAIChoice',
      url: BASE_URL,
    },
  }
}

// ── WebSite (root layout) ──────────────────────────────────────────

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'RightAIChoice',
    // Phase 9 (2026-05-27): WebSite alternateName mirrors the Organization
    // variants so Google's query parser stops autocorrecting "rightaichoice"
    // → "right choice" on the brand SERP.
    alternateName: [
      'Right AI Choice',
      'RightAI Choice',
      'rightaichoice.com',
      'rightaichoice',
      'RAC',
    ],
    url: BASE_URL,
    description:
      'RightAIChoice is the decision engine for AI tools. Tell us your goal. Get the exact AI tool stack with costs, tradeoffs, and alternatives.',
    publisher: PUBLISHER,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/tools?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

// ── Dataset (AEO / GEO) ────────────────────────────────────────────
//
// Phase 9 AEO (doc 08): position the catalog as a citable, structured
// dataset of AI tools. Generative engines (and Google Dataset Search)
// preferentially cite recognized data sources — this declares RAC as
// one, links the machine-readable distribution (llms-full.txt), and
// references the Wikidata entity for cross-verification. No hardcoded
// counts (avoids staleness); freshness is conveyed per-page elsewhere.

export function datasetJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    '@id': `${BASE_URL}/#dataset`,
    name: 'RightAIChoice — AI Tools Directory & Comparison Dataset',
    description:
      'A curated, continuously-updated dataset of AI tools across every major category — each entry with pricing, user-sentiment ratings, key features, underlying models, alternatives, a viability score, and side-by-side editorial comparisons. Maintained by RightAIChoice, the decision engine for picking the right AI stack.',
    url: BASE_URL,
    sameAs: 'https://www.wikidata.org/wiki/Q139970688',
    keywords: [
      'AI tools',
      'AI software directory',
      'AI tool comparison',
      'best AI tools',
      'AI tool pricing',
      'AI tool alternatives',
      'AI stack',
      'generative AI tools',
    ],
    creator: PUBLISHER,
    publisher: PUBLISHER,
    isAccessibleForFree: true,
    license: `${BASE_URL}/terms`,
    temporalCoverage: '2026/..',
    variableMeasured: [
      'pricing',
      'user rating',
      'category',
      'key features',
      'underlying AI models',
      'alternatives',
      'viability score',
    ],
    includedInDataCatalog: {
      '@type': 'DataCatalog',
      name: 'RightAIChoice',
      url: BASE_URL,
    },
    distribution: {
      '@type': 'DataDownload',
      encodingFormat: 'text/plain',
      contentUrl: `${BASE_URL}/llms-full.txt`,
    },
  }
}

// ── BreadcrumbList ─────────────────────────────────────────────────

type Crumb = { name: string; url: string }

export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url.startsWith('http') ? c.url : `${BASE_URL}${c.url}`,
    })),
  }
}

// ── ItemList (best-of pages, leaderboards) ─────────────────────────

type ListItem = { name: string; url: string; image?: string }

export function itemListJsonLd(
  name: string,
  description: string,
  url: string,
  items: ListItem[],
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    description,
    url: url.startsWith('http') ? url : `${BASE_URL}${url}`,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      url: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`,
      ...(item.image && { image: item.image }),
    })),
  }
}

// ── FAQPage ────────────────────────────────────────────────────────

type FaqEntry = { question: string; answer: string }

export function faqPageJsonLd(faqs: FaqEntry[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: sanitize(f.question),
      acceptedAnswer: {
        '@type': 'Answer',
        text: sanitize(f.answer),
      },
    })),
  }
}

// ── HowTo (stack pages) ───────────────────────────────────────────

type HowToStep = { name: string; text: string; url?: string }

export function howToJsonLd(
  name: string,
  description: string,
  url: string,
  steps: HowToStep[],
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    url: url.startsWith('http') ? url : `${BASE_URL}${url}`,
    step: steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
      ...(s.url && {
        url: s.url.startsWith('http') ? s.url : `${BASE_URL}${s.url}`,
      }),
    })),
  }
}

// ── Comparison: ItemList of SoftwareApplications ──────────────────
// Phase 7 Step 59 (BUG-021): structured data for /compare?tools=A,B and
// /compare/<slug>. Emits an ItemList where each item is an inline
// SoftwareApplication, optionally with aggregateRating when reviews exist.
// Caller is responsible for breadcrumbs separately (use breadcrumbJsonLd).

type ComparisonTool = {
  slug: string
  name: string
  tagline?: string | null
  description?: string | null
  logo_url?: string | null
  avg_rating?: number | null
  review_count?: number | null
  pricing_type?: string | null
}

export function comparisonJsonLd(tools: ComparisonTool[], url: string) {
  const canonicalUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`
  const names = tools.map((t) => t.name)

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${names.join(' vs ')} — AI Tool Comparison`,
    description: `Side-by-side comparison of ${names.join(', ')}.`,
    url: canonicalUrl,
    numberOfItems: tools.length,
    itemListElement: tools.map((tool, i) => {
      const ratingValue =
        typeof tool.avg_rating === 'number' && Number.isFinite(tool.avg_rating)
          ? tool.avg_rating
          : null
      const reviewCount =
        typeof tool.review_count === 'number' && tool.review_count > 0
          ? tool.review_count
          : 0

      const item: Record<string, unknown> = {
        '@type': 'SoftwareApplication',
        name: tool.name,
        url: `${BASE_URL}/tools/${tool.slug}`,
        applicationCategory: 'AI tool',
        ...(tool.logo_url && { image: tool.logo_url }),
        ...(tool.tagline && { description: tool.tagline }),
        ...(!tool.tagline && tool.description && { description: tool.description }),
      }

      if (ratingValue !== null && reviewCount > 0) {
        item.aggregateRating = {
          '@type': 'AggregateRating',
          ratingValue: ratingValue.toFixed(1),
          reviewCount,
          bestRating: '5',
          worstRating: '1',
        }
      }

      // Free / freemium tools advertise price=0 so SERP can show "Free" badge.
      if (tool.pricing_type === 'free' || tool.pricing_type === 'freemium') {
        item.offers = {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        }
      }

      return {
        '@type': 'ListItem',
        position: i + 1,
        item,
      }
    }),
  }
}

// ── Article (editorial compare / blog pages) ──────────────────────

type ArticleInput = {
  headline: string
  description: string
  url: string
  datePublished: string
  dateModified: string
  image?: string
}

export function articleJsonLd(input: ArticleInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    url: input.url.startsWith('http') ? input.url : `${BASE_URL}${input.url}`,
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    author: PUBLISHER,
    publisher: PUBLISHER,
    ...(input.image && { image: input.image }),
  }
}

// ── Helpers ────────────────────────────────────────────────────────

/** Escape HTML entities to prevent script injection in JSON-LD */
function sanitize(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Render one or more JSON-LD objects into a script tag string. */
export function jsonLdScriptProps(data: Record<string, unknown> | Record<string, unknown>[]) {
  return {
    type: 'application/ld+json' as const,
    dangerouslySetInnerHTML: { __html: JSON.stringify(data) },
  }
}
