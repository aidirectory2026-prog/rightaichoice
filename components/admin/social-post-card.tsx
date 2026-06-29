'use client'

// Phase 13 Social — one post in the approval queue, with a live graphic preview
// and one-tap actions. All mutations go through the gated server actions.

import { useState, useTransition } from 'react'
import { approvePost, unapprovePost, cancelPost, reschedulePost, editPost } from '@/app/admin/social/actions'

export type SocialPostView = {
  id: string
  platform: string
  kind: string
  status: string
  copy: string
  hashtags: string[]
  link_url: string | null
  graphic_template: string | null
  subreddit: string | null
  scheduled_at: string | null
  source_refs: { title: string; url: string }[]
  brain_meta: { angle?: string; title?: string | null; score?: number } | null
}

const PLATFORM_COLOR: Record<string, string> = {
  linkedin: 'bg-sky-900/40 text-sky-300 border-sky-800',
  x: 'bg-zinc-800 text-zinc-200 border-zinc-700',
  instagram: 'bg-fuchsia-900/40 text-fuchsia-300 border-fuchsia-800',
  reddit: 'bg-orange-900/40 text-orange-300 border-orange-800',
}
const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-zinc-800 text-zinc-300',
  approved: 'bg-emerald-900/50 text-emerald-300',
  scheduled: 'bg-amber-900/40 text-amber-300',
  posted: 'bg-emerald-700/40 text-emerald-200',
  failed: 'bg-rose-900/50 text-rose-300',
  cancelled: 'bg-zinc-900 text-zinc-500 line-through',
}

// Client-safe copy of the platform char limits (the server SOP module can't be
// imported here). X counts URLs as 23 (t.co), so measure the way X does.
const PLATFORM_LIMIT: Record<string, number> = { linkedin: 3000, x: 280, instagram: 2200, reddit: 40000 }
function effectiveLen(platform: string, text: string): number {
  if (platform !== 'x') return text.length
  const urls = text.match(/https?:\/\/\S+/g) ?? []
  return text.length - urls.reduce((s, u) => s + u.length, 0) + urls.length * 23
}

/** ISO → value for <input type="datetime-local"> in the viewer's local tz. */
function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const off = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - off).toISOString().slice(0, 16)
}

export function SocialPostCard({ post }: { post: SocialPostView }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [copy, setCopy] = useState(post.copy)
  const [tags, setTags] = useState(post.hashtags.join(' '))
  const [when, setWhen] = useState(toLocalInput(post.scheduled_at))

  function run(fn: () => Promise<{ ok?: true; error?: string }>) {
    setError(null)
    startTransition(async () => {
      const r = await fn()
      if (r.error) setError(r.error)
      else setEditing(false)
    })
  }

  const isDraft = post.status === 'draft'
  const isApproved = post.status === 'approved' || post.status === 'scheduled'

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={`rounded border px-2 py-0.5 text-xs font-medium ${PLATFORM_COLOR[post.platform] ?? 'border-zinc-700 text-zinc-300'}`}>
          {post.platform}
        </span>
        <span className="rounded bg-zinc-900 px-2 py-0.5 text-xs text-zinc-400">{post.kind}</span>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[post.status] ?? 'text-zinc-400'}`}>
          {post.status}
        </span>
        {post.brain_meta?.angle ? (
          <span className="text-xs text-zinc-500">· {post.brain_meta.angle}</span>
        ) : null}
        {post.subreddit ? <span className="text-xs text-orange-300">· r/{post.subreddit}</span> : null}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        {post.graphic_template ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/social/graphic/${post.id}`}
            alt={`${post.graphic_template} graphic`}
            className="h-auto w-full max-w-[260px] rounded border border-zinc-800"
          />
        ) : null}

        <div className="min-w-0 flex-1">
          {post.brain_meta?.title ? (
            <div className="mb-1 text-sm font-semibold text-zinc-200">Title: {post.brain_meta.title}</div>
          ) : null}

          {editing ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={copy}
                onChange={(e) => setCopy(e.target.value)}
                rows={5}
                className="w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-700 focus:outline-none"
              />
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="#AITools #Productivity"
                className="w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-700 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  disabled={pending}
                  onClick={() => run(() => editPost(post.id, copy, tags))}
                  className="rounded bg-emerald-700 px-3 py-1 text-sm text-white hover:bg-emerald-600 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  disabled={pending}
                  onClick={() => {
                    setEditing(false)
                    setCopy(post.copy)
                    setTags(post.hashtags.join(' '))
                  }}
                  className="rounded border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-900"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="whitespace-pre-wrap text-sm text-zinc-200">{post.copy}</p>
              {post.hashtags.length ? (
                <p className="mt-1 text-sm text-emerald-400">{post.hashtags.join(' ')}</p>
              ) : null}
            </>
          )}

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
            {(() => {
              const limit = PLATFORM_LIMIT[post.platform] ?? 0
              const used = effectiveLen(post.platform, post.copy)
              const pct = limit ? used / limit : 0
              const tone = pct > 1 ? 'text-rose-400' : pct > 0.9 ? 'text-amber-400' : 'text-zinc-500'
              return <span className={tone}>{used}{limit ? `/${limit}` : ''} chars</span>
            })()}
            {post.link_url ? (
              <a href={post.link_url} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">
                link
              </a>
            ) : null}
            {post.source_refs?.map((s) => (
              <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="text-zinc-500 hover:underline">
                src: {new URL(s.url).hostname}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      {post.status !== 'posted' && post.status !== 'cancelled' ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-900 pt-3">
          {isDraft ? (
            <button
              disabled={pending}
              onClick={() => run(() => approvePost(post.id))}
              className="rounded bg-emerald-700 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              Approve
            </button>
          ) : null}
          {isApproved ? (
            <button
              disabled={pending}
              onClick={() => run(() => unapprovePost(post.id))}
              className="rounded border border-amber-700 px-3 py-1 text-sm text-amber-300 hover:bg-amber-900/30 disabled:opacity-50"
            >
              Un-approve
            </button>
          ) : null}
          {isDraft ? (
            <button
              disabled={pending}
              onClick={() => setEditing((v) => !v)}
              className="rounded border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-900"
            >
              {editing ? 'Editing…' : 'Edit'}
            </button>
          ) : null}
          <span className="flex items-center gap-1">
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-200"
            />
            <button
              disabled={pending || !when}
              onClick={() => run(() => reschedulePost(post.id, when))}
              className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-900 disabled:opacity-50"
            >
              Reschedule
            </button>
          </span>
          <button
            disabled={pending}
            onClick={() => run(() => cancelPost(post.id))}
            className="ml-auto rounded border border-rose-800 px-3 py-1 text-sm text-rose-300 hover:bg-rose-900/30 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs text-rose-400">{error}</p> : null}
    </div>
  )
}
