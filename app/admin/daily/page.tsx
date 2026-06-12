import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CheckCircle2, Circle, ExternalLink, Mail, LinkIcon, FileText, Search } from 'lucide-react'
import { PageHeader } from '@/components/admin/page-header'
import { MetricInfo } from '@/components/admin/metric-info'
import { parseRange } from '@/lib/admin/range'

// Visual companion to `npm run daily`. Shows today's tasks at a glance,
// the live state of each one (already done? still pending? skipped?),
// and direct deep-links to the next action.
//
// Phase 10.5c.2 (2026-06-12) — re-skinned onto the shared admin kit
// (PageHeader breadcrumb, kit-styled stat cards with ⓘ provenance). Data +
// query semantics unchanged: the page is pinned to TODAY (IST) by design —
// a checklist for a different date range makes no sense, so the global
// filter bar does not apply here.
//
// 10.5c merge decision — /admin/activity stays a SEPARATE page: despite the
// similar name, it shares zero data sources with this checklist (activity =
// refresh_logs/tools pipeline feed, the Knowledge Room "view all" drill-down;
// daily = referring_domains/outreach_log human checklist). See phase5c-gate.md.

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Daily — Admin' }

type DailyTask = {
  key: string
  title: string
  description: string
  href?: string
  external?: boolean
  done: boolean
  meta?: string
  icon: React.ReactNode
}

export default async function DailyAdmin() {
  const supabase = await createClient()
  // 9.A.1 #6 — was new Date().toISOString() (UTC), which made "today's" counts
  // wrong for the first 5.5h of every IST day. Use the shared IST range helper.
  const today = parseRange({ range: 'today' })
  const todaySince = today.cutoffISO // IST midnight, as UTC ISO
  const todayISO = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
  // 9.A.1 #6 — Monday in IST, not UTC (server day-of-week is UTC on Vercel).
  const isMondayIST =
    new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' }) === 'Monday'

  // ── Today's RDs logged ────────────────────────────────────────
  const { data: rdsTodayRaw } = await supabase
    .from('referring_domains')
    .select('id, first_seen_at')
    .gte('first_seen_at', todaySince)
  const rdsToday = (rdsTodayRaw ?? []).length

  // ── Today's outreach sent ─────────────────────────────────────
  const { data: outreachTodayRaw } = await supabase
    .from('outreach_log')
    .select('id, sent_at, source_channel')
    .gte('sent_at', todaySince)
    .not('sent_at', 'is', null)
  const outreachToday = (outreachTodayRaw ?? []).length
  const haroToday = (outreachTodayRaw ?? []).filter(
    (r: { source_channel: string }) => r.source_channel === 'haro',
  ).length

  // ── Lifetime stats ────────────────────────────────────────────
  const { count: rdsLifetime } = await supabase
    .from('referring_domains')
    .select('id', { count: 'exact', head: true })
  const { count: outreachLifetime } = await supabase
    .from('outreach_log')
    .select('id', { count: 'exact', head: true })
    .not('sent_at', 'is', null)

  // ── Stale-outreach pool (eligible tools without a draft yet) ──
  const { count: draftedFounders } = await supabase
    .from('outreach_log')
    .select('id', { count: 'exact', head: true })
    .eq('source_channel', 'founder_outreach')

  const tasks: DailyTask[] = [
    {
      key: 'authority',
      title: 'Log referring domains',
      description: 'Spot-check yesterday\'s mentions, log any new RDs you found.',
      href: '/admin/authority',
      done: rdsToday > 0,
      meta: `${rdsToday} logged today · ${rdsLifetime ?? 0} lifetime`,
      icon: <LinkIcon className="h-4 w-4" />,
    },
    {
      key: 'outreach',
      title: 'Send 5-10 founder outreach emails',
      description: 'Open the latest outreach CSV → paste 5-10 rows into Gmail / Apollo.',
      done: outreachToday >= 5,
      meta: `${outreachToday}/5 sent today · ${draftedFounders ?? 0} drafts in pool · ${outreachLifetime ?? 0} lifetime sent`,
      icon: <Mail className="h-4 w-4" />,
    },
    {
      key: 'haro',
      title: 'HARO / Qwoted inbox',
      description: 'Filter to AI / software / productivity tags. Answer 2-3 max. 15 min cap.',
      href: '/admin/daily',
      done: haroToday > 0,
      meta: `${haroToday} replies today`,
      icon: <FileText className="h-4 w-4" />,
    },
    {
      key: 'bing',
      title: 'Bing Webmaster spot-check',
      description: 'Has indexed-page count moved? Sudden drop = act now.',
      href: 'https://www.bing.com/webmasters',
      external: true,
      done: false,
      meta: 'Open at start of each session',
      icon: <Search className="h-4 w-4" />,
    },
    {
      key: 'gsc',
      title: 'GSC indexed-page check (Mon only)',
      description: 'Week-over-week net-new indexed URLs. Target: 50+/week.',
      href: 'https://search.google.com/search-console',
      external: true,
      done: !isMondayIST,
      meta: isMondayIST ? 'Today is Monday — please review' : 'Not Monday — skip',
      icon: <Search className="h-4 w-4" />,
    },
  ]

  return (
    <div>
      <PageHeader>
        <span className="text-xs text-zinc-500">{todayISO} (IST)</span>
      </PageHeader>
      <p className="mb-8 -mt-2 max-w-3xl text-xs text-zinc-500">
        Companion to <code className="text-emerald-400">npm run daily</code>. The Bing
        + GSC + IndexNow steps run automatically (via launchd 09:00 / Vercel cron) —
        these are the manual pieces that need a human. Pinned to today (IST midnight);
        the global range filter does not apply here.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <Stat label="RDs today" value={rdsToday} sub={`${rdsLifetime ?? 0} lifetime`} info={<MetricInfo docKey="daily_checklist" />} />
        <Stat label="Emails sent today" value={outreachToday} sub={`${outreachLifetime ?? 0} lifetime`} info={<MetricInfo docKey="daily_checklist" />} />
        <Stat label="HARO replies today" value={haroToday} sub="goal: 2-3/day" info={<MetricInfo docKey="daily_checklist" />} />
        <Stat label="Founder drafts" value={draftedFounders ?? 0} sub="ready to send" info={<MetricInfo docKey="daily_checklist" />} />
      </div>

      <div className="space-y-3">
        {tasks.map((t) => (
          <div
            key={t.key}
            className={`rounded-lg border p-4 ${
              t.done ? 'border-emerald-800/50 bg-emerald-950/10' : 'border-zinc-800 bg-zinc-900/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                {t.done ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : (
                  <Circle className="h-5 w-5 text-zinc-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={`text-sm font-semibold ${t.done ? 'text-emerald-300' : 'text-white'}`}>
                    {t.title}
                  </h3>
                  {t.href && (
                    t.external ? (
                      <a
                        href={t.href}
                        target="_blank"
                        rel="noopener"
                        className="text-xs text-zinc-400 hover:text-emerald-300 flex items-center gap-1"
                      >
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <Link
                        href={t.href}
                        className="text-xs text-zinc-400 hover:text-emerald-300"
                      >
                        Go →
                      </Link>
                    )
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-1">{t.description}</p>
                {t.meta && (
                  <p className="text-[11px] text-zinc-500 mt-2 flex items-center gap-1.5">
                    {t.icon}
                    {t.meta}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 text-xs text-zinc-400">
        <p className="mb-2">
          <strong className="text-zinc-300">Automated steps</strong> (no action needed):
        </p>
        <ul className="space-y-1 list-disc pl-5">
          <li>Bing direct submission — daily 09:00 local via launchd plist</li>
          <li>GSC sitemap re-ping — Mon 06:00 UTC via Vercel cron + throttled in launchd</li>
          <li>IndexNow recent — daily 07:00 UTC via Vercel cron</li>
          <li>Latest-updates refresh — daily 02:00 UTC via Vercel cron (top 50 tools)</li>
        </ul>
        <p className="mt-3">
          Full strategy + cadence:{' '}
          <span className="text-emerald-400">docs/operations/strategy-5-approaches.md</span>
        </p>
      </div>
    </div>
  )
}

// Kit-styled stat card with the shared ⓘ provenance slot.
function Stat({ label, value, sub, info }: { label: string; value: number; sub: string; info?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between gap-1">
        <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
        {info ?? null}
      </div>
      <div className="text-2xl font-semibold text-white mt-2">{value.toLocaleString()}</div>
      <div className="text-[11px] text-zinc-500 mt-1">{sub}</div>
    </div>
  )
}
