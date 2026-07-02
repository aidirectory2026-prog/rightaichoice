import { LiveFeed } from './live-feed'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { FilterBar } from '@/components/admin/filter-bar'
import { filtersToJsonb, parseAdminFilters, type AdminFilters } from '@/lib/admin/filters'
import { withCohort } from '@/lib/admin/cohort-filter'
import { SCHEMA_EVENT_NAMES } from '@/lib/analytics-schema'
import { getCountryFilterOptions } from '../queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Live · Insights' }

async function getInitialData(f: AdminFilters) {
  const db = getAdminClient()
  const jsonb = filtersToJsonb(f)
  const [{ data: sessions }, { data: feed }] = await Promise.all([
    db.rpc('insights_live_sessions' as never, { p_active_within_sec: 300, p_include_bots: f.includeBots, p_filters: jsonb } as never),
    db.rpc('insights_activity_feed' as never, { p_limit: 50, p_include_bots: f.includeBots, p_filters: jsonb } as never),
  ])
  return {
    sessions: (sessions ?? []) as LiveSession[],
    feed: (feed ?? []) as ActivityEvent[],
  }
}

export type LiveSession = {
  distinct_id: string
  user_id: string | null
  auth_state: string
  last_event_at: string
  seconds_since_last: number
  current_page: string | null
  current_event: string
  events_in_window: number
  pages_in_window: number
  country: string | null
  city: string | null
  region: string | null
  device_type: string | null
  utm_source: string | null
  referrer: string | null
  is_active: boolean
}

export type ActivityEvent = {
  id: string
  created_at: string
  distinct_id: string
  event_name: string
  page_path: string | null
  country: string | null
  city: string | null
  device_type: string | null
  tool_slug: string | null
  source_kind: string
}

export default async function LivePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const filters = await withCohort(parseAdminFilters(sp), sp)
  const [initial, countryOptions] = await Promise.all([getInitialData(filters), getCountryFilterOptions()])
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {/* No RangePicker: Live is a fixed 5-minute window by definition. */}
        <FilterBar activeRange={filters.range.key} countries={countryOptions} eventNames={[...SCHEMA_EVENT_NAMES]} showRange={false} />
      </div>
      <LiveFeed
        initialSessions={initial.sessions}
        initialFeed={initial.feed}
        includeBots={filters.includeBots}
        filtersJsonb={filtersToJsonb(filters)}
      />
    </div>
  )
}
