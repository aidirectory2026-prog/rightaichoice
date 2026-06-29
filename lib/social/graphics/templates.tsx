// Phase 13 Social — branded graphic templates (in-house, $0, no AI-image cost).
//
// Rendered via next/og (Satori). Satori rules to respect: every element with >1
// child needs display:flex; text lives inside elements; only a CSS subset works.
// Brand tokens match app/api/og/stack/route.tsx (dark + emerald + Geist).

import type { Platform } from '../types'

// ── Brand tokens ───────────────────────────────────────────────────────────
const C = {
  bg: '#09090b',
  bgPanel: '#18181b',
  bgPanel2: '#27272a',
  border: '#27272a',
  borderHi: '#3f3f46',
  accent: '#34d399',
  accent2: '#10b981',
  text: '#ffffff',
  muted: '#a1a1aa',
  faint: '#71717a',
} as const

// ── Sizes ──────────────────────────────────────────────────────────────────
export type GraphicSizeName = 'square' | 'portrait' | 'landscape'
export const GRAPHIC_SIZES: Record<GraphicSizeName, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 }, // IG feed
  portrait: { width: 1080, height: 1350 }, // IG portrait (max reach)
  landscape: { width: 1200, height: 675 }, // X / LinkedIn
}
export const PLATFORM_DEFAULT_SIZE: Record<Platform, GraphicSizeName> = {
  instagram: 'square',
  x: 'landscape',
  linkedin: 'landscape',
  reddit: 'landscape',
}

// ── Template names + data shapes ─────────────────────────────────────────────
export type GraphicTemplate = 'stat_card' | 'tool_spotlight' | 'news_roundup' | 'comparison' | 'quote'

export type GraphicData = {
  stat_card: { stat: string; label: string; sublabel?: string; source?: string }
  tool_spotlight: { tool: string; category: string; tagline: string; pricing?: string; rating?: string }
  news_roundup: { headline: string; items: string[]; date?: string }
  comparison: { title: string; left: { name: string; points: string[] }; right: { name: string; points: string[] } }
  quote: { quote: string; attribution?: string }
}

// ── Shared frame (brand header + footer wrapping any template body) ───────────
function Frame({ pad, children }: { pad: number; children: React.ReactNode }) {
  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: C.bg,
        padding: pad,
        fontFamily: 'Geist',
      }}
    >
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: C.accent, display: 'flex' }} />
        <div style={{ fontSize: 24, color: C.accent, fontWeight: 600, letterSpacing: '-0.02em' }}>
          RightAIChoice
        </div>
      </div>
      {/* body */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', paddingTop: 28, paddingBottom: 28 }}>
        {children}
      </div>
      {/* footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', height: 4, width: 80, backgroundColor: C.accent2, borderRadius: 2 }} />
        <div style={{ color: C.faint, fontSize: 18 }}>rightaichoice.com</div>
      </div>
    </div>
  )
}

// ── The five templates ───────────────────────────────────────────────────────
function StatCard(d: GraphicData['stat_card']) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', fontSize: 200, fontWeight: 700, color: C.accent, lineHeight: 1, letterSpacing: '-0.04em' }}>
        {d.stat}
      </div>
      <div style={{ display: 'flex', fontSize: 52, fontWeight: 700, color: C.text, lineHeight: 1.1, maxWidth: 900 }}>
        {d.label}
      </div>
      {d.sublabel ? (
        <div style={{ display: 'flex', fontSize: 30, color: C.muted, lineHeight: 1.3, maxWidth: 880 }}>{d.sublabel}</div>
      ) : null}
      {d.source ? (
        <div style={{ display: 'flex', fontSize: 20, color: C.faint, marginTop: 8 }}>Source: {d.source}</div>
      ) : null}
    </div>
  )
}

function ToolSpotlight(d: GraphicData['tool_spotlight']) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex' }}>
        <div style={{ display: 'flex', fontSize: 22, color: C.bg, backgroundColor: C.accent, fontWeight: 600, padding: '8px 18px', borderRadius: 999 }}>
          {d.category}
        </div>
      </div>
      <div style={{ display: 'flex', fontSize: 84, fontWeight: 700, color: C.text, lineHeight: 1.05, letterSpacing: '-0.03em' }}>
        {d.tool}
      </div>
      <div style={{ display: 'flex', fontSize: 34, color: C.muted, lineHeight: 1.3, maxWidth: 900 }}>{d.tagline}</div>
      <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
        {d.pricing ? (
          <div style={{ display: 'flex', fontSize: 24, color: C.text, backgroundColor: C.bgPanel, border: `1px solid ${C.borderHi}`, padding: '10px 20px', borderRadius: 12 }}>
            {d.pricing}
          </div>
        ) : null}
        {d.rating ? (
          <div style={{ display: 'flex', fontSize: 24, color: C.accent, backgroundColor: C.bgPanel, border: `1px solid ${C.borderHi}`, padding: '10px 20px', borderRadius: 12 }}>
            Rated {d.rating}/5
          </div>
        ) : null}
      </div>
    </div>
  )
}

function NewsRoundup(d: GraphicData['news_roundup']) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {d.date ? <div style={{ display: 'flex', fontSize: 22, color: C.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{d.date}</div> : null}
      <div style={{ display: 'flex', fontSize: 56, fontWeight: 700, color: C.text, lineHeight: 1.1, maxWidth: 920 }}>{d.headline}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
        {d.items.slice(0, 5).map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ display: 'flex', minWidth: 12, width: 12, height: 12, borderRadius: 6, backgroundColor: C.accent, marginTop: 14 }} />
            <div style={{ display: 'flex', fontSize: 30, color: C.muted, lineHeight: 1.3, maxWidth: 900 }}>{item}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ComparisonCol(name: string, points: string[]) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 16, backgroundColor: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 18, padding: 28 }}>
      <div style={{ display: 'flex', fontSize: 40, fontWeight: 700, color: C.accent, lineHeight: 1.1 }}>{name}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {points.slice(0, 4).map((p, i) => (
          <div key={i} style={{ display: 'flex', fontSize: 25, color: C.muted, lineHeight: 1.3 }}>• {p}</div>
        ))}
      </div>
    </div>
  )
}

function Comparison(d: GraphicData['comparison']) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      <div style={{ display: 'flex', fontSize: 50, fontWeight: 700, color: C.text, lineHeight: 1.1, maxWidth: 960 }}>{d.title}</div>
      <div style={{ display: 'flex', gap: 22, alignItems: 'stretch' }}>
        {ComparisonCol(d.left.name, d.left.points)}
        {ComparisonCol(d.right.name, d.right.points)}
      </div>
    </div>
  )
}

function Quote(d: GraphicData['quote']) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'flex', fontSize: 120, color: C.accent, fontWeight: 700, lineHeight: 0.8, height: 70 }}>“</div>
      <div style={{ display: 'flex', fontSize: 58, fontWeight: 700, color: C.text, lineHeight: 1.25, letterSpacing: '-0.02em', maxWidth: 940 }}>
        {d.quote}
      </div>
      {d.attribution ? (
        <div style={{ display: 'flex', fontSize: 28, color: C.muted, marginTop: 6 }}>— {d.attribution}</div>
      ) : null}
    </div>
  )
}

// ── Dispatcher ────────────────────────────────────────────────────────────────
export function renderTemplate<T extends GraphicTemplate>(
  template: T,
  data: GraphicData[T],
  size: GraphicSizeName,
): React.ReactElement {
  const pad = size === 'landscape' ? 56 : 72
  let body: React.ReactNode
  switch (template) {
    case 'stat_card':
      body = StatCard(data as GraphicData['stat_card'])
      break
    case 'tool_spotlight':
      body = ToolSpotlight(data as GraphicData['tool_spotlight'])
      break
    case 'news_roundup':
      body = NewsRoundup(data as GraphicData['news_roundup'])
      break
    case 'comparison':
      body = Comparison(data as GraphicData['comparison'])
      break
    case 'quote':
      body = Quote(data as GraphicData['quote'])
      break
    default:
      body = <div style={{ display: 'flex', color: C.text }}>Unknown template</div>
  }
  return <Frame pad={pad}>{body}</Frame>
}

/** Sample data per template — used by previews + the render-samples script. */
export const SAMPLE_DATA: { [K in GraphicTemplate]: GraphicData[K] } = {
  stat_card: {
    stat: '63%',
    label: 'of AI writing tools we tested cost more than they save on a solo plan',
    sublabel: 'Based on 40 tools benchmarked on real tasks',
    source: 'RightAIChoice 2026 analysis',
  },
  tool_spotlight: {
    tool: 'Claude',
    category: 'AI Assistant',
    tagline: 'Long-context reasoning that holds up across a full codebase or document set.',
    pricing: 'Free tier + $20/mo',
    rating: '4.7',
  },
  news_roundup: {
    headline: "This week in AI tools",
    items: [
      'Two new open-weight models cleared the 1M-context bar',
      'A major image generator dropped its free tier',
      'Pricing shifts hit three popular writing assistants',
    ],
    date: 'Week of June 30, 2026',
  },
  comparison: {
    title: 'ChatGPT vs Claude — for long documents',
    left: { name: 'ChatGPT', points: ['Broad plugin ecosystem', 'Strong image generation', 'Faster short replies'] },
    right: { name: 'Claude', points: ['Larger usable context', 'Steadier long-form reasoning', 'Cleaner code edits'] },
  },
  quote: {
    quote: 'The best AI tool is the one that disappears into your workflow.',
    attribution: 'RightAIChoice',
  },
}
