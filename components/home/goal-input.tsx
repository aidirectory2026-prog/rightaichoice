'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { analytics } from '@/lib/analytics'
import { useDebouncedTextTracking } from '@/lib/hooks/use-debounced-text-tracking'
import { useAuth } from '@/components/providers/auth-provider'
import { PlanSignupModal } from '@/components/cta/plan-signup-modal'

const MIN_CHARS = 10

const PLACEHOLDERS = [
  'I run customer support for a 12-person SaaS and need to cut response time…',
  'Building a B2B newsletter — want to ship the first issue in a week…',
  'Solo founder, need to record + edit short-form video tutorials…',
  'Replacing Notion AI for our 8-person team, ~$60/seat budget…',
  'Need to generate product photos without hiring a photographer…',
  'Help me automate sales prospecting for a 50-call/day SDR team…',
]

const CHIPS: Array<{ label: string; intent: string }> = [
  {
    label: 'Customer support automation',
    intent:
      'Help me set up customer support automation for a 10-person team handling ~50 tickets/day from email + chat. Need triage, drafted replies, and a knowledge base.',
  },
  {
    label: 'Long-form content writing',
    intent:
      'I write long-form blog posts (~2,000 words each, 4 per month) for a B2B SaaS audience. Want a stack that helps with research, drafting, editing, and SEO without sounding like AI.',
  },
  {
    label: 'Sales prospecting',
    intent:
      'Build a sales prospecting stack for a 3-rep SDR team — ~50 outbound emails/day each, LinkedIn outreach, CRM enrichment.',
  },
  {
    label: 'Image + video generation',
    intent:
      'I need to generate product photos and short-form videos for a Shopify store — ~20 images/week and 4 videos/month. Brand consistency matters.',
  },
]

export function GoalInput() {
  const router = useRouter()
  const { user } = useAuth()
  const [goal, setGoal] = useState('')
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const [usedChip, setUsedChip] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [signupOpen, setSignupOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const trimmed = goal.trim()
  const canSubmit = trimmed.length >= MIN_CHARS && !submitting

  // Phase 8.g.11.b — capture every typed pause in the goal input.
  // capturePolicy='text' so the actual goal text rides along (user-explicit
  // request for plan goals + search).
  const goalTracker = useDebouncedTextTracking({
    fieldId: 'home_goal_input',
    capturePolicy: 'text',
    onCommit: (p) => analytics.fieldTextChanged({ event_name: 'plan_goal_typed', ...p }),
  })

  // Rotate placeholder while textarea is empty + unfocused.
  useEffect(() => {
    if (goal.length > 0) return
    const id = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length)
    }, 3500)
    return () => clearInterval(id)
  }, [goal.length])

  function handleChipClick(intent: string) {
    setGoal(intent)
    setUsedChip(true)
    // Defer focus so the value renders first.
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    analytics.heroCtaClicked('plan_my_stack', 'homepage_goal_input')
    analytics.searchQuerySubmitted(trimmed, 0, 'homepage_goal_input')
    analytics.planCtaClicked({ surface: 'homepage', page_path: '/' })
    // Note: usedChip flag is captured for future tracking once analytics
    // exposes a generic track() — see Phase 5 follow-ups in plan.md.
    void usedChip

    // Phase 9 — Anonymous users see the signup modal first (skippable);
    // known users navigate straight through.
    if (!user?.id) {
      setSignupOpen(true)
      return
    }
    setSubmitting(true)
    router.push(`/plan?q=${encodeURIComponent(trimmed)}&source=homepage`)
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={goal}
            onChange={(e) => {
              setGoal(e.target.value)
              goalTracker.handleChange(e.target.value)
            }}
            onBlur={(e) => goalTracker.handleBlur(e.target.value)}
            placeholder={PLACEHOLDERS[placeholderIdx]}
            rows={3}
            aria-label="Describe what you're trying to build"
            className="rai-input-halo w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 sm:px-5 py-4 text-base text-white placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/50"
            style={{ fieldSizing: 'content', minHeight: '8rem', maxHeight: '16rem' } as React.CSSProperties}
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          aria-label="Plan my stack"
          className="rai-cta-shimmer rai-arrow-nudge flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-base font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500 disabled:hover:bg-zinc-800 min-h-[52px]"
        >
          {submitting ? 'Building your stack…' : 'Plan My Stack'}
          {!submitting && <ArrowRight data-arrow className="h-4 w-4" />}
        </button>

        {trimmed.length > 0 && trimmed.length < MIN_CHARS && (
          <p className="text-xs text-zinc-500" role="status">
            A bit more context helps — at least {MIN_CHARS - trimmed.length} more characters.
          </p>
        )}

        {/* Phase 9 Stage 2 (2026-05-16): primes the user to expect the
            existing-tools question in the intake modal, so it's not a
            surprise interruption mid-flow. */}
        <p className="text-[11px] text-zinc-500 text-center">
          Already use some AI tools? We'll ask in the next step and build the stack <em>around</em> them.
        </p>
      </form>

      <div className="flex flex-wrap justify-center gap-2">
        {CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => handleChipClick(chip.intent)}
            className="inline-flex items-center min-h-[36px] rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-emerald-700/50 hover:bg-zinc-900 hover:text-emerald-400"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Phase 9 — Anonymous-user signup gate before /plan navigation.
          Skippable; typed goal is persisted to plan_intents either way. */}
      <PlanSignupModal
        open={signupOpen}
        onClose={() => setSignupOpen(false)}
        typedGoal={trimmed}
        sourceSurface="homepage"
      />
    </div>
  )
}
