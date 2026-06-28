// Phase 13 D2.2b — curated, FREE digital-PR targets for our data angles.
//
// These are where original AI-tool data earns coverage + editorial links at $0:
// AI newsletters (tips/submissions), inbound journalist-query platforms (HARO-style),
// and high-signal communities (data posts). The operator does the actual send/post;
// the engine just drafts the right pitch for each target's method + beat.

export type PrMethod = 'newsletter_tip' | 'inbound_query' | 'community_post' | 'cold_email'

export type PrTarget = {
  key: string
  name: string
  outlet: string
  method: PrMethod
  url: string // where to submit / pitch / post
  beat: string // what they cover (used to match angles)
  notes?: string
}

export const PR_TARGETS: PrTarget[] = [
  // — AI newsletters (submit a tip / "what we're reading") —
  { key: 'bens-bites', name: "Ben's Bites", outlet: 'Ben\'s Bites', method: 'newsletter_tip', url: 'https://news.bensbites.com/', beat: 'AI tools, launches, AI news', notes: 'Large AI newsletter; data + tool angles fit.' },
  { key: 'tldr-ai', name: 'TLDR AI', outlet: 'TLDR AI', method: 'newsletter_tip', url: 'https://tldr.tech/ai', beat: 'AI/ML news for builders', notes: 'Submit via their tip/contact form.' },
  { key: 'the-rundown', name: 'The Rundown AI', outlet: 'The Rundown', method: 'newsletter_tip', url: 'https://www.therundown.ai/', beat: 'AI news + tools for a broad audience' },
  { key: 'the-neuron', name: 'The Neuron', outlet: 'The Neuron', method: 'newsletter_tip', url: 'https://www.theneurondaily.com/', beat: 'AI tools + practical use' },
  { key: 'superhuman-ai', name: 'Superhuman AI', outlet: 'Superhuman', method: 'newsletter_tip', url: 'https://www.superhuman.ai/', beat: 'AI productivity for professionals' },
  { key: 'ai-breakfast', name: 'AI Breakfast', outlet: 'AI Breakfast', method: 'newsletter_tip', url: 'https://aibreakfast.beehiiv.com/', beat: 'AI news + research, data-friendly' },
  { key: 'last-week-in-ai', name: 'Last Week in AI', outlet: 'Last Week in AI', method: 'newsletter_tip', url: 'https://lastweekin.ai/', beat: 'weekly AI roundup; good for data/trend angles' },

  // — Inbound journalist-query platforms (answer queries → earn quotes/links) —
  { key: 'connectively', name: 'Connectively (ex-HARO)', outlet: 'various journalists', method: 'inbound_query', url: 'https://connectively.us/', beat: 'journalists requesting expert sources on AI/tech', notes: 'Answer AI-tool queries daily; each landed quote = a high-DA editorial link.' },
  { key: 'qwoted', name: 'Qwoted', outlet: 'various journalists', method: 'inbound_query', url: 'https://www.qwoted.com/', beat: 'reporter requests, tech/AI/SaaS' },
  { key: 'featured', name: 'Featured', outlet: 'various publishers', method: 'inbound_query', url: 'https://featured.com/', beat: 'expert Q&A published on high-DA sites' },
  { key: 'help-b2b-writer', name: 'Help a B2B Writer', outlet: 'B2B writers', method: 'inbound_query', url: 'https://helpab2bwriter.com/', beat: 'B2B/SaaS writer source requests' },

  // — High-signal communities (post the DATA, not a promo) —
  { key: 'hn', name: 'Hacker News', outlet: 'Hacker News', method: 'community_post', url: 'https://news.ycombinator.com/submit', beat: 'devs/founders; data + Show HN', notes: 'Lead with the data/finding, not the product. Big traffic + links if it lands.' },
  { key: 'reddit-artificial', name: 'r/artificial', outlet: 'Reddit', method: 'community_post', url: 'https://www.reddit.com/r/artificial/', beat: 'AI community; data posts' },
  { key: 'reddit-saas', name: 'r/SaaS', outlet: 'Reddit', method: 'community_post', url: 'https://www.reddit.com/r/SaaS/', beat: 'founders; pricing/market data' },
  { key: 'reddit-sideproject', name: 'r/SideProject', outlet: 'Reddit', method: 'community_post', url: 'https://www.reddit.com/r/SideProject/', beat: 'builders; tool discovery' },
  { key: 'indiehackers-post', name: 'Indie Hackers (post)', outlet: 'Indie Hackers', method: 'community_post', url: 'https://www.indiehackers.com/', beat: 'founders; data + build story' },
]

export function getPrTarget(key: string): PrTarget | undefined {
  return PR_TARGETS.find((t) => t.key === key)
}
