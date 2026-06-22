'use client'

// Phase 11 (2026-06-22): "Continue with Google" WITHOUT bouncing through
// <project>.supabase.co. Uses Google Identity Services (GIS) on our own origin to
// get a Google ID token, then hands it to Supabase via signInWithIdToken — so the
// Google screen shows "rightaichoice.com", never the Supabase project ref.
//
// Safety net: if GIS can't load/render, or the ID-token exchange fails, we fall
// back to the classic signInWithOAuth redirect (the old, working flow). So Google
// sign-in can never fully break — worst case it degrades to the previous screen.
//
// Requires (free, one-time): the Client ID added to Supabase → Auth → Providers →
// Google → "Authorized Client IDs", and https://rightaichoice.com (+ localhost)
// as an Authorized JavaScript origin on the Google OAuth client.

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { signInWithOAuthClient } from '@/lib/auth/oauth-client'
import { finalizeGoogleSignIn } from '@/actions/auth'
import { GoogleIcon } from '@/components/shared/google-icon'

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  '777408775110-815rdt4ojfhtfn2a6s29u7ofuptc7c6d.apps.googleusercontent.com'

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any
  }
}

/** Raw nonce → GIS gets the SHA-256 hash, signInWithIdToken gets the raw value. */
async function makeNonce(): Promise<[string, string]> {
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))))
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  const hashed = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return [raw, hashed]
}

let gisLoad: Promise<void> | null = null
function loadGis(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.google?.accounts?.id) return Promise.resolve()
  if (gisLoad) return gisLoad
  gisLoad = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('GIS failed to load'))
    document.head.appendChild(s)
  })
  return gisLoad
}

type Props = {
  /** Where to land after a successful sign-in (same-origin path). */
  next?: string | null
  /** Run inside the credential callback BEFORE the session is created — the plan
   *  modal uses this to stash/persist the typed goal + fire its analytics. */
  beforeSession?: () => void
}

export function GoogleSignInButton({ next, beforeSession }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<'init' | 'gis' | 'fallback' | 'busy'>('init')
  // Diagnostic surfaced on-screen so a non-GIS failure is visible, not silent.
  const [reason, setReason] = useState<string>('')

  const safeNext = useCallback(() => {
    if (!next || !next.startsWith('/') || next.startsWith('//')) return '/dashboard'
    return next
  }, [next])

  // Old, reliable redirect flow — used as the fallback.
  const fallback = useCallback(() => {
    try { beforeSession?.() } catch { /* ignore */ }
    void signInWithOAuthClient('google', safeNext())
  }, [beforeSession, safeNext])

  const onCredential = useCallback(
    async (rawNonce: string, credential: string) => {
      setMode('busy')
      try {
        try { beforeSession?.() } catch { /* ignore */ }
        const supabase = createClient()
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: credential,
          nonce: rawNonce,
        })
        if (error) throw error
        await finalizeGoogleSignIn().catch(() => {})
        window.location.href = safeNext()
      } catch (e) {
        // Surface the real reason instead of silently redirecting — that's what
        // hid the failure before. The classic button is still available below.
        const msg = e instanceof Error ? e.message : String(e)
        console.error('Google ID-token sign-in failed:', e)
        setReason(`sign-in: ${msg}`)
        setMode('fallback')
      }
    },
    [beforeSession, safeNext],
  )

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      // GIS never finished initializing (slow/blocked network) → fall back.
      if (!cancelled) setMode((m) => (m === 'init' ? 'fallback' : m))
    }, 6000)
    ;(async () => {
      try {
        await loadGis()
        if (cancelled) return
        if (!ref.current || !window.google?.accounts?.id) {
          setReason('google-script: not available (blocked by browser/extension?)')
          setMode('fallback')
          return
        }
        const [rawNonce, hashedNonce] = await makeNonce()
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (resp: { credential?: string }) => {
            if (resp?.credential) void onCredential(rawNonce, resp.credential)
          },
          nonce: hashedNonce,
          use_fedcm_for_prompt: true,
        })
        // IMPORTANT: the container must be VISIBLE here — GIS cannot render into a
        // display:none element (that was the bug). It's only hidden in fallback/busy.
        const width = Math.min(ref.current.offsetWidth || 360, 400)
        ref.current.replaceChildren()
        window.google.accounts.id.renderButton(ref.current, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'center',
          width,
        })
        if (!cancelled) setMode('gis')
      } catch (e) {
        if (!cancelled) {
          setReason(`gis-init: ${e instanceof Error ? e.message : String(e)}`)
          setMode('fallback')
        }
      }
    })()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [onCredential])

  // Fallback / loading button — matches the app's existing Google button style.
  const ClassicButton = (
    <button
      type="button"
      onClick={fallback}
      className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
    >
      <GoogleIcon />
      Continue with Google
    </button>
  )

  return (
    <div className="w-full">
      {/* GIS injects its themed button here. Kept VISIBLE during init + gis so the
          button can render; only hidden once we know we're falling back. */}
      <div
        ref={ref}
        className={`w-full justify-center ${mode === 'fallback' || mode === 'busy' ? 'hidden' : 'flex min-h-[40px]'}`}
      />
      {(mode === 'fallback' || mode === 'busy') && ClassicButton}
      {reason && (
        <p className="mt-1.5 text-[11px] leading-snug text-amber-400/80">
          Quick Google sign-in unavailable — {reason}
        </p>
      )}
    </div>
  )
}
