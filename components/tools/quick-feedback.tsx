'use client'

import Link from 'next/link'
import { useState } from 'react'
import { MessageSquare, Star, X } from 'lucide-react'
import { ReviewForm } from '@/components/reviews/review-form'
import { QuestionForm } from '@/components/qa/question-form'

type Mode = 'closed' | 'review' | 'question'

type QuickFeedbackProps = {
  toolId: string
  toolSlug: string
  toolName: string
  isLoggedIn: boolean
  alreadyReviewed: boolean
}

// Lightweight, single-section replacement for the old Reviews / Questions /
// Discussions blocks. Renders a small heading + two CTAs. Logged-in users
// expand the existing review or question form inline; anonymous users see a
// "Sign in to share" link that returns them here after auth.
//
// Submissions write to the existing reviews / questions tables (auth required
// — preserves data quality; no anonymous spam vector). The list/count UI is
// gone — submissions are admin-triaged via Supabase and feed the editorial
// sentiment synthesis we'll formalize in Phase 3.
export function QuickFeedback({
  toolId,
  toolSlug,
  toolName,
  isLoggedIn,
  alreadyReviewed,
}: QuickFeedbackProps) {
  const [mode, setMode] = useState<Mode>('closed')

  const loginHref = `/login?next=${encodeURIComponent(`/tools/${toolSlug}#feedback`)}`

  if (mode === 'review' && isLoggedIn && !alreadyReviewed) {
    return (
      <ExpandedShell title={`Leave a quick review of ${toolName}`} onClose={() => setMode('closed')}>
        <ReviewForm toolId={toolId} />
      </ExpandedShell>
    )
  }

  if (mode === 'question' && isLoggedIn) {
    return (
      <ExpandedShell title={`Ask about ${toolName}`} onClose={() => setMode('closed')}>
        <QuestionForm toolId={toolId} />
      </ExpandedShell>
    )
  }

  return (
    <section
      id="feedback"
      className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 text-sm text-zinc-300">
          Used {toolName}? Help shape our editorial sentiment research.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {isLoggedIn ? (
            <>
              {!alreadyReviewed && (
                <button
                  type="button"
                  onClick={() => setMode('review')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700/60 bg-emerald-900/20 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-900/40 transition-colors"
                >
                  <Star className="h-3.5 w-3.5" />
                  Leave a review
                </button>
              )}
              <button
                type="button"
                onClick={() => setMode('question')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Ask a question
              </button>
            </>
          ) : (
            <Link
              href={loginHref}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700/60 bg-emerald-900/20 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-900/40 transition-colors"
            >
              Sign in to share
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

function ExpandedShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <section
      id="feedback"
      className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Cancel
        </button>
      </div>
      {children}
    </section>
  )
}
