'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

// Guaranteed fallback for the OAuth return-path. signInWithOAuthClient stashes
// `oauth_return_to` before the provider round-trip; the auth provider tries to
// auto-redirect there once the session lands. But if Supabase bounces the user
// to its Site URL (the homepage) — which happens when the current origin isn't
// in Supabase's redirect allowlist (localhost / preview deploys) — the
// auto-redirect can fail to fire. This banner renders a plain, click-able link
// back to the scan with NO session/timing dependency, so the user is never
// stranded. It waits briefly first so the seamless auto-redirect (when it does
// work) wins and this never flashes.
export function OAuthContinueBanner() {
  const [to, setTo] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      let raw: string | null = null
      try { raw = sessionStorage.getItem('oauth_return_to') } catch { /* private mode */ }
      if (raw && raw.startsWith('/') && !raw.startsWith('//') && raw !== window.location.pathname) {
        setTo(raw)
      }
    }, 1500)
    return () => clearTimeout(t)
  }, [])

  if (!to) return null

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
