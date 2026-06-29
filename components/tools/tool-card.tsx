import Link from 'next/link'
import { Star, ExternalLink } from 'lucide-react'
import { pricingLabel, pricingColor } from '@/lib/utils'
import { AddToCompareButton } from '@/components/compare/add-to-compare-button'
import { ViabilityBadge } from '@/components/tools/viability-badge'
import { ToolLogo } from '@/components/tools/tool-logo'
import { VisitWebsiteButton } from '@/components/tools/visit-website-button'

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
  // BUG-41: the card root is a <div>, NOT a <Link>. The old <Link> wrapped the
  // Compare button (a <button>) — nested interactive elements are invalid HTML
  // and made a Compare click also navigate the card. Now the title is the link
  // (stretched via after:absolute to keep the whole card clickable), and every
  // interactive control lives in a footer at z-10 above that stretched link.
  return (
    <div className="rai-lift group relative flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-700 hover:bg-zinc-900">
      {tool.is_sponsored && (
        <span className="absolute top-3 right-3 z-10 text-xs font-medium text-zinc-500 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded">
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
            <Link href={`/tools/${tool.slug}`} className="after:absolute after:inset-0">
              {tool.name}
            </Link>
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500 line-clamp-2 leading-relaxed">
            {tool.tagline}
          </p>
        </div>
      </div>

      {/* Footer: Pricing + Compare + Try + Rating. relative z-10 so these
          controls sit ABOVE the title's stretched click target. */}
      <div className="relative z-10 mt-4 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            className={`inline-flex shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${pricingColor(tool.pricing_type)}`}
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
          {tool.website_url && (
            <VisitWebsiteButton
              slug={tool.slug}
              toolId={tool.id}
              source="tool_card"
              label="Try"
              icon={<ExternalLink className="h-3 w-3" />}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-800/60 bg-emerald-950/30 px-2 py-0.5 text-xs font-medium text-emerald-400 hover:bg-emerald-900/40 transition-colors"
            />
          )}
        </div>

        {tool.avg_rating > 0 && (
          <div className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-zinc-500">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="text-zinc-300">{tool.avg_rating.toFixed(1)}</span>
            <span>({tool.review_count})</span>
          </div>
        )}
      </div>
    </div>
  )
}
