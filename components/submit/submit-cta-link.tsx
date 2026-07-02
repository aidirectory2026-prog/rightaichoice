'use client'

import Link from 'next/link'
import { analytics } from '@/lib/analytics'

// Phase 14 — tiny tracked entry-point link to /submit for server-rendered
// pages (the /tools catalog header). Kept separate so those pages stay
// server components.
export function SubmitCtaLink({ source }: { source: 'tools_page' }) {
  return (
    <Link
      href="/submit"
      onClick={() => analytics.submitCtaClicked(source)}
      className="text-sm text-zinc-500 hover:text-emerald-400 transition-colors"
    >
      Built an AI tool? Submit it for review →
    </Link>
  )
}
