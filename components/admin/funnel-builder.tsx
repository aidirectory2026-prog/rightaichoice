'use client'

// Phase 14b Wave 3 — ad-hoc funnel builder. Compose ANY funnel from ANY
// events: ordered steps live in ?steps=a,b,c (URL-state, shareable), the
// server recomputes via insights_funnel_users. Presets restore the two
// classic journeys. No query language — add from the event list, reorder
// with arrows, remove with ✕.

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'

export function FunnelBuilder({
  steps,
  eventNames,
  presets,
}: {
  steps: string[]
  eventNames: string[]
  presets: Array<{ label: string; steps: string[] }>
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [draft, setDraft] = useState('')

  function setSteps(next: string[]) {
    const sp = new URLSearchParams(params.toString())
    sp.delete('who') // step list changed → any people-drill is stale
    if (next.length) sp.set('steps', next.join(','))
    else sp.delete('steps')
    const qs = sp.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  function addStep() {
    const v = draft.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (v && !steps.includes(v)) setSteps([...steps, v])
    setDraft('')
  }
  function move(i: number, delta: number) {
    const j = i + delta
    if (j < 0 || j >= steps.length) return
    const next = [...steps]
    ;[next[i], next[j]] = [next[j], next[i]]
    setSteps(next)
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">Build a funnel — ordered steps</span>
        <div className="flex items-center gap-1.5">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setSteps(p.steps)}
              className="rounded border border-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400 hover:border-emerald-700 hover:text-emerald-300"
            >
              {p.label}
            </button>
          ))}
          {steps.length > 0 && (
            <button
              type="button"
              onClick={() => setSteps([])}
              className="rounded border border-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500 hover:text-zinc-300"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <ol className="mb-2 space-y-1">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-2 text-xs">
            <span className="w-5 text-right font-mono text-[10px] text-zinc-600">{i + 1}.</span>
            <span className="flex-1 rounded border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono text-emerald-300">{s}</span>
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-zinc-600 hover:text-zinc-200 disabled:opacity-30" aria-label="Move up">
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === steps.length - 1} className="text-zinc-600 hover:text-zinc-200 disabled:opacity-30" aria-label="Move down">
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => setSteps(steps.filter((x) => x !== s))} className="text-zinc-600 hover:text-rose-300" aria-label="Remove step">
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ol>

      <div className="flex items-center gap-2">
        <Plus className="h-3.5 w-3.5 text-zinc-600" />
        <input
          list="funnel-builder-events"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addStep()
          }}
          placeholder="add a step (event name) ⏎"
          className="w-72 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-700 focus:outline-none"
        />
        <datalist id="funnel-builder-events">
          {eventNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </div>
    </div>
  )
}
