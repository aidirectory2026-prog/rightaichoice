'use client'

import { useState, FormEvent } from 'react'
import { Mail, Check } from 'lucide-react'

type Variant = 'inline' | 'card' | 'compact'

export function NewsletterForm({
  source,
  variant = 'inline',
  headline,
  sub,
  sourceEntity,
  ctaLabel = 'Subscribe',
}: {
  source:
    | 'home_hero'
    | 'plan_completion'
    | 'mobile_sticky'
    | 'footer'
    | 'tool_detail'
    | 'compare_detail'
  variant?: Variant
  headline?: string
  sub?: string
  sourceEntity?: string
  ctaLabel?: string
}) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState('sending')
    setErrorMsg(null)
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source, source_entity: sourceEntity }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        setErrorMsg(j.error ?? 'Could not subscribe — try again')
        setState('error')
        return
      }
      setState('ok')
      setEmail('')
    } catch {
      setErrorMsg('Network error — try again')
      setState('error')
    }
  }

  if (state === 'ok') {
    return (
      <div
        className={
          variant === 'card'
            ? 'rounded-xl border border-emerald-700 bg-emerald-950/30 p-5 text-sm text-emerald-200 flex items-center gap-2'
            : 'flex items-center gap-2 text-sm text-emerald-300'
        }
      >
        <Check className="h-4 w-4" />
        You&apos;re in. Look for one email a week — unsubscribe anytime.
      </div>
    )
  }

  const inputBase =
    'flex-1 rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none'
  const buttonBase =
    'rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-emerald-50 whitespace-nowrap'

  if (variant === 'card') {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        {headline && (
          <div className="text-base font-semibold text-white mb-1 flex items-center gap-2">
            <Mail className="h-4 w-4 text-emerald-400" />
            {headline}
          </div>
        )}
        {sub && <p className="text-xs text-zinc-400 mb-3">{sub}</p>}
        <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@work.com"
            className={inputBase}
            disabled={state === 'sending'}
          />
          <button type="submit" className={buttonBase} disabled={state === 'sending'}>
            {state === 'sending' ? 'Sending…' : ctaLabel}
          </button>
        </form>
        {errorMsg && <p className="text-xs text-rose-400 mt-2">{errorMsg}</p>}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@work.com"
          className={`${inputBase} text-xs py-1.5`}
          disabled={state === 'sending'}
        />
        <button type="submit" className={`${buttonBase} text-xs py-1.5 px-3`} disabled={state === 'sending'}>
          {state === 'sending' ? '…' : ctaLabel}
        </button>
      </form>
    )
  }

  // inline (default)
  return (
    <div>
      {headline && (
        <div className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
          <Mail className="h-4 w-4 text-emerald-400" />
          {headline}
        </div>
      )}
      {sub && <p className="text-xs text-zinc-400 mb-3">{sub}</p>}
      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@work.com"
          className={inputBase}
          disabled={state === 'sending'}
        />
        <button type="submit" className={buttonBase} disabled={state === 'sending'}>
          {state === 'sending' ? 'Sending…' : ctaLabel}
        </button>
      </form>
      {errorMsg && <p className="text-xs text-rose-400 mt-2">{errorMsg}</p>}
    </div>
  )
}
