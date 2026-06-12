import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/admin/page-header'
import { MetricInfo } from '@/components/admin/metric-info'

// Phase 10.5c.1 (2026-06-12) — re-skinned onto the shared admin kit
// (PageHeader breadcrumb, kit-styled KPI cards with ⓘ provenance). Data +
// query semantics unchanged. Not date-ranged by design: measurement is
// pinned at +28 days after approval, so the global filter bar does not
// apply — stated below.

export const dynamic = 'force-dynamic'
export const metadata = { title: 'SEO Impact' }

type Row = {
  page_path: string
  override_title: string
  source_bucket: string | null
  baseline_captured_at: string | null
  baseline_position: number | null
  baseline_impressions: number | null
  baseline_clicks: number | null
  baseline_ctr: number | null
  outcome_position: number | null
  outcome_impressions: number | null
  outcome_clicks: number | null
  outcome_ctr: number | null
  measured_at: string | null
}

const MEASURE_AFTER_DAYS = 28
const DAY_MS = 86_400_000

function pct(n: number | null): string {
  return n == null ? '—' : `${(n * 100).toFixed(2)}%`
}
function pos(n: number | null): string {
  return n == null ? '—' : n.toFixed(1)
}

export default async function SeoImpactPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('title_overrides')
    .select(
      'page_path, override_title, source_bucket, baseline_captured_at, baseline_position, baseline_impressions, baseline_clicks, baseline_ctr, outcome_position, outcome_impressions, outcome_clicks, outcome_ctr, measured_at',
    )
    .is('reverted_at', null)
    .not('baseline_captured_at', 'is', null)

  const rows = (data ?? []) as Row[]
  const measured = rows.filter((r) => r.measured_at)
  const pending = rows
    .filter((r) => !r.measured_at)
    .sort(
      (a, b) =>
        new Date(a.baseline_captured_at ?? 0).getTime() -
        new Date(b.baseline_captured_at ?? 0).getTime(),
    )

  // Summary over measured rows (CTR lift on pages that had impressions both windows).
  const comparable = measured.filter(
    (r) => (r.baseline_impressions ?? 0) > 0 && (r.outcome_impressions ?? 0) > 0,
  )
  const ctrLifts = comparable.map((r) => (r.outcome_ctr ?? 0) - (r.baseline_ctr ?? 0))
  const avgCtrLift =
    ctrLifts.length > 0 ? ctrLifts.reduce((a, b) => a + b, 0) / ctrLifts.length : null
  const winners = comparable.filter((r) => (r.outcome_ctr ?? 0) > (r.baseline_ctr ?? 0)).length
  const posDeltas = comparable
    .filter((r) => r.baseline_position != null && r.outcome_position != null)
    .map((r) => (r.baseline_position as number) - (r.outcome_position as number)) // + = improved
  const avgPosGain =
    posDeltas.length > 0 ? posDeltas.reduce((a, b) => a + b, 0) / posDeltas.length : null

  const now = Date.now()

  return (
    <div className="space-y-6">
      <div>
        <PageHeader />
        <p className="-mt-3 max-w-3xl text-xs text-zinc-500">
          Before/after lift on title changes, measured {MEASURE_AFTER_DAYS} days after approval
          against the latest GSC snapshot. CTR lift compares pages with impressions in both windows.
          Not date-ranged: the +{MEASURE_AFTER_DAYS}d measurement window is fixed by design, so the
          global range filter does not apply here.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Measured" value={String(measured.length)} info={<MetricInfo docKey="seo_impact_summary" />} />
        <Kpi label="Awaiting +28d" value={String(pending.length)} info={<MetricInfo docKey="seo_impact_summary" />} />
        <Kpi
          label="Avg CTR lift"
          value={avgCtrLift == null ? '—' : `${avgCtrLift >= 0 ? '+' : ''}${(avgCtrLift * 100).toFixed(2)}%`}
          good={avgCtrLift != null && avgCtrLift > 0}
          bad={avgCtrLift != null && avgCtrLift < 0}
          info={<MetricInfo docKey="seo_impact_summary" />}
        />
        <Kpi
          label="Avg position gain"
          value={avgPosGain == null ? '—' : `${avgPosGain >= 0 ? '+' : ''}${avgPosGain.toFixed(1)}`}
          good={avgPosGain != null && avgPosGain > 0}
          bad={avgPosGain != null && avgPosGain < 0}
          info={<MetricInfo docKey="seo_impact_summary" />}
        />
      </div>
      {comparable.length > 0 && (
        <p className="text-xs text-zinc-500">
          {winners}/{comparable.length} measured pages improved CTR. (Position gain: higher = moved
          up the SERP.)
        </p>
      )}

      {/* Measured */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-300">Measured</h2>
        {measured.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-500">
            Nothing measured yet — title changes are measured {MEASURE_AFTER_DAYS} days after approval.
          </div>
        ) : (
          <Table
            rows={measured}
            cols={(r) => (
              <>
                <Td>{pos(r.baseline_position)} → <b className="text-white">{pos(r.outcome_position)}</b></Td>
                <Td>
                  {pct(r.baseline_ctr)} → <b className="text-white">{pct(r.outcome_ctr)}</b>
                  <Delta base={r.baseline_ctr} out={r.outcome_ctr} kind="ctr" />
                </Td>
                <Td>{r.outcome_clicks ?? 0} clk / {r.outcome_impressions ?? 0} impr</Td>
              </>
            )}
          />
        )}
      </section>

      {/* Pending */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-300">Awaiting measurement</h2>
        {pending.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-500">
            None pending.
          </div>
        ) : (
          <Table
            rows={pending}
            cols={(r) => {
              const ready =
                new Date(r.baseline_captured_at ?? 0).getTime() + MEASURE_AFTER_DAYS * DAY_MS
              const days = Math.max(0, Math.ceil((ready - now) / DAY_MS))
              return (
                <>
                  <Td>baseline pos {pos(r.baseline_position)}</Td>
                  <Td>baseline CTR {pct(r.baseline_ctr)} · {r.baseline_impressions ?? 0} impr</Td>
                  <Td className="text-zinc-500">measures in ~{days}d</Td>
                </>
              )
            }}
          />
        )}
      </section>
    </div>
  )
}

// Kit-styled KPI card (string values — kit MetricCard is number-only) with
// the shared ⓘ provenance slot, mirroring components/admin/charts MetricCard.
function Kpi({ label, value, good, bad, info }: { label: string; value: string; good?: boolean; bad?: boolean; info?: React.ReactNode }) {
  const color = good ? 'text-emerald-400' : bad ? 'text-rose-400' : 'text-white'
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between gap-1">
        <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
        {info ?? null}
      </div>
      <div className={`mt-2 text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  )
}

function Table({ rows, cols }: { rows: Row[]; cols: (r: Row) => React.ReactNode }) {
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.page_path} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="flex items-center justify-between gap-3">
            <a href={r.page_path} target="_blank" rel="noreferrer" className="text-sm font-mono text-zinc-200 hover:text-emerald-400 truncate">
              {r.page_path}
            </a>
            {r.source_bucket && (
              <span className="text-xs px-2 py-0.5 rounded border border-zinc-700 text-zinc-400 shrink-0">{r.source_bucket}</span>
            )}
          </div>
          <div className="text-xs text-zinc-400 mt-1 italic truncate">{r.override_title}</div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-xs text-zinc-400">{cols(r)}</div>
        </div>
      ))}
    </div>
  )
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={className}>{children}</span>
}

function Delta({ base, out, kind }: { base: number | null; out: number | null; kind: 'ctr' }) {
  if (base == null || out == null) return null
  const d = out - base
  if (Math.abs(d) < 1e-9) return <span className="text-zinc-600"> (±0)</span>
  const up = d > 0
  return (
    <span className={up ? 'text-emerald-400' : 'text-rose-400'}>
      {' '}({up ? '+' : ''}{kind === 'ctr' ? `${(d * 100).toFixed(2)}pp` : d.toFixed(1)})
    </span>
  )
}
