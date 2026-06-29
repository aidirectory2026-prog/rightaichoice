'use client'

// Phase 12 (2026-06-28): shared filter-chip row used by the blog + stacks (and
// other) listings so every listing's filters look + behave the same. A single
// active value; emerald = active, matching the /tools ToolFilters palette.

export function FilterChips<T extends string>({
  options,
  active,
  onSelect,
  className,
}: {
  options: { value: T; label: string; count?: number }[]
  active: T
  onSelect: (v: T) => void
  className?: string
}) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className ?? ''}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onSelect(o.value)}
          aria-pressed={active === o.value}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            active === o.value
              ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
              : 'border-zinc-700 text-zinc-400 hover:text-white'
          }`}
        >
          {o.label}
          {o.count !== undefined && (
            <span className="ml-1 text-[10px] text-zinc-500">{o.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}
