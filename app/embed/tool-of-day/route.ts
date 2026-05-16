import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { htmlEscape, widgetShell } from '@/lib/embed/widget'

// Phase 7O.4 (2026-05-16): "Tool of the Day" embed widget.
//
// Other sites embed via:
//   <iframe src="https://rightaichoice.com/embed/tool-of-day"
//           width="380" height="240" frameborder="0"></iframe>
//
// Rotation: deterministic by date (UTC) over high-viability published
// tools — every embedder sees the same tool on day X. Cached with
// stale-while-revalidate so we serve from edge between rotations.

export const dynamic = 'force-dynamic'
export const revalidate = 3600

function pickByDate<T>(pool: T[], date: Date): T | null {
  if (pool.length === 0) return null
  // Days since 2026-01-01 in UTC. Stable across server restarts +
  // independent of TZ — every visitor sees the same tool on day N.
  const epoch = Date.UTC(2026, 0, 1)
  const daysSince = Math.floor((date.getTime() - epoch) / 86_400_000)
  const idx = ((daysSince % pool.length) + pool.length) % pool.length
  return pool[idx]
}

type ToolRow = {
  slug: string
  name: string
  tagline: string | null
  logo_url: string | null
  viability_score: number | null
}

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tools')
    .select('slug, name, tagline, logo_url, viability_score')
    .eq('is_published', true)
    .gte('viability_score', 70)
    .order('viability_score', { ascending: false })
    .limit(200)

  const pool = (error ? [] : (data as ToolRow[]) ?? []).filter((t) => !!t.slug && !!t.name)
  const tool = pickByDate(pool, new Date())

  let body: string
  if (!tool) {
    body = `<div class="rac-widget">
  <div class="rac-pill">Tool of the day</div>
  <div class="rac-title">RightAIChoice</div>
  <div class="rac-sub">Independent picks across 1,200+ AI tools.</div>
  <a class="rac-cta" href="https://rightaichoice.com/tools?utm_source=embed&utm_medium=tool_of_day" target="_blank" rel="noopener">Browse tools →</a>
</div>`
  } else {
    const tagline = htmlEscape((tool.tagline ?? '').slice(0, 110))
    const link = `https://rightaichoice.com/tools/${tool.slug}?utm_source=embed&utm_medium=tool_of_day`
    body = `<a class="rac-widget" href="${link}" target="_blank" rel="noopener">
  <div class="rac-pill">★ Tool of the day</div>
  <div class="rac-title">${htmlEscape(tool.name)}</div>
  <div class="rac-sub">${tagline}</div>
  <div class="rac-cta">See the editorial review →</div>
  <div class="rac-foot">
    <span>Picked by editors</span>
    <a href="https://rightaichoice.com?utm_source=embed&utm_medium=tool_of_day" target="_blank" rel="noopener">RightAIChoice</a>
  </div>
</a>`
  }

  return new NextResponse(widgetShell(`Tool of the Day — RightAIChoice`, body), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
