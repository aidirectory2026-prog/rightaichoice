// Phase 8.g.9 (2026-05-21) — /admin/insights/goals — KPI dashboard with
// editable targets. Vendor-pitch readiness up top (user priority), then
// acquisition, engagement, data quality.

import Link from 'next/link'
import { ChevronLeft, Target } from 'lucide-react'
import { getKpiRows } from '../queries'
import { SectionHeading } from '../charts'
import { GoalRow } from './goal-row'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'KPI goals — Admin' }

const CATEGORIES: Array<{ key: string; title: string; subtitle: string }> = [
  { key: 'vendor', title: 'Vendor-pitch readiness', subtitle: 'THE salable artifact. These KPIs unlock vendor outreach.' },
  { key: 'acq', title: 'Acquisition + conversion', subtitle: 'Traffic in, conversion through the funnel.' },
  { key: 'eng', title: 'Engagement', subtitle: 'Active users, repeat visits, depth.' },
  { key: 'data', title: 'Data quality (trust)', subtitle: 'Confirms the instrumentation is healthy.' },
]

export default async function GoalsPage() {
  const rows = await getKpiRows()
  const byCategory = new Map<string, typeof rows>()
  for (const r of rows) {
    const list = byCategory.get(r.category) ?? []
    list.push(r)
    byCategory.set(r.category, list)
  }

  const overallScore = rows.length > 0
    ? Math.round(rows.reduce((s, r) => s + Math.min(100, r.pct_of_goal), 0) / rows.length)
    : 0

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/insights" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
            <ChevronLeft className="h-3 w-3" />
            Insights
          </Link>
          <span className="text-zinc-700">/</span>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Target className="h-5 w-5 text-emerald-500" />
            KPI Goals
          </h1>
        </div>
        <div className="rounded border border-zinc-800 px-3 py-1.5 text-xs">
          <span className="text-zinc-500">Overall on-track:</span>{' '}
          <span className={overallScore >= 60 ? 'text-emerald-300' : overallScore >= 30 ? 'text-amber-300' : 'text-red-300'}>
            {overallScore}%
          </span>
        </div>
      </div>

      <p className="mb-6 text-xs text-zinc-500">
        Click any goal number (pencil icon) to edit. Targets seed from sensible defaults; tune them as the site grows.
        Current values exclude bot traffic. All values from last 7d unless noted.
      </p>

      {CATEGORIES.map((cat) => {
        const catRows = byCategory.get(cat.key) ?? []
        if (catRows.length === 0) return null
        return (
          <div key={cat.key}>
            <SectionHeading title={cat.title} subtitle={cat.subtitle} />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {catRows.map((r) => (
                <GoalRow
                  key={r.kpi_key}
                  kpiKey={r.kpi_key}
                  displayName={r.display_name}
                  description={r.description}
                  goal={r.goal_value}
                  current={r.current_value}
                  pctOfGoal={r.pct_of_goal}
                  unit={r.unit}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
