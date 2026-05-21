// Client component — editable goal row.

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Pencil, X } from 'lucide-react'

export function GoalRow({
  kpiKey,
  displayName,
  description,
  goal,
  current,
  pctOfGoal,
  unit,
}: {
  kpiKey: string
  displayName: string
  description: string | null
  goal: number
  current: number
  pctOfGoal: number
  unit: string
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [newGoal, setNewGoal] = useState(String(goal))
  const [saving, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const onSave = () => {
    setError(null)
    const v = Number(newGoal)
    if (Number.isNaN(v) || v < 0) {
      setError('Must be a number ≥ 0')
      return
    }
    startTransition(async () => {
      const res = await fetch('/api/admin/insights/goals', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kpi_key: kpiKey, goal_value: v }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null
        setError(j?.error ?? 'Save failed')
        return
      }
      setEditing(false)
      router.refresh()
    })
  }

  const colorClass =
    pctOfGoal >= 100 ? 'text-emerald-300 bg-emerald-900/40'
      : pctOfGoal >= 60 ? 'text-amber-300 bg-amber-900/40'
        : 'text-red-300 bg-red-900/40'

  const fmtVal = (v: number) => {
    if (unit === 'percent') return `${v}%`
    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`
    return String(v)
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-zinc-200">{displayName}</div>
          {description && <div className="mt-0.5 text-[10px] text-zinc-500">{description}</div>}
        </div>
        <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-mono ${colorClass}`}>
          {pctOfGoal}%
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Current</div>
          <div className="text-2xl font-semibold text-white">{fmtVal(current)}</div>
        </div>
        <div className="text-xl text-zinc-700">/</div>
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Goal</div>
          {!editing ? (
            <div className="flex items-center gap-2">
              <div className="text-xl text-zinc-300">{fmtVal(goal)}</div>
              <button
                onClick={() => setEditing(true)}
                className="text-zinc-600 hover:text-zinc-300 transition-colors"
                aria-label="Edit goal"
              >
                <Pencil className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="any"
                min="0"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                className="w-20 rounded border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 text-base text-zinc-100"
                autoFocus
              />
              <button
                onClick={onSave}
                disabled={saving}
                className="text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                aria-label="Save"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setEditing(false); setNewGoal(String(goal)); setError(null) }}
                disabled={saving}
                className="text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
                aria-label="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded bg-zinc-950">
        <div
          className={pctOfGoal >= 100 ? 'h-full bg-emerald-700' : pctOfGoal >= 60 ? 'h-full bg-amber-700' : 'h-full bg-red-700'}
          style={{ width: `${Math.min(100, pctOfGoal)}%` }}
        />
      </div>

      {error && <div className="mt-2 text-[10px] text-red-400">{error}</div>}
    </div>
  )
}
