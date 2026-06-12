// Phase 10.5b.3 (2026-06-12) — Funnels, rebuilt on the shared kit.
//
// The two VERIFIED plan funnels, both windowed/bot-filtered/smart-filtered
// through the same AdminFilters contract every other rebuilt page uses:
//   1. Plan acquisition (lib/admin/plan-conversion.ts getPlanFunnel):
//      CTA shown → clicked → modal → (4a/4b branches) → signup → /plan →
//      finalized — with step-over-step % on the MAIN path only.
//   2. Plan journey (insights getPlanFunnel): started → intake → completed
//      → recommended-tool click.
// Replaces the old unique-users site funnel (insights_funnel_steps RPC),
// whose p_days-only window could not honor calendar-anchored ranges — its
// removal is documented in docs/admin/phase5b-gate.md.

import Link from 'next/link'
import { ArrowRight, Filter } from 'lucide-react'
import { FilterBar } from '@/components/admin/filter-bar'
import { MetricInfo } from '@/components/admin/metric-info'
import { FunnelStrip, MetricCard, type FunnelStepDatum } from '@/components/admin/charts'
import { parseAdminFilters } from '@/lib/admin/filters'
import { SCHEMA_EVENT_NAMES } from '@/lib/analytics-schema'
import { EVENT_FUNNEL, getPlanFunnel as getAcquisitionFunnel } from '@/lib/admin/plan-conversion'
import { getCountryFilterOptions, getPlanFunnel as getJourneyFunnel } from '../queries'

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
    getAcquisitionFunnel(filters),
    getJourneyFunnel(filters),
    getCountryFilterOptions(),
  ])

  // Join the 4a/4b branch flags back onto the funnel counts (the query
  // result shape stays oracle-identical; presentation metadata lives in
  // the exported EVENT_FUNNEL definition).
  const branchByStep = new Map(EVENT_FUNNEL.map((s) => [s.event, !!s.branch]))
  const acquisitionSteps: FunnelStepDatum[] = acquisition.map((s) => ({
    label: s.label,
    value: s.count,
    branch: branchByStep.get(s.step),
  }))
  const journeySteps: FunnelStepDatum[] = journey.map((s) => ({ label: s.label, value: s.value }))

  const ctaShown = acquisition[0]?.count ?? 0
  const planFinalized = acquisition[acquisition.length - 1]?.count ?? 0
  const endToEnd = ctaShown > 0 ? Math.round((planFinalized / ctaShown) * 1000) / 10 : 0
  const journeyStarted = journey[0]?.value ?? 0
  const journeyClicked = journey[journey.length - 1]?.value ?? 0

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
        Both funnels count EVENTS per step over {filters.range.label.toLowerCase()},{' '}
        {filters.includeBots ? 'bots included' : 'humans only (audit F6)'}; the smart filters above apply to every step.
        Step-over-step % compares each main step with the previous main step — the 4a/4b modal branches are shown
        against step 3 and excluded from the main path.
      </p>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="CTA impressions" value={ctaShown} info={<MetricInfo docKey="funnel_plan_acquisition" />} />
        <MetricCard label="Plans finalized" value={planFinalized} extra={<span className="text-[10px] text-zinc-500">{endToEnd}% of CTA impressions</span>} />
        <MetricCard label="Plan flow started" value={journeyStarted} info={<MetricInfo docKey="funnel_plan_journey" />} />
        <MetricCard label="Result-tool clicks" value={journeyClicked} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FunnelStrip
          title="Plan acquisition — CTA → signup → plan"
          steps={acquisitionSteps}
          info={<MetricInfo docKey="funnel_plan_acquisition" />}
        />
        <FunnelStrip
          title="Plan journey — inside the flow"
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
