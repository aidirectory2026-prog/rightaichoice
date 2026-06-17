// Phase 10.4.2 — admin shell rewrite: left sidebar (from lib/admin/nav.ts)
// replaces the old 17-link top nav. Auth gating is unchanged. A server-side
// tracking-trust check renders a thin banner when the latest
// tracking_health run has any fail (red) or warn (amber).

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { AdminSidebar, MobileSidebar } from '@/components/admin/sidebar'
import { AdminBreadcrumb } from '@/components/admin/page-header'
import { GlobalSearch } from '@/components/admin/global-search'

export const metadata = { title: 'Admin' }

type TrustStatus = 'pass' | 'warn' | 'fail'

// Worst status of the most recent tracking_health run batch. One cheap
// round trip: newest run_at first, fails sorted to the front within the
// batch ('fail' < 'pass' < 'warn'), capped at 20 rows.
async function getTrackingTrustStatus(): Promise<TrustStatus | null> {
  try {
    const db = getAdminClient()
    const { data } = await db
      .from('tracking_health')
      .select('status, run_at')
      .order('run_at', { ascending: false })
      .order('status', { ascending: true })
      .limit(20)
    const rows = (data as { status: TrustStatus; run_at: string }[] | null) ?? []
    if (rows.length === 0) return null
    const batch = rows.filter((r) => r.run_at === rows[0].run_at)
    if (batch.some((r) => r.status === 'fail')) return 'fail'
    if (batch.some((r) => r.status === 'warn')) return 'warn'
    return 'pass'
  } catch {
    return null // banner is best-effort; never block the admin shell
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, username')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/dashboard')

  const trust = await getTrackingTrustStatus()

  return (
    <div className="min-h-screen bg-zinc-950 lg:flex">
      <AdminSidebar />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
          <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <MobileSidebar />
              <AdminBreadcrumb />
            </div>
            <div className="hidden flex-1 justify-center px-4 md:flex">
              <GlobalSearch />
            </div>
            <div className="flex shrink-0 items-center gap-4">
              <span className="text-xs text-zinc-500">{profile.username}</span>
              <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                Dashboard
              </Link>
            </div>
          </div>
        </header>
        {trust === 'fail' || trust === 'warn' ? (
          <Link
            href="/admin/tracking-health"
            className={`flex items-center gap-2 border-b px-4 py-1.5 text-xs font-medium sm:px-6 lg:px-8 ${
              trust === 'fail'
                ? 'border-red-900 bg-red-950/60 text-red-300 hover:bg-red-950'
                : 'border-amber-900 bg-amber-950/60 text-amber-300 hover:bg-amber-950'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Tracking trust check {trust === 'fail' ? 'failing' : 'warning'} — see Tracking health
          </Link>
        ) : null}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
