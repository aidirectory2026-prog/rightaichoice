import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { htmlEscape, widgetShell } from '@/lib/embed/widget'

// Phase 7O.4 (2026-05-16): per-tool viability badge embed.
//
// Vendors with high viability scores embed a compact badge on their
// own site that links back to our editorial review. Other tools get
// a neutral "Reviewed by RightAIChoice" badge — still earns a link.
//
// Usage:
//   <iframe src="https://rightaichoice.com/embed/viability-badge/cursor"
//           width="260" height="60" frameborder="0"
//           scrolling="no"></iframe>

export const dynamic = 'force-dynamic'
export const revalidate = 86400

type Params = { slug: string }

export async function GET(
  _req: Request,
  { params }: { params: Promise<Params> },
) {
  const { slug } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tools')
    .select('slug, name, viability_score')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (error || !data) {
    const body = `<div class="rac-badge">RightAIChoice — tool not found</div>`
    return new NextResponse(widgetShell('Viability badge', body), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const tool = data as { slug: string; name: string; viability_score: number | null }
  const score = typeof tool.viability_score === 'number' ? tool.viability_score : null
  const isTopTier = score !== null && score >= 70

  const link = `https://rightaichoice.com/tools/${tool.slug}?utm_source=embed&utm_medium=viability_badge`
  const label = isTopTier
    ? `Top-Viability AI Tool · ${score}/100`
    : `Reviewed by RightAIChoice`
  const checkmark = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M5 13l4 4L19 7" stroke="#6ee7b7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`

  const body = `<a class="rac-badge" href="${link}" target="_blank" rel="noopener" title="See the editorial review on RightAIChoice">
  ${checkmark}
  <span>${htmlEscape(label)}</span>
</a>`

  return new NextResponse(widgetShell(`${tool.name} — viability badge`, body), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
    },
  })
}
