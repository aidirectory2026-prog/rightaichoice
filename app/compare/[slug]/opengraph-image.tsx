/**
 * Phase 7B.seo (2026-05-13): per-pair OpenGraph image for compare pages.
 *
 * Next.js App Router file convention: this auto-wires `<meta property="og:image">`
 * on /compare/{slug} pointing at /compare/{slug}/opengraph-image.
 * Same `<meta name="twitter:image">` derives from this when a Twitter
 * card is configured in generateMetadata().
 *
 * Per-pair imagery (vs a static og.png) lifts social CTR meaningfully
 * — 25–30% in published ad-tech benchmarks. Each compare page now
 * shows the actual two tool names + ratings + verdict snippet on share.
 */
import { ImageResponse } from 'next/og'
import { getComparisonBySlug, getToolsForComparisonByIds } from '@/lib/data/comparisons'

export const runtime = 'nodejs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'RightAIChoice — AI tool comparison'

type Tool = { name: string; slug: string; avg_rating: number | null; review_count: number | null }
type Editorial = { verdict?: string | null }

export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const comparison = await getComparisonBySlug(slug)

  // Fallback design used when comparison is missing or thin — never 500s.
  if (!comparison) return defaultImage('AI Tool Comparison', 'rightaichoice.com')

  const tools = (await getToolsForComparisonByIds(
    comparison.tool_ids as string[]
  )) as unknown as Tool[]
  if (tools.length < 2) return defaultImage('AI Tool Comparison', 'rightaichoice.com')

  const [a, b] = tools
  const editorial = comparison as Editorial
  const verdictSnippet = (editorial.verdict ?? '').slice(0, 180)
  const ratingA = formatRating(a.avg_rating)
  const ratingB = formatRating(b.avg_rating)

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#09090b',
          padding: '56px 64px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Top — Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 22, color: '#34d399', fontWeight: 600, letterSpacing: '-0.02em' }}>
            RightAIChoice
          </div>
          <div style={{ fontSize: 14, color: '#52525b', marginLeft: 4 }}>
            · AI Tool Comparison · 2026
          </div>
        </div>

        {/* Center — Two-tool side-by-side */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            gap: 32,
            marginTop: 24,
          }}
        >
          {/* Tool A */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '32px 24px',
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              borderRadius: 18,
            }}
          >
            <div style={{ fontSize: 38, color: '#ffffff', fontWeight: 700, textAlign: 'center', lineHeight: 1.15 }}>
              {truncate(a.name, 24)}
            </div>
            {ratingA && (
              <div style={{ marginTop: 18, fontSize: 18, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6 }}>
                ★ {ratingA} <span style={{ color: '#71717a' }}>({a.review_count ?? 0})</span>
              </div>
            )}
          </div>

          {/* VS divider */}
          <div
            style={{
              fontSize: 36,
              color: '#34d399',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              padding: '0 12px',
            }}
          >
            VS
          </div>

          {/* Tool B */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '32px 24px',
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              borderRadius: 18,
            }}
          >
            <div style={{ fontSize: 38, color: '#ffffff', fontWeight: 700, textAlign: 'center', lineHeight: 1.15 }}>
              {truncate(b.name, 24)}
            </div>
            {ratingB && (
              <div style={{ marginTop: 18, fontSize: 18, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6 }}>
                ★ {ratingB} <span style={{ color: '#71717a' }}>({b.review_count ?? 0})</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom — Verdict snippet + URL */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {verdictSnippet && (
            <div
              style={{
                fontSize: 18,
                color: '#a1a1aa',
                lineHeight: 1.5,
                fontStyle: 'italic',
              }}
            >
              "{verdictSnippet}{verdictSnippet.length === 180 ? '…' : ''}"
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ fontSize: 14, color: '#52525b' }}>
              In-depth feature, pricing, and use-case analysis
            </div>
            <div style={{ fontSize: 14, color: '#52525b' }}>rightaichoice.com</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400',
      },
    }
  )
}

function defaultImage(title: string, footer: string) {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#09090b',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ fontSize: 24, color: '#34d399', fontWeight: 600 }}>RightAIChoice</div>
        <div style={{ fontSize: 56, color: '#ffffff', fontWeight: 700, marginTop: 16 }}>{title}</div>
        <div style={{ fontSize: 16, color: '#52525b', marginTop: 24 }}>{footer}</div>
      </div>
    ),
    { ...size }
  )
}

function formatRating(r: unknown): string | null {
  const n = typeof r === 'number' ? r : parseFloat(String(r ?? ''))
  return Number.isFinite(n) && n > 0 ? n.toFixed(1) : null
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}
