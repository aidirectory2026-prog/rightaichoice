'use client'

import { useState, FormEvent } from 'react'
import { Check } from 'lucide-react'

export function UnsubscribeForm({ prefillEmail }: { prefillEmail: string }) {
  const [email, setEmail] = useState(prefillEmail)
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState('sending')
    setErrorMsg(null)
    try {
      const res = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        setErrorMsg(j.error ?? 'Could not unsubscribe — try again')
        setState('error')
        return
      }
      setState('ok')
    } catch {
      setErrorMsg('Network error — try again')
      setState('error')
    }
  }

  if (state === 'ok') {
    return (
      <div className="rounded-lg border border-emerald-700 bg-emerald-950/30 p-5 text-sm text-emerald-200 flex items-center gap-2">
        <Check className="h-4 w-4" />
        You&apos;ve been unsubscribed. We&apos;re sorry to see you go.
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@work.com"
        className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none"
        disabled={state === 'sending'}
      />
      <button
        type="submit"
        className="w-full rounded bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 disabled:opacity-50"
        disabled={state === 'sending'}
      >
        {state === 'sending' ? 'Unsubscribing…' : 'Unsubscribe'}
      </button>
      {errorMsg && <p className="text-xs text-rose-400">{errorMsg}</p>}
    </form>
  )
}
