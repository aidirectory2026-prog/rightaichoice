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
