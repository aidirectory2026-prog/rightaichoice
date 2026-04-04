import { fetchHTML } from './scrape'

export interface DiscoveredTool {
  name: string
  url: string
  description: string
  source: string
}

// Discover AI tools from multiple sources
export async function discoverTools(): Promise<DiscoveredTool[]> {
  const results: DiscoveredTool[] = []

  const sources = await Promise.allSettled([
    discoverFromProductHunt(),
    discoverFromGitHubTrending(),
    discoverFromAIAggregators(),
  ])

  for (const result of sources) {
    if (result.status === 'fulfilled') {
      results.push(...result.value)
    } else {
      console.error('Source discovery failed:', result.reason)
    }
  }

  return results
}

async function discoverFromProductHunt(): Promise<DiscoveredTool[]> {
  const tools: DiscoveredTool[] = []
  try {
    const html = await fetchHTML('https://www.producthunt.com/topics/artificial-intelligence', 15000)
    // Extract tool names and URLs from the listing
    const matches = html.matchAll(
      /<a[^>]*href="\/posts\/([^"]+)"[^>]*>[\s\S]*?<h3[^>]*>(.*?)<\/h3>[\s\S]*?<p[^>]*>(.*?)<\/p>/gi
    )
    for (const match of matches) {
      const slug = match[1]
      const name = match[2].replace(/<[^>]+>/g, '').trim()
      const description = match[3].replace(/<[^>]+>/g, '').trim()
      if (name && description) {
        tools.push({
          name,
          url: `https://www.producthunt.com/posts/${slug}`,
          description,
          source: 'producthunt',
        })
      }
    }
  } catch (e) {
    console.error('ProductHunt discovery failed:', e)
  }
  return tools.slice(0, 80)
}

async function discoverFromGitHubTrending(): Promise<DiscoveredTool[]> {
  const tools: DiscoveredTool[] = []
  try {
    const html = await fetchHTML('https://github.com/trending?since=daily&spoken_language_code=en', 15000)
    // Extract repo info from trending page
    const repoMatches = html.matchAll(
      /<h2[^>]*class="[^"]*lh-condensed[^"]*"[^>]*>[\s\S]*?<a[^>]*href="\/([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<p[^>]*class="[^"]*col-9[^"]*"[^>]*>([\s\S]*?)<\/p>/gi
    )
    for (const match of repoMatches) {
      const repoPath = match[1].trim()
      const description = match[3].replace(/<[^>]+>/g, '').trim().toLowerCase()
      // Only include AI-related repos
      const aiKeywords = ['ai', 'llm', 'machine learning', 'deep learning', 'neural', 'gpt', 'transformer', 'diffusion', 'agent', 'chatbot', 'nlp', 'computer vision', 'generative']
      if (aiKeywords.some(kw => description.includes(kw))) {
        const name = repoPath.split('/')[1] || repoPath
        tools.push({
          name,
          url: `https://github.com/${repoPath}`,
          description,
          source: 'github_trending',
        })
      }
    }
  } catch (e) {
    console.error('GitHub trending discovery failed:', e)
  }
  return tools.slice(0, 60)
}

async function discoverFromAIAggregators(): Promise<DiscoveredTool[]> {
  const tools: DiscoveredTool[] = []
  const aggregatorUrls = [
    'https://theresanaiforthat.com/new/',
    'https://www.futurepedia.io/ai-tools?sort=newest',
  ]

  for (const url of aggregatorUrls) {
    try {
      const html = await fetchHTML(url, 15000)
      // Generic extraction: find tool cards with names and descriptions
      const cardMatches = html.matchAll(
        /<(?:h[23]|a)[^>]*class="[^"]*(?:tool|card|item)[^"]*"[^>]*>([\s\S]*?)<\/(?:h[23]|a)>/gi
      )
      for (const match of cardMatches) {
        const text = match[1].replace(/<[^>]+>/g, '').trim()
        if (text.length > 5 && text.length < 200) {
          tools.push({
            name: text.split(/[:\-–]/)[0].trim(),
            url,
            description: text,
            source: 'aggregator',
          })
        }
      }
    } catch (e) {
      console.error(`Aggregator ${url} failed:`, e)
    }
  }
  return tools.slice(0, 60)
}
