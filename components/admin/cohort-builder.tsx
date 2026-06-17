'use client'

// Phase 11 — cohort/segment builder. Compose conditions (did / didn't do an
// event, "did A then B", or a user-property filter), combine with All/Any, run
// against insights_cohort, and save/load named cohorts. Mixpanel-lite, but real.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, X, Play, Save, Users, Loader2, Trash2 } from 'lucide-react'

type CondType = 'did_event' | 'not_event' | 'sequence' | 'property'
type Condition = { type: CondType; event?: string; first?: string; then?: string; field?: string; op?: string; value?: string }
type Result = { distinct_id: string; email: string | null; full_name: string | null; events: number; last_seen: string }
type SavedView = { id: string; name: string; payload: { match: string; days: number; conditions: Condition[] } }

const PROPERTY_FIELDS = [
  'email_domain', 'plan_budget_segment', 'plan_team_segment', 'plan_industry_segment', 'plan_skill_segment',
  'searches_count', 'plans_completed_count', 'saves_count', 'tools_visited_count', 'comparisons_count', 'chat_messages_count',
]
const TYPE_LABEL: Record<CondType, string> = {
  did_event: 'Did event', not_event: "Didn't do event", sequence: 'Did A then B', property: 'User property',
}

export function CohortBuilder({ eventNames }: { eventNames: string[] }) {
  const [match, setMatch] = useState<'and' | 'or'>('and')
  const [days, setDays] = useState(30)
  const [conditions, setConditions] = useState<Condition[]>([{ type: 'did_event', event: '' }])
  const [results, setResults] = useState<Result[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState<SavedView[]>([])
  const [name, setName] = useState('')

  useEffect(() => { void refreshSaved() }, [])
  async function refreshSaved() {
    try { const r = await fetch('/api/admin/cohort'); const j = await r.json(); setSaved(j.views ?? []) } catch { /* ignore */ }
  }

  function set(i: number, patch: Partial<Condition>) {
    setConditions((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)))
  }
  function addCond() { setConditions((cs) => [...cs, { type: 'did_event', event: '' }]) }
  function removeCond(i: number) { setConditions((cs) => cs.filter((_, j) => j !== i)) }

  function toPayload() {
    // strip empties to the shape insights_cohort expects
    const cleaned = conditions
      .map((c) => {
        if (c.type === 'did_event' || c.type === 'not_event') return c.event ? { type: c.type, event: c.event } : null
        if (c.type === 'sequence') return c.first && c.then ? { type: 'sequence', first: c.first, then: c.then } : null
        if (c.type === 'property') return c.field && c.value ? { type: 'property', field: c.field, op: c.op ?? 'eq', value: c.value } : null
        return null
      })
      .filter(Boolean)
    return { op: match, conditions: cleaned }
  }

  async function run() {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/cohort', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'run', conditions: toPayload(), days }),
      })
      const j = await r.json()
      setResults((j.results ?? []) as Result[])
    } finally { setLoading(false) }
  }

  async function save() {
    if (!name.trim()) return
    await fetch('/api/admin/cohort', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'save', name: name.trim(), payload: { match, days, conditions } }),
    })
    setName(''); void refreshSaved()
  }
  async function load(v: SavedView) {
    setMatch((v.payload.match as 'and' | 'or') ?? 'and'); setDays(v.payload.days ?? 30); setConditions(v.payload.conditions ?? [])
    setResults(null)
  }
  async function del(id: string) {
    await fetch('/api/admin/cohort', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'delete', id }) })
    void refreshSaved()
  }

  const evList = (id: string) => <datalist id={id}>{eventNames.map((e) => <option key={e} value={e} />)}</datalist>

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
          <span className="text-zinc-400">Match</span>
          <select value={match} onChange={(e) => setMatch(e.target.value as 'and' | 'or')} className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-200">
            <option value="and">ALL conditions</option>
            <option value="or">ANY condition</option>
          </select>
          <span className="text-zinc-400">in the last</span>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-200">
            {[1, 7, 30, 90, 180, 365].map((d) => <option key={d} value={d}>{d} days</option>)}
          </select>
        </div>

        <div className="space-y-2">
          {conditions.map((c, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded border border-zinc-800 bg-zinc-950/50 p-2 text-xs">
              <select value={c.type} onChange={(e) => set(i, { type: e.target.value as CondType })} className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-200">
                {(Object.keys(TYPE_LABEL) as CondType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
              </select>
              {(c.type === 'did_event' || c.type === 'not_event') && (
                <>
                  <input list={`ev-${i}`} value={c.event ?? ''} onChange={(e) => set(i, { event: e.target.value })} placeholder="event name" className="min-w-[180px] flex-1 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-200" />
                  {evList(`ev-${i}`)}
                </>
              )}
              {c.type === 'sequence' && (
                <>
                  <input list={`ev-${i}a`} value={c.first ?? ''} onChange={(e) => set(i, { first: e.target.value })} placeholder="first event" className="min-w-[150px] rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-200" />
                  <span className="text-zinc-500">then</span>
                  <input list={`ev-${i}b`} value={c.then ?? ''} onChange={(e) => set(i, { then: e.target.value })} placeholder="later event" className="min-w-[150px] rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-200" />
                  {evList(`ev-${i}a`)}{evList(`ev-${i}b`)}
                </>
              )}
              {c.type === 'property' && (
                <>
                  <select value={c.field ?? ''} onChange={(e) => set(i, { field: e.target.value })} className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-200">
                    <option value="">field…</option>
                    {PROPERTY_FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <select value={c.op ?? 'eq'} onChange={(e) => set(i, { op: e.target.value })} className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-200">
                    <option value="eq">=</option><option value="contains">contains</option><option value="gt">&gt;</option><option value="lt">&lt;</option>
                  </select>
                  <input value={c.value ?? ''} onChange={(e) => set(i, { value: e.target.value })} placeholder="value" className="min-w-[120px] rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-200" />
                </>
              )}
              <button type="button" onClick={() => removeCond(i)} className="ml-auto text-zinc-600 hover:text-red-400" aria-label="Remove condition"><X className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={addCond} className="inline-flex items-center gap-1 rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-900"><Plus className="h-3.5 w-3.5" /> Add condition</button>
          <button type="button" onClick={run} disabled={loading} className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Run cohort
          </button>
          <span className="mx-1 h-4 w-px bg-zinc-800" />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="name this cohort" className="w-40 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-200" />
          <button type="button" onClick={save} className="inline-flex items-center gap-1 rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-900"><Save className="h-3.5 w-3.5" /> Save</button>
        </div>
      </div>

      {/* Saved cohorts */}
      {saved.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-zinc-500">Saved:</span>
          {saved.map((v) => (
            <span key={v.id} className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5">
              <button type="button" onClick={() => load(v)} className="text-zinc-300 hover:text-emerald-400">{v.name}</button>
              <button type="button" onClick={() => del(v.id)} className="text-zinc-600 hover:text-red-400" aria-label="Delete"><Trash2 className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}

      {/* Results */}
      {results !== null && (
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-zinc-300">
            <Users className="h-4 w-4 text-emerald-500" /> <strong>{results.length}</strong> {results.length === 1 ? 'person' : 'people'} match
          </div>
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-zinc-900/60 text-left text-[11px] uppercase tracking-wider text-zinc-500">
                <tr><th className="px-3 py-2">Who</th><th className="px-3 py-2 text-right">Events</th><th className="px-3 py-2">Last seen</th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/80">
                {results.length === 0 ? (
                  <tr><td colSpan={3} className="px-3 py-8 text-center text-zinc-500">No one matches — try loosening the conditions.</td></tr>
                ) : results.map((r) => (
                  <tr key={r.distinct_id} className="hover:bg-zinc-900/40">
                    <td className="px-3 py-2">
                      <Link href={`/admin/insights/user/${encodeURIComponent(r.distinct_id)}`} className="font-mono text-xs text-zinc-200 hover:text-emerald-400" title={r.distinct_id}>
                        {r.email ?? (r.distinct_id.length > 24 ? r.distinct_id.slice(0, 24) + '…' : r.distinct_id)}
                      </Link>
                      {r.full_name ? <span className="ml-2 text-[10px] text-zinc-500">{r.full_name}</span> : null}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-400">{r.events}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-500" title={r.last_seen}>{new Date(r.last_seen).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
