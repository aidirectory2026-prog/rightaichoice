'use client'

import { useActionState } from 'react'
import { updatePassword } from '@/actions/auth'
import { Logo } from '@/components/shared/logo'

export default function UpdatePasswordPage() {
  const [state, formAction, isPending] = useActionState(updatePassword, null)

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Logo size="lg" />
        <h1 className="mt-6 text-xl font-semibold text-white">Set new password</h1>
        <p className="mt-1 text-sm text-zinc-400">Enter your new password below.</p>
      </div>

      <form action={formAction} className="space-y-4">
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
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none"
            placeholder="At least 6 characters"
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
            minLength={6}
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
