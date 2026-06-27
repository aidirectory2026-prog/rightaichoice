import { createClient } from '@/lib/supabase/server'
import { Link as LinkIcon, TrendingUp, Globe } from 'lucide-react'
import { AddReferringDomainForm } from '@/components/admin/add-referring-domain-form'
import { PageHeader } from '@/components/admin/page-header'
import { MetricInfo } from '@/components/admin/metric-info'
import { RangePicker } from '@/components/admin/range-picker'
import { parseRange } from '@/lib/admin/range'
import { loadDirectoryPipeline } from '@/lib/authority/admin-queries'
import Link from 'next/link'

// Phase 10.5c.1 (2026-06-12) — re-skinned onto the shared admin kit
// (PageHeader breadcrumb with the range picker in the header slot, kit-styled
// stat cards with ⓘ provenance). Data + query semantics unchanged: genuinely
// date-ranged via the existing RangePicker (`range` capability in nav.ts) —
// referring_domains has no bot/device/event dimensions, so the full smart
// filter bar would be dead controls here.

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = { title: 'Authority — Admin' }

type Row = {
  id: string
  domain: string
  first_seen_at: string
  source_channel: string
  da_estimate: number | null
  anchor_text: string | null
  target_url: string | null
  source_url: string | null
  notes: string | null
}

const CHANNEL_LABEL: Record<string, string> = {
  founder_outreach: 'Founder outreach (7O.1)',
  data_pr: 'Data PR (7O.2)',
  haro: 'HARO / Qwoted (7O.3)',
  embed_widget: 'Embed widget (7O.4)',
  reddit_hn: 'Reddit / HN (7O.5)',
  organic: 'Organic',
  paid: 'Paid',
  other: 'Other',
}

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

export default async function AuthorityPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}) {
  const sp = await searchParams
  const sel = parseRange(sp)
  const dirs = await loadDirectoryPipeline() // Phase 13 D2.1 — directory submission pipeline
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('referring_domains')
    .select('*')
    .order('first_seen_at', { ascending: false })

  if (error) {
    return (
      <div className="text-zinc-300">
        <h1 className="text-2xl font-bold text-white mb-2">Authority</h1>
        <p className="text-sm text-rose-400">
          referring_domains table not found — apply migration 084_referring_domains.sql
          via the Supabase dashboard.
        </p>
      </div>
    )
  }

  const rows = (data ?? []) as Row[]

  // Per-channel totals + window-scoped count
  const cutoffMs = new Date(sel.cutoffISO).getTime()
  const inWindow = rows.filter((r) => new Date(r.first_seen_at).getTime() >= cutoffMs)
  const channelCounts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.source_channel] = (acc[r.source_channel] ?? 0) + 1
    return acc
  }, {})
  const channels = Object.entries(channelCounts).sort((a, b) => b[1] - a[1])

  const avgDa = (() => {
    const withDa = rows.filter((r) => typeof r.da_estimate === 'number')
    if (withDa.length === 0) return null
    return Math.round(withDa.reduce((s, r) => s + (r.da_estimate ?? 0), 0) / withDa.length)
  })()

  return (
    <div>
      <PageHeader>
        <RangePicker active={sel.key} />
      </PageHeader>
      <p className="mb-8 -mt-2 max-w-3xl text-xs text-zinc-500">
        Referring-domain tracker · window: {sel.label}. Powers weekly 7O outreach review.
        Date range applies to the &ldquo;New&rdquo; tile; the domain/channel tables are all-time.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <StatCard
          icon={<LinkIcon className="h-4 w-4" />}
          label="Referring domains"
          value={rows.length.toLocaleString()}
          sub="all-time, unique"
          info={<MetricInfo docKey="authority_summary" />}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label={`New · ${sel.label}`}
          value={inWindow.length.toLocaleString()}
          sub={inWindow.length >= 5 ? 'on pace' : 'below target (5+/window)'}
          info={<MetricInfo docKey="authority_summary" />}
        />
        <StatCard
          icon={<Globe className="h-4 w-4" />}
          label="Avg DA"
          value={avgDa === null ? '—' : String(avgDa)}
          sub="Moz/Ahrefs estimate"
          info={<MetricInfo docKey="authority_summary" />}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Top channel"
          value={channels[0]?.[0] ? CHANNEL_LABEL[channels[0][0]] : '—'}
          sub={channels[0] ? `${channels[0][1]} domains` : 'no data yet'}
          info={<MetricInfo docKey="authority_summary" />}
        />
      </div>

      <div className="mb-10 rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-sm font-semibold text-white mb-3">Add a new referring domain</h2>
        <AddReferringDomainForm />
      </div>

      {/* Phase 13 D2.1 — directory submission pipeline (authority + GEO consensus) */}
      <div className="mb-10 rounded-lg border border-indigo-900/50 bg-indigo-950/10 p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-indigo-200">Directory submission pipeline</h2>
          <span className="text-[11px] text-zinc-500">
            {dirs.total} targets · {dirs.counts['queued'] ?? 0} queued · {dirs.counts['submitted'] ?? 0} submitted ·{' '}
            {dirs.counts['live'] ?? 0} live · <span className="text-emerald-300">{dirs.backlinks} backlinks confirmed</span>
          </span>
        </div>
        <p className="mb-4 max-w-3xl text-xs text-zinc-500">
          High-authority, free directories to list RightAIChoice on — they earn dofollow links (the #1 ranking lever)
          and seed the cross-source “consensus” LLMs read before citing a brand. Run{' '}
          <code className="text-zinc-300">npm run authority:next</code> for the paste-ready submission kit; mark progress
          with <code className="text-zinc-300">authority:mark</code>; backlinks are auto-detected by{' '}
          <code className="text-zinc-300">authority:check</code> and flow into the table above.
        </p>

        {dirs.total === 0 ? (
          <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-500">
            No targets seeded yet. Run <code className="text-zinc-300">npm run authority:seed</code>.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/60 text-[11px] uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-3 py-2 text-left">Next to submit</th>
                  <th className="px-3 py-2 text-center">Tier</th>
                  <th className="px-3 py-2 text-right">DA</th>
                  <th className="px-3 py-2 text-center">Link</th>
                  <th className="px-3 py-2 text-left">Submit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {dirs.next.map((d) => (
                  <tr key={d.directory_key}>
                    <td className="px-3 py-2 text-zinc-200">
                      {d.directory_name}
                      {d.notes && <span className="ml-2 text-[11px] text-zinc-500">{d.notes}</span>}
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-zinc-400">T{d.authority_tier}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-zinc-400">{d.da_estimate ?? '—'}</td>
                    <td className="px-3 py-2 text-center text-[11px]">
                      {d.dofollow === true ? (
                        <span className="text-emerald-400">dofollow</span>
                      ) : d.dofollow === false ? (
                        <span className="text-zinc-500">nofollow</span>
                      ) : (
                        <span className="text-zinc-600">?</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {d.submit_url ? (
                        <Link href={d.submit_url} target="_blank" className="text-indigo-300 hover:underline">
                          submit ↗
                        </Link>
                      ) : (
                        <Link href={d.directory_url} target="_blank" className="text-zinc-400 hover:underline">
                          site ↗
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {dirs.active.length > 0 && (
          <div className="mt-3 text-xs text-zinc-400">
            In progress:{' '}
            {dirs.active.map((d) => (
              <span key={d.directory_key} className="mr-2 inline-block rounded-full border border-zinc-700 bg-zinc-900/60 px-2 py-0.5">
                {d.directory_name} · {d.status}
                {d.backlink_detected && <span className="ml-1 text-emerald-300">✓ link</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mb-10">
        <h2 className="text-sm font-semibold text-white mb-3">By channel (all-time)</h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/60">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-400">Channel</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-zinc-400">Domains</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-zinc-400">% of total</th>
              </tr>
            </thead>
            <tbody>
              {channels.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-zinc-500">
                    No referring domains tracked yet. Add the first one above.
                  </td>
                </tr>
              )}
              {channels.map(([ch, count]) => (
                <tr key={ch} className="border-t border-zinc-800/60">
                  <td className="px-4 py-2 text-zinc-300">{CHANNEL_LABEL[ch] ?? ch}</td>
                  <td className="px-4 py-2 text-right text-zinc-300">{count}</td>
                  <td className="px-4 py-2 text-right text-zinc-500">
                    {((count / rows.length) * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-white mb-3">All referring domains</h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/60">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-400">Domain</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-400">Channel</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-zinc-400">DA</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-400">Target</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-400">First seen</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                    No referring domains tracked yet.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-zinc-800/60 hover:bg-zinc-900/30">
                  <td className="px-4 py-2 text-zinc-200">
                    {r.source_url ? (
                      <Link
                        href={r.source_url}
                        target="_blank"
                        rel="noopener nofollow"
                        className="hover:text-emerald-400"
                      >
                        {r.domain}
                      </Link>
                    ) : (
                      r.domain
                    )}
                  </td>
                  <td className="px-4 py-2 text-zinc-400 text-xs">
                    {CHANNEL_LABEL[r.source_channel] ?? r.source_channel}
                  </td>
                  <td className="px-4 py-2 text-right text-zinc-300">{r.da_estimate ?? '—'}</td>
                  <td className="px-4 py-2 text-zinc-500 text-xs">
                    {r.target_url ? new URL(r.target_url, 'https://rightaichoice.com').pathname : '—'}
                  </td>
                  <td className="px-4 py-2 text-zinc-500 text-xs">
                    {daysAgo(r.first_seen_at)}d ago
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Kit-styled stat card (string values + icon + sub line) with the shared
// ⓘ provenance slot, mirroring components/admin/charts MetricCard.
function StatCard({
  icon,
  label,
  value,
  sub,
  info,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  info?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="flex items-center gap-2 text-zinc-400">
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </div>
        {info ?? null}
      </div>
      <div className="text-2xl font-semibold text-white">{value}</div>
      <div className="text-xs text-zinc-500 mt-1">{sub}</div>
    </div>
  )
}
