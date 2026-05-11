/**
 * Phase 6.5 (2026-05-12): shimmer placeholder that matches ToolCard
 * shape so wrapping a `<Suspense>` around a tool grid doesn't cause a
 * layout shift when the real cards arrive. Kept dimensions and spacing
 * in sync with components/tools/tool-card.tsx so the skeleton "becomes"
 * the card without a jolt.
 */
export function ToolCardSkeleton() {
  return (
    <div
      className="block rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 animate-pulse"
      aria-hidden="true"
    >
      {/* Header: logo + name + tagline */}
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 shrink-0 rounded-lg bg-zinc-800" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3.5 w-2/3 rounded bg-zinc-800" />
          <div className="h-3 w-full rounded bg-zinc-800/70" />
          <div className="h-3 w-4/5 rounded bg-zinc-800/70" />
        </div>
      </div>

      {/* Footer: pricing + viability + rating */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-5 w-14 rounded-md bg-zinc-800" />
          <div className="h-5 w-12 rounded-md bg-zinc-800" />
        </div>
        <div className="h-3 w-10 rounded bg-zinc-800" />
      </div>
    </div>
  )
}

/**
 * Phase 6.5 (2026-05-12): grid of N ToolCardSkeletons in the same
 * responsive layout used by ToolResults / category grid / saved page.
 * Defaults to 12 placeholders — covers the typical first-fold viewport
 * across every breakpoint without overflowing.
 */
export function ToolGridSkeleton({
  count = 12,
  cols = 'tools', // 'tools' = 1/2/3/4 cols, 'category' = 1/2/3 cols
}: {
  count?: number
  cols?: 'tools' | 'category'
}) {
  const gridClass =
    cols === 'category'
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
      : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
  return (
    <div className={gridClass}>
      {Array.from({ length: count }).map((_, i) => (
        <ToolCardSkeleton key={i} />
      ))}
    </div>
  )
}
