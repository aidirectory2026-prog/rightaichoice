'use client'

// Phase 11 (2026-06-22): the guest (anonymous) → real-account path. Shown on the
// dashboard for anonymous users so "guest" is never a confusing dead-end.
// Email upgrade converts the session IN PLACE (updateUser) — their data is kept —
// then we sync the profile + send a verification link. Google goes through normal
// OAuth.

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { syncMyProfile } from '@/actions/auth'
import { GoogleSignInButton } from '@/components/auth/google-signin-button'
import { Sparkles, Mail, Loader2 } from 'lucide-react'

export function GuestUpgrade() {
  const [mode, setMode] = useState<'idle' | 'email'>('idle')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function upgradeWithEmail(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setBusy(true)
    const supabase = createClient()
    // Convert the anonymous session into a permanent email account, in place.
    const { error: upErr } = await supabase.auth.updateUser({ email: email.trim(), password })
    if (upErr) {
      setError(upErr.message.includes('already') ? 'That email is already registered. Try signing in instead.' : upErr.message)
      setBusy(false)
      return
    }
    // Give them a real handle + send the verification link.
    await syncMyProfile().catch(() => {})
    window.location.href = '/dashboard?upgraded=1'
  }

  return (
    <div className="mb-6 rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600/20 ring-1 ring-emerald-500/40">
          <Sparkles className="h-4 w-4 text-emerald-300" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-white">You&apos;re browsing as a guest</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Create a free account to keep your saved tools, stacks, and scans for good — it takes a few seconds and you won&apos;t lose anything you&apos;ve saved.
          </p>

          {mode === 'idle' ? (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="sm:max-w-[240px]">
                <GoogleSignInButton next="/dashboard" />
              </div>
              <button
                type="button"
                onClick={() => setMode('email')}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors"
              >
                <Mail className="h-4 w-4" aria-hidden />
                Continue with email
              </button>
            </div>
          ) : (
            <form onSubmit={upgradeWithEmail} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (8+ chars)"
                autoComplete="new-password"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={busy}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-60 transition-colors"
              >
                {busy ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Creating…</> : 'Create account'}
              </button>
            </form>
          )}
          {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
        </div>
      </div>
    </div>
  )
}
