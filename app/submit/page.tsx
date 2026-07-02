import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { SubmitForm } from '@/components/submit/submit-form'

// Phase 14 — public vendor tool-submission page. The form writes to the
// moderated tool_submissions queue, never to tools; editorial review +
// the onboard SOP's quality gates decide what goes live. Cookie-read for
// the "your submissions" list makes this page dynamic by nature.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Submit your AI tool — RightAIChoice',
  description:
    'Submit an AI tool for free editorial review. Submissions never influence rankings, scores, or recommendations — RightAIChoice is a decision engine, not a listing service.',
}

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending: { text: 'In review', cls: 'bg-amber-950/40 text-amber-400 border-amber-900' },
  approved: { text: 'Approved — in quality checks', cls: 'bg-emerald-950/40 text-emerald-400 border-emerald-900' },
  rejected: { text: 'Not accepted', cls: 'bg-red-950/40 text-red-400 border-red-900' },
}

const REJECTION_LABEL: Record<string, string> = {
  not_ai_tool: 'Not an AI tool within our coverage scope',
  duplicate: 'Already in the catalog or pipeline',
  low_quality: 'Not enough verifiable substance yet',
  site_unreachable: 'Website unreachable during review',
  spam: 'Did not appear to be a genuine submission',
  other: 'Did not pass editorial review',
}

export default async function SubmitPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // RLS-scoped: a signed-in user only ever sees their own rows.
  const { data: submissions } =
    user && !user.is_anonymous
      ? await supabase
          .from('tool_submissions')
          .select('id, name, status, rejected_reason, created_at, tool_id')
          .order('created_at', { ascending: false })
          .limit(10)
      : { data: null }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 space-y-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold text-white">Submit your AI tool</h1>
        <p className="text-zinc-400 leading-relaxed">
          Built an AI tool? Submit it for free editorial review. If it passes, it enters the same
          data pipeline as every other tool we evaluate.
        </p>
      </header>

      <section aria-label="How it works" className="grid gap-4 sm:grid-cols-3">
        {[
          ['1 · Submit', 'Tell us what the tool does and who it’s for. Takes two minutes.'],
          ['2 · Editorial review', 'A human checks it’s a real AI tool with verifiable substance. We email you the decision.'],
          ['3 · Quality gates', 'Approved tools go through automated enrichment and quality checks before going live — typically within ~24h.'],
        ].map(([title, body]) => (
          <div key={title} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-sm font-semibold text-white mb-1">{title}</p>
            <p className="text-xs text-zinc-400 leading-relaxed">{body}</p>
          </div>
        ))}
      </section>

      <section
        aria-label="Integrity policy"
        className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-5"
      >
        <p className="text-sm text-emerald-300 font-medium mb-1">
          Submitting never buys placement.
        </p>
        <p className="text-sm text-zinc-400 leading-relaxed">
          RightAIChoice is a decision engine, not a listing service. Submission is free and never
          influences rankings, scores, or recommendations — those come from our independent data
          alone. Every submission passes human editorial review and the same automated quality
          gates as tools our own research pipeline discovers.
        </p>
      </section>

      <SubmitForm />

      {submissions && submissions.length > 0 && (
        <section aria-label="Your submissions" className="space-y-3">
          <h2 className="text-base font-semibold text-white">Your submissions</h2>
          <ul className="space-y-2">
            {submissions.map(s => {
              const badge = STATUS_LABEL[s.status] ?? STATUS_LABEL.pending
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{s.name}</p>
                    {s.status === 'rejected' && s.rejected_reason && (
                      <p className="text-xs text-zinc-500">
                        {REJECTION_LABEL[s.rejected_reason] ?? REJECTION_LABEL.other}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${badge.cls}`}
                  >
                    {badge.text}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </main>
  )
}
