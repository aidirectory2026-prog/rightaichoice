import { fetchHTML, fetchPageText } from './scrape'

export interface RawFaqData {
  source: string
  content: string
}

export async function gatherFaqSources(toolName: string): Promise<RawFaqData[]> {
  const results: RawFaqData[] = []

  const sources = await Promise.allSettled([
    fetchFromReddit(toolName),
    fetchFromProductHunt(toolName),
    fetchFromG2(toolName),
  ])

  for (const result of sources) {
    if (result.status === 'fulfilled' && result.value.length > 0) {
      results.push(...result.value)
    }
  }

  return results
}

async function fetchFromReddit(toolName: string): Promise<RawFaqData[]> {
  const results: RawFaqData[] = []
  const query = encodeURIComponent(`${toolName} AI tool`)

  try {
    const url = `https://www.reddit.com/search.json?q=${query}&sort=relevance&limit=10&type=link`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'RightAIChoice/1.0 (research bot)',
      },
    })

    if (!res.ok) throw new Error(`Reddit HTTP ${res.status}`)
    const data = await res.json()

    for (const post of data?.data?.children || []) {
      const { title, selftext, num_comments } = post.data
      if (num_comments > 2 && selftext) {
        results.push({
          source: 'reddit',
          content: `${title}\n${selftext.slice(0, 1000)}`,
        })
      }
    }
  } catch (e) {
    console.error('Reddit fetch failed:', e)
  }

  return results.slice(0, 5)
}

async function fetchFromProductHunt(toolName: string): Promise<RawFaqData[]> {
  const results: RawFaqData[] = []

  try {
    const query = encodeURIComponent(toolName)
    const text = await fetchPageText(`https://www.producthunt.com/search?q=${query}`, 10000)
    if (text.length > 100) {
      results.push({
        source: 'producthunt',
        content: text.slice(0, 2000),
      })
    }
  } catch (e) {
    console.error('ProductHunt fetch failed:', e)
  }

  return results
}

async function fetchFromG2(toolName: string): Promise<RawFaqData[]> {
  const results: RawFaqData[] = []

  try {
    const query = encodeURIComponent(toolName)
    const text = await fetchPageText(`https://www.g2.com/search?utf8=%E2%9C%93&query=${query}`, 10000)
    if (text.length > 100) {
      results.push({
        source: 'g2',
        content: text.slice(0, 2000),
      })
    }
  } catch (e) {
    console.error('G2 fetch failed:', e)
  }

  return results
}
