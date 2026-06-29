'use client'

import { useActionState, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { updatePassword } from '@/actions/auth'
import { Logo } from '@/components/shared/logo'

export default function UpdatePasswordPage() {
  const [state, formAction, isPending] = useActionState(updatePassword, null)
  // BUG-27d: gate on a real session. A recovery link establishes one (via
  // /auth/confirm → exchangeCodeForSession, or a PASSWORD_RECOVERY event); a
  // signed-in user changing their password also has one. With NO session the
  // form's submit would just fail with a confusing error, so show an
  // "expired link" state + a path to request a fresh one instead.
  const [hasSession, setHasSession] = useState<boolean | null>(null) // null = checking

  useEffect(() => {
    const supabase = createClient()
    let active = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) setHasSession((prev) => prev || !!session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setHasSession(true)
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])

  // A successful update flips state.success — keep showing the form/message then.
  if (hasSession === null && !state?.success) {
    return (
      <div className="space-y-6 text-center">
        <Logo size="lg" />
        <p className="mt-6 text-sm text-zinc-400">Checking your reset link…</p>
      </div>
    )
  }

  if (hasSession === false && !state?.success) {
    return (
      <div className="space-y-6 text-center">
        <Logo size="lg" />
        <h1 className="mt-6 text-xl font-semibold text-white">Reset link invalid or expired</h1>
        <p className="mt-1 text-sm text-zinc-400">
          This password-reset link is no longer valid. Request a fresh one and we&apos;ll email you a new link.
        </p>
        <Link
          href="/forgot-password"
          className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
        >
          Request a new link
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Logo size="lg" />
        <h1 className="mt-6 text-xl font-semibold text-white">Set new password</h1>
        <p className="mt-1 text-sm text-zinc-400">Enter your new password below.</p>
      </div>

      <form action={formAction} data-form-id="auth_update_password" className="space-y-4">
        {state?.error && (
          <div className="bg-red-950 border border-red-800 text-red-400 text-sm px-4 py-3 rounded-lg">
            {state.error}
          </div>
        )}
        {state?.success && (
          <div className="bg-emerald-950 border border-emerald-800 text-emerald-400 text-sm px-4 py-3 rounded-lg">
            {state.success}
          </div>
        )}

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-1">
            New password
          </label>
          {/* Phase 7 Step 53 (BUG-010): minLength is 8 here to match signup
              and the server-side PASSWORD_MIN constant in actions/auth.ts. */}
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none"
            placeholder="At least 8 characters"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-300 mb-1">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-400 transition-colors"
        >
          {isPending ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
