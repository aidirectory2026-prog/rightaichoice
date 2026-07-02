'use client'

import { useState, useTransition } from 'react'
import { approveSubmission, rejectSubmission } from './actions'

// Phase 14 — one pending vendor submission: all supplied fields, dedupe
// hints, Approve, and Reject-with-reason. Copies the tier1-review card
// interaction shape (useTransition + inline status line).

export type SubmissionCardData = {
  id: string
  name: string
  website_url: string
  tagline: string
  description: string
  pricing_type: string
  categories_freetext: string | null
  logo_url: string | null
  submitter_role: string
  normalized_domain: string
  proposed_slug: string
  status: string
  rejected_reason: string | null
  created_at: string
  submitter_email: string | null
  similar_tools: Array<{ slug: string; name: string; is_published: boolean }>
}

const REJECT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'not_ai_tool', label: 'Not an AI tool' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'low_quality', label: 'Low quality / no substance' },
  { value: 'site_unreachable', label: 'Site unreachable' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Other' },
]

export function SubmissionCard({ sub }: { sub: SubmissionCardData }) {
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<string | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('not_ai_tool')
  const [note, setNote] = useState('')

  const onApprove = () => {
    setStatus(null)
    startTransition(async () => {
      const res = await approveSubmission(sub.id)
      setStatus(res.error ? `Error: ${res.error}` : 'Approved — draft created, SOP will pick it up.')
    })
  }

  const onReject = () => {
    setStatus(null)
    startTransition(async () => {
      const res = await rejectSubmission(sub.id, reason, note || undefined)
      setStatus(res.error ? `Error: ${res.error}` : 'Rejected — submitter emailed.')
      setRejectOpen(false)
    })
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-white font-medium">
            {sub.name}{' '}
            <span className="text-xs text-zinc-500">({sub.pricing_type})</span>
          </p>
          <a
            href={sub.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-emerald-400 hover:text-emerald-300 break-all"
          >
            {sub.website_url}
          </a>
        </div>
        <span className="shrink-0 rounded-full border border-zinc-700 px-2.5 py-0.5 text-xs text-zinc-400">
          {new Date(sub.created_at).toISOString().slice(0, 10)}
        </span>
      </div>

      <p className="text-sm text-zinc-300">{sub.tagline}</p>
      <p className="text-sm text-zinc-400 whitespace-pre-wrap leading-relaxed">{sub.description}</p>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-500">
        <span>From: {sub.submitter_email ?? 'unknown'} ({sub.submitter_role})</span>
        <span>Slug: {sub.proposed_slug}</span>
        <span>Domain: {sub.normalized_domain}</span>
        {sub.categories_freetext && <span>Suggested categories: {sub.categories_freetext}</span>}
        {sub.logo_url && (
          <a href={sub.logo_url} target="_blank" rel="noopener noreferrer" className="text-emerald-500">
            logo ↗
          </a>
        )}
      </div>

      {sub.similar_tools.length > 0 && (
        <div className="rounded-md border border-amber-900/60 bg-amber-950/20 px-3 py-2">
          <p className="text-xs text-amber-400 mb-1">Possible duplicates in catalog:</p>
          <ul className="text-xs text-zinc-400 space-y-0.5">
            {sub.similar_tools.map(t => (
              <li key={t.slug}>
                <a
                  href={`/tools/${t.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  {t.name}
                </a>{' '}
                — {t.is_published ? 'published' : 'draft'}
              </li>
            ))}
          </ul>
        </div>
      )}

      {sub.status === 'pending' && (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={onApprove}
            disabled={pending}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
          >
            {pending ? 'Working…' : 'Approve → draft pipeline'}
          </button>
          {!rejectOpen ? (
            <button
              onClick={() => setRejectOpen(true)}
              disabled={pending}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-rose-700 hover:text-rose-300 transition-colors disabled:opacity-50"
            >
              Reject…
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-300"
              >
                {REJECT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                maxLength={1000}
                placeholder="Optional note to the submitter"
                className="w-64 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600"
              />
              <button
                onClick={onReject}
                disabled={pending}
                className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 transition-colors disabled:opacity-50"
              >
                Confirm reject
              </button>
              <button
                onClick={() => setRejectOpen(false)}
                disabled={pending}
                className="text-sm text-zinc-500 hover:text-zinc-300"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {status && (
        <p className={`text-sm ${status.startsWith('Error') ? 'text-rose-400' : 'text-emerald-400'}`}>
          {status}
        </p>
      )}
    </div>
  )
}
