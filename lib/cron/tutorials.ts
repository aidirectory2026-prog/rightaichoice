import { SupabaseClient } from '@supabase/supabase-js'
import { fetchHTML } from './scrape'

interface Tutorial {
  title: string
  youtube_url: string
  channel: string
  video_id: string
}

export async function discoverTutorials(
  toolName: string
): Promise<Tutorial[]> {
  const query = encodeURIComponent(`${toolName} tutorial`)
  const url = `https://www.youtube.com/results?search_query=${query}`

  try {
    const html = await fetchHTML(url, 15000)
    const tutorials: Tutorial[] = []

    // Extract video data from YouTube's initial data JSON
    const dataMatch = html.match(/var ytInitialData\s*=\s*({.*?});/)
    if (dataMatch) {
      try {
        const data = JSON.parse(dataMatch[1])
        const contents =
          data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
            ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || []

        for (const item of contents) {
          const video = item?.videoRenderer
          if (!video) continue

          const videoId = video.videoId
          const title = video.title?.runs?.[0]?.text || ''
          const channel = video.ownerText?.runs?.[0]?.text || ''

          if (videoId && title) {
            tutorials.push({
              title,
              youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
              channel,
              video_id: videoId,
            })
          }

          if (tutorials.length >= 6) break
        }
      } catch {
        // Fallback: regex extraction
      }
    }

    // Fallback: regex-based extraction
    if (tutorials.length === 0) {
      const videoMatches = html.matchAll(
        /\/watch\?v=([a-zA-Z0-9_-]{11})/g
      )
      const seen = new Set<string>()
      for (const match of videoMatches) {
        const videoId = match[1]
        if (seen.has(videoId)) continue
        seen.add(videoId)
        tutorials.push({
          title: `${toolName} Tutorial`,
          youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
          channel: '',
          video_id: videoId,
        })
        if (tutorials.length >= 6) break
      }
    }

    return tutorials
  } catch (e) {
    console.error(`Tutorial discovery failed for ${toolName}:`, e)
    return []
  }
}

export async function runTutorialDiscovery(supabase: SupabaseClient) {
  const runId = crypto.randomUUID()

  // Get 30 tools that have no tutorials yet
  const { data: tools } = await supabase
    .from('tools')
    .select('id, name, slug, tutorial_videos')
    .eq('is_published', true)
    .or('tutorial_videos.is.null,tutorial_videos.eq.[]')
    .limit(30)

  if (!tools || tools.length === 0) {
    // All tools have tutorials — refresh oldest ones
    const { data: stale } = await supabase
      .from('tools')
      .select('id, name, slug')
      .eq('is_published', true)
      .order('updated_at', { ascending: true })
      .limit(30)
    if (!stale) return { runId, processed: 0 }
    return processTools(supabase, stale, runId)
  }

  return processTools(supabase, tools, runId)
}

async function processTools(
  supabase: SupabaseClient,
  tools: { id: string; name: string; slug: string }[],
  runId: string
) {
  let processed = 0

  for (const tool of tools) {
    try {
      const tutorials = await discoverTutorials(tool.name)
      if (tutorials.length > 0) {
        await supabase
          .from('tools')
          .update({ tutorial_videos: tutorials })
          .eq('id', tool.id)
        processed++
      }
    } catch (e) {
      console.error(`[tutorials:${runId}] Failed for ${tool.slug}:`, e)
    }
  }

  console.log(`[tutorials:${runId}] Updated ${processed}/${tools.length} tools`)
  return { runId, processed, total: tools.length }
}
