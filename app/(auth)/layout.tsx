import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Phase 7 Step 53 (BUG-008): authed users hitting /login or /signup get a
// 307 redirect to /dashboard. Stale links no longer dump returning users on
// an auth form they don't need. Server-side, so it fires before any client
// JS — no flash of the wrong UI.
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
