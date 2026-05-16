import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { TrendingUp, RefreshCw, Plus, AlertCircle, CheckCircle2 } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Daily updates — Admin' }

type DailyRow = {
  utc_date: string
  tools_refreshed: number
  tools_refresh_failed: number
  tools_ingested: number
  tools_ingest_gated: number
  tools_ingest_failed: number
  compares_regenerated: number
  compares_cascade_failed: number
  tools_latest_updates_refreshed: number
  bing_urls_submitted: number
  refreshed_slugs_sample: string[]
  ingested_slugs_sample: string[]
  cascaded_slugs_sample: string[]
  total_published_tools: number | null
  oldest_last_verified_at: string | null
  cascade_backlog: number | null
  health_flags: Record<string, boolean | string>
  created_at: string
}

function daysAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 86_400_000
  if (diff < 1) return 'today'
  if (diff < 2) return 'yesterday'
  return `${Math.floor(diff)}d ago`
}

export default async function UpdatesPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('daily_update_summaries')
    .select('*')
    .order('utc_date', { ascending: false })
    .limit(60)

  if (error) {
    return (
      <div className="text-zinc-300">
        <h1 className="text-2xl font-bold text-white mb-2">Daily updates</h1>
        <p className="text-sm text-rose-400">
          daily_update_summaries table not found — apply migration 089 first.
        </p>
      </div>
    )
  }

  const rows = (data ?? []) as DailyRow[]
  const today = rows[0]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Daily updates log</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Every refresh, ingest, and cascade across all Phase 8 pipelines.
          Written by <code className="text-emerald-400">/api/cron/snapshot-daily-updates</code>{' '}
          at 23:55 UTC nightly. Counts are UTC-day-scoped (open interval, not 24h sliding).
        </p>
      </div>

      {/* Today's row hero */}
      {today ? (
        <section className="mb-10 rounded-xl border border-emerald-800/40 bg-emerald-950/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-emerald-300">
              Today · {today.utc_date}
            </h2>
            <span className="text-xs text-zinc-500">
              snapshot: {daysAgo(today.created_at)}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <Stat icon={<RefreshCw className="h-4 w-4" />} label="Refreshed" value={today.tools_refreshed} sub={`${today.tools_refresh_failed} failed`} />
            <Stat icon={<Plus className="h-4 w-4" />} label="New tools" value={today.tools_ingested} sub={`${today.tools_ingest_gated} gated`} />
            <Stat icon={<TrendingUp className="h-4 w-4" />} label="Compares re-edited" value={today.compares_regenerated} sub="cascade" />
            <Stat icon={<RefreshCw className="h-4 w-4" />} label="Latest-updates" value={today.tools_latest_updates_refreshed} sub="top-50 tools" />
            <Stat icon={<TrendingUp className="h-4 w-4" />} label="Bing pushed" value={today.bing_urls_submitted} sub="direct API" />
            <Stat icon={<CheckCircle2 className="h-4 w-4" />} label="Catalog" value={today.total_published_tools ?? 0} sub={`stalest: ${today.oldest_last_verified_at ? daysAgo(today.oldest_last_verified_at) : '—'}`} />
          </div>

          {Object.keys(today.health_flags ?? {}).length > 0 && (
            <div className="mt-4 rounded-lg border border-rose-800/40 bg-rose-950/20 p-3 text-sm text-rose-300 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <strong>Health flags raised:</strong>{' '}
                {Object.keys(today.health_flags).join(', ')}
              </div>
            </div>
          )}

          {today.refreshed_slugs_sample.length > 0 && (
            <SlugSample title="Refreshed today (sample)" slugs={today.refreshed_slugs_sample} />
          )}
          {today.ingested_slugs_sample.length > 0 && (
            <SlugSample title="Ingested today (sample)" slugs={today.ingested_slugs_sample} />
          )}
          {today.cascaded_slugs_sample.length > 0 && (
            <SlugSample
              title="Compares re-edited today (sample)"
              slugs={today.cascaded_slugs_sample}
              basePath="/compare"
            />
          )}
        </section>
      ) : (
        <p className="text-sm text-zinc-500 mb-10">
          No snapshot yet — the first one is written tonight at 23:55 UTC.
        </p>
      )}

      {/* History table */}
      <section>
        <h2 className="text-base font-semibold text-white mb-3">Last 60 days</h2>
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/60">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-400">Date</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-zinc-400">Refreshed</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-zinc-400">New</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-zinc-400">Compares</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-zinc-400">Catalog</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-zinc-400">Backlog</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-zinc-400">Health</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-zinc-500">
                    No daily summaries yet.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const flagCount = Object.keys(r.health_flags ?? {}).length
                return (
                  <tr key={r.utc_date} className="border-t border-zinc-800/60 hover:bg-zinc-900/30">
                    <td className="px-4 py-2 text-zinc-200">{r.utc_date}</td>
                    <td className="px-3 py-2 text-right text-zinc-300 tabular-nums">{r.tools_refreshed}</td>
                    <td className="px-3 py-2 text-right text-zinc-300 tabular-nums">{r.tools_ingested}</td>
                    <td className="px-3 py-2 text-right text-zinc-300 tabular-nums">{r.compares_regenerated}</td>
                    <td className="px-3 py-2 text-right text-zinc-500 tabular-nums">
                      {r.total_published_tools?.toLocaleString() ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-zinc-500 tabular-nums">
                      {r.cascade_backlog?.toLocaleString() ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {flagCount === 0 ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto" />
                      ) : (
                        <span className="text-xs text-rose-400">{flagCount} flag{flagCount > 1 ? 's' : ''}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-8 text-xs text-zinc-500">
        Want a static markdown export? Run{' '}
        <code className="text-emerald-400">npm run daily:log:export</code>{' '}
        to dump the table as <code>docs/operations/daily-updates-log.md</code>.
      </p>
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  sub: string
}) {
  return (
    <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3">
      <div className="flex items-center gap-2 text-zinc-400 mb-1">
        {icon}
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold text-white tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-[11px] text-zinc-500 mt-0.5">{sub}</div>
    </div>
  )
}

function SlugSample({
  title,
  slugs,
  basePath = '/tools',
}: {
  title: string
  slugs: string[]
  basePath?: string
}) {
  return (
    <div className="mt-5">
      <h3 className="text-xs font-medium text-zinc-400 mb-2">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {slugs.map((slug) => (
          <Link
            key={slug}
            href={`${basePath}/${slug}`}
            target="_blank"
            className="rounded border border-zinc-800 bg-zinc-900/50 px-2 py-1 text-[11px] text-zinc-300 hover:border-emerald-700 hover:text-emerald-300"
          >
            {slug}
          </Link>
        ))}
      </div>
    </div>
  )
}
