// Phase 10 (Traffic Analysis Upgrade, 2026-06-17) — Funnels count UNIQUE PEOPLE,
// sequentially. Each step = distinct visitors who reached it AND every step
// before (longest contiguous prefix, insights_funnel_users RPC), so the strip
// always shrinks and the % reads as true drop-off — replacing the old
// event-count version whose steps didn't decrease (a modal "shown" more than a
// CTA "clicked"). Two clean journeys via getFunnelUsers(ACQUISITION_STEPS /
// COMPLETION_STEPS), still windowed/bot-filtered/smart-filtered through the
// shared AdminFilters contract.

import Link from 'next/link'
import { ArrowRight, Filter } from 'lucide-react'
import { FilterBar } from '@/components/admin/filter-bar'
import { MetricInfo } from '@/components/admin/metric-info'
import { FunnelStrip, MetricCard, type FunnelStepDatum } from '@/components/admin/charts'
import { parseAdminFilters } from '@/lib/admin/filters'
import { SCHEMA_EVENT_NAMES } from '@/lib/analytics-schema'
import { getFunnelUsers, ACQUISITION_STEPS, COMPLETION_STEPS, type FunnelUserStep } from '@/lib/admin/plan-conversion'
import { getCountryFilterOptions } from '../queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Funnels — Admin' }

export default async function FunnelsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const filters = parseAdminFilters(sp)

  const [acquisition, journey, countryOptions] = await Promise.all([
    getFunnelUsers(ACQUISITION_STEPS, filters),
    getFunnelUsers(COMPLETION_STEPS, filters),
    getCountryFilterOptions(),
  ])

  // Both funnels now count unique PEOPLE who reached each step (sequential —
  // longest contiguous prefix), so the strip always shrinks step to step.
  const byEvent = (rows: FunnelUserStep[], ev: string) => rows.find((r) => r.step === ev)?.users ?? 0
  const acquisitionSteps: FunnelStepDatum[] = acquisition.map((s) => ({ label: s.label, value: s.users }))
  const journeySteps: FunnelStepDatum[] = journey.map((s) => ({ label: s.label, value: s.users }))

  const sawCta = byEvent(acquisition, 'plan_cta_impression')
  const signedUp = byEvent(acquisition, 'signup_completed')
  const planStarted = byEvent(journey, 'plan_started')
  const planCompleted = byEvent(journey, 'plan_completed')
  const completionRate = planStarted > 0 ? Math.round((planCompleted / planStarted) * 1000) / 10 : 0

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

      <p className="mb-6 max-w-3xl text-xs text-zinc-500">
        Both funnels count <span className="font-medium text-zinc-300">unique people</span>, sequentially —
        each step is the count of distinct visitors who reached it <em>and every step before it</em>, so the
        numbers always shrink and the % is the share who made it from the previous step. Over{' '}
        {filters.range.label.toLowerCase()}, {filters.includeBots ? 'bots included' : 'humans only'}; the smart
        filters above apply to every step.
      </p>

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

      <div className="mt-6 text-xs text-zinc-500">
        Per-surface conversion, the typed-goal intent stream and the anon→known link rate live on{' '}
        <Link href="/admin/plan-conversion" className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300">
          Plan conversion <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>
    </div>
  )
}
