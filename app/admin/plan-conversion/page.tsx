// Phase 9 — Plan conversion (funnel + intent stream for the global CTA).
// Phase 10.5b.3 — re-skinned onto the shared admin kit: global smart filter
// bar (queries converted to AdminFilters; humans-only F6 default preserved),
// FunnelStrip with the 4a/4b branches off the main path, MetricCard KPI
// strip, and ⓘ provenance popovers. The plan_intents-based panels (intent
// stream, link rate) honor ONLY the date range — that table has no bot flag
// or filter dimensions, and the page says so.

import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { FilterBar } from '@/components/admin/filter-bar'
import { MetricInfo } from '@/components/admin/metric-info'
import { FunnelStrip, MetricCard, type FunnelStepDatum } from '@/components/admin/charts'
import { parseAdminFilters } from '@/lib/admin/filters'
import { SCHEMA_EVENT_NAMES } from '@/lib/analytics-schema'
import { getCountryFilterOptions } from '@/app/admin/insights/queries'
import { EVENT_FUNNEL, getPlanFunnel, getSurfaceBreakdown, getIntentStream, getLinkRate } from '@/lib/admin/plan-conversion'

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

export default async function PlanConversionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const filters = parseAdminFilters(sp)

  const [funnel, surfaces, intents, linkRate, countryOptions] = await Promise.all([
    getPlanFunnel(filters),
    getSurfaceBreakdown(filters),
    getIntentStream(filters, 50),
    getLinkRate(filters),
    getCountryFilterOptions(),
  ])

  const branchByStep = new Map(EVENT_FUNNEL.map((s) => [s.event, !!s.branch]))
  const funnelSteps: FunnelStepDatum[] = funnel.map((s) => ({
    label: s.label,
    value: s.count,
    branch: branchByStep.get(s.step),
  }))
  // Semantic lookups (not magic indices) — the funnel step set has changed once
  // already (dead signup events) and silently broke the KPI strip. Look up by
  // event name so reordering can never misroute a number again.
  const stepCount = (event: string) => funnel.find((s) => s.step === event)?.count ?? 0

  return (
    <div>
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Sparkles className="h-5 w-5 text-emerald-500" />
          Plan conversion
        </h1>
        <FilterBar
          activeRange={filters.range.key}
          countries={countryOptions}
          eventNames={[...SCHEMA_EVENT_NAMES]}
        />
      </div>

      <p className="mb-6 max-w-3xl text-sm text-zinc-400">
        Funnel and intent stream for the global Plan-Your-Stack CTA. Tracks every
        impression, click, signup-modal interaction, and durable typed goal — including
        users who skip the signup gate. {filters.includeBots ? 'Bots included.' : 'Humans only (audit F6).'}
      </p>

      {/* ── KPI strip ─────────────────────────────────────────────────────── */}
      <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="CTAs shown" value={stepCount('plan_cta_impression')} info={<MetricInfo docKey="funnel_plan_acquisition" />} />
        <MetricCard label="CTA clicks" value={stepCount('plan_cta_clicked')} />
        <MetricCard label="Signups completed" value={stepCount('signup_completed')} />
        <MetricCard
          label="Goals captured"
          value={linkRate.total_anon_intents}
          info={<MetricInfo docKey="plan_link_rate" />}
          extra={<span className="text-[10px] text-zinc-500">{linkRate.link_rate_pct}% linked to a user</span>}
        />
      </div>

      {/* ── Funnel ────────────────────────────────────────────────────────── */}
      <section className="mb-8">
        <FunnelStrip
          title="CTA → signup → plan"
          steps={funnelSteps}
          info={<MetricInfo docKey="funnel_plan_acquisition" />}
        />
      </section>

      {/* ── Per-surface breakdown ─────────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-1 text-sm font-semibold text-zinc-200">
          Per-surface conversion
          <MetricInfo docKey="plan_surface_breakdown" />
        </h2>
        <p className="mb-2 text-xs text-zinc-500">
          Which CTA surface (homepage hero / sticky bar / inline card / navbar / plan_page) actually pulls clicks + signups. <em>plan_page</em> = goal typed directly on /plan without arriving via an upstream CTA. The ALL row is computed without the surface filter — a built-in parity check.
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
                <tr key={s.surface} className={`hover:bg-zinc-900/60 ${s.surface.startsWith('ALL') ? 'bg-zinc-950/50 text-zinc-400' : ''}`}>
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
          <h2 className="flex items-center gap-1 text-sm font-semibold text-zinc-200">
            Intent stream
            <MetricInfo docKey="plan_intent_stream" />
          </h2>
          <span className="text-xs text-zinc-500">
            Last 50 typed goals in this window · date range only (plan_intents has no bot/dimension columns)
          </span>
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
                          href={`/admin/insights/user/${encodeURIComponent(r.distinct_id)}`}
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
        <h2 className="mb-3 flex items-center gap-1 text-sm font-semibold text-zinc-200">
          Anon → known link rate
          <MetricInfo docKey="plan_link_rate" />
        </h2>
        <p className="mb-2 text-xs text-zinc-500">
          % of typed goals that eventually got linked to an authenticated user_id (either same session via OAuth, or later via auth-provider reconciliation). Date range only.
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
        <strong className="text-zinc-400">How to read:</strong> the funnel shows step counts; per-surface table tells you which CTA placement converts; the intent stream is your live feed of what every visitor actually wants — even if they bounced. Click any goal to jump to that visitor&apos;s full event timeline.
        <span className="mx-2">·</span>
        <Link href="/admin/data-audit" className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1">
          Verify these numbers in data-audit
          <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>
    </div>
  )
}
