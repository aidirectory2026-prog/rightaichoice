import Link from 'next/link'
import { Check, X, AlertTriangle, ChevronLeft, ShieldCheck } from 'lucide-react'
import { runAudit, type AuditResult } from '@/lib/admin/data-audit'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Data audit — Admin' }

const CATEGORY_LABEL: Record<AuditResult['category'], string> = {
  catalog: 'Catalog integrity',
  events: 'Events table integrity',
  triangulation: 'Triangulation',
  boundaries: 'Window monotonicity',
  freshness: 'Freshness signals',
  mirror: 'Mirror channel health',
  'tracking-rpc': 'Tracking RPC fidelity',
  'tracking-windows': 'Time-window correctness',
  'tracking-stability': 'Query stability',
  'tracking-dedup': 'Anti-double-count',
}

const CATEGORY_HELP: Record<AuditResult['category'], string> = {
  catalog: 'Invariants on the tools table — counts, coverage, dedup hygiene.',
  events: 'Sanity checks on user_events — distinct_id population, no future timestamps, no insert_id dupes.',
  triangulation: 'Same metric computed two ways. Drift here means one path is filtering differently than its description.',
  boundaries: 'Strict ≤ relationships that MUST hold (today ≤ week, humans ≤ all). Failing one means a filter is buggy.',
  freshness: 'Are pipelines still running? No event in 6h or stalest tool >30d old = broken cron.',
  mirror: 'Client-side track-mirror + server-side tracking both firing. One channel dropping = half your data is wrong.',
  'tracking-rpc': 'For each KPI shown on insights pages, compute the same number two ways: raw SQL vs the RPC the dashboard calls. They MUST match (within tolerance for summed-by-day RPCs).',
  'tracking-windows': '"Today" / "Yesterday" filters must be calendar-day-precise in IST. These checks verify the time math doesn\'t leak between buckets.',
  'tracking-stability': 'Same query run twice should return identical results. If a top-N list reshuffles between page loads, the RPC has non-deterministic ordering.',
  'tracking-dedup': 'Double-fired pageviews / search events inflate every metric. These checks find suspicious rapid-fire bursts of identical events.',
}

export default async function DataAuditPage() {
  const t0 = Date.now()
  const results = await runAudit()
  const ms = Date.now() - t0

  const pass = results.filter((r) => r.pass).length
  const fail = results.filter((r) => !r.pass).length
  const errored = results.filter((r) => r.error).length

  const byCategory: Record<string, AuditResult[]> = {}
  for (const r of results) {
    if (!byCategory[r.category]) byCategory[r.category] = []
    byCategory[r.category].push(r)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
            <ChevronLeft className="h-3 w-3" />Admin
          </Link>
          <span className="text-zinc-700">/</span>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-white">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            Data audit
          </h1>
        </div>
        <div className="text-xs text-zinc-500">
          {results.length} invariants evaluated in {ms}ms
        </div>
      </div>

      <p className="mb-6 text-sm text-zinc-400 max-w-3xl">
        Each row below is a relationship that MUST hold if your admin data is correct.
        For example: "humans-only event count ≤ all-events count" — if it fails, the
        bot filter is corrupted and every dashboard with a "Humans only" toggle is showing
        the wrong number. Re-run anytime by reloading.
      </p>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-4">
          <div className="text-[10px] uppercase tracking-wider text-emerald-500 font-medium">Pass</div>
          <div className="mt-1 text-3xl font-semibold text-emerald-300 tabular-nums">{pass}</div>
        </div>
        <div className={`rounded-lg border ${fail > 0 ? 'border-rose-900/40 bg-rose-950/20' : 'border-zinc-800 bg-zinc-900/40'} p-4`}>
          <div className={`text-[10px] uppercase tracking-wider font-medium ${fail > 0 ? 'text-rose-500' : 'text-zinc-500'}`}>Fail</div>
          <div className={`mt-1 text-3xl font-semibold tabular-nums ${fail > 0 ? 'text-rose-300' : 'text-zinc-500'}`}>{fail}</div>
        </div>
        <div className={`rounded-lg border ${errored > 0 ? 'border-amber-900/40 bg-amber-950/20' : 'border-zinc-800 bg-zinc-900/40'} p-4`}>
          <div className={`text-[10px] uppercase tracking-wider font-medium ${errored > 0 ? 'text-amber-500' : 'text-zinc-500'}`}>Errors</div>
          <div className={`mt-1 text-3xl font-semibold tabular-nums ${errored > 0 ? 'text-amber-300' : 'text-zinc-500'}`}>{errored}</div>
        </div>
      </div>

      <div className="space-y-6">
        {(Object.keys(byCategory) as AuditResult['category'][]).map((cat) => (
          <section key={cat}>
            <div className="mb-2">
              <h2 className="text-sm font-semibold text-zinc-200">{CATEGORY_LABEL[cat]}</h2>
              <p className="text-xs text-zinc-500 mt-0.5">{CATEGORY_HELP[cat]}</p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800/80 overflow-hidden">
              {byCategory[cat].map((r) => (
                <div key={r.id} className="px-4 py-3 flex items-start gap-3">
                  <div className="mt-0.5">
                    {r.error ? (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-950 border border-amber-800">
                        <AlertTriangle className="h-3 w-3 text-amber-300" />
                      </div>
                    ) : r.pass ? (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-950 border border-emerald-800">
                        <Check className="h-3 w-3 text-emerald-300" />
                      </div>
                    ) : (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-950 border border-rose-800">
                        <X className="h-3 w-3 text-rose-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-100">{r.label}</div>
                    <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                      <div>
                        <span className="text-zinc-500">Actual: </span>
                        <span className={r.pass ? 'text-zinc-300' : 'text-rose-300 font-medium'}>{r.actual}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Expected: </span>
                        <span className="text-zinc-300">{r.expected}</span>
                      </div>
                    </div>
                    {r.note && <div className="mt-1 text-xs text-amber-300/80">Note: {r.note}</div>}
                    {r.error && <div className="mt-1 text-xs text-amber-300 font-mono">{r.error}</div>}
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[10px] text-zinc-600 hover:text-zinc-400">
                        Why this check exists · {r.ms}ms
                      </summary>
                      <div className="mt-1 text-[11px] text-zinc-500 italic">{r.rationale}</div>
                      <pre className="mt-1 overflow-x-auto rounded bg-zinc-950 border border-zinc-800 p-2 text-[10px] text-zinc-400">{r.sql.trim()}</pre>
                    </details>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-8 text-xs text-zinc-500 max-w-3xl">
        <strong className="text-zinc-400">How to read this:</strong> All green = your admin
        dashboards reflect the underlying DB faithfully. A failure means the data behind a
        specific section is inconsistent — drill into the SQL (click "Why this check
        exists"), run it directly in Supabase Studio, and trace upstream.
      </div>
    </div>
  )
}
