import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Logo } from '@/components/shared/logo'

export const metadata = { title: 'Admin' }

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

  return (
    <div className="min-h-screen bg-zinc-950">
      <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <Logo size="sm" />
              <span className="text-xs font-medium text-emerald-400 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded">
                Admin
              </span>
              <div className="flex items-center gap-4">
                <Link href="/admin/updates" className="text-sm text-zinc-400 hover:text-white transition-colors">
                  Knowledge Room
                </Link>
                <Link href="/admin/tools" className="text-sm text-zinc-400 hover:text-white transition-colors">
                  Tools
                </Link>
                <Link href="/admin/insights" className="text-sm text-zinc-400 hover:text-white transition-colors">
                  Insights
                </Link>
                <Link href="/admin/seo-pulse" className="text-sm text-zinc-400 hover:text-white transition-colors">
                  SEO Pulse
                </Link>
                <Link href="/admin/tracking-health" className="text-sm text-zinc-400 hover:text-white transition-colors">
                  Tracking health
                </Link>
                <Link href="/admin/freshness" className="text-sm text-zinc-400 hover:text-white transition-colors">
                  Freshness
                </Link>
                <Link href="/admin/daily" className="text-sm text-zinc-400 hover:text-white transition-colors">
                  Daily
                </Link>
                <Link href="/admin/authority" className="text-sm text-zinc-400 hover:text-white transition-colors">
                  Authority
                </Link>
                <Link href="/admin/tier1-review" className="text-sm text-zinc-400 hover:text-white transition-colors">
                  Tier-1
                </Link>
                <Link href="/admin/plan-conversion" className="text-sm text-zinc-400 hover:text-white transition-colors">
                  Plan funnel
                </Link>
                <Link href="/admin/data-audit" className="text-sm text-zinc-400 hover:text-white transition-colors">
                  Audit
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-zinc-500">{profile.username}</span>
              <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
