import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ChevronLeft, Download, Database, Users, Activity } from 'lucide-react'

// Phase 8.h (2026-05-20) — Admin export view for vendor data deliveries.
// Pulls from public.user_events + public.user_intent_profile (the salable
// per-user record). Mixpanel data is duplicated here so we never depend on
// Mixpanel's paid Query API for export.

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Exports — Admin' }

function ago(iso: string | null | undefined): string {
  if (!iso) return '—'
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export default async function ExportsPage() {
  const supabase = await createClient()

  const [
    eventsCount,
    profilesCount,
    latestEvent,
    topEventNames,
    topMentionedTools,
    topComparedPairs,
    topExistingTools,
    profileStats,
  ] = await Promise.all([
    supabase.from('user_events').select('id', { count: 'exact', head: true }).then((r) => r.count ?? 0),
    supabase.from('user_intent_profile').select('distinct_id', { count: 'exact', head: true }).then((r) => r.count ?? 0),
    supabase.from('user_events').select('event_name, created_at').order('created_at', { ascending: false }).limit(1).maybeSingle().then((r) => r.data as { event_name: string; created_at: string } | null),
    supabase.from('user_events').select('event_name').order('created_at', { ascending: false }).limit(5000).then((r) => {
      const rows = (r.data ?? []) as Array<{ event_name: string }>
      const counts: Record<string, number> = {}
      for (const row of rows) counts[row.event_name] = (counts[row.event_name] ?? 0) + 1
      return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12)
    }),
    // Top tools mentioned in AI chat (across all users — vendor pitch material).
    supabase
      .from('user_intent_profile')
      .select('ai_chat_tools_mentioned')
      .not('ai_chat_tools_mentioned', 'is', null)
      .limit(2000)
      .then((r) => {
        const counts: Record<string, number> = {}
        for (const row of (r.data ?? []) as Array<{ ai_chat_tools_mentioned: string[] }>) {
          for (const t of row.ai_chat_tools_mentioned ?? []) counts[t] = (counts[t] ?? 0) + 1
        }
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 15)
      }),
    supabase
      .from('user_intent_profile')
      .select('tools_compared_with')
      .limit(2000)
      .then((r) => {
        const counts: Record<string, number> = {}
        for (const row of (r.data ?? []) as Array<{ tools_compared_with: string[] }>) {
          for (const p of row.tools_compared_with ?? []) counts[p] = (counts[p] ?? 0) + 1
        }
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 15)
      }),
    // Top tools mentioned as "I already use" — the VENDOR-GOLD signal.
    supabase
      .from('user_intent_profile')
      .select('existing_tools_history')
      .limit(2000)
      .then((r) => {
        const counts: Record<string, number> = {}
        for (const row of (r.data ?? []) as Array<{ existing_tools_history: string[] }>) {
          for (const t of row.existing_tools_history ?? []) counts[t.toLowerCase()] = (counts[t.toLowerCase()] ?? 0) + 1
        }
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 20)
      }),
    // Aggregate counters from user_intent_profile.
    supabase
      .from('user_intent_profile')
      .select('saves_count, comparisons_count, plans_completed_count, reviews_count, tools_visited_count, chat_messages_count, searches_count')
      .limit(5000)
      .then((r) => {
        const rows = (r.data ?? []) as Array<Record<string, number>>
        const sum = (k: string) => rows.reduce((s, x) => s + (Number(x[k]) || 0), 0)
        return {
          saves: sum('saves_count'),
          comparisons: sum('comparisons_count'),
          plans: sum('plans_completed_count'),
          reviews: sum('reviews_count'),
          tool_visits: sum('tools_visited_count'),
          chat_messages: sum('chat_messages_count'),
          searches: sum('searches_count'),
        }
      }),
  ])

  return (
    <div>
      <div className="mb-6 flex items-start gap-3">
        <Link href="/admin/updates" className="text-zinc-400 hover:text-emerald-300 mt-1">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-400" />
            Vendor data exports
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Salable per-user behavioural data — owned by us, mirrored from every analytics event
            into Supabase (Mixpanel free tier blocks API export; this is the workaround).
          </p>
        </div>
      </div>

      {/* ── Catalog state ──────────────────────────────────────────── */}
      <section className="mb-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat icon={<Activity className="h-4 w-4" />} label="Events captured" value={eventsCount.toLocaleString()} sub="user_events table" />
          <Stat icon={<Users className="h-4 w-4" />} label="User profiles" value={profilesCount.toLocaleString()} sub="user_intent_profile" />
          <Stat label="Last event" value={latestEvent ? ago(latestEvent.created_at) : '—'} sub={latestEvent?.event_name ?? ''} />
          <Stat label="Mirror status" value={eventsCount > 0 ? 'live ✓' : 'awaiting traffic'} sub="from /api/track-mirror" />
        </div>
      </section>

      {/* ── Quick aggregates from user_intent_profile ───────────────── */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-white mb-3">Catalog rollups (lifetime, all users)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <Stat label="Saves" value={profileStats.saves.toLocaleString()} />
          <Stat label="Comparisons" value={profileStats.comparisons.toLocaleString()} />
          <Stat label="Plans completed" value={profileStats.plans.toLocaleString()} />
          <Stat label="Reviews" value={profileStats.reviews.toLocaleString()} />
          <Stat label="Tool visits" value={profileStats.tool_visits.toLocaleString()} />
          <Stat label="Chat messages" value={profileStats.chat_messages.toLocaleString()} />
          <Stat label="Searches" value={profileStats.searches.toLocaleString()} />
        </div>
      </section>

      {/* ── Top events ──────────────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-white mb-3">Top events (last 5,000 captured)</h2>
        <Panel>
          {topEventNames.length === 0 ? (
            <Empty>No events captured yet. Browse the site to generate data.</Empty>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-zinc-500 border-b border-zinc-800">
                <tr>
                  <th className="text-left py-1.5 font-medium">Event</th>
                  <th className="text-right py-1.5 font-medium w-24">Count</th>
                </tr>
              </thead>
              <tbody>
                {topEventNames.map(([name, count]) => (
                  <tr key={name} className="border-t border-zinc-800/40">
                    <td className="py-1.5 text-zinc-300">{name}</td>
                    <td className="py-1.5 text-right text-zinc-400 tabular-nums">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </section>

      {/* ── THE VENDOR-PITCH ARTIFACTS ──────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          <span className="rounded bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 text-[10px] text-emerald-300 uppercase tracking-wider">
            VENDOR GOLD
          </span>
          Tools our users CURRENTLY USE (from plan flow)
        </h2>
        <p className="text-xs text-zinc-500 mb-3">
          Each row = a tool name our users typed into &quot;tools I already use&quot;. High count = strong vendor-pitch
          opportunity (offer ourselves as the discovery channel for that tool&apos;s competitors).
        </p>
        <Panel>
          {topExistingTools.length === 0 ? (
            <Empty>No data yet. Users complete the /plan intake to populate this.</Empty>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-zinc-500 border-b border-zinc-800">
                <tr>
                  <th className="text-left py-1.5 font-medium">Tool name (as typed)</th>
                  <th className="text-right py-1.5 font-medium w-32">Mentioned by N users</th>
                </tr>
              </thead>
              <tbody>
                {topExistingTools.map(([name, count]) => (
                  <tr key={name} className="border-t border-zinc-800/40">
                    <td className="py-1.5 text-zinc-200">{name}</td>
                    <td className="py-1.5 text-right text-emerald-300 tabular-nums font-semibold">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-white mb-3">Tools mentioned in AI chat</h2>
        <Panel>
          {topMentionedTools.length === 0 ? (
            <Empty>No AI chat tool mentions yet.</Empty>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-zinc-500 border-b border-zinc-800">
                <tr>
                  <th className="text-left py-1.5 font-medium">Tool slug</th>
                  <th className="text-right py-1.5 font-medium w-24">Mentions</th>
                </tr>
              </thead>
              <tbody>
                {topMentionedTools.map(([slug, count]) => (
                  <tr key={slug} className="border-t border-zinc-800/40">
                    <td className="py-1.5 text-zinc-300">{slug}</td>
                    <td className="py-1.5 text-right text-zinc-400 tabular-nums">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-white mb-3">Top compared pairs</h2>
        <Panel>
          {topComparedPairs.length === 0 ? (
            <Empty>No comparisons yet.</Empty>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-zinc-500 border-b border-zinc-800">
                <tr>
                  <th className="text-left py-1.5 font-medium">Tool pair</th>
                  <th className="text-right py-1.5 font-medium w-24">Times</th>
                </tr>
              </thead>
              <tbody>
                {topComparedPairs.map(([pair, count]) => (
                  <tr key={pair} className="border-t border-zinc-800/40">
                    <td className="py-1.5 text-zinc-300">{pair}</td>
                    <td className="py-1.5 text-right text-zinc-400 tabular-nums">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </section>

      {/* ── CSV exports ─────────────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-white mb-3">CSV exports</h2>
        <p className="text-xs text-zinc-500 mb-3">
          Generate per-vendor CSV deliveries from Supabase. Each export streams from
          /api/admin/export — fetch as plain GET, save the response. Free, unlimited, no Mixpanel paywall.
        </p>
        <Panel>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-3">
              <Download className="h-4 w-4 text-emerald-400" />
              <a href="/api/admin/export?type=user_intent_profile" className="text-emerald-300 hover:text-emerald-200">
                /api/admin/export?type=user_intent_profile
              </a>
              <span className="text-zinc-500 text-xs">
                — every user&apos;s full behavioural record (CSV, one row per user)
              </span>
            </li>
            <li className="flex items-center gap-3">
              <Download className="h-4 w-4 text-emerald-400" />
              <a href="/api/admin/export?type=user_events&days=30" className="text-emerald-300 hover:text-emerald-200">
                /api/admin/export?type=user_events&amp;days=30
              </a>
              <span className="text-zinc-500 text-xs">— raw event log, last 30 days (CSV)</span>
            </li>
            <li className="flex items-center gap-3">
              <Download className="h-4 w-4 text-emerald-400" />
              <a href="/api/admin/export?type=existing_tools_mentions" className="text-emerald-300 hover:text-emerald-200">
                /api/admin/export?type=existing_tools_mentions
              </a>
              <span className="text-zinc-500 text-xs">
                — tool name → N users currently using it (vendor outreach list)
              </span>
            </li>
            <li className="flex items-center gap-3">
              <Download className="h-4 w-4 text-emerald-400" />
              <a href="/api/admin/export?type=tool_audience&slug=chatgpt" className="text-emerald-300 hover:text-emerald-200">
                /api/admin/export?type=tool_audience&amp;slug=&lt;tool_slug&gt;
              </a>
              <span className="text-zinc-500 text-xs">— every user who interacted with one specific tool</span>
            </li>
          </ul>
        </Panel>
      </section>
    </div>
  )
}

function Stat({ icon, label, value, sub }: { icon?: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3">
      <div className="flex items-center gap-1.5 text-zinc-400">
        {icon}
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <div className="text-lg font-bold text-white mt-1 tabular-nums">{value}</div>
      {sub && <div className="text-[10px] text-zinc-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">{children}</div>
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-zinc-500 italic">{children}</p>
}
