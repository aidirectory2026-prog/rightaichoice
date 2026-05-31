// Phase 9 D2 — gated new-tool SOP QA surface.
//
// Reads tool_onboarding_qa (written by lib/cron/onboard.ts) joined to tools so
// admins can see, at a glance:
//   1. Draft tools pending publish (is_published=false) and which HARD gate is
//      blocking them.
//   2. Any tool whose QA record has a failing HARD gate.
//   3. Recently published-via-SOP tools (all-green).
//
// Bounded: each list caps at 50 rows. HARD/SOFT classification mirrors the
// onboard module so the same gate names render with the right severity.
import { getAdminClient } from '@/lib/cron/supabase-admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Onboarding QA — Admin' }

const HARD_GATES = new Set([
  'description',
  'features',
  'pricing_type',
  'categories',
  'alternatives',
  'editorial_compares',
  'faqs',
  'editorial_fields',
])

type GateCheck = { status: 'pass' | 'warn' | 'fail'; detail: string }
type QaRow = {
  tool_id: string
  checks: Record<string, GateCheck>
  all_green: boolean
  published: boolean
  updated_at: string
  tools: { slug: string; name: string; is_published: boolean } | null
}

function failingHardGates(checks: Record<string, GateCheck>): string[] {
  return Object.entries(checks)
    .filter(([step, c]) => HARD_GATES.has(step) && c.status !== 'pass')
    .map(([step]) => step)
}

function ist(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export default async function OnboardingQaPage() {
  const db = getAdminClient()

  const { data } = await db
    .from('tool_onboarding_qa')
    .select('tool_id, checks, all_green, published, updated_at, tools(slug, name, is_published)')
    .order('updated_at', { ascending: false })
    .limit(200)

  const rows = ((data ?? []) as unknown as QaRow[]).map((r) => ({
    ...r,
    tools: Array.isArray(r.tools) ? r.tools[0] ?? null : r.tools,
  }))

  const pendingPublish = rows.filter((r) => r.tools && !r.tools.is_published)
  const failingHard = rows.filter((r) => failingHardGates(r.checks).length > 0)
  const publishedGreen = rows.filter((r) => r.published && r.tools?.is_published).slice(0, 50)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Onboarding QA</h1>
        <p className="text-sm text-zinc-400 mt-1 max-w-3xl">
          Per-tool QA records from the gated new-tool SOP (
          <code className="text-zinc-300">tool_onboarding_qa</code>, written by{' '}
          <code className="text-zinc-300">lib/cron/onboard.ts</code>). A draft publishes only when every{' '}
          <span className="text-rose-400">HARD</span> gate passes; <span className="text-amber-400">SOFT</span> gates
          (logo, sentiment, tutorials, models, latest_updates) only warn.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="QA records" value={String(rows.length)} />
        <Kpi label="Drafts pending publish" value={String(pendingPublish.length)} tone={pendingPublish.length ? 'warn' : 'ok'} />
        <Kpi label="With failing HARD gate" value={String(failingHard.length)} tone={failingHard.length ? 'bad' : 'ok'} />
        <Kpi label="Published (all-green)" value={String(rows.filter((r) => r.published).length)} tone="ok" />
      </div>

      <Section title={`Drafts pending publish (${pendingPublish.length})`}>
        {pendingPublish.length === 0 ? (
          <Empty>No draft tools waiting on the SOP.</Empty>
        ) : (
          <QaTable rows={pendingPublish.slice(0, 50)} />
        )}
      </Section>

      <Section title={`Failing a HARD gate (${failingHard.length})`}>
        {failingHard.length === 0 ? (
          <Empty>No tool is blocked by a hard gate.</Empty>
        ) : (
          <QaTable rows={failingHard.slice(0, 50)} />
        )}
      </Section>

      <Section title={`Recently published via SOP (${publishedGreen.length})`}>
        {publishedGreen.length === 0 ? (
          <Empty>No SOP-published tools yet.</Empty>
        ) : (
          <QaTable rows={publishedGreen} />
        )}
      </Section>
    </div>
  )
}

function QaTable({ rows }: { rows: QaRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-900/60 text-[11px] uppercase tracking-wider text-zinc-500">
          <tr>
            <th className="px-3 py-2 text-left">Tool</th>
            <th className="px-3 py-2 text-left">State</th>
            <th className="px-3 py-2 text-left">Failing HARD gates</th>
            <th className="px-3 py-2 text-left">Gate detail</th>
            <th className="px-3 py-2 text-left">Updated (IST)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {rows.map((r) => {
            const failing = failingHardGates(r.checks)
            return (
              <tr key={r.tool_id} className={failing.length ? 'bg-rose-950/15' : 'bg-zinc-950/30'}>
                <td className="px-3 py-2">
                  <div className="text-zinc-200">{r.tools?.name ?? '—'}</div>
                  <div className="text-[10px] font-mono text-zinc-600">{r.tools?.slug ?? r.tool_id}</div>
                </td>
                <td className="px-3 py-2">
                  {r.all_green ? (
                    <Pill tone="ok">all-green</Pill>
                  ) : (
                    <Pill tone="bad">blocked</Pill>
                  )}
                  {r.tools && (
                    <span className="ml-1">
                      {r.tools.is_published ? <Pill tone="ok">live</Pill> : <Pill tone="warn">draft</Pill>}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs font-mono text-rose-300">
                  {failing.length ? failing.join(', ') : '—'}
                </td>
                <td className="px-3 py-2 text-[11px] text-zinc-400 max-w-md">
                  {Object.entries(r.checks)
                    .filter(([, c]) => c.status !== 'pass')
                    .slice(0, 6)
                    .map(([step, c]) => `${step}: ${c.detail}`)
                    .join(' · ') || 'all pass'}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-zinc-500">{ist(r.updated_at)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-zinc-200 mb-2">{title}</h2>
      {children}
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/15 p-4 text-sm text-emerald-300/80">
      {children}
    </div>
  )
}

function Pill({ tone, children }: { tone: 'ok' | 'bad' | 'warn'; children: React.ReactNode }) {
  const cls =
    tone === 'ok'
      ? 'border-emerald-800 text-emerald-300 bg-emerald-900/40'
      : tone === 'bad'
        ? 'border-rose-800 text-rose-300 bg-rose-900/40'
        : 'border-amber-800 text-amber-300 bg-amber-900/40'
  return (
    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${cls}`}>
      {children}
    </span>
  )
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'bad' | 'warn' }) {
  const color =
    tone === 'bad' ? 'text-rose-400' : tone === 'warn' ? 'text-amber-400' : tone === 'ok' ? 'text-emerald-400' : 'text-white'
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`text-xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  )
}
