import Link from 'next/link'
import { Star, ExternalLink } from 'lucide-react'
import { pricingLabel, pricingColor } from '@/lib/utils'

type Props = {
  slug: string
  name: string
  tagline: string
  pricing: string
  rating: number
  reviewCount: number
}

export function ToolCardInline({ slug, name, tagline, pricing, rating, reviewCount }: Props) {
  return (
    <Link
      href={`/tools/${slug}`}
      className="group flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 hover:border-zinc-700 hover:bg-zinc-900 transition-all duration-200"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800">
        <span className="text-sm font-bold text-zinc-500">{name.charAt(0)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
            {name}
          </span>
          <ExternalLink className="h-3 w-3 text-zinc-600" />
        </div>
        <p className="mt-0.5 text-xs text-zinc-500 line-clamp-1">{tagline}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <span
            className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium ${pricingColor(pricing)}`}
          >
            {pricingLabel(pricing)}
          </span>
          {rating > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-zinc-500">
              <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
              {rating.toFixed(1)} ({reviewCount})
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
