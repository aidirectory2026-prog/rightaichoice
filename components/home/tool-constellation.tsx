import Link from 'next/link'
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
  Zap,
  Search,
  Briefcase,
  MessageSquare,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'

type CategoryInput = {
  id?: string | number
  slug: string
  name: string
}

type Props = {
  categories: CategoryInput[]
}

// Pattern-match a category slug/name to a lucide icon. Fallback: Sparkles.
function iconFor(cat: CategoryInput): LucideIcon {
  const key = `${cat.slug} ${cat.name}`.toLowerCase()
  if (/(chat|convers|assistant|gpt)/.test(key)) return Bot
  if (/(image|photo|art|picture|midjourney)/.test(key)) return ImageIcon
  if (/(code|dev|program|engineer)/.test(key)) return Code
  if (/(music|audio|sound)/.test(key)) return Music
  if (/(video|film|motion)/.test(key)) return Video
  if (/(writ|copy|content|blog)/.test(key)) return FileText
  if (/(voice|speech|tts|narrat)/.test(key)) return Mic
  if (/(design|logo|brand|ui|ux)/.test(key)) return Palette
  if (/(data|analytic|bi|insight)/.test(key)) return BarChart3
  if (/(productiv|automat|workflow)/.test(key)) return Zap
  if (/(search|research|scrape)/.test(key)) return Search
  if (/(market|sales|business|crm)/.test(key)) return Briefcase
  if (/(social|community)/.test(key)) return MessageSquare
  return Sparkles
}

/**
 * Pure-CSS 3D orbit of AI-category tiles — Step 45 Slice 3.
 * Each tile is a real link to its category page.
 * Center CTA starts the plan flow. Zero JS added.
 */
export function ToolConstellation({ categories }: Props) {
  const tiles = categories.slice(0, 10)
  const count = tiles.length || 1
  return (
    <div className="constellation-stage">
      <div className="constellation-glow" aria-hidden="true" />
      <div className="constellation-ring" aria-hidden="true">
        {tiles.map((cat, i) => {
          const Icon = iconFor(cat)
          return (
            <Link
              key={cat.slug}
              href={`/tools?category=${cat.slug}`}
              className="constellation-node"
              style={
                {
                  ['--i' as string]: i,
                  ['--n' as string]: count,
                } as React.CSSProperties
              }
              aria-label={`Browse ${cat.name} tools`}
            >
              <div className="constellation-node-inner">
                <Icon className="constellation-icon" strokeWidth={1.75} />
                <span className="constellation-label">{cat.name}</span>
              </div>
            </Link>
          )
        })}
      </div>
      <Link href="/plan" className="constellation-cta">
        <span>Start your stack</span>
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
