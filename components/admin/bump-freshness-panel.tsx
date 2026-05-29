'use client'

/**
 * 1.1 freshness-cascade — admin "Bump freshness" panel.
 *
 * Mounted on /admin/tools/[id]. Lets the manager mark every page mentioning
 * this tool as freshly reviewed (after a non-DB editorial change). Reason
 * is required, min 10 chars.
 *
 * POSTs to /api/admin/freshness/bump.
 */
import { useState } from 'react'
import { Clock, Loader2 } from 'lucide-react'

type Props = {
  toolSlug: string
  toolName: string
  className?: string
}

export function BumpFreshnessPanel({ toolSlug, toolName, className = '' }: Props) {
  const [reason, setReason] = useState('')
  const [event, setEvent] = useState('editorial_polish')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<{ touched: number } | null>(null)

  const canSubmit = !pending && reason.trim().length >= 10

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setOk(null)
    setPending(true)
    try {
      const res = await fetch('/api/admin/freshness/bump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_slug: toolSlug,
          reason: reason.trim(),
          event,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(
          (json as { error?: string }).error ?? `Failed (${res.status})`
        )
        return
      }
      setOk({ touched: (json as { pages_touched?: number }).pages_touched ?? 0 })
      setReason('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <section
      className={`rounded-lg border border-zinc-800 bg-zinc-950 p-4 ${className}`}
    >
      <header className="mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-emerald-400" aria-hidden />
        <h2 className="text-sm font-semibold text-zinc-200">Bump freshness</h2>
      </header>

      <p className="mb-3 text-xs text-zinc-400">
        Cascades a “freshly reviewed” timestamp to every page mentioning{' '}
        <span className="font-medium text-zinc-200">{toolName}</span>. Use this
        after shipping a non-DB editorial change (copy polish, image swap,
        etc.). Triggers ISR + IndexNow.
      </p>

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label
            htmlFor="bump-event"
            className="mb-1 block text-xs font-medium text-zinc-300"
          >
            Change type
          </label>
          <select
            id="bump-event"
            value={event}
            onChange={(e) => setEvent(e.target.value)}
            disabled={pending}
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
          >
            <option value="editorial_polish">Editorial polish</option>
            <option value="image_swap">Image swap</option>
            <option value="layout_change">Layout change</option>
            <option value="manual_review">Manual review</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="bump-reason"
            className="mb-1 block text-xs font-medium text-zinc-300"
          >
            Reason <span className="text-zinc-500">(required, min 10 chars)</span>
          </label>
          <textarea
            id="bump-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={pending}
            rows={3}
            placeholder="e.g. Rewrote hero copy and re-screenshotted the pricing table"
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
            {pending ? 'Cascading…' : 'Bump freshness'}
          </button>
          {ok && (
            <span className="text-xs text-emerald-300">
              Bumped {ok.touched} {ok.touched === 1 ? 'page' : 'pages'}. ISR pending.
            </span>
          )}
          {error && <span className="text-xs text-red-400">{error}</span>}
        </div>
      </form>
    </section>
  )
}
