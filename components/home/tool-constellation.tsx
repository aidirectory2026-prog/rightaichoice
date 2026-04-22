import {
  Sparkles,
  Bot,
  Image as ImageIcon,
  Code,
  Music,
  Video,
  FileText,
  Mic,
  Palette,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'

type Node = { Icon: LucideIcon; label: string }

const NODES: Node[] = [
  { Icon: Sparkles, label: 'AI' },
  { Icon: Bot, label: 'Chat' },
  { Icon: ImageIcon, label: 'Image' },
  { Icon: Code, label: 'Code' },
  { Icon: Music, label: 'Audio' },
  { Icon: Video, label: 'Video' },
  { Icon: FileText, label: 'Writing' },
  { Icon: Mic, label: 'Voice' },
  { Icon: Palette, label: 'Design' },
  { Icon: BarChart3, label: 'Data' },
]

/**
 * Pure-CSS 3D orbit of AI-category tiles — Step 45 Slice 3.
 * Zero JS added. Honors prefers-reduced-motion via globals.css.
 */
export function ToolConstellation() {
  const count = NODES.length
  return (
    <div className="constellation-stage" aria-hidden="true">
      <div className="constellation-glow" />
      <div className="constellation-ring">
        {NODES.map(({ Icon, label }, i) => (
          <div
            key={label}
            className="constellation-node"
            style={
              {
                ['--i' as string]: i,
                ['--n' as string]: count,
              } as React.CSSProperties
            }
          >
            <div className="constellation-node-inner">
              <Icon className="constellation-icon" strokeWidth={1.75} />
              <span className="constellation-label">{label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
