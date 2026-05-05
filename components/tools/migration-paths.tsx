import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'

// Phase 3 (2026-05-05): "Migration path in / out" — pure decision-friction
// reducer. Tells a switcher exactly how to bring data in from common
// predecessors and how to get it back out again to common successors.
// Sourced from tools.migration_in / tools.migration_out (text[]).

export function MigrationPaths({
  toolName,
  migrationIn,
  migrationOut,
}: {
  toolName: string
  migrationIn: string[] | null | undefined
  migrationOut: string[] | null | undefined
}) {
  const ins = (migrationIn ?? []).filter(Boolean)
  const outs = (migrationOut ?? []).filter(Boolean)
  if (ins.length === 0 && outs.length === 0) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[MigrationPaths] no data for ${toolName} — Phase 4 backfill will populate.`)
    }
    return null
  }
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h2 className="text-lg font-semibold text-white mb-1">Switching to or from {toolName}</h2>
      <p className="text-xs text-zinc-500 mb-4">
        How to bring data in from common predecessors and how to get it back out — written for the switcher, not the buyer.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ins.length > 0 && (
          <div className="rounded-lg border border-emerald-900/30 bg-emerald-950/10 p-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mb-2">
              <ArrowDownToLine className="h-3.5 w-3.5" /> Migrating in
            </div>
            <ul className="space-y-1.5">
              {ins.map((item, i) => (
                <li key={i} className="text-sm text-zinc-300 leading-relaxed flex gap-1.5">
                  <span className="text-emerald-500 mt-1">→</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {outs.length > 0 && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 mb-2">
              <ArrowUpFromLine className="h-3.5 w-3.5" /> Migrating out
            </div>
            <ul className="space-y-1.5">
              {outs.map((item, i) => (
                <li key={i} className="text-sm text-zinc-300 leading-relaxed flex gap-1.5">
                  <span className="text-zinc-500 mt-1">↗</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
