// Phase 9 S7 — Market Sentiment Checker admin panel.
//
// One surface for the paid sentiment feature: the acquisition→revenue funnel
// (from user_events, which both the client analytics and serverAnalytics mirror
// into), revenue by currency (sentiment_payments), scan health (status mix,
// p50/p95 latency, source success rates), and the most recent scans + payments.
import { getAdminClient } from '@/lib/cron/supabase-admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Sentiment Checker — Admin' }

const FUNNEL: { event: string; label: string }[] = [
  { event: 'sentiment_card_viewed', label: 'Page viewed' },
  { event: 'sentiment_scan_requested', label: 'Scan requested' },
  { event: 'sentiment_scan_completed', label: 'Scan completed' },
  { event: 'sentiment_paywall_shown', label: 'Paywall shown' },
  { event: 'sentiment_payment_succeeded', label: 'Payment succeeded' },
]

type SearchRow = {
  id: string; tool_slug: string; status: string; charge_type: string
  sources: string[] | null; mention_count: number | null; duration_ms: number | null; created_at: string
}
type PaymentRow = { id: string; gateway: string; amount_minor: number; currency: string; status: string; created_at: string }

function pctl(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return sorted[idx]
}

export default async function SentimentAdminPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getAdminClient() as any

  const funnelCounts = await Promise.all(
    FUNNEL.map(async (f) => {
      const { count } = await admin.from('user_events').select('*', { count: 'exact', head: true }).eq('event_name', f.event)
      return { ...f, count: count ?? 0 }
    }),
  )

  const { data: searchesData } = await admin
    .from('sentiment_searches')
    .select('id, tool_slug, status, charge_type, sources, mention_count, duration_ms, created_at')
    .order('created_at', { ascending: false })
    .limit(500)
  const searches = (searchesData ?? []) as SearchRow[]

  const { data: paymentsData } = await admin
    .from('sentiment_payments')
    .select('id, gateway, amount_minor, currency, status, created_at')
    .order('created_at', { ascending: false })
    .limit(200)
  const payments = (paymentsData ?? []) as PaymentRow[]

  // Aggregates
  const statusMix = searches.reduce<Record<string, number>>((a, s) => ((a[s.status] = (a[s.status] ?? 0) + 1), a), {})
  const durations = searches.map((s) => s.duration_ms ?? 0).filter((d) => d > 0).sort((a, b) => a - b)
  const sourceFreq = searches.reduce<Record<string, number>>((a, s) => {
    for (const src of s.sources ?? []) a[src] = (a[src] ?? 0) + 1
    return a
  }, {})
  const revenue = payments.filter((p) => p.status === 'paid').reduce<Record<string, number>>((a, p) => ((a[p.currency] = (a[p.currency] ?? 0) + p.amount_minor), a), {})
  const paidCount = payments.filter((p) => p.status === 'paid').length

  const card = 'rounded-xl border border-zinc-800 bg-zinc-950 p-4'

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Market Sentiment Checker</h1>
        <p className="text-sm text-zinc-500">Paid on-demand sentiment scans — funnel, revenue, and scan health. Tracked in Mixpanel + here.</p>
      </div>

      {/* Funnel */}
      <section className={card}>
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Acquisition → revenue funnel</h2>
        <div className="space-y-2">
          {funnelCounts.map((f, i) => {
            const top = funnelCounts[0].count || 1
            const width = Math.max(2, Math.round((f.count / top) * 100))
            const fromPrev = i > 0 && funnelCounts[i - 1].count > 0 ? Math.round((f.count / funnelCounts[i - 1].count) * 100) : null
            return (
              <div key={f.event} className="flex items-center gap-3">
                <span className="w-36 text-xs text-zinc-400">{f.label}</span>
                <div className="flex-1 h-6 rounded bg-zinc-900 overflow-hidden">
                  <div className="h-full bg-emerald-600/70 flex items-center px-2 text-[11px] text-white" style={{ width: `${width}%` }}>{f.count}</div>
                </div>
                <span className="w-12 text-right text-[11px] text-zinc-500">{fromPrev !== null ? `${fromPrev}%` : ''}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* KPI cards */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className={card}>
          <div className="text-xs text-zinc-500">Revenue (paid)</div>
          <div className="text-lg font-semibold text-white">
            {Object.keys(revenue).length === 0 ? '—' : Object.entries(revenue).map(([c, m]) => `${c === 'INR' ? '₹' : '$'}${(m / 100).toFixed(2)}`).join(' · ')}
          </div>
          <div className="text-[11px] text-zinc-600">{paidCount} paid scans</div>
        </div>
        <div className={card}>
          <div className="text-xs text-zinc-500">Total scans</div>
          <div className="text-lg font-semibold text-white">{searches.length}</div>
          <div className="text-[11px] text-zinc-600">{statusMix['ready'] ?? 0} ready · {statusMix['partial'] ?? 0} partial · {statusMix['failed'] ?? 0} failed</div>
        </div>
        <div className={card}>
          <div className="text-xs text-zinc-500">Latency p50 / p95</div>
          <div className="text-lg font-semibold text-white">{(pctl(durations, 50) / 1000).toFixed(1)}s / {(pctl(durations, 95) / 1000).toFixed(1)}s</div>
          <div className="text-[11px] text-zinc-600">SLA &lt; 45s</div>
        </div>
        <div className={card}>
          <div className="text-xs text-zinc-500">Free vs paid</div>
          <div className="text-lg font-semibold text-white">
            {searches.filter((s) => s.charge_type === 'free').length} / {searches.filter((s) => s.charge_type === 'paid').length}
          </div>
          <div className="text-[11px] text-zinc-600">free / paid scans</div>
        </div>
      </section>

      {/* Source success */}
      <section className={card}>
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Source contribution (scans with ≥1 post)</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(sourceFreq).sort((a, b) => b[1] - a[1]).map(([src, n]) => (
            <span key={src} className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-300">{src}: {n}</span>
          ))}
          {Object.keys(sourceFreq).length === 0 && <span className="text-xs text-zinc-600">No scans yet.</span>}
        </div>
      </section>

      {/* Recent scans */}
      <section className={card}>
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Recent scans</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-zinc-500"><tr className="text-left"><th className="py-1 pr-3">Tool</th><th className="pr-3">Status</th><th className="pr-3">Charge</th><th className="pr-3">Sources</th><th className="pr-3">Posts</th><th className="pr-3">Time</th><th>When</th></tr></thead>
            <tbody className="text-zinc-300">
              {searches.slice(0, 30).map((s) => (
                <tr key={s.id} className="border-t border-zinc-900">
                  <td className="py-1 pr-3">{s.tool_slug}</td>
                  <td className="pr-3"><span className={s.status === 'ready' ? 'text-emerald-400' : s.status === 'failed' ? 'text-red-400' : 'text-amber-400'}>{s.status}</span></td>
                  <td className="pr-3">{s.charge_type}</td>
                  <td className="pr-3">{(s.sources ?? []).join(', ') || '—'}</td>
                  <td className="pr-3">{s.mention_count ?? 0}</td>
                  <td className="pr-3">{s.duration_ms ? `${(s.duration_ms / 1000).toFixed(1)}s` : '—'}</td>
                  <td className="text-zinc-600">{new Date(s.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {searches.length === 0 && <tr><td colSpan={7} className="py-3 text-zinc-600">No scans yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent payments */}
      <section className={card}>
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Recent payments</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-zinc-500"><tr className="text-left"><th className="py-1 pr-3">Gateway</th><th className="pr-3">Amount</th><th className="pr-3">Status</th><th>When</th></tr></thead>
            <tbody className="text-zinc-300">
              {payments.slice(0, 20).map((p) => (
                <tr key={p.id} className="border-t border-zinc-900">
                  <td className="py-1 pr-3">{p.gateway}</td>
                  <td className="pr-3">{p.currency === 'INR' ? '₹' : '$'}{(p.amount_minor / 100).toFixed(2)}</td>
                  <td className="pr-3"><span className={p.status === 'paid' ? 'text-emerald-400' : p.status === 'failed' ? 'text-red-400' : 'text-zinc-400'}>{p.status}</span></td>
                  <td className="text-zinc-600">{new Date(p.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={4} className="py-3 text-zinc-600">No payments yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
