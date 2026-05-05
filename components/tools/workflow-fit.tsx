import { Briefcase } from 'lucide-react'

// Phase 3 (2026-05-05): "Real-world workflow fit" — 2-3 short scenarios
// per tool ("If you're a solo creator on Substack and want to migrate,
// this is what changes"). Sourced from tools.workflow_scenarios jsonb.

type WorkflowScenario = {
  persona?: string
  scenario?: string
  outcome?: string
}

export function WorkflowFit({
  toolName,
  scenarios,
}: {
  toolName: string
  scenarios: WorkflowScenario[] | null | undefined
}) {
  const items = (scenarios ?? []).filter((s) => s && (s.persona || s.scenario))
  if (items.length === 0) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[WorkflowFit] no data for ${toolName} — Phase 4 backfill will populate.`)
    }
    return null
  }
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-emerald-400" />
        Real-world workflow fit
      </h2>
      <p className="text-xs text-zinc-500 mb-4">
        Concrete scenarios for the personas {toolName} actually fits — and what changes day-one when you adopt it.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {items.slice(0, 3).map((s, i) => (
          <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
            {s.persona && (
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-400 mb-1.5">
                {s.persona}
              </div>
            )}
            {s.scenario && (
              <p className="text-sm text-zinc-300 leading-relaxed mb-2">{s.scenario}</p>
            )}
            {s.outcome && (
              <p className="text-xs text-zinc-500 leading-relaxed border-t border-zinc-800 pt-2">
                <span className="font-medium text-zinc-400">Outcome:</span> {s.outcome}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
