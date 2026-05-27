import Link from 'next/link'
import { ChevronLeft, ArrowRight, Sparkles, Users, MousePointerClick, UserPlus, BarChart3 } from 'lucide-react'
import { RangePicker } from '@/components/admin/range-picker'
import { parseRange } from '@/lib/admin/range'
import { getPlanFunnel, getSurfaceBreakdown, getIntentStream, getLinkRate } from '@/lib/admin/plan-conversion'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Plan conversion — Admin' }

function pct(n: number): string {
  if (!Number.isFinite(n)) return '0%'
  return `${n}%`
}

function fmtNum(n: number): string {
  if (n >= 10_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

function relTime(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const OUTCOME_COLOR: Record<string, string> = {
  completed_google: 'bg-emerald-950/50 text-emerald-300 border-emerald-800',
  completed_linkedin: 'bg-sky-950/50 text-sky-300 border-sky-800',
  skipped: 'bg-zinc-900 text-zinc-400 border-zinc-700',
  unknown: 'bg-zinc-900 text-zinc-500 border-zinc-800',
}

export default async function PlanConversionPage({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string; days?: string }> }) {
  const sp = await searchParams
  const sel = parseRange(sp)

  const [funnel, surfaces, intents, linkRate] = await Promise.all([
    getPlanFunnel(sel),
    getSurfaceBreakdown(sel),
    getIntentStream(sel, 50),
    getLinkRate(sel),
  ])

  // Max for funnel bar widths
  const maxFunnelCount = Math.max(1, ...funnel.map((f) => f.count))

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
            <ChevronLeft className="h-3 w-3" />Admin
          </Link>
          <span className="text-zinc-700">/</span>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            Plan conversion
          </h1>
        </div>
        <RangePicker active={sel.key} />
      </div>

      <p className="mb-6 max-w-3xl text-sm text-zinc-400">
        Funnel and intent stream for the global Plan-Your-Stack CTA. Tracks every
        impression, click, signup-modal interaction, and durable typed goal — including
        users who skip the signup gate.
      </p>

      {/* ── KPI strip ─────────────────────────────────────────────────────── */}
      <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
            <BarChart3 className="h-3 w-3" />CTAs shown
          </div>
          <div className="mt-2 text-2xl font-semibold text-white tabular-nums">{fmtNum(funnel[0]?.count ?? 0)}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
            <MousePointerClick className="h-3 w-3" />CTA clicks
          </div>
          <div className="mt-2 text-2xl font-semibold text-white tabular-nums">{fmtNum(funnel[1]?.count ?? 0)}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
            <UserPlus className="h-3 w-3" />Signups completed
          </div>
          <div className="mt-2 text-2xl font-semibold text-emerald-300 tabular-nums">{fmtNum(funnel[5]?.count ?? 0)}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
            <Users className="h-3 w-3" />Goals captured
          </div>
          <div className="mt-2 text-2xl font-semibold text-white tabular-nums">{fmtNum(linkRate.total_anon_intents)}</div>
          <div className="mt-1 text-[10px] text-zinc-500">{linkRate.link_rate_pct}% linked to user</div>
        </div>
      </div>

      {/* ── Funnel ────────────────────────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">Funnel</h2>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800/80 overflow-hidden">
          {funnel.map((step, i) => {
            const prevCount = i > 0 ? funnel[i - 1].count : null
            const dropPct = prevCount && prevCount > 0 ? Math.round(((prevCount - step.count) / prevCount) * 1000) / 10 : null
            const widthPct = (step.count / maxFunnelCount) * 100
            return (
              <div key={step.step} className="grid grid-cols-12 items-center gap-3 px-4 py-3">
                <div className="col-span-4 text-sm text-zinc-300">{step.label}</div>
                <div className="col-span-6 flex items-center gap-2">
                  <div className="h-2 flex-1 rounded-full bg-zinc-900 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-600"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
                <div className="col-span-2 text-right text-sm font-medium text-white tabular-nums">
                  {fmtNum(step.count)}
                  {dropPct !== null && (
                    <div className="text-[10px] text-zinc-500">{dropPct > 0 ? `−${dropPct}%` : '+0%'}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Per-surface breakdown ─────────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">Per-surface conversion</h2>
        <p className="mb-2 text-xs text-zinc-500">
          Which CTA surface (homepage hero / sticky bar / inline card / navbar) actually pulls clicks + signups.
        </p>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-zinc-500 bg-zinc-950/60">
              <tr>
                <th className="px-4 py-2 text-left">Surface</th>
                <th className="px-4 py-2 text-right">Impressions</th>
                <th className="px-4 py-2 text-right">Clicks</th>
                <th className="px-4 py-2 text-right">CTR</th>
                <th className="px-4 py-2 text-right">Signups</th>
                <th className="px-4 py-2 text-right">Signup rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {surfaces.map((s) => (
                <tr key={s.surface} className="hover:bg-zinc-900/60">
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-300">{s.surface}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-zinc-300">{fmtNum(s.impressions)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-zinc-300">{fmtNum(s.clicks)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-emerald-300">{pct(s.ctr)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-zinc-300">{fmtNum(s.signups)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-emerald-300">{pct(s.signup_rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Intent stream ─────────────────────────────────────────────────── */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">Intent stream</h2>
          <span className="text-xs text-zinc-500">Last 50 typed goals in this window</span>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden">
          {intents.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-500">No typed goals captured in this window yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-zinc-500 bg-zinc-950/60">
                <tr>
                  <th className="px-4 py-2 text-left">Typed goal</th>
                  <th className="px-4 py-2 text-left">Surface</th>
                  <th className="px-4 py-2 text-left">Outcome</th>
                  <th className="px-4 py-2 text-left">User</th>
                  <th className="px-4 py-2 text-right">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {intents.map((r) => {
                  const outcomeClass = OUTCOME_COLOR[r.signup_outcome ?? 'unknown'] ?? OUTCOME_COLOR.unknown
                  return (
                    <tr key={r.id} className="hover:bg-zinc-900/60 align-top">
                      <td className="px-4 py-2.5 max-w-md">
                        <Link
                          href={`/admin/insights/journey/${encodeURIComponent(r.distinct_id)}`}
                          className="text-zinc-200 hover:text-emerald-300 transition-colors line-clamp-2"
                        >
                          {r.typed_goal}
                        </Link>
                        {r.source_path && (
                          <div className="mt-0.5 text-[10px] text-zinc-600 font-mono truncate">{r.source_path}</div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-zinc-400">{r.source_surface}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${outcomeClass}`}>
                          {r.signup_outcome ?? 'unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {r.user_id ? (
                          <span className="font-mono text-emerald-300">{r.user_id.slice(0, 8)}…</span>
                        ) : (
                          <span className="text-zinc-600">anon</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-zinc-500 tabular-nums whitespace-nowrap">
                        {relTime(r.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ── Anon → known link rate ────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">Anon → known link rate</h2>
        <p className="mb-2 text-xs text-zinc-500">
          % of typed goals that eventually got linked to an authenticated user_id (either same session via OAuth, or later via auth-provider reconciliation).
        </p>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Total intents</div>
              <div className="mt-1 text-2xl font-semibold text-white tabular-nums">{fmtNum(linkRate.total_anon_intents)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Linked to user</div>
              <div className="mt-1 text-2xl font-semibold text-emerald-300 tabular-nums">{fmtNum(linkRate.linked_to_user)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Link rate</div>
              <div className="mt-1 text-2xl font-semibold text-emerald-300 tabular-nums">{pct(linkRate.link_rate_pct)}</div>
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-zinc-900 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-600"
              style={{ width: `${Math.min(100, linkRate.link_rate_pct)}%` }}
            />
          </div>
        </div>
      </section>

      <div className="mt-8 text-xs text-zinc-500 max-w-3xl">
        <strong className="text-zinc-400">How to read:</strong> the funnel shows step counts; per-surface table tells you which CTA placement converts; the intent stream is your live feed of what every visitor actually wants — even if they bounced. Click any goal to jump to that visitor's full event timeline.
        <span className="mx-2">·</span>
        <Link href="/admin/data-audit" className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1">
          Verify these numbers in data-audit
          <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>
    </div>
  )
}
