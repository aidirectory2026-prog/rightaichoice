'use client'

// Phase 10.5a.1 (2026-06-12) — ⓘ provenance popover.
//
// Small client component: an ⓘ button that opens an absolutely-positioned
// panel rendering the metric's provenance entry from lib/admin/metric-docs.ts
// (what it counts / how computed / why trusted / caveats). No portal/popover
// dependency — a fixed full-screen click-catcher + absolute panel is enough,
// and the panel content is pure data shared with the Phase 8 Resources guide.

import { useState } from 'react'
import { Info, X } from 'lucide-react'
import { getMetricDoc, type MetricDocKey } from '@/lib/admin/metric-docs'

export function MetricInfo({
  docKey,
  align = 'right',
}: {
  docKey: MetricDocKey
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const doc = getMetricDoc(docKey)

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-label={`About "${doc.title}": what it counts and why it's trustworthy`}
        aria-expanded={open}
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full transition-colors ${
          open ? 'text-emerald-400' : 'text-zinc-600 hover:text-zinc-300'
        }`}
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      {open && (
        <>
          {/* click-catcher so any outside click closes the panel */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="dialog"
            aria-label={`${doc.title} — provenance`}
            className={`absolute top-5 z-50 w-72 sm:w-80 rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-left shadow-xl shadow-black/50 ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="text-xs font-semibold text-white">{doc.title}</div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            <dl className="space-y-2">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500">What this counts</dt>
                <dd className="mt-0.5 text-[11px] leading-relaxed text-zinc-300">{doc.whatItCounts}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-sky-500">How it&apos;s computed</dt>
                <dd className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">{doc.howComputed}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-violet-400">Why it&apos;s trustworthy</dt>
                <dd className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">{doc.whyTrusted}</dd>
              </div>
              {doc.caveats.length > 0 && (
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-amber-500">Caveats</dt>
                  <dd className="mt-0.5">
                    <ul className="list-disc space-y-1 pl-3.5 text-[11px] leading-relaxed text-zinc-500">
                      {doc.caveats.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </>
      )}
    </span>
  )
}
