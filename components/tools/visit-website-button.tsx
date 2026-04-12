'use client'

import { ExternalLink } from 'lucide-react'
import { analytics } from '@/lib/analytics'

type Props = {
  slug: string
  url: string
  toolId?: string
  source?: string
}

export function VisitWebsiteButton({ slug, url: _url, toolId, source = 'tool_page' }: Props) {
  // Route through the visit endpoint — logs the click + redirects to affiliate_url if set, else website_url
  const href = `/api/tools/${slug}/visit`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => analytics.toolVisitClicked(toolId ?? slug, slug, source)}
      className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
    >
      <ExternalLink className="h-4 w-4" />
      Visit Website
    </a>
  )
}
