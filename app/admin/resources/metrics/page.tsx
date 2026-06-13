// Phase 10.8 — Resources §4: Metric provenance cards. AUTO-GENERATED at render
// time from lib/admin/metric-docs.ts — the SAME data the ⓘ popovers on the
// dashboard show — so the guide and the popovers can never disagree. For every
// headline metric: what it counts / how it's computed / why it's trusted /
// caveats. Grouped by admin area; the grouping is exhaustive by construction
// (any metric-doc key not placed in a group surfaces in an "ungrouped" block).

import { GanttChartSquare } from 'lucide-react'
import { GuideHeader, Callout, GuideFooterNav } from '../_components'
import { METRIC_DOCS, type MetricDoc, type MetricDocKey } from '@/lib/admin/metric-docs'

export const metadata = { title: 'Metric provenance — Learning guide' }

/**
 * Ordered groups of metric-doc keys by admin area. The Overview group is
 * first and exactly mirrors the Overview dashboard tiles — that ordering is
 * what the Phase 8 acceptance test checks (every Overview tile has a card).
 * Keys not listed here still render (in the "Other metrics" group), so the
 * page can never silently omit a documented metric.
 */
const GROUPS: Array<{ title: string; blurb: string; keys: MetricDocKey[] }> = [
  {
    title: 'Overview dashboard',
    blurb: 'Every tile on the main /admin dashboard. If you can read these cards, you can explain the whole Overview screen.',
    keys: [
      'kpi_visitors', 'kpi_page_views', 'kpi_signed_in', 'kpi_signups', 'kpi_outclicks', 'kpi_newsletter',
      'right_now_pulse', 'dau_trend',
      'top_sources', 'top_channels', 'top_pages', 'top_events', 'top_tools_viewed', 'top_tools_clicked',
    ],
  },
  {
    title: 'Audience',
    blurb: 'Who the visitors are — directory, geography, devices.',
    keys: [
      'users_directory', 'users_returning_badge',
      'geo_countries', 'geo_referrers', 'geo_utm',
      'devices_breakdown', 'devices_browser_os', 'devices_adblock',
    ],
  },
  {
    title: 'Behavior',
    blurb: 'What visitors do — the events explorer and per-tool engagement.',
    keys: [
      'events_volume_list', 'event_property_breakdown', 'event_raw_stream',
      'tools_heatmap', 'tool_audience',
    ],
  },
  {
    title: 'Funnels & conversion',
    blurb: 'How visitors move through the plan flow and where they drop.',
    keys: [
      'funnel_plan_journey', 'funnel_plan_acquisition', 'plan_surface_breakdown',
      'plan_intent_stream', 'plan_link_rate',
    ],
  },
  {
    title: 'Revenue (Sentiment Checker)',
    blurb: 'The paid sentiment funnel, the money collected, and scan health.',
    keys: ['sentiment_funnel', 'sentiment_revenue', 'sentiment_scan_health'],
  },
  {
    title: 'SEO & Growth',
    blurb: 'Search Console totals, title-change impact, niche pages, AI citations, authority.',
    keys: [
      'seo_pulse_wow', 'seo_pulse_queue', 'seo_impact_summary', 'niche_tracker_summary',
      'ai_citations_kpis', 'authority_summary', 'tier1_queue',
    ],
  },
  {
    title: 'Content Ops',
    blurb: 'The catalog, the content pipelines, and the daily growth checklist.',
    keys: [
      'kr_catalog_state', 'kr_user_activity', 'kr_activity_feed', 'kr_pipeline_results',
      'kr_pipeline_cost', 'kr_health_score', 'tools_catalog_freshness', 'freshness_field_map',
      'daily_checklist',
    ],
  },
  {
    title: 'Pipelines & Health',
    blurb: 'Whether the automated jobs are running on schedule.',
    keys: [
      'pipeline_health_kpis', 'pipeline_sla', 'pipeline_monitors', 'catalog_freshness_sla',
    ],
  },
  {
    title: 'Tracking & capture health',
    blurb: 'Meta-metrics about the tracking system itself.',
    keys: ['event_capture_health', 'mixpanel_volume_budget'],
  },
]

function MetricCard({ doc }: { doc: MetricDoc }) {
  return (
    <div id={`metric-${doc.key}`} className="scroll-mt-20 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">{doc.title}</h3>
        <span className="font-mono text-[10px] text-zinc-600">{doc.key}</span>
      </div>
      <dl className="mt-3 space-y-2.5">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500">What this counts</dt>
          <dd className="mt-0.5 text-[12px] leading-relaxed text-zinc-300">{doc.whatItCounts}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-sky-500">How it&apos;s computed</dt>
          <dd className="mt-0.5 text-[12px] leading-relaxed text-zinc-400">{doc.howComputed}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-violet-400">Why it&apos;s trustworthy</dt>
          <dd className="mt-0.5 text-[12px] leading-relaxed text-zinc-400">{doc.whyTrusted}</dd>
        </div>
        {doc.caveats.length > 0 && (
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-amber-500">Caveats</dt>
            <dd className="mt-0.5">
              <ul className="list-disc space-y-1 pl-4 text-[12px] leading-relaxed text-zinc-500">
                {doc.caveats.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </dd>
          </div>
        )}
      </dl>
    </div>
  )
}

export default function MetricProvenancePage() {
  const allKeys = Object.keys(METRIC_DOCS) as MetricDocKey[]
  const placed = new Set(GROUPS.flatMap((g) => g.keys))
  const ungrouped = allKeys.filter((k) => !placed.has(k))

  const renderGroups = ungrouped.length
    ? [...GROUPS, { title: 'Other metrics', blurb: 'Documented metrics not yet placed in a section above.', keys: ungrouped }]
    : GROUPS

  return (
    <div>
      <GuideHeader
        icon={<GanttChartSquare className="h-6 w-6 text-emerald-500" />}
        title="Metric provenance cards"
        subtitle={`For each of the ${allKeys.length} headline metrics on these screens: exactly what it counts, how it's computed (table/RPC, window and bot rules), why it can be trusted (which verification mean covers it), and its caveats. This is the same content behind every ⓘ popover on the dashboard — generated from lib/admin/metric-docs.ts, never hand-copied.`}
      />

      <Callout tone="good" title="The acceptance test, in your hands">
        The <strong>Overview dashboard</strong> group below has one card for every tile on the main
        dashboard. Read those fourteen cards and you can explain what each Overview tile means AND
        why it&apos;s trustworthy — without leaving this guide. That is the literal goal of the
        Resources section.
      </Callout>

      <p className="mb-6 mt-4 text-sm text-zinc-400">
        Jump to:{' '}
        {renderGroups.map((g, i) => {
          const anchor = g.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
          return (
            <span key={g.title}>
              <a href={`#grp-${anchor}`} className="text-emerald-400 hover:text-emerald-300">{g.title}</a>
              {i < renderGroups.length - 1 ? <span className="text-zinc-700"> · </span> : null}
            </span>
          )
        })}
      </p>

      {renderGroups.map((g) => {
        const anchor = g.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        return (
          <section key={g.title} id={`grp-${anchor}`} className="mb-10 scroll-mt-20">
            <div className="mb-3">
              <h2 className="text-base font-semibold text-zinc-100">{g.title}</h2>
              <p className="text-xs text-zinc-500">{g.blurb}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {g.keys.map((k) => (
                <MetricCard key={k} doc={METRIC_DOCS[k]} />
              ))}
            </div>
          </section>
        )
      })}

      <GuideFooterNav
        prev={{ href: '/admin/resources/event-dictionary', label: 'Event dictionary' }}
        next={{ href: '/admin/resources/trust', label: 'Trust & verification' }}
      />
    </div>
  )
}
