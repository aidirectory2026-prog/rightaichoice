'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'

// OAuth return-path handler. `signInWithOAuthClient` stashes `oauth_return_to`
// (the page the user clicked the CTA on) before the provider round-trip. When
// Supabase bounces the user to its Site URL (the homepage) instead of back to
// the CTA — which happens when the current origin isn't in Supabase's redirect
// allowlist (localhost / preview deploys) — we recover it here.
//
// Crucially this reads auth state from the AuthProvider context (`useAuth`),
// which the layout resolves SERVER-side from the session cookie. It never
// creates a Supabase client or calls getSession()/detectSessionInUrl, so it
// CANNOT race or consume the single-use OAuth code (the bug that previously
// broke sign-in). If signed in → redirect straight to the CTA; if the session
// isn't resolved yet → show a guaranteed manual link.
export function OAuthContinueBanner() {
  const router = useRouter()
  const { user } = useAuth()
  const [to, setTo] = useState<string | null>(null)

  useEffect(() => {
    let raw: string | null = null
    try { raw = sessionStorage.getItem('oauth_return_to') } catch { /* private mode */ }
    if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw === window.location.pathname) return

    // BUGFIX (2026-06-21): only ever surface this banner for a user who is
    // ACTUALLY signed in. Previously the not-signed-in branch still rendered a
    // "You're signed in 🎉" banner whenever a stale `oauth_return_to` lingered —
    // e.g. the user clicked "Continue with Google", abandoned the consent
    // screen, and came back. The stash survived, so we falsely told them they
    // were logged in. If there's no resolved session, the round-trip didn't
    // complete: clear the stale path and show nothing.
    if (!user) {
      try { sessionStorage.removeItem('oauth_return_to') } catch { /* ignore */ }
      return
    }

    // Signed in with a pending return path → go straight to the CTA, with a
    // deferred manual-link fallback in case router.replace lags.
    try { sessionStorage.removeItem('oauth_return_to') } catch { /* ignore */ }
    router.replace(raw)
    const id = setTimeout(() => setTo(raw), 0)
    return () => clearTimeout(id)
  }, [user, router])

  if (!to || !user) return null

  const label = to.includes('/sentiment') ? 'Continue to your scan' : 'Continue where you left off'
  const clear = () => {
    try { sessionStorage.removeItem('oauth_return_to') } catch { /* ignore */ }
    setTo(null)
  }

  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex justify-center px-3 pt-3">
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-950/95 px-4 py-2.5 shadow-lg shadow-emerald-500/10 backdrop-blur">
        <span className="text-sm text-emerald-100">You&apos;re signed in 🎉</span>
        <Link
          href={to}
          onClick={clear}
          className="group inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-sm font-bold text-emerald-950 transition hover:bg-emerald-400"
        >
          {label}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </Link>
        <button onClick={clear} aria-label="Dismiss" className="px-1 text-lg leading-none text-emerald-300/70 hover:text-emerald-200">
          ×
        </button>
      </div>
    </div>
  )
}
