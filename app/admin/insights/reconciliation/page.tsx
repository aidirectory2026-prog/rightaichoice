// Phase 8.g.8 (2026-05-21) — Mixpanel vs admin-panel reconciliation
// explainer. Mixpanel free tier blocks the Query API, so we can't pull
// Mixpanel's numbers programmatically. Instead, we show OUR Supabase
// numbers + the structural reasons they will always differ from
// Mixpanel's, plus the actual measurable offsets (server events,
// bot events, anon-merge gap).

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { type DayWindow, getReconciliationStats } from '../queries'
import { parseRange } from '@/lib/admin/range'
import { baseFilters } from '@/lib/admin/filters'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Mixpanel vs admin — Admin' }

const WINDOWS: { value: DayWindow; label: string }[] = [
  { value: 1, label: '24h' },
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
]

export default async function ReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; mp?: string }>
}) {
  const sp = await searchParams
  const requested = Number(sp.days ?? '7') as DayWindow
  const days: DayWindow = ([1, 7, 30] as DayWindow[]).includes(requested) ? requested : 7

  // Range-only on this page (includeBots is irrelevant — the bot split IS
  // the metric; see the queries.ts note).
  const stats = await getReconciliationStats(baseFilters(parseRange({ days: String(days) }), false))

  const humanEvents = stats.client_events - stats.bot_events
  const humanVisitors = stats.unique_distinct_ids_no_bots
  // 9.A.3 — triple-source reconciliation. Source B (this Supabase mirror) is
  // our operational truth. Source A (Mixpanel) is ad-block-lossy; rather than
  // ASSERT a 30% loss, accept the operator's real Mixpanel total via ?mp= and
  // MEASURE the actual ad-block ratio. Source C (Vercel Web Analytics) is an
  // independent edge counter, compared manually below.
  const assumedRatio = stats.ad_block_ratio_estimate
  const estMixpanelClient = Math.round(humanEvents * (1 - assumedRatio))
  const estMixpanelTotal = estMixpanelClient + stats.server_events
  const mpActual = sp.mp && Number.isFinite(Number(sp.mp)) ? Math.max(0, Math.round(Number(sp.mp))) : null
  const measuredClient = mpActual !== null ? Math.max(0, mpActual - stats.server_events) : null
  const measuredRatio =
    measuredClient !== null && humanEvents > 0
      ? Math.max(0, Math.min(1, 1 - measuredClient / humanEvents))
      : null

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/admin/insights?days=${days}`} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
            <ChevronLeft className="h-3 w-3" />
            Insights
          </Link>
          <span className="text-zinc-700">/</span>
          <h1 className="text-lg font-semibold text-white">Mixpanel vs admin reconciliation</h1>
        </div>
        <div className="flex gap-1">
          {WINDOWS.map((w) => (
            <Link
              key={w.value}
              href={`/admin/insights/reconciliation?days=${w.value}`}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                w.value === days
                  ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-800'
                  : 'text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              {w.label}
            </Link>
          ))}
        </div>
      </div>

      <p className="mb-6 text-xs text-zinc-500">
        Mixpanel free tier blocks the Query API, so we can&apos;t pull Mixpanel&apos;s
        numbers programmatically. This page shows our Supabase counts +
        the structural reasons they will always differ from Mixpanel.
      </p>

      {/* ── What admin shows ──────────────────────────────── */}
      <div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
        <div className="mb-3 text-sm font-medium text-zinc-200">What admin (this site) shows for last {days}d</div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Total events" value={stats.client_events + stats.server_events} />
          <Stat label="Client events" value={stats.client_events} />
          <Stat label="Server events" value={stats.server_events} />
          <Stat label="Bot events (excluded by default)" value={stats.bot_events} accent="amber" />
          <Stat label="Unique distinct_ids (raw)" value={stats.unique_distinct_ids} />
          <Stat label="Unique humans (bots out)" value={humanVisitors} accent="emerald" />
          <Stat label="Human events" value={humanEvents} accent="emerald" />
        </div>
      </div>

      {/* ── Expected Mixpanel numbers ─────────────────────── */}
      <div className="mb-6 rounded-lg border border-blue-900/50 bg-blue-950/20 p-4">
        <div className="mb-3 text-sm font-medium text-blue-300">What Mixpanel SHOULD show for last {days}d (estimate)</div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Stat label="Total events (est)" value={estMixpanelTotal} accent="blue" />
          <Stat label="Client events × 70% (ad-block)" value={estMixpanelClient} />
          <Stat label="Server events × 100%" value={stats.server_events} />
        </div>
        <p className="mt-3 text-[11px] text-zinc-400">
          Go to <a href="https://eu.mixpanel.com/project/4014921/view/4511061/app/insights" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">Mixpanel Insights</a>,
          create a chart filtering by the same date window, with event=&quot;All Events&quot;, measurement=Total events.
          The number you see there should be ROUGHLY <span className="font-mono text-blue-300">{estMixpanelTotal.toLocaleString()}</span>.
          Within ±15% is normal — Mixpanel applies additional bot-stripping we don&apos;t replicate.
          The 30% is an <em>assumption</em> — measure the real rate below.
        </p>
      </div>

      {/* ── 9.A.3 — MEASURED ad-block ratio (Source A vs B) ── */}
      <div className="mb-6 rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-4">
        <div className="mb-3 text-sm font-medium text-emerald-300">Measure the real ad-block ratio (Source A ↔ B)</div>
        <form method="get" className="mb-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="days" value={days} />
          <label className="text-[11px] text-zinc-400">
            Enter Mixpanel&apos;s actual &quot;Total events&quot; for this {days}d window:
            <input
              name="mp"
              type="number"
              defaultValue={mpActual ?? undefined}
              placeholder="e.g. 4200"
              className="ml-2 w-32 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-xs text-white"
            />
          </label>
          <button type="submit" className="rounded bg-emerald-800/60 px-3 py-1 text-xs font-medium text-emerald-200 border border-emerald-700 hover:bg-emerald-800">
            Compute
          </button>
        </form>
        {measuredRatio !== null ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Stat label="Mixpanel total (you entered)" value={mpActual!} accent="blue" />
            <Stat label="Measured ad-block ratio" value={`${Math.round(measuredRatio * 100)}%`} accent="emerald" />
            <Stat label="Assumed ratio (baseline)" value={`${Math.round(assumedRatio * 100)}%`} />
          </div>
        ) : (
          <p className="text-[11px] text-zinc-500">
            No Mixpanel number entered yet — showing the assumed {Math.round(assumedRatio * 100)}% baseline above.
            Once you enter the real number, this measures the true client-event loss
            (1 − (mixpanel_total − server_events) ÷ human_client_events) instead of guessing.
          </p>
        )}
      </div>

      {/* ── 9.A.3 — Source C: Vercel Web Analytics cross-check ── */}
      <div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
        <div className="mb-2 text-sm font-medium text-zinc-200">Source C — Vercel Web Analytics (independent)</div>
        <p className="text-[11px] text-zinc-400">
          Vercel Web Analytics is collected at the edge and is far harder to ad-block than
          Mixpanel, so it&apos;s the third leg of verification. Open the Vercel project →
          Analytics tab for this window and compare its <span className="text-zinc-200">Visitors</span> to our
          <span className="font-mono text-emerald-300"> {humanVisitors.toLocaleString()}</span> unique humans
          and its <span className="text-zinc-200">Page Views</span> to our <span className="text-zinc-200">page_viewed</span> count.
          If Vercel ≈ Supabase but Mixpanel is much lower, the gap is ad-block (expected); if Vercel and
          Supabase diverge, our mirror ingestion is dropping events — investigate /api/track-mirror.
        </p>
      </div>

      {/* ── Why they differ — the 6 structural reasons ──── */}
      <div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
        <div className="mb-3 text-sm font-medium text-zinc-200">Why the numbers will never match exactly</div>
        <ol className="space-y-3 text-xs text-zinc-300">
          <Reason
            num={1}
            title="Ad-blockers"
            direction="Supabase > Mixpanel"
            magnitude="≈ 30% of client events"
            body="uBlock / Brave Shields / Adblock Plus block /mp/track (Mixpanel SDK), but let /api/track-mirror through because it looks like our own first-party API. So Supabase captures events that Mixpanel never sees."
          />
          <Reason
            num={2}
            title="Mixpanel Identity Merge"
            direction="Mixpanel unique users < admin unique distinct_ids"
            magnitude="significant for any user who signs in"
            body="Mixpanel collapses anon + known events into one profile at query time. Admin panel counts raw distinct_ids without merge. A signed-up user with 3 anon sessions before signup = 1 Mixpanel user but 4 distinct_ids here."
          />
          <Reason
            num={3}
            title="Server-fired events"
            direction="Mixpanel > Supabase (for those 5 events)"
            magnitude={`${stats.server_events.toLocaleString()} server events in this window`}
            body="signup_completed, login_completed, tool_visit_redirected, review_submitted, activation_milestone fire from server actions via mixpanel-server.ts. They DO go to the Supabase mirror with source_kind='server', but client-only events like page_viewed and search_query_submitted don't have a server twin."
          />
          <Reason
            num={4}
            title="Bot filtering"
            direction="Supabase > Mixpanel"
            magnitude={`${stats.bot_events.toLocaleString()} bot events in this window`}
            body="Mixpanel auto-strips Googlebot / Bingbot / etc. We capture them but flag bot_likely=true and exclude from default views. Toggle 'Including bots' on the main Insights page to see the raw number."
          />
          <Reason
            num={5}
            title="Mirror flush timing"
            direction="Supabase ≤ Mixpanel"
            magnitude="< 1% miss rate"
            body="Events queue 8s before POSTing to /api/track-mirror. Very fast tab-closes can lose the last events even with sendBeacon. Mixpanel SDK has its own batch logic that's slightly more aggressive."
          />
          <Reason
            num={6}
            title="Timezone"
            direction="Either direction"
            magnitude="depends on time of day"
            body="Mixpanel UI defaults to UTC; admin panel uses your local timezone. 'Last 24h' returns different windows depending on time of day. Compare like-for-like by setting Mixpanel's date filter to your local timezone explicitly."
          />
        </ol>
      </div>

      <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-4 text-xs text-zinc-300">
        <div className="mb-1 font-medium text-emerald-300">TL;DR</div>
        Trust the trend, not the absolute number. Both go up on a busy day; both go down on a slow one.
        If you need an exact count, query <span className="font-mono text-zinc-200">user_events</span> via SQL — that&apos;s
        the truth source, with bot filtering baked in.
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: 'amber' | 'emerald' | 'blue' }) {
  const color = accent === 'amber' ? 'text-amber-300' : accent === 'emerald' ? 'text-emerald-300' : accent === 'blue' ? 'text-blue-300' : 'text-zinc-100'
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${color}`}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
    </div>
  )
}

function Reason({ num, title, direction, magnitude, body }: { num: number; title: string; direction: string; magnitude: string; body: string }) {
  return (
    <li>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-zinc-500">{num}.</span>
        <span className="font-medium text-zinc-200">{title}</span>
        <span className="text-[10px] text-zinc-500">·</span>
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">{direction}</span>
        <span className="text-[10px] text-zinc-500">·</span>
        <span className="text-[10px] text-emerald-400">{magnitude}</span>
      </div>
      <div className="ml-5 mt-0.5 text-zinc-400">{body}</div>
    </li>
  )
}
