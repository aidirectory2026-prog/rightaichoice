'use client'

// Phase 14 — a reusable multi-select pill group backed by a single URL param
// as a comma-separated list (e.g. ?pricing=free,paid or ?country=IN,US). Toggling
// a pill updates the URL via router.replace (same pattern as the FilterBar), so
// the server re-renders filtered. Parse the value with a simple
// (sp[param] ?? '').split(',').filter(Boolean) on the server, or via
// parseAdminFilters for the global dimensions.

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export function MultiSelectFilter({
  label,
  param,
  options,
  className = '',
}: {
  label: string
  param: string
  options: { value: string; label?: string }[]
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const selected = new Set(
    (params.get(param) ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  )

  function toggle(value: string) {
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    const sp = new URLSearchParams(params.toString())
    if (next.size) sp.set(param, [...next].join(','))
    else sp.delete(param)
    const qs = sp.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => {
          const on = selected.has(o.value)
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              aria-pressed={on}
              className={`rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
                on
                  ? 'border-emerald-700 bg-emerald-950/50 text-emerald-300'
                  : 'border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              {o.label ?? o.value}
            </button>
          )
        })}
      </div>
    </div>
  )
}
