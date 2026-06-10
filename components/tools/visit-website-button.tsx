'use client'

import { ExternalLink } from 'lucide-react'
import { analytics, getDistinctIdWithFallback } from '@/lib/analytics'

type Props = {
  slug: string
  url: string
  toolId?: string
  source?: string
  /** Override button styling (e.g. the subtle zinc style in the compare
   *  table header). Defaults to the primary emerald CTA. */
  className?: string
  /** Override the button label. */
  label?: string
  /** Optional icon override rendered before the label. */
  icon?: React.ReactNode
}

function buildVisitHref(slug: string, source: string): string {
  try {
    // Dept B — use the fallback-aware id so ?d= is present even when
    // Mixpanel is blocked; the visit endpoint accepts d as same-origin
    // evidence for browsers that send neither Sec-Fetch-Site nor Referer.
    const did = getDistinctIdWithFallback()
    const params = new URLSearchParams({
      ref: typeof window !== 'undefined' ? window.location.pathname : '',
      src: source,
      ...(did ? { d: String(did) } : {}),
    })
    return `/api/tools/${slug}/visit?${params.toString()}`
  } catch {
    return `/api/tools/${slug}/visit?src=${encodeURIComponent(source)}`
  }
}

export function VisitWebsiteButton({
  slug,
  url: _url,
  toolId,
  source = 'tool_page',
  className,
  label = 'Visit Website',
  icon,
}: Props) {
  // Route through the visit endpoint — logs the click + redirects to affiliate_url if set, else website_url
  return (
    <a
      href={buildVisitHref(slug, source)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => analytics.toolVisitClicked(toolId ?? slug, slug, source)}
      className={
        className ??
        'flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors'
      }
    >
      {icon ?? <ExternalLink className="h-4 w-4" />}
      {label}
    </a>
  )
}
