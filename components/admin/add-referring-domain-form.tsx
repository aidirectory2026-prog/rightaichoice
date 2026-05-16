'use client'

import { useState, useTransition } from 'react'
import { addReferringDomain } from '@/app/admin/authority/actions'

const CHANNEL_OPTIONS = [
  { value: 'founder_outreach', label: 'Founder outreach (7O.1)' },
  { value: 'data_pr', label: 'Data PR (7O.2)' },
  { value: 'haro', label: 'HARO / Qwoted (7O.3)' },
  { value: 'embed_widget', label: 'Embed widget (7O.4)' },
  { value: 'reddit_hn', label: 'Reddit / HN (7O.5)' },
  { value: 'organic', label: 'Organic' },
  { value: 'paid', label: 'Paid' },
  { value: 'other', label: 'Other' },
]

export function AddReferringDomainForm() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  async function onSubmit(formData: FormData) {
    setError(null)
    setOk(null)
    startTransition(async () => {
      const result = await addReferringDomain(formData)
      if (result.error) setError(result.error)
      else setOk(`Saved ${result.domain}`)
    })
  }

  return (
    <form
      action={onSubmit}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
    >
      <input
        name="domain"
        required
        placeholder="techcrunch.com"
        className="rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-700 focus:outline-none"
      />
      <select
        name="source_channel"
        required
        defaultValue="founder_outreach"
        className="rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
      >
        {CHANNEL_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <input
        name="da_estimate"
        type="number"
        min={0}
        max={100}
        placeholder="DA (0–100)"
        className="rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
      />
      <input
        name="source_url"
        type="url"
        placeholder="Source URL (where the link lives)"
        className="rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 sm:col-span-2 lg:col-span-2"
      />
      <input
        name="target_url"
        type="url"
        placeholder="Target URL (which page on us)"
        className="rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
      />
      <input
        name="anchor_text"
        placeholder="Anchor text"
        className="rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 sm:col-span-2 lg:col-span-2"
      />
      <input
        name="notes"
        placeholder="Notes (optional)"
        className="rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
      />
      <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-between gap-3">
        <div className="text-xs">
          {error && <span className="text-rose-400">{error}</span>}
          {ok && <span className="text-emerald-400">{ok}</span>}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white"
        >
          {pending ? 'Saving…' : 'Add domain'}
        </button>
      </div>
    </form>
  )
}
