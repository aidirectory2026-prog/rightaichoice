import Link from 'next/link'
import { Star, ArrowRight, Sparkles } from 'lucide-react'
import { pricingLabel, pricingColor } from '@/lib/utils'
import type { RecommendedTool } from '@/lib/data/recommendations'

type Props = {
  tool: RecommendedTool
  rank: number
}

export function RecommendedToolCard({ tool, rank }: Props) {
  return (
    <div className="relative flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-700 transition-colors">
      {/* Rank badge */}
      <div className="absolute -top-3 -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white shadow">
        {rank}
      </div>

      {/* Tool header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-base font-bold text-emerald-400">
          {tool.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-white">{tool.name}</span>
            <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium ${pricingColor(tool.pricing)}`}>
              {pricingLabel(tool.pricing)}
            </span>
            {tool.rating > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-zinc-500">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {tool.rating.toFixed(1)}
                <span className="text-zinc-600">({tool.reviewCount})</span>
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-zinc-400 line-clamp-1">{tool.tagline}</p>
        </div>
      </div>

      {/* AI reasoning */}
      {tool.reason && (
        <div className="flex items-start gap-2 rounded-lg bg-emerald-950/40 border border-emerald-900/50 px-3 py-2.5">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
          <p className="text-xs leading-relaxed text-emerald-300/80">{tool.reason}</p>
        </div>
      )}

      {/* CTA */}
      <Link
        href={`/tools/${tool.slug}`}
        className="mt-auto flex items-center justify-center gap-1.5 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
      >
        View Tool
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}
