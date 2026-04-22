import Link from 'next/link'
import {
  Sparkles,
  FileText,
  Image as ImageIcon,
  Mic,
  BarChart3,
  Video,
  ChevronDown,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'

type Stage = {
  stage: string
  tool: string
  tint: 'emerald' | 'sky' | 'violet' | 'pink' | 'amber'
  Icon: LucideIcon
}

const STAGES: Stage[] = [
  { stage: 'Research', tool: 'Claude', Icon: Sparkles, tint: 'emerald' },
  { stage: 'Script', tool: 'ChatGPT', Icon: FileText, tint: 'sky' },
  { stage: 'Thumbnails', tool: 'Midjourney', Icon: ImageIcon, tint: 'violet' },
  { stage: 'Voice-over', tool: 'ElevenLabs', Icon: Mic, tint: 'pink' },
  { stage: 'Analytics', tool: 'VidIQ', Icon: BarChart3, tint: 'amber' },
]

/**
 * "Watch a stack build itself" — product demo hero animation.
 * Step 45 Slice 3c. Pure CSS, zero JS, works on mobile.
 */
export function StackAssembly() {
  return (
    <div className="stack-assembly" aria-label="Product demo: assembling an AI tool stack">
      <div className="stack-assembly-prompt" aria-hidden="true">
        <Sparkles className="stack-assembly-prompt-icon h-4 w-4" />
        <span className="stack-assembly-typing">Start a YouTube channel</span>
      </div>

      <ChevronDown className="stack-assembly-arrow h-5 w-5" aria-hidden="true" />

      <div className="stack-assembly-stack" aria-hidden="true">
        {STAGES.map((s, i) => {
          const Icon = s.Icon
          return (
            <div
              key={`${s.stage}-${s.tool}`}
              className={`stack-assembly-card stack-assembly-card-${s.tint}`}
              style={{ ['--i' as string]: i } as React.CSSProperties}
            >
              <div className="stack-assembly-stage">
                Stage {i + 1} · {s.stage}
              </div>
              <div className="stack-assembly-tool">
                <Icon className="stack-assembly-tool-icon h-5 w-5" strokeWidth={1.75} />
                <span>{s.tool}</span>
              </div>
            </div>
          )
        })}
      </div>

      <Link href="/plan" className="stack-assembly-cta">
        <span>Build your own stack</span>
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
