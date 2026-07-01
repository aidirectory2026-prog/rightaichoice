import type { ScrapeResult, ScrapedPost } from './types'

// Fable-5 review (2026-06-13): GitHub signals via the official REST API —
// free; GITHUB_TOKEN (already configured) raises the rate limit to 5k/hr.
// For open-source tools this is ground truth: star count = adoption proof,
// the most-discussed issues = the community's loudest real complaints and
// requests. Mismatch guard: we only attach a repo whose name closely matches
// the tool name — wrong-repo data is worse than no data.

const API = 'https://api.github.com'

type Repo = {
  full_name?: string
  name?: string
  stargazers_count?: number
  open_issues_count?: number
  description?: string
  html_url?: string
  archived?: boolean
}

type Issue = {
  title?: string
  body?: string | null
  comments?: number
  html_url?: string
  created_at?: string
  reactions?: { total_count?: number }
  pull_request?: unknown
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    'User-Agent': 'RightAIChoice/1.0 (rightaichoice.com)',
    Accept: 'application/vnd.github+json',
  }
  const token = process.env.GITHUB_REPO_TOKEN || process.env.GITHUB_TOKEN
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

function nameMatches(toolName: string, repo: Repo): boolean {
  const tool = toolName.toLowerCase().replace(/[^a-z0-9]+/g, '')
  const name = (repo.name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '')
  if (!tool || !name) return false
  // Near-exact only: 'langchain' matches 'langchain'/'langchainjs', but
  // 'cursor' must NOT match 'cursorrules' (ecosystem repo, wrong star count
  // attached to the product). Allow ≤2 extra chars either way.
  if (name === tool) return true
  if (name.includes(tool) && name.length - tool.length <= 2) return true
  if (tool.includes(name) && tool.length - name.length <= 2) return true
  return false
}

/**
 * Lean stars-only probe for the ingest traction gate. ONE search call (no issues
 * fetch) to stay under the 30/min authenticated search rate limit across a batch.
 * Resolves the repo by strict name match and returns its star count.
 *
 * `ok` reflects whether GitHub actually answered: false on a network error or a
 * rate-limit/5xx (so the gate treats it as "couldn't check", not "no repo").
 * A 200 with no matching repo is ok:true, stars:0 — a real "no popular repo"
 * signal (fine for closed-source tools; they lean on the other sources).
 */
export async function probeGitHubStars(toolName: string): Promise<{ stars: number; ok: boolean }> {
  try {
    const q = encodeURIComponent(`"${toolName}" in:name`)
    let h = headers()
    let res = await fetch(`${API}/search/repositories?q=${q}&sort=stars&order=desc&per_page=5`, { headers: h })
    if (res.status === 401) {
      h = { 'User-Agent': 'RightAIChoice/1.0 (rightaichoice.com)', Accept: 'application/vnd.github+json' }
      res = await fetch(`${API}/search/repositories?q=${q}&sort=stars&order=desc&per_page=5`, { headers: h })
    }
    if (!res.ok) return { stars: 0, ok: false } // rate-limit / 5xx → couldn't check
    const search = (await res.json()) as { items?: Repo[] }
    const repo = (search.items ?? []).find((r) => !r.archived && nameMatches(toolName, r))
    return { stars: repo?.stargazers_count ?? 0, ok: true }
  } catch {
    return { stars: 0, ok: false }
  }
}

/**
 * GitHub adoption + issue signals for a tool. Resolves the repo by strict-ish
 * name match (most-starred candidate); returns [] for closed-source tools.
 * Never throws.
 */
export async function scrapeGitHub(toolName: string): Promise<ScrapeResult> {
  try {
    const q = encodeURIComponent(`"${toolName}" in:name`)
    let h = headers()
    let res = await fetch(`${API}/search/repositories?q=${q}&sort=stars&order=desc&per_page=5`, { headers: h })
    if (res.status === 401) {
      // Stale/revoked token — fall back to keyless for the whole call chain
      // (60 req/hr is enough for the daily cron) rather than losing the source.
      h = { 'User-Agent': 'RightAIChoice/1.0 (rightaichoice.com)', Accept: 'application/vnd.github+json' }
      res = await fetch(`${API}/search/repositories?q=${q}&sort=stars&order=desc&per_page=5`, { headers: h })
    }
    if (!res.ok) {
      return { source: 'github', posts: [], error: `search ${res.status}`, scrapedAt: new Date().toISOString() }
    }
    const search = (await res.json()) as { items?: Repo[] }
    const repo = (search.items ?? []).find((r) => !r.archived && nameMatches(toolName, r))
    // No close name match → likely closed-source; that's fine, not an error.
    if (!repo?.full_name || (repo.stargazers_count ?? 0) < 100) {
      return { source: 'github', posts: [], scrapedAt: new Date().toISOString() }
    }

    const posts: ScrapedPost[] = [
      {
        source: 'github',
        title: `${repo.full_name} — ${repo.stargazers_count?.toLocaleString()} GitHub stars`,
        body: `${repo.description ?? ''} (${repo.open_issues_count ?? 0} open issues)`.slice(0, 400),
        score: repo.stargazers_count,
        url: repo.html_url,
      },
    ]

    // Most-commented issues = the community's loudest real feedback.
    const issuesRes = await fetch(
      `${API}/repos/${repo.full_name}/issues?sort=comments&direction=desc&state=all&per_page=8`,
      { headers: h },
    )
    if (issuesRes.ok) {
      const issues = (await issuesRes.json()) as Issue[]
      for (const it of issues) {
        if (it.pull_request) continue // PRs aren't opinions
        const body = (it.body ?? '').trim()
        posts.push({
          source: 'github',
          title: `Issue: ${it.title ?? ''} (${it.comments ?? 0} comments)`,
          body: body.slice(0, 1000) || (it.title ?? ''),
          score: (it.comments ?? 0) + (it.reactions?.total_count ?? 0),
          date: it.created_at,
          url: it.html_url,
        })
      }
    }

    return { source: 'github', posts, scrapedAt: new Date().toISOString() }
  } catch (err) {
    return {
      source: 'github',
      posts: [],
      error: err instanceof Error ? err.message : 'Unknown error',
      scrapedAt: new Date().toISOString(),
    }
  }
}
