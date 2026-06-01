import type { ScrapeResult, ScrapedPost } from './types'

// Phase 9 S1b (2026-06-01): Product Hunt via the free GraphQL API v2
// (developer token in PRODUCTHUNT_TOKEN). We resolve the product, then pull
// its reviews (rating + sentiment + body) — strong signal for launches and
// newer tools where Reddit/HN are thin. Returns [] gracefully without a token.

const GQL = 'https://api.producthunt.com/v2/api/graphql'

// PH's schema doesn't support a cheap free-text product search on `posts`, so we
// resolve by the tool's slug via the `post(slug:)` field.
const BY_SLUG = `query BySlug($slug: String!) {
  post(slug: $slug) {
    name tagline votesCount reviewsRating url
    reviews(first: 15) { edges { node { rating sentiment body user { name } } } }
  }
}`

type Review = { rating?: number; sentiment?: string; body?: string; user?: { name?: string } }
type Post = {
  name?: string
  tagline?: string
  votesCount?: number
  reviewsRating?: number
  url?: string
  reviews?: { edges?: { node?: Review }[] }
}

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

async function call(token: string, query: string, variables: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(GQL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`PH ${res.status}`)
  return res.json()
}

/**
 * Scrape Product Hunt reviews for a tool (resolved by slug). Never throws.
 * Returns [] when PRODUCTHUNT_TOKEN is absent.
 */
export async function scrapeProductHunt(toolName: string): Promise<ScrapeResult> {
  const token = process.env.PRODUCTHUNT_TOKEN
  if (!token) return { source: 'producthunt', posts: [], scrapedAt: new Date().toISOString() }

  try {
    const json = (await call(token, BY_SLUG, { slug: slugify(toolName) })) as {
      data?: { post?: Post }
      errors?: unknown
    }
    const post = json.data?.post
    if (!post) return { source: 'producthunt', posts: [], scrapedAt: new Date().toISOString() }

    const posts: ScrapedPost[] = []
    // The product card itself: tagline + aggregate rating.
    posts.push({
      source: 'producthunt',
      title: `${post.name ?? toolName}${post.reviewsRating ? ` (${post.reviewsRating}★ on PH)` : ''}`,
      body: `${post.tagline ?? ''} — ${post.votesCount ?? 0} upvotes`.slice(0, 400),
      score: post.votesCount,
      url: post.url,
    })
    for (const edge of post.reviews?.edges ?? []) {
      const r = edge.node
      const body = (r?.body ?? '').trim()
      if (body.length < 20) continue
      posts.push({
        source: 'producthunt',
        title: `${post.name ?? toolName} review${r?.rating ? ` (${r.rating}★)` : ''}`,
        body: body.slice(0, 1500),
        author: r?.user?.name,
        score: r?.rating,
        sentiment: r?.sentiment?.toLowerCase(),
        url: post.url,
      })
    }

    return { source: 'producthunt', posts, scrapedAt: new Date().toISOString() }
  } catch (err) {
    return {
      source: 'producthunt',
      posts: [],
      error: err instanceof Error ? err.message : 'Unknown error',
      scrapedAt: new Date().toISOString(),
    }
  }
}
