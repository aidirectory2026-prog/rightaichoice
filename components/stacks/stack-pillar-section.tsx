/**
 * Phase 9 — Stack pillar editorial layer.
 *
 * Renders the hand-written long-form intro + last-reviewed byline
 * above the stages template on /stacks/[slug]. Only mounts when
 * the stack has a `pillar` field. Existing stacks without a
 * pillar render unchanged.
 */

import { ShieldCheck, Clock } from 'lucide-react'
import type { StackPillar } from '@/lib/data/stacks'

type Props = {
  pillar: StackPillar
}

export function StackPillarSection({ pillar }: Props) {
  return (
    <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-2">
      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          Reviewed by RightAIChoice editorial on{' '}
          <time dateTime={pillar.lastReviewedISO} className="font-semibold">
            {pillar.lastReviewed}
          </time>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3 w-3" aria-hidden />
          Last updated{' '}
          <time
            dateTime={pillar.lastReviewedISO}
            className="font-medium text-zinc-300"
          >
            {pillar.lastReviewedISO}
          </time>
        </span>
      </div>

      <div className="mt-6 max-w-3xl">{pillar.intro}</div>
    </section>
  )
}

type FaqProps = {
  faqs: StackPillar['faqs']
}

export function StackPillarFaqs({ faqs }: FaqProps) {
  if (faqs.length === 0) return null
  return (
    <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-20">
      <div className="border-t border-zinc-800 pt-10">
        <h2 className="text-2xl font-semibold text-white">
          Frequently asked questions
        </h2>
        <dl className="mt-6 space-y-6 max-w-3xl">
          {faqs.map((f) => (
            <div key={f.question}>
              <dt className="text-base font-semibold text-white">
                {f.question}
              </dt>
              <dd className="mt-2 text-sm text-zinc-300 leading-relaxed">
                {f.answer}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
