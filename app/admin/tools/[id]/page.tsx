import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ToolForm } from '../tool-form'
import {
  Clock,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
} from 'lucide-react'

// Phase 8.f (2026-05-19) — per-tool depth + history on the edit page.
// Adds freshness snapshot (every _at field with relative age + tone) and
// a full refresh timeline (every refresh_logs entry for this tool) above
// the existing edit form. Live-fetched on every load.

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Edit Tool' }

// ── Freshness-related timestamp columns on `tools` ──────────────────
// Keep this list in sync with v_field_freshness in migration 091.
const FRESHNESS_FIELDS: Array<{ key: string; label: string; ownerCron: string }> = [
  { key: 'last_verified_at', label: 'Last verified', ownerCron: 'refresh-tools (hourly)' },
  { key: 'last_full_refresh_at', label: 'Last full SOP refresh', ownerCron: 'scripts/backfill-tool-data.ts' },
  { key: 'latest_updates_at', label: '“Latest from” feed', ownerCron: 'refresh-latest-updates (daily)' },
  { key: 'viability_updated_at', label: 'Viability score', ownerCron: 'calculate-viability (Weds)' },
  { key: 'our_views_generated_at', label: 'View count seed', ownerCron: 'manual / scripts/seed-views.ts' },
  { key: 'updated_at', label: 'Row updated', ownerCron: 'any DB write (cron or admin edit)' },
  { key: 'created_at', label: 'Created', ownerCron: '—' },
]

function relAge(iso: string | null | undefined): { label: string; tone: string } {
  if (!iso) return { label: 'never', tone: 'text-rose-400' }
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (min < 1) return { label: 'just now', tone: 'text-emerald-400' }
  if (min < 60) return { label: `${min}m ago`, tone: 'text-emerald-400' }
  const h = Math.floor(min / 60)
  if (h < 24) return { label: `${h}h ago`, tone: 'text-emerald-400' }
  const d = Math.floor(h / 24)
  if (d < 7) return { label: `${d}d ago`, tone: 'text-zinc-300' }
  if (d < 30) return { label: `${d}d ago`, tone: 'text-amber-400' }
  return { label: `${d}d ago`, tone: 'text-rose-400' }
}

function absoluteISO(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
}

type RefreshLog = {
  id: string
  run_id: string | null
  status: string
  fields_updated: string[] | null
  error_message: string | null
  duration_ms: number | null
  created_at: string
}

export default async function EditToolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: tool },
    { data: categories },
    { data: tags },
    { data: refreshLogs },
  ] = await Promise.all([
    supabase
      .from('tools')
      .select('*, tool_categories(category_id), tool_tags(tag_id)')
      .eq('id', id)
      .single(),
    supabase.from('categories').select('id, name').order('sort_order'),
    supabase.from('tags').select('id, name').order('name'),
    // Last 50 refresh entries for this tool (DESC) — full audit trail.
    supabase
      .from('refresh_logs')
      .select('id, run_id, status, fields_updated, error_message, duration_ms, created_at')
      .eq('tool_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (!tool) notFound()

  const toolData = {
    ...tool,
    categoryIds: (tool.tool_categories as { category_id: string }[])?.map((tc) => tc.category_id) ?? [],
    tagIds: (tool.tool_tags as { tag_id: string }[])?.map((tt) => tt.tag_id) ?? [],
  }
  const t = tool as Record<string, unknown>
  const logs = (refreshLogs ?? []) as RefreshLog[]

  // Quick stats for the timeline header
  const refreshCount = logs.filter((l) => l.status === 'refreshed').length
  const failCount = logs.filter((l) => l.status === 'failed').length
  const lastSuccess = logs.find((l) => l.status === 'refreshed')
  const lastFailure = logs.find((l) => l.status === 'failed')

  return (
    <div>
      {/* ── Breadcrumb + header ─────────────────────────────────── */}
      <div className="mb-6 flex items-start gap-3">
        <Link href="/admin/tools" className="text-zinc-400 hover:text-emerald-300 mt-1">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Edit: {tool.name as string}</h1>
          <p className="text-sm text-zinc-500 mt-1">
            <Link href={`/tools/${tool.slug}`} target="_blank" className="hover:text-emerald-300">
              /tools/{tool.slug as string} <ExternalLink className="h-3 w-3 inline" />
            </Link>
            <span className="ml-3 text-zinc-600">id: <span className="font-mono text-[11px]">{id}</span></span>
          </p>
        </div>
      </div>

      {/* ── 1. FRESHNESS SNAPSHOT ────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-emerald-400" />
          Freshness snapshot
        </h2>
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/60 text-xs text-zinc-400">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Field</th>
                <th className="text-right px-3 py-2 font-medium w-24">Age</th>
                <th className="text-left px-3 py-2 font-medium w-44">When (UTC)</th>
                <th className="text-left px-3 py-2 font-medium">Owned by</th>
              </tr>
            </thead>
            <tbody>
              {FRESHNESS_FIELDS.map((f) => {
                const v = t[f.key] as string | null | undefined
                const a = relAge(v)
                return (
                  <tr key={f.key} className="border-t border-zinc-800/60">
                    <td className="px-3 py-1.5 text-zinc-200">{f.label}</td>
                    <td className={`px-3 py-1.5 text-right tabular-nums font-medium ${a.tone}`}>{a.label}</td>
                    <td className="px-3 py-1.5 text-zinc-500 font-mono text-[11px]">{absoluteISO(v)}</td>
                    <td className="px-3 py-1.5 text-zinc-500 text-xs">{f.ownerCron}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 2. REFRESH TIMELINE ──────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-cyan-400" />
          Refresh timeline
          <span className="text-xs text-zinc-500 font-normal ml-2">
            {logs.length === 0
              ? 'no entries yet'
              : `last ${logs.length} entries · ${refreshCount} refreshed · ${failCount} failed`}
          </span>
        </h2>

        {logs.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Stat
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
              label="Last success"
              value={lastSuccess ? relAge(lastSuccess.created_at).label : '—'}
              sub={lastSuccess ? absoluteISO(lastSuccess.created_at) : ''}
            />
            <Stat
              icon={<AlertCircle className="h-4 w-4 text-rose-400" />}
              label="Last failure"
              value={lastFailure ? relAge(lastFailure.created_at).label : 'never'}
              sub={lastFailure ? absoluteISO(lastFailure.created_at) : ''}
            />
            <Stat
              label="Mean duration"
              value={(() => {
                const d = logs.map((l) => l.duration_ms).filter((x): x is number => typeof x === 'number')
                if (d.length === 0) return '—'
                return `${Math.round(d.reduce((a, b) => a + b, 0) / d.length / 1000)}s`
              })()}
              sub={`across ${logs.length} runs`}
            />
            <Stat
              label="Success rate"
              value={logs.length === 0 ? '—' : `${Math.round((refreshCount / logs.length) * 100)}%`}
              sub={`${refreshCount}/${logs.length}`}
            />
          </div>
        )}

        {logs.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-500 text-center">
            No refresh history yet. This tool may be brand-new, or the refresh cron hasn't reached
            it in its rotation yet.
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-zinc-900/60 text-zinc-400">
                <tr>
                  <th className="text-left px-3 py-2 font-medium w-44">When (UTC)</th>
                  <th className="text-right px-3 py-2 font-medium w-24">Age</th>
                  <th className="text-left px-3 py-2 font-medium w-20">Status</th>
                  <th className="text-right px-3 py-2 font-medium w-20">Duration</th>
                  <th className="text-left px-3 py-2 font-medium">Fields changed / error</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => {
                  const failed = l.status === 'failed'
                  return (
                    <tr key={l.id} className={`border-t border-zinc-800/60 ${failed ? 'bg-rose-950/10' : ''}`}>
                      <td className="px-3 py-1.5 text-zinc-500 font-mono text-[11px]">
                        {absoluteISO(l.created_at)}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-zinc-500">
                        {relAge(l.created_at).label}
                      </td>
                      <td className="px-3 py-1.5">
                        <span
                          className={`inline-block text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            failed
                              ? 'bg-rose-950/60 text-rose-300'
                              : 'bg-emerald-950/40 text-emerald-300'
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-zinc-500">
                        {l.duration_ms != null ? `${(l.duration_ms / 1000).toFixed(1)}s` : '—'}
                      </td>
                      <td className="px-3 py-1.5">
                        {failed ? (
                          <span className="text-rose-400 text-[11px]">{l.error_message ?? '(no message)'}</span>
                        ) : l.fields_updated && l.fields_updated.length > 0 ? (
                          <span className="flex flex-wrap gap-1">
                            {l.fields_updated.map((f) => (
                              <span
                                key={f}
                                className="inline-block text-[10px] uppercase tracking-wider px-1 py-px rounded bg-zinc-800/60 text-zinc-400"
                              >
                                {f}
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span className="text-zinc-600">no changes recorded</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── 3. FULL EDIT FORM (existing) ─────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-white mb-3">Edit tool data</h2>
        <ToolForm tool={toolData} categories={categories ?? []} tags={tags ?? []} />
      </section>
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon?: React.ReactNode
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3">
      <div className="flex items-center gap-1.5 text-zinc-400">
        {icon}
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <div className="text-lg font-bold text-white mt-1 tabular-nums">{value}</div>
      {sub && <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">{sub}</div>}
    </div>
  )
}
