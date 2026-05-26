import { getAdminClient } from '@/lib/cron/supabase-admin'
import { BigNumber, Card, EmptyState, RangePicker, fmt, parseDays, pct } from '../_ui/primitives'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Funnel · Insights' }

type FunnelRow = {
  step_index: number
  step_name: string
  step_event: string
  unique_users: number
  total_events: number
  pct_of_step_1: number
}

async function getFunnel(days: number, country: string | null, device: string | null): Promise<FunnelRow[]> {
  const db = getAdminClient()
  const { data } = await db.rpc('insights_funnel_steps' as never, {
    p_days: days,
    p_include_bots: false,
    p_country: country,
    p_device: device,
  } as never)
  return (data ?? []) as FunnelRow[]
}

async function getFilterOptions(days: number): Promise<{ countries: string[]; devices: string[] }> {
  const db = getAdminClient()
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString()
  const { data } = await db
    .from('user_events')
    .select('country, device_type')
    .gte('created_at', cutoff)
    .eq('bot_likely', false)
    .limit(2000)
  type Row = { country: string | null; device_type: string | null }
  const countries = new Set<string>()
  const devices = new Set<string>()
  for (const r of (data ?? []) as Row[]) {
    if (r.country) countries.add(r.country)
    if (r.device_type) devices.add(r.device_type)
  }
  return {
    countries: Array.from(countries).sort(),
    devices: Array.from(devices).sort(),
  }
}

export default async function FunnelPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; country?: string; device?: string }>
}) {
  const sp = await searchParams
  const days = parseDays(sp.days, 7)
  const country = sp.country?.trim() || null
  const device = sp.device?.trim() || null

  const [steps, options] = await Promise.all([
    getFunnel(days, country, device),
    getFilterOptions(days),
  ])

  const step1 = steps[0]?.unique_users ?? 0
  const stepLast = steps[steps.length - 1]?.unique_users ?? 0
  const dropPct = step1 > 0 ? ((step1 - stepLast) / step1) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Conversion funnel</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Visitor → tool view → outbound click → signup. Counted as unique users.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <FilterForm days={days} country={country} device={device} options={options} />
          <RangePicker current={days} basePath="/admin/insights/funnel" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <BigNumber label="Top of funnel" value={step1} hint="Unique landed" />
        <BigNumber
          label="Reached step 2"
          value={steps[1]?.unique_users ?? 0}
          suffix={steps[1] ? `${steps[1].pct_of_step_1}%` : undefined}
          tone="accent"
        />
        <BigNumber
          label="Outbound clickers"
          value={steps[2]?.unique_users ?? 0}
          suffix={steps[2] ? `${steps[2].pct_of_step_1}%` : undefined}
          tone="good"
        />
        <BigNumber
          label="Total drop-off"
          value={pct(dropPct)}
          hint={`${fmt(step1 - stepLast)} users lost`}
          tone={dropPct > 95 ? 'bad' : dropPct > 80 ? 'warn' : 'good'}
        />
      </div>

      <Card title="Step-by-step drop-off" subtitle="Bars are proportional to step 1.">
        {steps.length === 0 || step1 === 0 ? (
          <EmptyState title="No funnel data in this window" hint="Need at least one page_viewed event to draw a funnel." />
        ) : (
          <div className="space-y-4">
            {steps.map((s, i) => {
              const widthPct = step1 > 0 ? (s.unique_users / step1) * 100 : 0
              const prev = i === 0 ? 0 : steps[i - 1].unique_users
              const stepDrop = i === 0 ? 0 : prev > 0 ? ((prev - s.unique_users) / prev) * 100 : 0
              return (
                <div key={s.step_index}>
                  <div className="flex items-baseline justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-400 inline-flex items-center justify-center text-[10px] font-medium">
                        {s.step_index}
                      </span>
                      <span className="text-zinc-200 font-medium">{s.step_name}</span>
                      <span className="text-[10px] text-zinc-600 font-mono">{s.step_event}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-500 text-[11px]">
                        {fmt(s.total_events)} events
                      </span>
                      <span className="font-mono text-zinc-200 tabular-nums">
                        {fmt(s.unique_users)} users
                      </span>
                      <span className={`font-mono text-[11px] ${s.pct_of_step_1 < 50 && i > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {s.pct_of_step_1}%
                      </span>
                    </div>
                  </div>
                  <div className="relative h-8 overflow-hidden rounded bg-zinc-950 border border-zinc-900">
                    <div
                      className={`absolute inset-y-0 left-0 ${i === 0 ? 'bg-emerald-700/70' : i === steps.length - 1 ? 'bg-sky-700/70' : 'bg-emerald-700/40'}`}
                      style={{ width: `${widthPct}%` }}
                    />
                    {i > 0 && stepDrop > 0 && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 text-[10px] text-rose-400/80">
                        ↓ {stepDrop.toFixed(0)}% drop from prev
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

function FilterForm({
  days, country, device, options,
}: {
  days: number
  country: string | null
  device: string | null
  options: { countries: string[]; devices: string[] }
}) {
  return (
    <form className="flex items-center gap-2">
      <input type="hidden" name="days" value={days} />
      <select
        name="country"
        defaultValue={country ?? ''}
        className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200"
      >
        <option value="">All countries</option>
        {options.countries.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <select
        name="device"
        defaultValue={device ?? ''}
        className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200"
      >
        <option value="">All devices</option>
        {options.devices.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
      <button type="submit" className="rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800">
        Apply
      </button>
    </form>
  )
}
