'use client'

import { Scale, Check } from 'lucide-react'
import { useCompare, type CompareItem } from '@/components/providers/compare-provider'

export function AddToCompareButton({
  tool,
  size = 'sm',
}: {
  tool: CompareItem
  size?: 'sm' | 'md'
}) {
  const { add, remove, isInCompare, isFull } = useCompare()
  const active = isInCompare(tool.id)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault() // prevent navigation when inside a Link
    e.stopPropagation()
    if (active) {
      remove(tool.id)
    } else {
      add(tool)
    }
  }

  if (!active && isFull) return null // hide when tray is full and this tool isn't selected

  const base =
    size === 'sm'
      ? 'h-7 px-2 text-[11px] gap-1 rounded-md'
      : 'h-8 px-3 text-xs gap-1.5 rounded-lg'

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
