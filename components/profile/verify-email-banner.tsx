'use client'

// Phase 11 (2026-06-21): shown on the dashboard ONLY when the signed-in user has
// an email that isn't verified yet (instant-signup accounts). Lets them resend
// the verification link and verify whenever they like. Hidden entirely once
// verified, and never shown to OAuth users (verified) or guests (no email).

import { useState } from 'react'
import { MailWarning, Check, Loader2 } from 'lucide-react'
import { resendVerification } from '@/actions/auth'

export function VerifyEmailBanner({ email }: { email: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  async function resend() {
    setState('sending')
    setError('')
    const r = await resendVerification()
    if (r.ok) setState('sent')
    else {
      setState('error')
      setError(r.error ?? 'Please try again.')
    }
  }

  return (
    <div className="mb-6 flex flex-col gap-2 rounded-xl border border-amber-900/50 bg-amber-950/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2.5 text-sm text-amber-200">
        <MailWarning className="h-4 w-4 shrink-0" aria-hidden />
        <span>
          Your email <span className="font-medium text-amber-100">{email}</span> isn&apos;t verified yet.
        </span>
      </div>
      {state === 'sent' ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
          <Check className="h-3.5 w-3.5" aria-hidden /> Verification link sent — check your inbox.
        </span>
      ) : (
        <div className="flex items-center gap-3">
          {state === 'error' && <span className="text-xs text-red-300">{error}</span>}
          <button
            type="button"
            onClick={resend}
            disabled={state === 'sending'}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-amber-950 transition hover:bg-amber-400 disabled:opacity-60"
          >
            {state === 'sending' ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Sending…
              </>
            ) : (
              'Verify email'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
