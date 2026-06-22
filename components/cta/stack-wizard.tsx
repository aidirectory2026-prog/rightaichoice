'use client'

/**
 * Phase 12 Bug-1 — the stepped "plan your stack" wizard (full-screen takeover).
 *
 * One question per screen, Typeform-style: goal → skill → budget → team → role →
 * goal-type → tools → signup gate → results. Skippable, auto-advancing, with a
 * progress bar + Back + Esc-to-close. Mounted globally by <WizardProvider> and
 * opened from any CTA via useWizard().openWizard().
 *
 * TRACKING PARITY (the hard requirement): every event the legacy
 * GoalInput→PlanSignupModal→IntakeModal flow fired is re-fired here —
 *   plan_started (on open), plan_chip_selected (per pick), plan_intake_submitted
 *   (full payload, BEFORE the signup gate), plan_intent_persisted, the signup
 *   options' events (via <SignupOptions>), and form_* via data-form-id.
 * CAPTURE-ON-DISCARD: every answer is mirrored the instant it's picked
 *   (plan_chip_selected), the full set + goal is persisted the instant the
 *   questions finish (before the gate), and the goal is persisted again on close
 *   — so abandoning the signup step loses nothing.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { analytics } from '@/lib/analytics'
import { useDebouncedTextTracking } from '@/lib/hooks/use-debounced-text-tracking'
import { persistPlanIntent } from '@/lib/cta/persist-intent'
import { saveProfile, type UserProfile } from '@/lib/plan/user-profile'
import { INTAKE_QUESTIONS, type IntakeQuestion } from '@/lib/plan/intake-questions'
import { ExistingToolsChipInput } from '@/components/ai/existing-tools-chip-input'
import { SignupOptions } from '@/components/cta/signup-options'
import type { OpenWizardOptions } from '@/components/providers/wizard-provider'

const MIN_CHARS = 10

const DEFAULT_PROFILE: UserProfile = {
  skill: 'intermediate',
  budget: 'under_50',
  team: 'solo',
  industry: 'other',
  goalType: 'build',
  existingTools: [],
}

const GOAL_PLACEHOLDERS = [
  'I run customer support for a 12-person SaaS and need to cut response time…',
  'Building a B2B newsletter — want to ship the first issue in a week…',
  'Solo founder, need to record + edit short-form video tutorials…',
  'Replacing Notion AI for our 8-person team, ~$60/seat budget…',
]

const GOAL_CHIPS: Array<{ label: string; intent: string }> = [
  { label: 'Customer support automation', intent: 'Help me set up customer support automation for a 10-person team handling ~50 tickets/day from email + chat. Need triage, drafted replies, and a knowledge base.' },
  { label: 'Long-form content writing', intent: 'I write long-form blog posts (~2,000 words each, 4 per month) for a B2B SaaS audience. Want a stack that helps with research, drafting, editing, and SEO without sounding like AI.' },
  { label: 'Sales prospecting', intent: 'Build a sales prospecting stack for a 3-rep SDR team — ~50 outbound emails/day each, LinkedIn outreach, CRM enrichment.' },
  { label: 'Image + video generation', intent: 'I need to generate product photos and short-form videos for a Shopify store — ~20 images/week and 4 videos/month. Brand consistency matters.' },
]

type ScreenId = 'goal' | IntakeQuestion['key'] | 'tools' | 'signup'

export function StackWizard({ options, onClose }: { options: OpenWizardOptions; onClose: () => void }) {
  const router = useRouter()
  const { user } = useAuth()

  const sourceSurface = options.sourceSurface
  const originalPagePath = options.originalPagePath

  // A real (non-guest) account skips the signup screen; everyone else gets it.
  const showSignup = !(user?.id && !user.is_anonymous)
  // Homepage hero already collected the goal → skip the goal screen.
  const showGoalScreen = options.startAtStep !== 'skill'

  const screens = useMemo<ScreenId[]>(() => {
    const list: ScreenId[] = []
    if (showGoalScreen) list.push('goal')
    for (const q of INTAKE_QUESTIONS) list.push(q.key)
    list.push('tools')
    if (showSignup) list.push('signup')
    return list
  }, [showGoalScreen, showSignup])

  const [index, setIndex] = useState(0)
  const [goal, setGoal] = useState(options.initialGoal ?? '')
  const [profile, setProfile] = useState<UserProfile>({ ...DEFAULT_PROFILE })
  const [existingTools, setExistingTools] = useState<string[]>([])
  const [placeholderIdx, setPlaceholderIdx] = useState(0)

  const mountedAtRef = useRef<number>(Date.now())
  const intakeFiredRef = useRef(false)
  const startedFiredRef = useRef(false)
  const signupShownRef = useRef(false)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const current = screens[index]

  const goalTracker = useDebouncedTextTracking({
    fieldId: 'wizard_goal_input',
    capturePolicy: 'text',
    onCommit: (p) => analytics.fieldTextChanged({ event_name: 'plan_goal_typed', ...p }),
  })

  function effectivePagePath(): string {
    if (originalPagePath) return originalPagePath
    if (typeof window === 'undefined') return ''
    return window.location.pathname || ''
  }

  const buildNextUrl = useCallback(() => {
    const q = goal.trim()
    const base = q ? `/plan?q=${encodeURIComponent(q)}&source=${sourceSurface}` : `/plan?source=${sourceSurface}`
    return `${base}&ready=1`
  }, [goal, sourceSurface])

  // ── plan_started once on open (matches the legacy ProjectPlanner.handleSubmit) ──
  useEffect(() => {
    if (startedFiredRef.current) return
    startedFiredRef.current = true
    analytics.planStarted(sourceSurface)
  }, [sourceSurface])

  // Body scroll lock while the takeover is open.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Rotate the goal placeholder while the goal screen is empty.
  useEffect(() => {
    if (current !== 'goal' || goal.length > 0) return
    const id = setInterval(() => setPlaceholderIdx((i) => (i + 1) % GOAL_PLACEHOLDERS.length), 3500)
    return () => clearInterval(id)
  }, [current, goal.length])

  // Move focus into each screen as it appears (a11y + keyboard flow).
  useEffect(() => {
    containerRef.current?.focus()
  }, [index])

  // Fire plan_signup_modal_shown when the gate screen appears (parity with the modal).
  useEffect(() => {
    if (current === 'signup' && !signupShownRef.current) {
      signupShownRef.current = true
      analytics.planSignupModalShown({
        source_surface: sourceSurface,
        typed_goal_char_count: goal.trim().length,
      })
    }
  }, [current, sourceSurface, goal])

  useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current) }, [])

  // ── The full answer bundle — fired the instant the questions finish, BEFORE
  // the signup gate, so a discard at the gate still captures everything. ──
  const fireIntakeBundle = useCallback(() => {
    if (intakeFiredRef.current) return
    intakeFiredRef.current = true
    analytics.planIntakeSubmitted({
      skill_level: profile.skill,
      budget: profile.budget,
      team_size: profile.team,
      industry: profile.industry,
      goal_type: profile.goalType,
      goal_text: goal,
      existing_tools: existingTools,
      time_to_complete_intake_ms: Date.now() - mountedAtRef.current,
      source: 'stack_wizard',
    })
    if (goal.trim()) {
      void persistPlanIntent({
        typed_goal: goal,
        source_surface: sourceSurface,
        signup_outcome: 'unknown',
        page_path: effectivePagePath(),
      })
    }
    saveProfile({ ...profile, existingTools })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, existingTools, goal, sourceSurface])

  const goToResults = useCallback(() => {
    fireIntakeBundle()
    const url = buildNextUrl()
    onClose()
    router.push(url)
  }, [fireIntakeBundle, buildNextUrl, onClose, router])

  // Advance from the current screen. Leaving the tools screen finalizes answers.
  const goNext = useCallback(() => {
    const cur = screens[index]
    if (cur === 'tools') {
      fireIntakeBundle()
      if (showSignup) setIndex((i) => Math.min(i + 1, screens.length - 1))
      else goToResults()
      return
    }
    if (cur === 'signup') return // terminal; SignupOptions handles navigation
    setIndex((i) => Math.min(i + 1, screens.length - 1))
  }, [screens, index, showSignup, fireIntakeBundle, goToResults])

  const goBack = useCallback(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    setIndex((i) => Math.max(i - 1, 0))
  }, [])

  // Close (× / Esc / backdrop) — persist the goal so an early bail still
  // captures intent (per-answer picks are already mirrored via plan_chip_selected).
  const handleClose = useCallback(() => {
    if (!intakeFiredRef.current && goal.trim()) {
      void persistPlanIntent({
        typed_goal: goal,
        source_surface: sourceSurface,
        signup_outcome: 'unknown',
        page_path: effectivePagePath(),
      })
    }
    onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal, sourceSurface, onClose])

  // Pick an option on a question screen → track, set, auto-advance.
  function pickOption(q: IntakeQuestion, value: string, label: string, optIndex: number) {
    analytics.planChipSelected({
      step: q.key,
      step_index: q.stepIndex,
      chip_value: value,
      chip_label: label,
      chip_index: optIndex,
      multi_select_count: 1,
      all_selected_values: [value],
      time_to_select_ms: Date.now() - mountedAtRef.current,
    })
    setProfile((p) => ({ ...p, [q.field]: value }))
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    advanceTimer.current = setTimeout(() => setIndex((i) => Math.min(i + 1, screens.length - 1)), 240)
  }

  // Keyboard: Esc closes; Enter advances on goal/tools screens; number keys pick.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { handleClose(); return }
      if (current === 'goal' && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        if (goal.trim().length >= MIN_CHARS) goNext()
        return
      }
      const q = INTAKE_QUESTIONS.find((x) => x.key === current)
      if (q && /^[1-9]$/.test(e.key)) {
        const i = Number(e.key) - 1
        const opt = q.options[i]
        if (opt) pickOption(q, opt[0], opt[1], i)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, goal, goNext])

  const total = screens.length
  const progress = Math.round(((index + 1) / total) * 100)
  const currentQuestion = INTAKE_QUESTIONS.find((q) => q.key === current)

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-zinc-950/95 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Plan your AI stack"
    >
      {/* Top bar: progress + close */}
      <div className="flex items-center gap-4 px-4 sm:px-8 pt-5">
        <div className="flex items-center gap-2 text-emerald-400">
          <Sparkles className="h-4 w-4" aria-hidden />
          <span className="text-xs font-medium text-zinc-400 hidden sm:inline">Plan your stack</span>
        </div>
        <div className="flex-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <span className="text-[11px] tabular-nums text-zinc-500">{index + 1}/{total}</span>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-200 transition-colors"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {/* Screen body */}
      <form
        data-form-id="plan_intake"
        onSubmit={(e) => e.preventDefault()}
        className="flex flex-1 items-center justify-center px-4 sm:px-8 py-6 overflow-y-auto"
      >
        <div
          key={index}
          ref={containerRef}
          tabIndex={-1}
          className="w-full max-w-xl outline-none motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300"
        >
          {/* ── Goal screen ── */}
          {current === 'goal' && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">What are you building?</h2>
                <p className="mt-2 text-sm sm:text-base text-zinc-400 leading-relaxed">
                  Describe your goal in plain language — the more context, the sharper your stack.
                </p>
              </div>
              <textarea
                autoFocus
                value={goal}
                onChange={(e) => { setGoal(e.target.value); goalTracker.handleChange(e.target.value) }}
                onBlur={(e) => goalTracker.handleBlur(e.target.value)}
                placeholder={GOAL_PLACEHOLDERS[placeholderIdx]}
                rows={3}
                aria-label="Describe what you're trying to build"
                name="goal"
                className="rai-input-halo w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 sm:px-5 py-4 text-base text-white placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/50"
                style={{ fieldSizing: 'content', minHeight: '8rem', maxHeight: '16rem' } as React.CSSProperties}
              />
              <div className="flex flex-wrap gap-2">
                {GOAL_CHIPS.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => setGoal(chip.intent)}
                    className="inline-flex items-center min-h-[36px] rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-emerald-700/50 hover:bg-zinc-900 hover:text-emerald-400"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              {goal.trim().length > 0 && goal.trim().length < MIN_CHARS && (
                <p className="text-xs text-zinc-500" role="status">
                  A bit more context helps — at least {MIN_CHARS - goal.trim().length} more characters.
                </p>
              )}
            </div>
          )}

          {/* ── Question screens ── */}
          {currentQuestion && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{currentQuestion.headline}</h2>
                <p className="mt-2 text-sm sm:text-base text-zinc-400 leading-relaxed">{currentQuestion.subhead}</p>
              </div>
              <div className="grid gap-2.5">
                {currentQuestion.options.map(([value, label], i) => {
                  const selected = profile[currentQuestion.field] === value
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => pickOption(currentQuestion, value, label, i)}
                      className={`group flex items-center justify-between rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-colors ${
                        selected
                          ? 'border-emerald-600 bg-emerald-950/40 text-emerald-200'
                          : 'border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className={`flex h-5 w-5 items-center justify-center rounded-md border text-[10px] font-semibold ${selected ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300' : 'border-zinc-700 text-zinc-500'}`}>{i + 1}</span>
                        {label}
                      </span>
                      <ArrowRight className={`h-4 w-4 transition-all ${selected ? 'text-emerald-400 translate-x-0.5' : 'text-zinc-700 group-hover:text-zinc-500'}`} aria-hidden />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Tools screen ── */}
          {current === 'tools' && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Any tools you already use?</h2>
                <p className="mt-2 text-sm sm:text-base text-zinc-400 leading-relaxed">
                  Optional — we&apos;ll build <em>around</em> these: slot them into your plan and add complementary picks for the gaps.
                </p>
              </div>
              <ExistingToolsChipInput value={existingTools} onChange={setExistingTools} />
            </div>
          )}

          {/* ── Signup gate ── */}
          {current === 'signup' && (
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600/20 ring-1 ring-emerald-500/40">
                <Sparkles className="h-5 w-5 text-emerald-300" aria-hidden />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-white tracking-tight">Save your custom AI stack</h2>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed max-w-sm">
                It&apos;s <span className="text-emerald-300 font-medium">free</span> and takes 5 seconds — we&apos;ll save your stack to your dashboard so you can revisit, compare, and share it anytime.
              </p>
              <div className="mt-6 w-full max-w-sm">
                <SignupOptions
                  typedGoal={goal}
                  sourceSurface={sourceSurface}
                  nextUrl={buildNextUrl()}
                  originalPagePath={originalPagePath}
                  onSkip={goToResults}
                />
              </div>
            </div>
          )}
        </div>
      </form>

      {/* Bottom nav: Back + Skip/Continue (hidden on the signup screen, which has its own actions) */}
      {current !== 'signup' && (
        <div className="flex items-center justify-between gap-3 border-t border-zinc-800/60 px-4 sm:px-8 py-4">
          <button
            type="button"
            onClick={goBack}
            disabled={index === 0}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 disabled:opacity-0 disabled:cursor-default transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </button>

          <div className="flex items-center gap-2">
            {/* Questions + tools are skippable; the goal screen needs MIN_CHARS. */}
            {(currentQuestion || current === 'tools') && (
              <button
                type="button"
                onClick={goNext}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-2"
              >
                {current === 'tools' ? 'Skip' : 'Skip this'}
              </button>
            )}
            <button
              type="button"
              onClick={goNext}
              disabled={current === 'goal' && goal.trim().length < MIN_CHARS}
              className="rai-arrow-nudge inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500 transition-colors"
            >
              {current === 'tools' ? 'See my stack' : 'Continue'}
              <ArrowRight data-arrow className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
