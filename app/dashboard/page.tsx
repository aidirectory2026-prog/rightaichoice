import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/actions/auth'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, full_name, avatar_url, reputation, review_count, is_admin')
    .eq('id', user.id)
    .single()

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-white">
            {profile?.full_name || profile?.username || 'Dashboard'}
          </h1>
          <p className="text-sm text-zinc-400">{user.email}</p>
          {profile?.is_admin && (
            <span className="inline-block text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 rounded px-2 py-0.5 mt-1">
              Admin
            </span>
          )}
        </div>

        <div className="flex justify-center gap-6 text-center">
          <div>
            <p className="text-lg font-semibold text-white">{profile?.reputation ?? 0}</p>
            <p className="text-xs text-zinc-500">Reputation</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-white">{profile?.review_count ?? 0}</p>
            <p className="text-xs text-zinc-500">Reviews</p>
          </div>
        </div>

        <form action={signOut}>
          <button
            type="submit"
            className="text-sm text-zinc-400 hover:text-white underline transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  )
}
