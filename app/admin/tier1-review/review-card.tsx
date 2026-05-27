'use client'

import { useState, useTransition } from 'react'
import { approveTitleOverride, revertTitleOverride } from './actions'

type Bucket = '1A' | '1B' | '1C'

type Rewrite = {
  page: string
  bucket: Bucket
  currentTitle: string
  weightedPosition: number
  totalImpressions: number
  totalClicks: number
  topQuery: string
  suggestions: Array<{ title: string; rationale: string }>
}

const BUCKET_STYLE: Record<Bucket, string> = {
  '1A': 'border-emerald-700 text-emerald-300 bg-emerald-950/60',
  '1B': 'border-amber-700 text-amber-300 bg-amber-950/60',
  '1C': 'border-rose-700 text-rose-300 bg-rose-950/60',
}

export function ReviewCard({
  rewrite,
  activeOverride,
}: {
  rewrite: Rewrite
  activeOverride: string | null
}) {
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<string | null>(null)

  const onApprove = (title: string) => {
    setStatus(null)
    startTransition(async () => {
      const res = await approveTitleOverride({
        pagePath: rewrite.page,
        title,
        bucket: rewrite.bucket,
      })
      setStatus(res.error ? `Error: ${res.error}` : `Saved: ${title}`)
      setEditIndex(null)
    })
  }

  const onRevert = () => {
    setStatus(null)
    startTransition(async () => {
      const res = await revertTitleOverride({ pagePath: rewrite.page })
      setStatus(res.error ? `Error: ${res.error}` : 'Reverted')
    })
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <a
            href={rewrite.page}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-mono text-zinc-200 hover:text-emerald-400 truncate block"
          >
            {rewrite.page}
          </a>
          <p className="text-xs text-zinc-500 mt-1">
            pos {rewrite.weightedPosition.toFixed(1)} · {rewrite.totalImpressions} impr ·{' '}
            {rewrite.totalClicks} clk{rewrite.topQuery ? ` · top: "${rewrite.topQuery}"` : ''}
          </p>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded border shrink-0 ${BUCKET_STYLE[rewrite.bucket]}`}
        >
          {rewrite.bucket}
        </span>
      </div>

      <div>
        <div className="text-xs text-zinc-500 mb-1">Current title</div>
        <div className="text-sm text-zinc-300 italic">{rewrite.currentTitle}</div>
      </div>

      {activeOverride && (
        <div className="rounded border border-emerald-700 bg-emerald-950/40 p-3 space-y-2">
          <div className="text-xs text-emerald-400 font-medium">Active override</div>
          <div className="text-sm text-white">{activeOverride}</div>
          <button
            onClick={onRevert}
            disabled={pending}
            className="text-xs text-rose-400 hover:text-rose-300 underline disabled:opacity-50"
          >
            Revert
          </button>
        </div>
      )}

      <div className="space-y-2">
        {rewrite.suggestions.map((s, i) => (
          <div key={i} className="rounded border border-zinc-800 p-3 space-y-2">
            {editIndex === i ? (
              <>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="w-full rounded bg-zinc-950 border border-zinc-700 px-2 py-1 text-sm text-white font-mono"
                  rows={2}
                />
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>{draft.length} chars</span>
                  <button
                    onClick={() => onApprove(draft)}
                    disabled={pending || draft.trim().length < 10}
                    className="ml-auto px-3 py-1 rounded bg-emerald-700 text-white hover:bg-emerald-600 disabled:opacity-50"
                  >
                    Save edited
                  </button>
                  <button
                    onClick={() => setEditIndex(null)}
                    className="px-3 py-1 rounded border border-zinc-700 text-zinc-300 hover:border-zinc-500"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white">{s.title}</div>
                  <div className="text-xs text-zinc-500 mt-1">{s.rationale}</div>
                  <div className="text-xs text-zinc-600 mt-1">{s.title.length} chars</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => onApprove(s.title)}
                    disabled={pending}
                    className="px-3 py-1 rounded bg-emerald-700 text-white text-xs hover:bg-emerald-600 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      setEditIndex(i)
                      setDraft(s.title)
                    }}
                    className="px-3 py-1 rounded border border-zinc-700 text-zinc-300 text-xs hover:border-zinc-500"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {status && <div className="text-xs text-zinc-400 italic">{status}</div>}
    </div>
  )
}
