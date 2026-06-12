import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PageHeader } from '@/components/admin/page-header'
import { MetricInfo } from '@/components/admin/metric-info'

// Phase 8.d.5b — full ordered list for one activity-feed type. Linked
// from Knowledge Room's "view all →" CTA when a panel hits the 20-row cap.
//
// Phase 10.5c.2 (2026-06-12) — re-skinned onto the shared admin kit
// (PageHeader breadcrumb, type switcher tabs, ⓘ provenance). Data + query
// semantics unchanged, including the page's own window convention (rolling
// today=24h/7d/30d via ?range, or ?from) — it inherits whatever window the
// Knowledge Room "view all" link carried, so we deliberately did NOT swap it
// for the calendar-anchored picker (that would change the row sets).
//
// Merge decision (10.5c): evaluated merging this page INTO /admin/daily —
// kept separate. Zero shared data sources: this is the pipeline activity
// drill-down over refresh_logs/tools; /admin/daily is the human growth-loop
// checklist over referring_domains/outreach_log. See phase5c-gate.md.

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Activity — Admin' }

type ActivityType = 'refreshed' | 'added' | 'latest'
const VALID_TYPES: ActivityType[] = ['refreshed', 'added', 'latest']

const TYPE_LABEL: Record<ActivityType, string> = {
  refreshed: 'Tools refreshed',
  added: 'Tools newly added',
  latest: '“Latest from” refreshed',
}

const RANGE_HOURS: Record<string, number> = {
  today: 24,
  '7d': 24 * 7,
  '30d': 24 * 30,
}

function cutoffISO(range: string, from?: string, to?: string): string {
  if (from) return new Date(from).toISOString()
  const hours = RANGE_HOURS[range] ?? 24
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

function ago(iso: string | null | undefined): string {
  if (!iso) return '—'
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; range?: string; from?: string; to?: string }>
}) {
  const sp = await searchParams
  const type: ActivityType = VALID_TYPES.includes(sp.type as ActivityType) ? (sp.type as ActivityType) : 'refreshed'
  const range = sp.range ?? 'today'
  const cutoff = cutoffISO(range, sp.from, sp.to)
  const supabase = await createClient()

  let rows: Array<{ slug: string; name: string; when: string; sub?: string }> = []

  if (type === 'refreshed') {
    const { data } = await supabase
      .from('refresh_logs')
      .select('tool_slug, created_at')
      .eq('status', 'refreshed')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(500)
    const logs = (data ?? []) as Array<{ tool_slug: string; created_at: string }>
    const slugs = Array.from(new Set(logs.map((l) => l.tool_slug)))
    const namesRes = slugs.length
      ? await supabase.from('tools').select('slug, name').in('slug', slugs)
      : { data: [] as Array<{ slug: string; name: string }> }
    const lookup = new Map(((namesRes.data ?? []) as Array<{ slug: string; name: string }>).map((t) => [t.slug, t.name]))
    rows = logs.map((l) => ({ slug: l.tool_slug, name: lookup.get(l.tool_slug) ?? l.tool_slug, when: l.created_at }))
  } else if (type === 'added') {
    const { data } = await supabase
      .from('tools')
      .select('slug, name, created_at, submitted_by')
      .eq('is_published', true)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(500)
    rows = ((data ?? []) as Array<{ slug: string; name: string; created_at: string; submitted_by: string | null }>).map(
      (t) => ({ slug: t.slug, name: t.name, when: t.created_at, sub: t.submitted_by ? 'manual' : 'auto-ingested' }),
    )
  } else {
    const { data } = await supabase
      .from('tools')
      .select('slug, name, latest_updates_at')
      .eq('is_published', true)
      .gte('latest_updates_at', cutoff)
      .order('latest_updates_at', { ascending: false })
      .limit(500)
    rows = ((data ?? []) as Array<{ slug: string; name: string; latest_updates_at: string }>).map((t) => ({
      slug: t.slug,
      name: t.name,
      when: t.latest_updates_at,
    }))
  }

  return (
    <div>
      <PageHeader>
        <Link href="/admin/updates" className="text-xs text-zinc-500 hover:text-emerald-300">
          ← Knowledge Room
        </Link>
      </PageHeader>

      {/* Type switcher — custom control kept (one feed type per view) */}
      <div className="mb-4 flex items-center gap-2">
        {VALID_TYPES.map((t) => {
          const qs = new URLSearchParams()
          qs.set('type', t)
          if (sp.range) qs.set('range', sp.range)
          if (sp.from) qs.set('from', sp.from)
          if (sp.to) qs.set('to', sp.to)
          return (
            <Link
              key={t}
              href={`/admin/activity?${qs.toString()}`}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                type === t
                  ? 'border-emerald-700 bg-emerald-950 text-emerald-400'
                  : 'border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600'
              }`}
            >
              {TYPE_LABEL[t]}
            </Link>
          )
        })}
      </div>

      <p className="mb-4 flex items-center gap-1 text-xs text-zinc-500">
        <span className="text-zinc-300 font-medium">{TYPE_LABEL[type]}</span>
        <span>· {rows.length.toLocaleString()} entries · since {new Date(cutoff).toISOString().slice(0, 19)} UTC</span>
        <MetricInfo docKey="kr_activity_feed" align="left" />
      </p>

      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/60 text-xs text-zinc-400">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Tool</th>
              <th className="text-right px-3 py-2 font-medium w-32">When</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-zinc-500">
                  No entries in this window.
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={r.slug + r.when + i} className="border-t border-zinc-800/60 hover:bg-zinc-900/30">
                <td className="px-3 py-2">
                  <Link href={`/tools/${r.slug}`} target="_blank" className="text-zinc-200 hover:text-emerald-300">
                    {r.name}
                  </Link>
                  {r.sub && <span className="text-[10px] text-zinc-600 ml-2">· {r.sub}</span>}
                </td>
                <td className="px-3 py-2 text-right text-[11px] text-zinc-500">{ago(r.when)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
