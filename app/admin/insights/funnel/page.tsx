// Phase 10 (Traffic Analysis Upgrade, 2026-06-17) — Funnels count UNIQUE PEOPLE,
// sequentially (longest contiguous prefix, insights_funnel_users RPC).
// Phase 14b Wave 3 — the funnel is now COMPOSABLE: ?steps=a,b,c builds any
// funnel from any events (FunnelBuilder), each step breaks down by a dimension
// (?fdim=, insights_funnel_breakdown), and any step drills to the actual
// people who converted or dropped (?who=<step>.<conv|drop>,
// insights_funnel_people) — all identity-stitched and honoring the FilterBar.

import Link from 'next/link'
import { ArrowRight, Filter, Users } from 'lucide-react'
import { FilterBar } from '@/components/admin/filter-bar'
import { FunnelBuilder } from '@/components/admin/funnel-builder'
import { MetricInfo } from '@/components/admin/metric-info'
import { FunnelStrip, MetricCard, fmt, type FunnelStepDatum } from '@/components/admin/charts'
import { resolveServerFilters } from '@/lib/admin/resolve-filters'
import { SCHEMA_EVENT_NAMES } from '@/lib/analytics-schema'
import {
  getFunnelUsers,
  getFunnelBreakdown,
  getFunnelPeople,
  ACQUISITION_STEPS,
  COMPLETION_STEPS,
  type FunnelPerson,
  type FunnelUserStep,
} from '@/lib/admin/plan-conversion'
import { getCountryFilterOptions } from '../queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Funnels — Admin' }

const FDIM_OPTIONS = ['country', 'device', 'browser', 'os', 'city', 'utm_source', 'auth', 'source_kind'] as const

function parseSteps(raw: string | undefined): string[] {
  if (!raw) return []
  return [
    ...new Set(
      raw
        .split(',')
        .map((s) => s.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''))
        .filter(Boolean),
    ),
  ].slice(0, 8)
}

/** ?who=<stepIndex>.<conv|drop> — which people-drill is open. */
function parseWho(raw: string | undefined, stepCount: number): { step: number; converted: boolean } | null {
  const m = /^(\d+)\.(conv|drop)$/.exec(raw ?? '')
  if (!m) return null
  const step = Number(m[1])
  if (step < 1 || step > stepCount) return null
  return { step, converted: m[2] === 'conv' }
}

const humanize = (ev: string) => ev.replace(/_/g, ' ')

export default async function FunnelsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const filters = await resolveServerFilters(sp)
  const customSteps = parseSteps(sp.steps)
  const fdim = (FDIM_OPTIONS as readonly string[]).includes(sp.fdim ?? '') ? sp.fdim! : 'country'
  const who = parseWho(sp.who, customSteps.length)

  const stepDefs = customSteps.map((s) => ({ event: s, label: humanize(s) }))
  const [acquisition, journey, custom, breakdown, people, countryOptions] = await Promise.all([
    customSteps.length ? Promise.resolve([] as FunnelUserStep[]) : getFunnelUsers(ACQUISITION_STEPS, filters),
    customSteps.length ? Promise.resolve([] as FunnelUserStep[]) : getFunnelUsers(COMPLETION_STEPS, filters),
    customSteps.length ? getFunnelUsers(stepDefs, filters) : Promise.resolve([] as FunnelUserStep[]),
    customSteps.length >= 2 ? getFunnelBreakdown(customSteps, filters, fdim) : Promise.resolve([]),
    customSteps.length >= 1 && who
      ? getFunnelPeople(customSteps, filters, who.step, who.converted)
      : Promise.resolve([] as FunnelPerson[]),
    getCountryFilterOptions(),
  ])

  const byEvent = (rows: FunnelUserStep[], ev: string) => rows.find((r) => r.step === ev)?.users ?? 0
  const acquisitionSteps: FunnelStepDatum[] = acquisition.map((s) => ({ label: s.label, value: s.users }))
  const journeySteps: FunnelStepDatum[] = journey.map((s) => ({ label: s.label, value: s.users }))
  const customStrip: FunnelStepDatum[] = custom.map((s) => ({ label: s.label, value: s.users }))

  // Pivot the breakdown rows: key → [users at step 1..n]
  const keys = [...new Set(breakdown.map((r) => r.key))]
  const cell = (key: string, i: number) => breakdown.find((r) => r.key === key && r.step_index === i)?.users ?? 0
  const keysSorted = keys.sort((a, b) => cell(b, 1) - cell(a, 1))

  /** Rebuild the URL with overrides, preserving every filter param. */
  const qs = (overrides: Record<string, string | null>) => {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries(sp)) if (v) p.set(k, v)
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null) p.delete(k)
      else p.set(k, v)
    }
    const s = p.toString()
    return s ? `/admin/insights/funnel?${s}` : '/admin/insights/funnel'
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Filter className="h-5 w-5 text-emerald-500" />
          Funnels
        </h1>
        <FilterBar
          activeRange={filters.range.key}
          countries={countryOptions}
          eventNames={[...SCHEMA_EVENT_NAMES]}
        />
      </div>

      <p className="mb-4 max-w-3xl text-xs text-zinc-500">
        Funnels count <span className="font-medium text-zinc-300">unique people</span>, sequentially — each step is
        the count of distinct visitors who reached it <em>and every step before it</em>. Build your own below, break
        any step down by geo/device/…, and click through to the actual people. Over {filters.range.label.toLowerCase()},{' '}
        {filters.includeBots ? 'bots included' : 'humans only'}; the smart filters above apply to every step.
      </p>

      <div className="mb-5">
        <FunnelBuilder
          steps={customSteps}
          eventNames={[...SCHEMA_EVENT_NAMES]}
          presets={[
            { label: 'Acquisition', steps: ACQUISITION_STEPS.map((s) => s.event) },
            { label: 'Plan completion', steps: COMPLETION_STEPS.map((s) => s.event) },
          ]}
        />
      </div>

      {customSteps.length > 0 ? (
        <>
          <div className="mb-5">
            <FunnelStrip title={`Custom funnel — ${customSteps.length} steps (unique people)`} steps={customStrip} />
          </div>

          {/* People drill — who converted / dropped at each step. */}
          <div className="mb-5 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-zinc-500 mr-1 inline-flex items-center gap-1"><Users className="h-3 w-3" /> Who?</span>
            {customSteps.map((s, i) => (
              <span key={s} className="inline-flex items-center gap-1">
                <Link
                  href={qs({ who: `${i + 1}.conv` })}
                  className={`rounded border px-1.5 py-0.5 ${who?.step === i + 1 && who.converted ? 'border-emerald-700 bg-emerald-950/50 text-emerald-300' : 'border-zinc-800 text-zinc-400 hover:text-emerald-300'}`}
                >
                  reached {i + 1}
                </Link>
                {i > 0 && (
                  <Link
                    href={qs({ who: `${i + 1}.drop` })}
                    className={`rounded border px-1.5 py-0.5 ${who?.step === i + 1 && !who.converted ? 'border-rose-800 bg-rose-950/40 text-rose-300' : 'border-zinc-800 text-zinc-500 hover:text-rose-300'}`}
                  >
                    dropped before {i + 1}
                  </Link>
                )}
              </span>
            ))}
            {who && (
              <Link href={qs({ who: null })} className="rounded border border-zinc-800 px-1.5 py-0.5 text-zinc-500 hover:text-zinc-300">
                close
              </Link>
            )}
          </div>

          {who && (
            <div className="mb-6 overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-zinc-900/60 text-left text-[11px] uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">
                      {who.converted ? `Reached step ${who.step}` : `Dropped before step ${who.step}`} ({people.length})
                    </th>
                    <th className="px-3 py-2 font-medium">Account</th>
                    <th className="px-3 py-2 text-right font-medium">Furthest step</th>
                    <th className="px-3 py-2 font-medium">Last seen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/80">
                  {people.length === 0 ? (
                    <tr><td colSpan={4} className="px-3 py-6 text-center text-zinc-500">Nobody in this bucket.</td></tr>
                  ) : (
                    people.map((p) => (
                      <tr key={p.person} className="hover:bg-zinc-900/40">
                        <td className="px-3 py-2">
                          <Link
                            href={`/admin/insights/user/${encodeURIComponent(p.person)}?tab=journey`}
                            className="font-mono text-xs text-zinc-300 hover:text-emerald-400"
                            title={p.person}
                          >
                            {p.email ?? (p.person.length > 26 ? `${p.person.slice(0, 26)}…` : p.person)}
                          </Link>
                        </td>
                        <td className="px-3 py-2">
                          {p.is_user ? (
                            <span className="rounded-full border border-sky-800 bg-sky-950/40 px-1.5 py-0.5 text-[9px] text-sky-300">account</span>
                          ) : (
                            <span className="text-[10px] text-zinc-600">anon</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-400">{p.furthest}/{customSteps.length}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-zinc-500">{new Date(p.last_seen).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Per-step breakdown by dimension. */}
          {customSteps.length >= 2 && (
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-200">Step breakdown</h2>
                <div className="flex items-center gap-1">
                  {FDIM_OPTIONS.map((d) => (
                    <Link
                      key={d}
                      href={qs({ fdim: d === 'country' ? null : d })}
                      className={`rounded border px-1.5 py-0.5 text-[10px] ${fdim === d ? 'border-emerald-700 bg-emerald-950/50 text-emerald-300' : 'border-zinc-800 text-zinc-500 hover:text-zinc-200'}`}
                    >
                      {d.replace('_', ' ')}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-zinc-800">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-900/60 text-left text-[10px] uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">{fdim.replace('_', ' ')}</th>
                      {customSteps.map((s, i) => (
                        <th key={s} className="px-3 py-2 text-right font-medium" title={s}>
                          {i + 1}. {humanize(s).slice(0, 18)}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-right font-medium">conv %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/80">
                    {keysSorted.length === 0 ? (
                      <tr><td colSpan={customSteps.length + 2} className="px-3 py-6 text-center text-zinc-500">No data in this window.</td></tr>
                    ) : (
                      keysSorted.map((k) => {
                        const first = cell(k, 1)
                        const last = cell(k, customSteps.length)
                        return (
                          <tr key={k} className="hover:bg-zinc-900/40">
                            <td className="px-3 py-2 text-zinc-200">{k}</td>
                            {customSteps.map((s, i) => (
                              <td key={s} className="px-3 py-2 text-right font-mono tabular-nums text-zinc-300">{fmt(cell(k, i + 1))}</td>
                            ))}
                            <td className="px-3 py-2 text-right font-mono tabular-nums text-emerald-300">
                              {first > 0 ? `${Math.round((last / first) * 1000) / 10}%` : '—'}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <DefaultFunnels
          acquisition={acquisition}
          journey={journey}
          acquisitionSteps={acquisitionSteps}
          journeySteps={journeySteps}
          byEvent={byEvent}
        />
      )}

      <div className="mt-6 text-xs text-zinc-500">
        Per-surface conversion, the typed-goal intent stream and the anon→known link rate live on{' '}
        <Link href="/admin/plan-conversion" className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300">
          Plan conversion <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>
    </div>
  )
}

function DefaultFunnels({
  acquisition,
  journey,
  acquisitionSteps,
  journeySteps,
  byEvent,
}: {
  acquisition: FunnelUserStep[]
  journey: FunnelUserStep[]
  acquisitionSteps: FunnelStepDatum[]
  journeySteps: FunnelStepDatum[]
  byEvent: (rows: FunnelUserStep[], ev: string) => number
}) {
  const sawCta = byEvent(acquisition, 'plan_cta_impression')
  const signedUp = byEvent(acquisition, 'signup_completed')
  const planStarted = byEvent(journey, 'plan_started')
  const planCompleted = byEvent(journey, 'plan_completed')
  const completionRate = planStarted > 0 ? Math.round((planCompleted / planStarted) * 1000) / 10 : 0
  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Saw plan CTA" value={sawCta} kind="people" info={<MetricInfo docKey="funnel_plan_acquisition" />} />
        <MetricCard label="Signed up" value={signedUp} kind="people" />
        <MetricCard label="Started a plan" value={planStarted} kind="people" info={<MetricInfo docKey="funnel_plan_journey" />} />
        <MetricCard label="Completed a plan" value={planCompleted} kind="people" extra={<span className="text-[10px] text-zinc-500">{completionRate}% of starters</span>} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FunnelStrip
          title="Acquisition — saw CTA → signed up (unique people)"
          steps={acquisitionSteps}
          info={<MetricInfo docKey="funnel_plan_acquisition" />}
        />
        <FunnelStrip
          title="Plan completion — started → generated (unique people)"
          steps={journeySteps}
          info={<MetricInfo docKey="funnel_plan_journey" />}
        />
      </div>
    </>
  )
}
