'use client'

// Phase 12 Bug-4.1 (2026-06-27): long-form prose (About, Behind the Verdict)
// used to open the tool page with a wall of 300–800 words. This wraps such a
// block so it shows a clamped 3-line preview with a "Read the full breakdown"
// toggle. The FULL text is always rendered in the DOM (we only line-clamp
// visually) so SEO / GEO answer-engines can still extract it — we never hide
// it behind display:none or conditional rendering.

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

export function CollapsibleProse({
  title,
  text,
  icon,
  footer,
  clampThreshold = 280,
}: {
  title: string
  text: string | null | undefined
  icon?: ReactNode
  footer?: ReactNode
  clampThreshold?: number
}) {
  const [open, setOpen] = useState(false)
  const trimmed = (text ?? '').trim()
  if (!trimmed) return null

  // Only offer the toggle when there's enough prose that clamping helps.
  const longEnough = trimmed.length > clampThreshold

  return (
    <section>
      <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        {icon}
        {title}
      </h2>
      <div className="prose prose-invert prose-zinc prose-sm max-w-none">
        <p
          className={`text-zinc-400 leading-relaxed whitespace-pre-line ${
            !open && longEnough ? 'line-clamp-3' : ''
          }`}
        >
          {trimmed}
        </p>
      </div>
      {longEnough && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          {open ? 'Show less' : 'Read the full breakdown'}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      )}
      {/* footer (e.g. "Last updated") stays visible regardless of clamp state */}
      {open && footer}
    </section>
  )
}
