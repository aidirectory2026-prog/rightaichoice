/**
 * Phase 8.g.4 v2 (2026-05-20) — actually create Mixpanel dashboards via API.
 *
 * Previous version only logged a manual setup checklist. This one uses the
 * newer /api/app/projects/.../dashboards/ + /bookmarks/ endpoints which DO
 * work on the free tier (confirmed via probe).
 *
 * Free-tier capability matrix (confirmed 2026-05-20):
 *   ✓ Create dashboards
 *   ✓ Create insights bookmarks (charts) attached to a dashboard
 *   ✗ Create cohorts ("plan does not allow saving cohorts")
 *   ✗ Create funnels ("plan does not allow API calls" — old 2.0 API blocked)
 *   ✗ Create alerts (paid tier only)
 *
 * What this script does:
 *   1. Reads dashboard-spec.ts (source of truth)
 *   2. Skips dashboards that already exist (idempotent by title)
 *   3. Creates new dashboards + attaches insights tiles
 *   4. Logs a click-by-click guide for cohorts/funnels/alerts at the end
 *
 * Run: npm run mixpanel:dashboards        (apply to live)
 *      npm run mixpanel:dashboards:dry    (preview only)
 */

import { COHORTS, FUNNELS, ALERTS } from './config/dashboard-spec'

const PROJECT_ID = process.env.MIXPANEL_PROJECT_ID
const USERNAME = process.env.MIXPANEL_SERVICE_ACCOUNT_USERNAME
const SECRET = process.env.MIXPANEL_SERVICE_ACCOUNT_SECRET
const HOST = process.env.MIXPANEL_API_HOST || 'https://eu.mixpanel.com'

if (!PROJECT_ID || !USERNAME || !SECRET) {
  console.error('Missing Mixpanel env. Need MIXPANEL_PROJECT_ID + MIXPANEL_SERVICE_ACCOUNT_USERNAME + MIXPANEL_SERVICE_ACCOUNT_SECRET.')
  process.exit(1)
}

const auth = Buffer.from(`${USERNAME}:${SECRET}`).toString('base64')
const HEADERS = {
  authorization: `Basic ${auth}`,
  'content-type': 'application/json',
  accept: 'application/json',
}
const dryRun = process.argv.includes('--dry-run')

// ── Tile (insight chart) spec — what we build via the bookmarks API ──
type ChartType = 'metric' | 'line' | 'bar'
type Measurement = 'unique' | 'total'
type TimeWindow =
  | { kind: 'last_n_days'; days: number }
  | { kind: 'today_minutes' }
  | { kind: 'last_n_hours'; hours: number }

interface Tile {
  title: string
  event: string                  // event name (or '$all_events')
  chart: ChartType
  measurement: Measurement       // 'unique' = unique users, 'total' = total events
  time: TimeWindow
  breakdownProperty?: string     // for bar charts — group by this property
}

interface Board {
  title: string
  description: string
  tiles: Tile[]
}

// ── Param-shape builder ─────────────────────────────────────────────
// The Mixpanel bookmarks API expects `params` as a JSON-stringified object
// with a deeply-nested schema. This builder produces a minimal but valid
// shape for each combination we use. Verified by cloning live bookmarks.
function buildParams(t: Tile): string {
  // Map chart type → Mixpanel chartType key
  const chartType =
    t.chart === 'metric' ? 'insights-metric' : t.chart === 'line' ? 'line' : 'bar'

  // Time section
  let timeSection: Record<string, unknown>
  if (t.time.kind === 'last_n_days') {
    timeSection = { dateRangeType: 'in the last', unit: 'day', value: t.time.days }
  } else if (t.time.kind === 'today_minutes') {
    timeSection = { dateRangeType: 'since', unit: 'minute', value: '$start_of_current_day' }
  } else {
    timeSection = { dateRangeType: 'in the last', unit: 'hour', value: t.time.hours }
  }

  const showEntry: Record<string, unknown> = {
    behavior: {
      type: 'simple',
      name: t.event,
      hasUnsavedChanges: false,
      resourceType: 'events',
      dataGroupId: null,
      filters: [],
      behaviors: [
        {
          type: 'event',
          id: null,
          name: t.event,
          filters: [],
          filtersDeterminer: null,
        },
      ],
    },
    measurement: {
      math: t.measurement === 'unique' ? 'unique' : 'total',
      perUserAggregation: null,
      property: null,
      rolling: null,
      cumulative: false,
      multiAttribution: null,
    },
    isHidden: false,
    labelPrefix: null,
    type: 'metric',
  }

  const groupSection = t.breakdownProperty
    ? [
        {
          propertyType: 'string',
          resourceType: 'events',
          value: t.breakdownProperty,
          label: t.breakdownProperty,
          unit: null,
          typeCast: null,
          filter: null,
        },
      ]
    : []

  const params = {
    columnWidths: { bar: {} },
    displayOptions: {
      analysis: 'linear',
      chartType,
      plotStyle: 'standard',
      value: 'absolute',
      primaryYAxisOptions: { min: 0, useSoftMinMax: true },
    },
    sections: {
      filter: [],
      formula: [],
      group: groupSection,
      show: [showEntry],
      time: [timeSection],
    },
    sorting: {
      bar: { colSortAttrs: [{ sortBy: 'value', sortOrder: 'desc' }], sortBy: 'column' },
      'insights-metric': {
        colSortAttrs: [{ sortBy: 'value', sortOrder: 'desc', valueField: 'totalValue' }],
        sortBy: 'value',
        sortOrder: 'desc',
        valueField: 'totalValue',
      },
      line: {
        colSortAttrs: [{ sortBy: 'value', sortOrder: 'desc', valueField: 'averageValue' }],
        sortBy: 'value',
        sortOrder: 'desc',
        valueField: 'averageValue',
      },
    },
  }

  return JSON.stringify(params)
}

// ── Six dashboards × tiles ──────────────────────────────────────────
// Every event below MUST exist in scripts/mixpanel/config/events.ts.
// Tiles use existing events from the lexicon push.
const BOARDS: Board[] = [
  {
    title: 'RAC — Acquisition',
    description: 'How traffic enters: page views, sources, signup rate. Use this to see if marketing campaigns convert.',
    tiles: [
      { title: 'Page views — last 7d', event: 'page_viewed', chart: 'line', measurement: 'total', time: { kind: 'last_n_days', days: 7 } },
      { title: 'Unique visitors — last 7d', event: 'page_viewed', chart: 'line', measurement: 'unique', time: { kind: 'last_n_days', days: 7 } },
      { title: 'Signups — last 30d', event: 'signup_completed', chart: 'line', measurement: 'total', time: { kind: 'last_n_days', days: 30 } },
      { title: 'Page views by device — 7d', event: 'page_viewed', chart: 'bar', measurement: 'unique', time: { kind: 'last_n_days', days: 7 }, breakdownProperty: 'device_type' },
      { title: 'Newsletter subs — 30d', event: 'newsletter_subscribed', chart: 'metric', measurement: 'total', time: { kind: 'last_n_days', days: 30 } },
    ],
  },
  {
    title: 'RAC — Plan Funnel',
    description: 'The plan flow — your highest-intent vendor signal. Where users drop off in the flow.',
    tiles: [
      { title: 'Plan started — 7d', event: 'plan_started', chart: 'metric', measurement: 'total', time: { kind: 'last_n_days', days: 7 } },
      { title: 'Plan intake submitted — 7d', event: 'plan_intake_submitted', chart: 'metric', measurement: 'total', time: { kind: 'last_n_days', days: 7 } },
      { title: 'Plan completed — 7d', event: 'plan_completed', chart: 'metric', measurement: 'total', time: { kind: 'last_n_days', days: 7 } },
      { title: 'Plan results clicked — 7d', event: 'plan_results_tool_clicked', chart: 'line', measurement: 'total', time: { kind: 'last_n_days', days: 7 } },
      { title: 'Plan tools added (existing) — 7d', event: 'plan_existing_tool_added', chart: 'bar', measurement: 'total', time: { kind: 'last_n_days', days: 7 }, breakdownProperty: 'tool_name' },
    ],
  },
  {
    title: 'RAC — Engagement',
    description: 'Active users, retention proxy, top events. The "is the site alive?" board.',
    tiles: [
      { title: 'Active users today', event: '$all_events', chart: 'metric', measurement: 'unique', time: { kind: 'today_minutes' } },
      { title: 'Active users — 7d', event: '$all_events', chart: 'metric', measurement: 'unique', time: { kind: 'last_n_days', days: 7 } },
      { title: 'Active users — 30d', event: '$all_events', chart: 'metric', measurement: 'unique', time: { kind: 'last_n_days', days: 30 } },
      { title: 'Daily active users — 30d trend', event: '$all_events', chart: 'line', measurement: 'unique', time: { kind: 'last_n_days', days: 30 } },
      { title: 'Tool page views — 7d', event: 'tool_page_viewed', chart: 'line', measurement: 'total', time: { kind: 'last_n_days', days: 7 } },
      { title: 'Tools saved — 7d', event: 'tool_saved', chart: 'metric', measurement: 'total', time: { kind: 'last_n_days', days: 7 } },
    ],
  },
  {
    title: 'RAC — Search',
    description: 'Search behaviour. Zero-result rate reveals catalog gaps. Top queries reveal new content opportunities.',
    tiles: [
      { title: 'Searches — 7d', event: 'search_query_submitted', chart: 'line', measurement: 'total', time: { kind: 'last_n_days', days: 7 } },
      { title: 'Search results clicked — 7d', event: 'search_result_clicked', chart: 'line', measurement: 'total', time: { kind: 'last_n_days', days: 7 } },
      { title: 'Top searched terms — 30d', event: 'search_query_submitted', chart: 'bar', measurement: 'total', time: { kind: 'last_n_days', days: 30 }, breakdownProperty: 'query' },
      { title: 'Search typing volume — 7d', event: 'search_typing', chart: 'line', measurement: 'total', time: { kind: 'last_n_days', days: 7 } },
    ],
  },
  {
    title: 'RAC — AI Chat',
    description: 'AI chat usage. Which tools users ask about. Conversation depth.',
    tiles: [
      { title: 'AI chat messages — 7d', event: 'ai_chat_message', chart: 'line', measurement: 'total', time: { kind: 'last_n_days', days: 7 } },
      { title: 'Unique AI chat users — 7d', event: 'ai_chat_message', chart: 'metric', measurement: 'unique', time: { kind: 'last_n_days', days: 7 } },
      { title: 'AI tool clicked from chat — 7d', event: 'ai_chat_tool_clicked', chart: 'line', measurement: 'total', time: { kind: 'last_n_days', days: 7 } },
      { title: 'Tools mentioned in chat — 30d', event: 'ai_chat_message', chart: 'bar', measurement: 'total', time: { kind: 'last_n_days', days: 30 }, breakdownProperty: 'mentioned_tool_slugs' },
    ],
  },
  {
    title: 'RAC — Vendor Audience Snapshot',
    description: 'THE SALABLE ARTIFACT. Per-tool audience: visitors, save rate, click-through, comparisons. Filter date range by 30d to pitch vendors.',
    tiles: [
      { title: 'Most viewed tools — 30d', event: 'tool_page_viewed', chart: 'bar', measurement: 'unique', time: { kind: 'last_n_days', days: 30 }, breakdownProperty: 'tool_slug' },
      { title: 'Most clicked-out tools — 30d', event: 'tool_visit_redirected', chart: 'bar', measurement: 'total', time: { kind: 'last_n_days', days: 30 }, breakdownProperty: 'tool_slug' },
      { title: 'Most saved tools — 30d', event: 'tool_saved', chart: 'bar', measurement: 'total', time: { kind: 'last_n_days', days: 30 }, breakdownProperty: 'tool_slug' },
      { title: 'Most compared tools — 30d', event: 'comparison_viewed', chart: 'bar', measurement: 'total', time: { kind: 'last_n_days', days: 30 }, breakdownProperty: 'tools' },
      { title: 'Most recommended in plan — 30d', event: 'plan_results_displayed', chart: 'bar', measurement: 'total', time: { kind: 'last_n_days', days: 30 }, breakdownProperty: 'recommended_tool_slugs' },
    ],
  },
]

// ── Provisioning helpers ────────────────────────────────────────────
type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string }

async function api<T = unknown>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  const res = await fetch(`${HOST}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) {
    return { ok: false, status: res.status, error: text.slice(0, 400) }
  }
  try {
    return { ok: true, data: JSON.parse(text) as T }
  } catch {
    return { ok: true, data: text as unknown as T }
  }
}

interface DashboardRow {
  id: number
  title: string
}

async function listDashboards(): Promise<DashboardRow[]> {
  const r = await api<{ results: DashboardRow[] }>('GET', `/api/app/projects/${PROJECT_ID}/dashboards/`)
  if (!r.ok) {
    console.error('Failed to list dashboards:', r.error)
    return []
  }
  return r.data.results ?? []
}

async function createDashboard(board: Board): Promise<number | null> {
  if (dryRun) {
    console.log(`  [dry-run] would create dashboard: ${board.title}`)
    return -1
  }
  const r = await api<{ results: { id: number } }>('POST', `/api/app/projects/${PROJECT_ID}/dashboards/`, {
    title: board.title,
    description: board.description,
  })
  if (!r.ok) {
    console.error(`  ✗ Dashboard "${board.title}" failed (${r.status}):`, r.error)
    return null
  }
  console.log(`  ✓ Dashboard created: ${board.title} (id=${r.data.results.id})`)
  return r.data.results.id
}

async function createTile(dashboardId: number, tile: Tile): Promise<boolean> {
  if (dryRun) {
    console.log(`    [dry-run] would create tile: ${tile.title}`)
    return true
  }
  // Mixpanel bug: dashboard_id in POST body is silently ignored on free tier.
  // Must POST first (creates orphan), then PATCH dashboard_id to attach.
  const created = await api<{ results: { id: number } }>('POST', `/api/app/projects/${PROJECT_ID}/bookmarks/`, {
    name: tile.title,
    type: 'insights',
    params: buildParams(tile),
  })
  if (!created.ok) {
    console.error(`    ✗ Tile "${tile.title}" failed at POST (${created.status}):`, created.error)
    return false
  }
  const bookmarkId = created.data.results.id
  const attached = await api('PATCH', `/api/app/projects/${PROJECT_ID}/bookmarks/${bookmarkId}`, {
    dashboard_id: dashboardId,
  })
  if (!attached.ok) {
    console.error(`    ⚠ Tile "${tile.title}" created (id=${bookmarkId}) but PATCH failed (${attached.status}):`, attached.error)
    return false
  }
  console.log(`    ✓ Tile: ${tile.title}`)
  return true
}

function logManualChecklist(): void {
  console.log('\n────────────────────────────────────────────────────────────')
  console.log('MANUAL SETUP (Mixpanel free tier blocks API for these)')
  console.log('────────────────────────────────────────────────────────────\n')
  console.log(`Open: https://eu.mixpanel.com/project/${PROJECT_ID}\n`)
  console.log(`COHORTS (${COHORTS.length}) — Users tab → Cohorts → New Cohort`)
  COHORTS.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.name}`)
    console.log(`     Filter: ${c.filter}`)
  })
  console.log(`\nFUNNELS (${FUNNELS.length}) — Reports → Funnels → New funnel`)
  FUNNELS.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.name}`)
    console.log(`     Steps: ${f.steps.join(' → ')}`)
    console.log(`     Window: ${f.windowDays} days`)
  })
  console.log(`\nALERTS (${ALERTS.length}) — paid feature; skip unless upgrading`)
  ALERTS.forEach((a, i) => {
    console.log(`  ${i + 1}. ${a.name} — ${a.triggerOn}`)
  })
}

// ── Main ────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log(`Mixpanel project ${PROJECT_ID} @ ${HOST} ${dryRun ? '(DRY RUN — no writes)' : ''}\n`)

  const existing = await listDashboards()
  const existingByTitle = new Map(existing.map((d) => [d.title, d.id] as const))

  let createdCount = 0
  let skippedCount = 0
  let tilesCreated = 0
  let tilesFailed = 0

  for (const board of BOARDS) {
    console.log(`\n📊 Board: ${board.title}`)
    if (existingByTitle.has(board.title)) {
      console.log(`  ↺ Already exists (id=${existingByTitle.get(board.title)}) — skipping`)
      skippedCount++
      continue
    }
    const id = await createDashboard(board)
    if (id === null) continue
    createdCount++
    for (const tile of board.tiles) {
      const ok = await createTile(id, tile)
      if (ok) tilesCreated++
      else tilesFailed++
      await new Promise((r) => setTimeout(r, 250)) // pace requests to avoid rate limiting
    }
  }

  console.log('\n────────────────────────────────────────────────────────────')
  console.log(`Dashboards: ${createdCount} created, ${skippedCount} already existed`)
  console.log(`Tiles:      ${tilesCreated} created, ${tilesFailed} failed`)
  console.log('────────────────────────────────────────────────────────────')
  console.log(`\nOpen Mixpanel to view: https://eu.mixpanel.com/project/${PROJECT_ID}/view/4511061/app/boards`)

  logManualChecklist()
}

void main().catch((e: unknown) => {
  console.error('Fatal:', e)
  process.exit(1)
})
