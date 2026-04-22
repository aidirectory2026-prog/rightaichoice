import Link from 'next/link'
import { Star } from 'lucide-react'
import { pricingLabel, pricingColor } from '@/lib/utils'
import { AddToCompareButton } from '@/components/compare/add-to-compare-button'
import { ViabilityBadge } from '@/components/tools/viability-badge'
import { ToolLogo } from '@/components/tools/tool-logo'

type ToolCardData = {
  id: string
  name: string
  slug: string
  tagline: string
  logo_url: string | null
  website_url?: string | null
  pricing_type: string
  avg_rating: number
  review_count: number
  is_sponsored?: boolean
  viability_score?: number | null
}

export function ToolCard({ tool }: { tool: ToolCardData }) {
  return (
    <Link
      href={`/tools/${tool.slug}`}
      className="rai-lift group relative flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-700 hover:bg-zinc-900"
    >
      {tool.is_sponsored && (
        <span className="absolute top-3 right-3 text-[10px] font-medium text-zinc-500 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded">
          Sponsored
        </span>
      )}
      {/* Header: Logo + Name */}
      <div className="flex items-start gap-3.5">
        <ToolLogo
          tool={tool}
          size={44}
          className="flex shrink-0 items-center justify-center rounded-lg bg-zinc-800 overflow-hidden"
          fallbackClassName="text-lg font-bold text-zinc-500"
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors truncate">
            {tool.name}
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500 line-clamp-2 leading-relaxed">
            {tool.tagline}
          </p>
        </div>
      </div>

      {/* Footer: Pricing + Compare + Rating */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${pricingColor(tool.pricing_type)}`}
          >
            {pricingLabel(tool.pricing_type)}
          </span>
          <ViabilityBadge score={tool.viability_score ?? null} size="sm" />
          <AddToCompareButton
            tool={{
              id: tool.id,
              slug: tool.slug,
              name: tool.name,
              logo_url: tool.logo_url,
            }}
          />
        </div>

        {tool.avg_rating > 0 ? (
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="text-zinc-300">{tool.avg_rating.toFixed(1)}</span>
            <span>({tool.review_count})</span>
          </div>
        ) : (
          <span className="text-[11px] text-zinc-600">No reviews yet</span>
        )}
      </div>
    </Link>
  )
}
