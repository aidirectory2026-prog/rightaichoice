/**
 * Shared JSON-LD structured data builders for all page types.
 * Each function returns a plain object ready for JSON.stringify().
 */

const BASE_URL = 'https://rightaichoice.com'

const PUBLISHER = {
  '@type': 'Organization' as const,
  name: 'RightAIChoice',
  url: BASE_URL,
}

// ── WebSite (root layout) ──────────────────────────────────────────

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'RightAIChoice',
    url: BASE_URL,
    description:
      'Tell us your goal. Get the exact AI tool stack with costs, tradeoffs, and alternatives. The decision engine for AI tools.',
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
