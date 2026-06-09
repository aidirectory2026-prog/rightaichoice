// Phase 10 #58 — tool discovery via STABLE JSON APIs.
//
// The old implementation scraped ProductHunt / GitHub-trending / aggregator HTML
// with regexes tied to CSS class names on JS-rendered SPAs. Those break silently
// on any markup change and return 0 while reporting success — which is why the
// discovery queue had dried up to ~1 row. We now use:
//   - ProductHunt GraphQL v2 `posts` feed (PRODUCTHUNT_TOKEN)
//   - GitHub Search API (stable JSON; GITHUB_REPO_TOKEN optional, raises limits)
// Both prefer the tool's REAL website URL (better dedup downstream) and degrade
// gracefully to [] when their token is missing. Per-source yields are logged so
// a silent zero is visible (and the pg_cron pipeline heartbeat alerts on it).

export interface DiscoveredTool {
  name: string
  url: string
  description: string
  source: string
}

export async function discoverTools(): Promise<DiscoveredTool[]> {
  const results: DiscoveredTool[] = []

  const sources = await Promise.allSettled([
    discoverFromProductHunt(),
    discoverFromGitHub(),
  ])

  const labels = ['producthunt', 'github']
  sources.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      console.log(`[discover] ${labels[i]}: ${result.value.length} candidates`)
      if (result.value.length === 0) {
        console.warn(`[discover] ${labels[i]} returned 0 — check token/API shape`)
      }
      results.push(...result.value)
    } else {
      console.error(`[discover] ${labels[i]} failed:`, result.reason)
    }
  })

  return results
}

async function discoverFromProductHunt(): Promise<DiscoveredTool[]> {
  const token = process.env.PRODUCTHUNT_TOKEN
  if (!token) {
    console.warn('[discover] PRODUCTHUNT_TOKEN not set — skipping PH discovery')
    return []
  }
  const query = `query RecentAI($after: DateTime) {
    posts(order: NEWEST, postedAfter: $after, first: 50, topic: "artificial-intelligence") {
      edges { node { name tagline slug website votesCount } }
    }
  }`
  const after = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const res = await fetch('https://api.producthunt.com/v2/api/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query, variables: { after } }),
  })
  if (!res.ok) throw new Error(`ProductHunt GraphQL HTTP ${res.status}`)
  const json = (await res.json()) as {
    data?: { posts?: { edges?: Array<{ node?: { name?: string; tagline?: string; slug?: string; website?: string } }> } }
  }
  const edges = json.data?.posts?.edges ?? []
  const tools: DiscoveredTool[] = []
  for (const e of edges) {
    const n = e.node
    if (!n?.name) continue
    tools.push({
      name: n.name,
      // Prefer the real product website over the PH listing URL so downstream
      // dedup keys on the actual vendor domain, not a shared aggregator host.
      url: n.website || (n.slug ? `https://www.producthunt.com/products/${n.slug}` : 'https://www.producthunt.com'),
      description: n.tagline ?? '',
      source: 'producthunt',
    })
  }
  return tools
}

async function discoverFromGitHub(): Promise<DiscoveredTool[]> {
  // GitHub Search API — recent AI repos by stars. Stable JSON (no HTML scraping).
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const q = encodeURIComponent(`topic:ai created:>${since}`)
  const url = `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=50`
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  const token = process.env.GITHUB_REPO_TOKEN
  if (token) headers.Authorization = `token ${token}`

  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`GitHub Search HTTP ${res.status}`)
  const json = (await res.json()) as {
    items?: Array<{ name?: string; full_name?: string; description?: string; homepage?: string; html_url?: string }>
  }
  const tools: DiscoveredTool[] = []
  for (const it of json.items ?? []) {
    if (!it.full_name) continue
    const desc = (it.description ?? '').trim()
    if (!desc) continue
    tools.push({
      name: it.name || it.full_name,
      url: it.homepage?.startsWith('http') ? it.homepage : it.html_url || `https://github.com/${it.full_name}`,
      description: desc.slice(0, 300),
      source: 'github',
    })
  }
  return tools
}
