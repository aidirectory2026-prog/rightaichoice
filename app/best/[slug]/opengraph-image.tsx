import { ImageResponse } from 'next/og'
import { getBestPageBySlug } from '@/lib/data/best-pages'

// Dept D (fable 5 review) — per-guide OG image for /best/[slug]. These pages
// declared summary_large_image with no image (Phase 10 #44 added the card
// fields; the image itself was still missing).

export const runtime = 'edge'
export const alt = 'RightAIChoice best-of guide'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = getBestPageBySlug(slug)
  const title = page?.h1 ?? 'Best AI Tools'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #09090b 0%, #18181b 60%, #064e3b 140%)',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: '#10b981',
              display: 'flex',
            }}
          />
          <div style={{ fontSize: 32, fontWeight: 700 }}>RightAIChoice</div>
        </div>
        <div
          style={{
            marginTop: 48,
            fontSize: title.length > 40 ? 56 : 68,
            fontWeight: 800,
            letterSpacing: -2,
            lineHeight: 1.1,
          }}
        >
          {title}
        </div>
        <div style={{ marginTop: 24, fontSize: 30, color: '#a1a1aa' }}>
          Tested + ranked · updated 2026
        </div>
      </div>
    ),
    size,
  )
}
