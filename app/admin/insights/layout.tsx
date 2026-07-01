import Link from 'next/link'
import { Activity, BarChart3, ChevronLeft, Filter, Globe2, Layers, Monitor, Users, Wrench } from 'lucide-react'
import { LiveTickerBadge } from './_ui/live-ticker-badge'

export const metadata = { title: 'Insights — Admin' }

const TABS = [
  { href: '/admin/insights', label: 'Overview', icon: BarChart3 },
  { href: '/admin/insights/live', label: 'Live', icon: Activity, badge: true },
  { href: '/admin/insights/funnel', label: 'Funnel', icon: Filter },
  { href: '/admin/insights/tools', label: 'Tools', icon: Wrench },
  { href: '/admin/insights/geo', label: 'Geo', icon: Globe2 },
  { href: '/admin/insights/devices', label: 'Devices', icon: Monitor },
  // 10.5c.4 — journeys merged: index → Users directory, per-user journey →
  // the user 360 page's "Journey" tab.
  { href: '/admin/insights/users', label: 'Users', icon: Users },
  // Phase 14 — surface the (existing but hidden) cohort builder in the tab
  // strip: build a segment (did/didn't event, sequence, property; AND/OR),
  // save it, run it. This is the "user-by-user / cohort" power the founder
  // said was missing — it existed only in the left sidebar before.
  { href: '/admin/insights/cohorts', label: 'Cohorts', icon: Layers },
] as const

export default function InsightsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mt-8 -mx-4 sm:-mx-6 lg:-mx-8">
      <div className="border-b border-zinc-800/80 bg-zinc-950/60 backdrop-blur-sm sticky top-14 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Link href="/admin" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 shrink-0">
                <ChevronLeft className="h-3 w-3" />Admin
              </Link>
              <span className="text-zinc-700">/</span>
              <h1 className="text-sm font-semibold text-white shrink-0">Insights</h1>
              <LiveTickerBadge />
            </div>
          </div>
          <nav className="flex items-center gap-1 overflow-x-auto -mx-1 px-1 pb-1">
            {TABS.map((t) => {
              const Icon = t.icon
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors whitespace-nowrap"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </div>
    </div>
  )
}
