// Phase 13 Social — the approval queue + control panel, organised per platform.
// Service-role-only tables → read via getAdminClient (the admin layout already
// gates this route to is_admin users). Tabs: Overview + one per platform, each
// with this week's AI strategy card and that platform's filtered queue.

import type { ReactNode } from 'react'
import Link from 'next/link'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { PageHeader } from '@/components/admin/page-header'
import { SocialPostCard, type SocialPostView } from '@/components/admin/social-post-card'
import { BulkApproveButton, PauseToggle, RegenerateStrategyButton } from '@/components/admin/social-controls'
import { getCurrentStrategy, SOCIAL_GOALS, type StoredStrategy } from '@/lib/social/strategy'
import { X_COST_PER_POST, X_COST_PER_POST_WITH_LINK } from '@/lib/social/sops'
import type { Platform } from '@/lib/social/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Social — Admin' }

const PLATFORMS: Platform[] = ['linkedin', 'x', 'instagram', 'reddit']

type Row = SocialPostView & { platform: string; status: string; cost_usd: number; posted_at: string | null }

function startOfMonthISO(): string {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString()
}

export default async function SocialAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string }>
}) {
  const sp = await searchParams
  const view: 'overview' | Platform = PLATFORMS.includes(sp.platform as Platform) ? (sp.platform as Platform) : 'overview'
  const db = getAdminClient()

  const postsRes = await db
    .from('social_posts')
    .select('id, platform, kind, status, copy, hashtags, link_url, graphic_template, subreddit, scheduled_at, source_refs, brain_meta, cost_usd, posted_at')
    .order('created_at', { ascending: false })
    .limit(300)
  const allPosts = (postsRes.data ?? []) as Row[]
  const posts = view === 'overview' ? allPosts : allPosts.filter((p) => p.platform === view)

  const accountsRes = await db.from('social_accounts').select('platform, status, display_name, token_expires_at, meta')
  const accounts = (accountsRes.data ?? []) as Array<{ platform: string; status: string; display_name: string | null; token_expires_at: string | null; meta: Record<string, unknown> | null }>
  const accountByPlatform = new Map(accounts.map((a) => [a.platform, a]))

  const strategy = view === 'overview' ? null : await getCurrentStrategy(view)

  // X budget meter — month-to-date spend from posted X posts.
  const monthStart = startOfMonthISO()
  const xSpend = allPosts
    .filter((p) => p.platform === 'x' && p.posted_at && p.posted_at >= monthStart)
    .reduce((s, p) => s + (Number(p.cost_usd) || 0), 0)
  const xCap = process.env.X_MONTHLY_CAP_USD ? parseFloat(process.env.X_MONTHLY_CAP_USD) : null
  const xPct = xCap ? Math.min(100, Math.round((xSpend / xCap) * 100)) : null

  const pending = posts.filter((p) => p.status === 'draft')
  const queued = posts.filter((p) => p.status === 'approved' || p.status === 'scheduled')
  const done = posts.filter((p) => ['posted', 'failed', 'cancelled'].includes(p.status))

  const byPlatform = () => PLATFORMS.map((pl) => ({ pl, n: allPosts.filter((p) => p.platform === pl).length }))

  return (
    <div className="text-zinc-300">
      <PageHeader />

      <div className="mb-2 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-white">Social</h1>
        <span className="text-sm text-zinc-500">{allPosts.length} posts · {allPosts.filter((p) => p.status === 'draft').length} awaiting approval</span>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <TabLink href="/admin/social" active={view === 'overview'} label="Overview" />
        {PLATFORMS.map((pl) => (
          <TabLink key={pl} href={`/admin/social?platform=${pl}`} active={view === pl} label={pl[0].toUpperCase() + pl.slice(1)} />
        ))}
      </div>

      {view === 'overview' ? (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <XBudgetCard xCap={xCap} xSpend={xSpend} xPct={xPct} />
            <ConnectionsCard accountByPlatform={accountByPlatform} />
          </div>
          <div className="mb-8 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <div className="mb-2 text-sm font-semibold text-white">Posts by platform</div>
            <div className="flex flex-wrap gap-4 text-sm">
              {byPlatform().map(({ pl, n }) => (
                <Link key={pl} href={`/admin/social?platform=${pl}`} className="text-zinc-400 hover:text-emerald-400">
                  <span className="capitalize text-zinc-200">{pl}</span>: {n}
                </Link>
              ))}
            </div>
            <p className="mt-3 text-xs text-zinc-500">Open a platform tab to see its weekly strategy + queue.</p>
          </div>
        </>
      ) : (
        <>
          <StrategyCard platform={view} strategy={strategy} />
          <div className="mb-8 flex flex-wrap items-center gap-4">
            <PlatformConnection account={accountByPlatform.get(view)} platform={view} />
            {view === 'x' ? <XBudgetInline xCap={xCap} xSpend={xSpend} xPct={xPct} /> : null}
          </div>
        </>
      )}

      <Section
        title={`Awaiting approval (${pending.length})`}
        posts={pending}
        empty="No drafts waiting. The daily brain fills the queue (aligned to the strategy above)."
        action={<BulkApproveButton count={pending.length} />}
      />
      <Section title={`Approved & scheduled (${queued.length})`} posts={queued} empty="Nothing approved yet." groupByDay />
      <Section title={`History (${done.length})`} posts={done} empty="No posted/cancelled posts yet." />
    </div>
  )
}

function TabLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? 'border-emerald-700 bg-emerald-950/40 text-emerald-300' : 'border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
      }`}
    >
      {label}
    </Link>
  )
}

function StrategyCard({ platform, strategy }: { platform: Platform; strategy: StoredStrategy | null }) {
  return (
    <div className="mb-6 rounded-lg border border-emerald-900/50 bg-emerald-950/10 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-400">This week&rsquo;s {platform} strategy</h2>
        <RegenerateStrategyButton platform={platform} />
      </div>
      {!strategy ? (
        <p className="text-sm text-zinc-400">
          No strategy yet for this week — it generates automatically every Monday, or click <em>Regenerate</em> to craft one now from
          last week&rsquo;s results.
        </p>
      ) : (
        <div className="space-y-3 text-sm">
          <div className="text-base font-semibold text-white">{strategy.focus}</div>
          {strategy.themes.length ? (
            <div className="flex flex-wrap gap-2">
              {strategy.themes.map((t) => (
                <span key={t} className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300">{t}</span>
              ))}
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 text-zinc-400 sm:grid-cols-2">
            {strategy.postTypes.length ? <div><span className="text-zinc-500">Formats:</span> {strategy.postTypes.join(', ')}</div> : null}
            {strategy.cadence ? <div><span className="text-zinc-500">Cadence:</span> {strategy.cadence}</div> : null}
          </div>
          {strategy.rationale ? <p className="text-zinc-400"><span className="text-zinc-500">Why:</span> {strategy.rationale}</p> : null}
          {strategy.goalAlignment ? <p className="text-zinc-400"><span className="text-zinc-500">Goal fit:</span> {strategy.goalAlignment}</p> : null}
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-zinc-800 pt-2 text-xs text-zinc-500">
            <span>Goals: {SOCIAL_GOALS.join(' · ')}</span>
            <span>Based on last week: {strategy.basedOn.postCount} posts{strategy.basedOn.postCount ? `, avg engagement ${strategy.basedOn.avgEngagement}` : ''}</span>
            {strategy.weekStart ? <span>Week of {strategy.weekStart}</span> : null}
          </div>
        </div>
      )}
    </div>
  )
}

function XBudgetCard({ xCap, xSpend, xPct }: { xCap: number | null; xSpend: number; xPct: number | null }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-1 text-sm font-semibold text-white">X / Twitter budget (this month)</div>
      {xCap == null ? (
        <p className="text-sm text-amber-400">No cap set — define <code className="text-zinc-300">X_MONTHLY_CAP_USD</code> to enable X posting + the meter.</p>
      ) : (
        <>
          <div className="mb-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">${xSpend.toFixed(2)}</span>
            <span className="text-sm text-zinc-500">/ ${xCap.toFixed(2)} cap</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded bg-zinc-800">
            <div className={`h-full ${xPct! >= 90 ? 'bg-rose-500' : xPct! >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${xPct}%` }} />
          </div>
          <p className="mt-2 text-xs text-zinc-500">~${X_COST_PER_POST.toFixed(3)}/post · ${X_COST_PER_POST_WITH_LINK.toFixed(2)}/post-with-link. The brain skips X drafts that would exceed the cap.</p>
        </>
      )}
    </div>
  )
}

function XBudgetInline({ xCap, xSpend, xPct }: { xCap: number | null; xSpend: number; xPct: number | null }) {
  if (xCap == null) return <span className="text-xs text-amber-400">X budget: no cap set</span>
  return (
    <span className="flex items-center gap-2 text-xs text-zinc-400">
      X budget: <span className="font-semibold text-white">${xSpend.toFixed(2)}</span>/${xCap.toFixed(2)}
      <span className="inline-block h-1.5 w-24 overflow-hidden rounded bg-zinc-800">
        <span className={`block h-full ${xPct! >= 90 ? 'bg-rose-500' : xPct! >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${xPct}%` }} />
      </span>
    </span>
  )
}

type Account = { platform: string; status: string; display_name: string | null; meta: Record<string, unknown> | null }

function ConnectionsCard({ accountByPlatform }: { accountByPlatform: Map<string, Account> }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-2 text-sm font-semibold text-white">Platform connections</div>
      <div className="grid grid-cols-2 gap-2">
        {PLATFORMS.map((pl) => (
          <div key={pl} className="flex items-center justify-between rounded border border-zinc-800 px-3 py-2">
            <span className="text-sm capitalize text-zinc-300">{pl}</span>
            <PlatformConnection account={accountByPlatform.get(pl)} platform={pl} compact />
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-zinc-500">Pause stops a platform without disconnecting.</p>
    </div>
  )
}

function PlatformConnection({ account, platform, compact }: { account?: Account; platform: Platform; compact?: boolean }) {
  const connected = account?.status === 'connected'
  const paused = (account?.meta as { paused?: boolean } | undefined)?.paused === true
  return (
    <span className="flex items-center gap-2">
      {!compact ? <span className="text-sm capitalize text-zinc-300">{platform}:</span> : null}
      <span className={`text-xs font-medium ${paused ? 'text-amber-400' : connected ? 'text-emerald-400' : 'text-zinc-500'}`}>
        {paused ? 'paused' : connected ? 'connected' : (account?.status ?? 'not connected')}
      </span>
      <PauseToggle platform={platform} paused={paused} />
    </span>
  )
}

function dayLabel(iso: string | null): string {
  if (!iso) return 'Unscheduled'
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }) + ' (UTC)'
}

function Section({
  title,
  posts,
  empty,
  action,
  groupByDay,
}: {
  title: string
  posts: (SocialPostView & { scheduled_at?: string | null })[]
  empty: string
  action?: ReactNode
  groupByDay?: boolean
}) {
  const groups: { label: string; items: SocialPostView[] }[] = []
  if (groupByDay) {
    const byDay = new Map<string, SocialPostView[]>()
    for (const p of [...posts].sort((a, b) => String(a.scheduled_at).localeCompare(String(b.scheduled_at)))) {
      const k = dayLabel(p.scheduled_at ?? null)
      if (!byDay.has(k)) byDay.set(k, [])
      byDay.get(k)!.push(p)
    }
    for (const [label, items] of byDay) groups.push({ label, items })
  }

  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {action}
      </div>
      {posts.length === 0 ? (
        <p className="text-sm text-zinc-500">{empty}</p>
      ) : groupByDay ? (
        <div className="flex flex-col gap-5">
          {groups.map((g) => (
            <div key={g.label}>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-emerald-400">{g.label} · {g.items.length}</div>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {g.items.map((p) => (
                  <SocialPostCard key={p.id} post={p} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {posts.map((p) => (
            <SocialPostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </section>
  )
}
