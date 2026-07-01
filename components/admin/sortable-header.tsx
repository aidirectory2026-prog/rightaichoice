'use client'

// Phase 14 — a clickable column header that drives URL sort state
// (?sort=<key>&dir=asc|desc, or scoped params for multi-list pages). Mirrors the
// FilterBar navigation pattern (router.replace, URL-state only). Drop it inside a
// <th> (or any header cell); parse the state server-side with lib/admin/sort.ts.

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { sortParams, type SortDir } from '@/lib/admin/sort'

export function SortableHeader({
  label,
  sortKey,
  scope = '',
  firstDir = 'desc',
  align = 'left',
  className = '',
}: {
  label: string
  sortKey: string
  scope?: string
  /** Direction applied on the FIRST click of a not-yet-active column. */
  firstDir?: SortDir
  align?: 'left' | 'right' | 'center'
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const { sortKey: sortParam, dirKey: dirParam } = sortParams(scope)

  const isActive = params.get(sortParam) === sortKey
  const activeDir: SortDir = params.get(dirParam) === 'asc' ? 'asc' : 'desc'

  function onClick() {
    const sp = new URLSearchParams(params.toString())
    const nextDir: SortDir = isActive ? (activeDir === 'asc' ? 'desc' : 'asc') : firstDir
    sp.set(sortParam, sortKey)
    sp.set(dirParam, nextDir)
    router.replace(`${pathname}?${sp.toString()}`)
  }

  const justify = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Sort by ${label}${isActive ? (activeDir === 'asc' ? ' (ascending)' : ' (descending)') : ''}`}
      className={`group inline-flex w-full items-center gap-1 ${justify} whitespace-nowrap text-left transition-colors hover:text-zinc-200 ${
        isActive ? 'text-emerald-300' : 'text-zinc-400'
      } ${className}`}
    >
      <span>{label}</span>
      <span className={`text-[10px] ${isActive ? 'text-emerald-400' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
        {isActive ? (activeDir === 'asc' ? '▲' : '▼') : '↕'}
      </span>
    </button>
  )
}
