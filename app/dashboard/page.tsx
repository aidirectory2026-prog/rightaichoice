import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/actions/auth'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-zinc-400">Logged in as {user.email}</p>
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
