import type { ScrapeResult, ScrapedPost } from './types'

// Phase 9 S1b (2026-06-01): YouTube reviews + comments via the free YouTube
// Data API v3 (key in YOUTUBE_API_KEY). We find the top "<tool> review"
// videos, then pull their top comments — genuine user opinion + the video
// titles themselves ("X vs Y", "X honest review"). High signal across all tool
// categories. Returns [] gracefully when no key is set.

const API = 'https://www.googleapis.com/youtube/v3'

type SearchItem = { id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string; publishedAt?: string } }
type CommentItem = {
  snippet?: {
    topLevelComment?: { snippet?: { textOriginal?: string; authorDisplayName?: string; likeCount?: number; publishedAt?: string } }
  }
}

async function topVideos(key: string, toolName: string): Promise<SearchItem[]> {
  const url = new URL(`${API}/search`)
  url.searchParams.set('key', key)
  url.searchParams.set('part', 'snippet')
  url.searchParams.set('q', `${toolName} review`)
  url.searchParams.set('type', 'video')
  url.searchParams.set('order', 'relevance')
  url.searchParams.set('maxResults', '5')
  url.searchParams.set('relevanceLanguage', 'en')
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`yt search ${res.status}`)
  const json = (await res.json()) as { items?: SearchItem[] }
  return json.items ?? []
}

async function topComments(key: string, videoId: string): Promise<CommentItem[]> {
  const url = new URL(`${API}/commentThreads`)
  url.searchParams.set('key', key)
  url.searchParams.set('part', 'snippet')
  url.searchParams.set('videoId', videoId)
  url.searchParams.set('order', 'relevance')
  url.searchParams.set('maxResults', '8')
  url.searchParams.set('textFormat', 'plainText')
  const res = await fetch(url.toString())
  if (!res.ok) return [] // comments disabled / quota — skip this video
  const json = (await res.json()) as { items?: CommentItem[] }
  return json.items ?? []
}

/**
 * Scrape YouTube for review videos + their top comments about a tool.
 * Never throws. Returns [] when YOUTUBE_API_KEY is absent.
 */
export async function scrapeYouTube(toolName: string): Promise<ScrapeResult> {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) return { source: 'youtube', posts: [], scrapedAt: new Date().toISOString() }

  try {
    const videos = await topVideos(key, toolName)
    const posts: ScrapedPost[] = []

    // Each video title is itself signal (e.g. "Notion AI honest review 2026").
    for (const v of videos) {
      if (v.snippet?.title) {
        posts.push({
          source: 'youtube',
          title: v.snippet.title,
          body: `Video: ${v.snippet.title} — ${v.snippet.channelTitle ?? ''}`.slice(0, 400),
          author: v.snippet.channelTitle,
          date: v.snippet.publishedAt,
          url: v.id?.videoId ? `https://youtube.com/watch?v=${v.id.videoId}` : undefined,
        })
      }
    }

    // Pull comments from the top 3 videos in parallel.
    const commentBatches = await Promise.all(
      videos
        .slice(0, 3)
        .filter((v) => v.id?.videoId)
        .map((v) => topComments(key, v.id!.videoId!).then((c) => ({ v, c }))),
    )
    for (const { v, c } of commentBatches) {
      for (const item of c) {
        const s = item.snippet?.topLevelComment?.snippet
        const text = s?.textOriginal ?? ''
        if (text.length < 30) continue
        posts.push({
          source: 'youtube',
          title: v.snippet?.title ?? '',
          body: text.slice(0, 1500),
          author: s?.authorDisplayName,
          date: s?.publishedAt,
          score: s?.likeCount,
          url: v.id?.videoId ? `https://youtube.com/watch?v=${v.id.videoId}` : undefined,
        })
      }
    }

    return { source: 'youtube', posts: posts.slice(0, 30), scrapedAt: new Date().toISOString() }
  } catch (err) {
    return {
      source: 'youtube',
      posts: [],
      error: err instanceof Error ? err.message : 'Unknown error',
      scrapedAt: new Date().toISOString(),
    }
  }
}
