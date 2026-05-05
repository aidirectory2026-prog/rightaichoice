import Link from 'next/link'
import { Layers3 } from 'lucide-react'
import { ToolLogo } from '@/components/tools/tool-logo'

// Phase 3 (2026-05-05): "Stack-pairing recommendations" — 2-3 tools that
// compose well with this one, each with a one-line *why*. Reuses the
// existing alternatives data (which the tool page already fetches via
// getAlternativeTools) plus a per-pair reason. Internal-link density gain
// for SEO since each pairing links to its own /tools/[slug] page.

type Pairing = {
  id: string
  slug: string
  name: string
  tagline?: string | null
  logo_url?: string | null
  pairing_reason?: string | null   // optional — falls back to tagline if absent
}

export function StackPairings({
  toolName,
  pairings,
}: {
  toolName: string
  pairings: Pairing[] | null | undefined
}) {
  const items = (pairings ?? []).slice(0, 3).filter((p) => p && p.slug && p.name)
  if (items.length === 0) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[StackPairings] no pairings for ${toolName} — Phase 4 backfill will populate.`)
    }
    return null
  }
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
        <Layers3 className="h-5 w-5 text-purple-400" />
        Tools that pair well with {toolName}
      </h2>
      <p className="text-xs text-zinc-500 mb-4">
        Common stack mates teams adopt alongside {toolName}, with the specific reason each pairing earns its keep.
      </p>
      <div className="space-y-2">
        {items.map((p) => (
          <Link
            key={p.id}
            href={`/tools/${p.slug}`}
            className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-950/30 p-3 hover:border-zinc-700 hover:bg-zinc-900/50 transition-colors group"
          >
            <ToolLogo
              tool={{ name: p.name, logo_url: p.logo_url ?? null, website_url: null }}
              size={36}
              className="flex shrink-0 items-center justify-center rounded-lg bg-zinc-800 overflow-hidden"
              fallbackClassName="text-sm font-bold text-zinc-500"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">
                {p.name}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500 leading-relaxed line-clamp-2">
                {p.pairing_reason || p.tagline || 'Common pairing in the same workflow.'}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
