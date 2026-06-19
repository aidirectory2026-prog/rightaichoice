import { ImageResponse } from 'next/og'
import { TOOL_COUNT_DISPLAY } from '@/lib/copy/tool-count'

// Dept D (fable 5 review) — site-wide default OG image. The root metadata
// declared `summary_large_image` but no image existed anywhere, so every
// share rendered as a bare text link. Nested routes inherit this unless they
// define their own opengraph-image (e.g. /best/[slug]).

export const runtime = 'edge'
export const alt = 'RightAIChoice — the best AI tools for your goal, matched on fit not search rank'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
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
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: -1 }}>RightAIChoice</div>
        </div>
        <div style={{ marginTop: 48, fontSize: 72, fontWeight: 800, letterSpacing: -2, lineHeight: 1.1 }}>
          Find the best AI tools for what you&apos;re building
        </div>
        <div style={{ marginTop: 24, fontSize: 32, color: '#a1a1aa' }}>
          Matched to your goal, not search rank · {TOOL_COUNT_DISPLAY} tools · real pricing
        </div>
      </div>
    ),
    size,
  )
}
