// Phase 11.1 — Members (registered users). Reads auth.users DIRECTLY so every
// signup appears here the moment the account exists — independent of whether the
// signup_completed analytics event fired. This is the source-of-truth list so a
// new signup is never missed. Admin-only (insights_registered_users, migration 164).

import Link from 'next/link'
import { ChevronLeft, UserCheck, Sparkles } from 'lucide-react'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { MetricCard } from '@/components/admin/charts'
import { SearchInput } from '@/components/admin/search-input'
import { parseAdminFilters } from '@/lib/admin/filters'
import { RangePicker } from '@/components/admin/range-picker'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Members — Admin' }

type Member = {
  user_id: string
  email: string | null
  full_name: string | null
  provider: string | null
  username: string | null
  signed_up: string
  last_sign_in: string | null
  email_confirmed: boolean
  distinct_id: string | null
  lifetime_events: number
  last_event: string | null
  has_signup_event: boolean
}

async function getMembers(): Promise<Member[]> {
  const db = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (db as any).rpc('insights_registered_users')
  return ((data ?? []) as Member[]).map((m) => ({ ...m, lifetime_events: Number(m.lifetime_events) }))
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
function isNew(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 7 * 86_400_000
}

const PROVIDER_CLASS: Record<string, string> = {
  google: 'border-sky-800 bg-sky-950/40 text-sky-300',
  email: 'border-zinc-700 bg-zinc-900 text-zinc-400',
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  // Wave 1 — search + signed-up range, applied in TS (this list reads
  // auth.users, not user_events, so the event-dimension bar can't honestly
  // apply here; every-account is small enough to filter after fetch).
  const q = (sp.q ?? '').trim().toLowerCase()
  const hasRange = Boolean(sp.range || sp.from || sp.to)
  const rangeSel = parseAdminFilters(sp).range

  const all = await getMembers()
  const members = all.filter((m) => {
    if (q) {
      const hay = `${m.email ?? ''} ${m.full_name ?? ''} ${m.username ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (hasRange) {
      const t = new Date(m.signed_up).getTime()
      if (t < new Date(rangeSel.cutoffISO).getTime()) return false
      if (rangeSel.endCutoffISO && t >= new Date(rangeSel.endCutoffISO).getTime()) return false
    }
    return true
  })
  const total = members.length
  const new7 = members.filter((m) => isNew(m.signed_up)).length
  const google = members.filter((m) => m.provider === 'google').length

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
            <ChevronLeft className="h-3 w-3" />Admin
          </Link>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-white">
            <UserCheck className="h-5 w-5 text-emerald-500" />
            Members
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <SearchInput param="q" placeholder="Email, name or username…" />
          {/* No highlight when unset — the list is all-time by default. */}
          <RangePicker active={hasRange ? rangeSel.key : ('none' as never)} />
        </div>
      </div>
      <p className="mb-4 max-w-3xl text-xs text-zinc-500">
        Every registered account, newest first — read straight from the auth system, so a signup shows here the
        moment it happens (even if its tracking event didn’t fire). New this week is highlighted.
      </p>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricCard label="Registered members" value={total} kind="accounts" />
        <MetricCard label="New this week" value={new7} kind="accounts" />
        <MetricCard label="Via Google" value={google} kind="accounts" />
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-zinc-900/60 text-left text-[11px] uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-medium">Member</th>
              <th className="px-3 py-2 font-medium">Via</th>
              <th className="px-3 py-2 font-medium">Signed up</th>
              <th className="px-3 py-2 font-medium">Last sign-in</th>
              <th className="px-3 py-2 text-right font-medium">Events</th>
              <th className="px-3 py-2 font-medium">Last active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/80">
            {members.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-zinc-500">{q || hasRange ? 'No members match these filters.' : 'No registered members yet.'}</td></tr>
            ) : (
              members.map((m) => (
                <tr key={m.user_id} className={`hover:bg-zinc-900/40 ${isNew(m.signed_up) ? 'bg-emerald-950/20' : ''}`}>
                  <td className="px-3 py-2">
                    {m.distinct_id ? (
                      <Link href={`/admin/insights/user/${encodeURIComponent(m.distinct_id)}`} className="group inline-flex flex-col">
                        <span className="flex items-center gap-1.5 text-xs text-zinc-200 group-hover:text-emerald-400">
                          {m.email ?? m.username ?? m.user_id}
                          {isNew(m.signed_up) && <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-700 bg-emerald-950/50 px-1.5 py-px text-[9px] font-semibold text-emerald-300"><Sparkles className="h-2.5 w-2.5" />NEW</span>}
                        </span>
                        {m.full_name && <span className="text-[10px] text-zinc-500">{m.full_name}</span>}
                      </Link>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-zinc-300">
                        {m.email ?? m.username ?? m.user_id}
                        {isNew(m.signed_up) && <span className="rounded-full border border-emerald-700 bg-emerald-950/50 px-1.5 py-px text-[9px] font-semibold text-emerald-300">NEW</span>}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${PROVIDER_CLASS[m.provider ?? 'email'] ?? PROVIDER_CLASS.email}`}>{m.provider ?? 'email'}</span>
                    {!m.email_confirmed && <span className="ml-1 rounded-full border border-amber-800 bg-amber-950/40 px-1.5 py-0.5 text-[9px] text-amber-300" title="Email not confirmed">unconfirmed</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-300" title={m.signed_up}>{fmtDate(m.signed_up)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-500" title={m.last_sign_in ?? ''}>{fmtDate(m.last_sign_in)}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-400">{m.lifetime_events.toLocaleString()}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-500" title={m.last_event ?? ''}>{fmtDate(m.last_event)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
