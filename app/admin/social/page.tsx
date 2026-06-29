// Phase 13 Social — the approval queue + control panel.
// Service-role-only tables → read via getAdminClient (the admin layout already
// gates this route to is_admin users).

import type { ReactNode } from 'react'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { PageHeader } from '@/components/admin/page-header'
import { SocialPostCard, type SocialPostView } from '@/components/admin/social-post-card'
import { BulkApproveButton, PauseToggle } from '@/components/admin/social-controls'
import { X_COST_PER_POST, X_COST_PER_POST_WITH_LINK } from '@/lib/social/sops'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Social — Admin' }

const PLATFORMS = ['linkedin', 'x', 'instagram', 'reddit'] as const

type Row = SocialPostView & { platform: string; status: string; cost_usd: number; posted_at: string | null }

function startOfMonthISO(): string {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString()
}

export default async function SocialAdminPage() {
  const db = getAdminClient()

  const postsRes = await db
    .from('social_posts')
    .select('id, platform, kind, status, copy, hashtags, link_url, graphic_template, subreddit, scheduled_at, source_refs, brain_meta, cost_usd, posted_at')
    .order('created_at', { ascending: false })
    .limit(200)
  const posts = (postsRes.data ?? []) as Row[]

  const accountsRes = await db.from('social_accounts').select('platform, status, display_name, token_expires_at, meta')
  const accounts = (accountsRes.data ?? []) as Array<{ platform: string; status: string; display_name: string | null; token_expires_at: string | null; meta: Record<string, unknown> | null }>
  const accountByPlatform = new Map(accounts.map((a) => [a.platform, a]))

  // X budget meter — month-to-date spend from posted X posts.
  const monthStart = startOfMonthISO()
  const xSpend = posts
    .filter((p) => p.platform === 'x' && p.posted_at && p.posted_at >= monthStart)
    .reduce((s, p) => s + (Number(p.cost_usd) || 0), 0)
  const xCap = process.env.X_MONTHLY_CAP_USD ? parseFloat(process.env.X_MONTHLY_CAP_USD) : null
  const xPct = xCap ? Math.min(100, Math.round((xSpend / xCap) * 100)) : null

  // Queue groups.
  const pending = posts.filter((p) => p.status === 'draft')
  const queued = posts.filter((p) => p.status === 'approved' || p.status === 'scheduled')
  const done = posts.filter((p) => ['posted', 'failed', 'cancelled'].includes(p.status))

  const byPlatform = (st?: string) =>
    PLATFORMS.map((pl) => ({
      pl,
      n: posts.filter((p) => p.platform === pl && (!st || p.status === st)).length,
    }))

  return (
    <div className="text-zinc-300">
      <PageHeader />

      <div className="mb-2 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-white">Social</h1>
        <span className="text-sm text-zinc-500">{posts.length} posts · {pending.length} awaiting approval</span>
      </div>
      <p className="mb-6 max-w-3xl text-sm text-zinc-400">
        The brain drafts posts from our live data and schedules a slot. Nothing posts until you approve it
        here. Approved posts publish automatically from the cloud at their scheduled time.
      </p>

      {/* Top strip: X budget + connection status */}
      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <div className="mb-1 text-sm font-semibold text-white">X / Twitter budget (this month)</div>
          {xCap == null ? (
            <p className="text-sm text-amber-400">
              No cap set — define <code className="text-zinc-300">X_MONTHLY_CAP_USD</code> to enable X posting + the meter.
            </p>
          ) : (
            <>
              <div className="mb-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">${xSpend.toFixed(2)}</span>
                <span className="text-sm text-zinc-500">/ ${xCap.toFixed(2)} cap</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded bg-zinc-800">
                <div
                  className={`h-full ${xPct! >= 90 ? 'bg-rose-500' : xPct! >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${xPct}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                ~${X_COST_PER_POST.toFixed(3)}/post · ${X_COST_PER_POST_WITH_LINK.toFixed(2)}/post-with-link. The brain skips X drafts that would exceed the cap.
              </p>
            </>
          )}
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <div className="mb-2 text-sm font-semibold text-white">Platform connections</div>
          <div className="grid grid-cols-2 gap-2">
            {PLATFORMS.map((pl) => {
              const a = accountByPlatform.get(pl)
              const connected = a?.status === 'connected'
              const paused = (a?.meta as { paused?: boolean } | undefined)?.paused === true
              return (
                <div key={pl} className="flex items-center justify-between rounded border border-zinc-800 px-3 py-2">
                  <span className="text-sm capitalize text-zinc-300">{pl}</span>
                  <span className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${paused ? 'text-amber-400' : connected ? 'text-emerald-400' : 'text-zinc-500'}`}>
                      {paused ? 'paused' : connected ? 'connected' : (a?.status ?? 'not connected')}
                    </span>
                    <PauseToggle platform={pl} paused={paused} />
                  </span>
                </div>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-zinc-500">Publishers light up as each platform's credentials/approvals land. Pause stops a platform without disconnecting.</p>
        </div>
      </div>

      {/* Insights snapshot (full loop in S7) */}
      <div className="mb-8 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <div className="mb-2 text-sm font-semibold text-white">Queue by platform</div>
        <div className="flex flex-wrap gap-4 text-sm">
          {byPlatform().map(({ pl, n }) => (
            <span key={pl} className="text-zinc-400">
              <span className="capitalize text-zinc-200">{pl}</span>: {n}
            </span>
          ))}
        </div>
      </div>

      <Section
        title={`Awaiting approval (${pending.length})`}
        posts={pending}
        empty="No drafts waiting. Run the draft brain to fill the queue."
        action={<BulkApproveButton count={pending.length} />}
      />
      <Section title={`Approved & scheduled (${queued.length})`} posts={queued} empty="Nothing approved yet." groupByDay />
      <Section title={`History (${done.length})`} posts={done} empty="No posted/cancelled posts yet." />
    </div>
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
  // For the schedule view, group by the day a post is scheduled to go out.
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
