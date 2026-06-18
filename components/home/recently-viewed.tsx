'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Clock } from 'lucide-react'

const COOKIE_NAME = 'rac_recent'

type RecentTool = { id: string; name: string; slug: string; tagline: string | null; logo_url: string | null }

/**
 * Phase 6.4 → Cowork QA: client island. Reads the `rac_recent` cookie that
 * <RecordRecentView> sets (client-side, not httpOnly), then fetches the matching
 * tool cards from /api/tools/recently-viewed and renders a compact rail. Renders
 * null when there's nothing to show.
 *
 * Why client-side now: the previous server component read cookies(), which forced
 * the WHOLE homepage to render dynamically (no edge cache, ~1.1s TTFB). As a
 * client island the page stays statically cached and the rail hydrates here.
 */
export function RecentlyViewed({ limit = 5, excludeSlug }: { limit?: number; excludeSlug?: string }) {
  const [tools, setTools] = useState<RecentTool[]>([])

  useEffect(() => {
    let active = true
    let slugs: string[] = []
    try {
      const raw = document.cookie
        .split('; ')
        .find((c) => c.startsWith(`${COOKIE_NAME}=`))
        ?.split('=')[1]
      if (raw) {
        const parsed = JSON.parse(decodeURIComponent(raw))
        if (Array.isArray(parsed)) {
          slugs = parsed
            .filter((s): s is string => typeof s === 'string')
            .filter((s) => s !== excludeSlug)
            .slice(0, limit)
        }
      }
    } catch {
      slugs = []
    }
    if (slugs.length === 0) return

    fetch(`/api/tools/recently-viewed?slugs=${encodeURIComponent(slugs.join(','))}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d && Array.isArray(d.tools)) setTools(d.tools)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [limit, excludeSlug])

  if (tools.length === 0) return null

  return (
    <section className="border-t border-zinc-900/50 bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-zinc-300 flex items-center gap-2">
            <Clock className="h-4 w-4 text-zinc-500" />
            Recently viewed
          </h2>
          <Link href="/tools" className="text-xs text-zinc-500 hover:text-white transition-colors">
            Browse all →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {tools.map((tool) => (
            <Link
              key={tool.id}
              href={`/tools/${tool.slug}`}
              className="group rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 transition-colors hover:border-zinc-700 hover:bg-zinc-900/70"
            >
              <div className="flex items-center gap-2">
                {tool.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tool.logo_url}
                    alt=""
                    className="h-7 w-7 shrink-0 rounded-md bg-zinc-800 object-contain"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-7 w-7 shrink-0 rounded-md bg-zinc-800" />
                )}
                <span className="truncate text-sm font-medium text-white group-hover:text-emerald-300 transition-colors">
                  {tool.name}
                </span>
              </div>
              {tool.tagline && (
                <p className="mt-2 line-clamp-2 text-xs text-zinc-500 leading-snug">{tool.tagline}</p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
