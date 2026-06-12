'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X, Scale, Trash2 } from 'lucide-react'
import { useCompare } from '@/components/providers/compare-provider'
import { CompareToolSearch } from '@/components/compare/compare-tool-search'
import { ToolLogo } from '@/components/tools/tool-logo'
import { analytics } from '@/lib/analytics'

export function CompareTray() {
  const { items, remove, clear } = useCompare()
  const router = useRouter()
  // Phase 8.g.2 — fire compare_tray_opened once per session when tray
  // first appears (items.length >= 1). Captures "user started a compare
  // intent" funnel step before they hit the actual /compare page.
  const trayOpenFiredRef = useRef(false)

  useEffect(() => {
    if (items.length > 0 && !trayOpenFiredRef.current) {
      trayOpenFiredRef.current = true
      analytics.compareTrayOpened(items.length)
    }
    if (items.length === 0) trayOpenFiredRef.current = false
  }, [items.length])

  if (items.length === 0) return null

  const handleCompare = () => {
    const slugs = items.map((i) => i.slug)
    // Phase 8.g.2 — fire the share_clicked equivalent: user-initiated
    // navigation to the compare page with their selected tools.
    analytics.compareShareClicked(slugs)
    router.push(`/compare?tools=${slugs.join(',')}`)
  }

  // Phase 6.8 (2026-05-12): once 2+ tools are selected, the Compare Now
  // button becomes the natural next step — give it a subtle pulse so
  // users notice without us forcing an auto-navigation.
  const ready = items.length >= 2

  return (
    <div className="rai-compare-tray fixed bottom-0 inset-x-0 z-50 border-t border-zinc-800 bg-zinc-900/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
        {/* Label */}
        <div className="flex items-center gap-2 text-sm text-zinc-400 shrink-0">
          <Scale className="h-4 w-4 text-emerald-400" />
          <span className="hidden sm:inline">Compare</span>
          <span className="text-zinc-600">{items.length} of 3 selected</span>
        </div>

        {/* Tool search — kept OUTSIDE the overflow-x scroll container
            below so its dropdown isn't clipped by the implicit
            overflow-y:hidden the browser applies when overflow-x is
            set. Without this split, typing in the search showed no
            recommendations on screens where the pill row overflowed. */}
        <CompareToolSearch />

        {/* Tool pills (overflow-x scroll for many pills) */}
        <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 shrink-0"
            >
              <ToolLogo
                tool={item}
                size={20}
                className="flex items-center justify-center rounded bg-zinc-700 overflow-hidden"
                fallbackClassName="text-[8px] font-bold text-zinc-400"
              />
              <span className="text-sm text-zinc-300 font-medium">
                {item.name}
              </span>
              <button
                onClick={() => remove(item.id)}
                className="text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              // 10.7c.6 — abandoned compare intent: tray emptied without
              // hitting Compare Now.
              analytics.compareTrayCleared(items.length)
              clear()
            }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
          <button
            onClick={handleCompare}
            disabled={items.length < 2}
            className={`inline-flex items-center justify-center rounded-lg px-4 min-h-[40px] text-sm font-medium text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              ready
                ? 'bg-emerald-600 hover:bg-emerald-500 rai-compare-cta-pulse'
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            Compare Now
          </button>
        </div>
      </div>
    </div>
  )
}
