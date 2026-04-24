'use client'

import { Scale, Check } from 'lucide-react'
import { useCompare, type CompareItem } from '@/components/providers/compare-provider'
import { analytics } from '@/lib/analytics'

export function AddToCompareButton({
  tool,
  size = 'sm',
}: {
  tool: CompareItem
  size?: 'sm' | 'md'
}) {
  const { add, remove, isInCompare, isFull, items } = useCompare()
  const active = isInCompare(tool.id)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault() // prevent navigation when inside a Link
    e.stopPropagation()
    if (active) {
      remove(tool.id)
      analytics.compareToolRemoved(tool.slug ?? tool.id, Math.max(items.length - 1, 0))
    } else {
      add(tool)
      analytics.compareToolAdded(tool.slug ?? tool.id, items.length + 1)
    }
  }

  if (!active && isFull) return null // hide when tray is full and this tool isn't selected

  const base =
    size === 'sm'
      ? 'min-h-[36px] px-2.5 text-xs gap-1 rounded-md'
      : 'min-h-[40px] px-3 text-xs gap-1.5 rounded-lg'

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center font-medium transition-colors ${base} ${
        active
          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 hover:bg-emerald-900'
          : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white hover:border-zinc-600'
      }`}
    >
      {active ? (
        <>
          <Check className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
          Comparing
        </>
      ) : (
        <>
          <Scale className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
          Compare
        </>
      )}
    </button>
  )
}
