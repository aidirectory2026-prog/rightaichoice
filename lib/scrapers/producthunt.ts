import type { ScrapeResult, ScrapedPost } from './types'

// Phase 9 S1b (2026-06-01): Product Hunt via the free GraphQL API v2
// (developer token in PRODUCTHUNT_TOKEN). We resolve the product, then pull
// its reviews (rating + sentiment + body) — strong signal for launches and
// newer tools where Reddit/HN are thin. Returns [] gracefully without a token.

const GQL = 'https://api.producthunt.com/v2/api/graphql'

// PH's schema doesn't support a cheap free-text product search on `posts`, so we
// resolve by the tool's slug via the `post(slug:)` field.
// Fable-5 review (2026-06-13): the original query requested `reviews(...)`,
// a field that DOESN'T EXIST on Post — every call returned a GraphQL error,
// `data.post` came back undefined, and the scraper silently yielded 0 posts
// since launch. Post exposes `comments` (real user voices on the launch) plus
// the aggregate reviewsRating/reviewsCount — use those.
const BY_SLUG = `query BySlug($slug: String!) {
  post(slug: $slug) {
    name tagline votesCount reviewsRating reviewsCount url
    comments(first: 15, order: VOTES_COUNT) { edges { node { body votesCount user { name } } } }
  }
}`

type PhComment = { body?: string; votesCount?: number; user?: { name?: string } }
type Post = {
  name?: string
  tagline?: string
  votesCount?: number
  reviewsRating?: number
  reviewsCount?: number
  url?: string
  comments?: { edges?: { node?: PhComment }[] }
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
    // The product card itself: tagline + aggregate rating + review count.
    posts.push({
      source: 'producthunt',
      title: `${post.name ?? toolName}${post.reviewsRating ? ` (${post.reviewsRating}★ from ${post.reviewsCount ?? '?'} PH reviews)` : ''}`,
      body: `${post.tagline ?? ''} — ${post.votesCount ?? 0} upvotes`.slice(0, 400),
      score: post.votesCount,
      url: post.url,
    })
    for (const edge of post.comments?.edges ?? []) {
      const c = edge.node
      const body = (c?.body ?? '').trim()
      if (body.length < 20) continue
      posts.push({
        source: 'producthunt',
        title: `${post.name ?? toolName} launch comment`,
        body: body.slice(0, 1500),
        author: c?.user?.name,
        score: c?.votesCount,
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
