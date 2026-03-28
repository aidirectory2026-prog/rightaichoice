'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Gauge,
  Search,
} from 'lucide-react'

const BUDGET_OPTIONS = [
  {
    value: 'free',
    label: 'Free',
    description: 'Free tools only',
    icon: '🆓',
  },
  {
    value: 'freemium',
    label: 'Freemium',
    description: 'Free tier + paid upgrades',
    icon: '⚡',
  },
  {
    value: 'paid',
    label: 'Paid',
    description: "I'm okay paying for quality",
    icon: '💎',
  },
  {
    value: 'any',
    label: 'Any budget',
    description: "Show me everything",
    icon: '🔓',
  },
]

const LEVEL_OPTIONS = [
  {
    value: 'beginner',
    label: 'Beginner',
    description: 'New to AI tools, want simple setup',
    icon: '🌱',
  },
  {
    value: 'intermediate',
    label: 'Intermediate',
    description: 'Comfortable with tech, some AI experience',
    icon: '⚙️',
  },
  {
    value: 'advanced',
    label: 'Advanced',
    description: 'Want APIs, customization, full control',
    icon: '🔬',
  },
  {
    value: 'any',
    label: 'Doesn\'t matter',
    description: 'Show me all skill levels',
    icon: '🎯',
  },
]

const QUICK_PICKS = [
  'Write blog posts',
  'Generate images',
  'Build code faster',
  'Edit videos automatically',
  'Summarize documents',
  'Automate workflows',
  'Create presentations',
  'Voice transcription',
]

export function RecommendationWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [useCase, setUseCase] = useState('')
  const [budget, setBudget] = useState('')
  const [level, setLevel] = useState('')

  function handleQuickPick(pick: string) {
    setUseCase(pick)
  }

  function handleNext() {
    if (step < 3) setStep(step + 1)
  }

  function handleBack() {
    if (step > 1) setStep(step - 1)
  }

  function handleSubmit() {
    const params = new URLSearchParams()
    params.set('usecase', useCase.trim())
    if (budget) params.set('budget', budget)
    if (level) params.set('level', level)
    router.push(`/recommend?${params.toString()}`)
  }

  const step1Valid = useCase.trim().length >= 3
  const step2Valid = !!budget
  const step3Valid = !!level

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-zinc-500">Step {step} of 3</span>
          <span className="text-sm text-zinc-500">
            {step === 1 ? 'Use case' : step === 2 ? 'Budget' : 'Skill level'}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-zinc-800">
          <div
            className="h-1.5 rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* Step 1 — Use case */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white">What do you want to do?</h2>
            <p className="mt-1 text-zinc-400">Describe your goal and we&apos;ll find the right AI tools for you.</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={useCase}
              onChange={(e) => setUseCase(e.target.value)}
              placeholder="e.g. Write social media posts for my startup"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && step1Valid && handleNext()}
              autoFocus
            />
          </div>

          <div>
            <p className="mb-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Quick picks</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_PICKS.map((pick) => (
                <button
                  key={pick}
                  onClick={() => handleQuickPick(pick)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    useCase === pick
                      ? 'border-emerald-600 bg-emerald-950/50 text-emerald-300'
                      : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-white'
                  }`}
                >
                  {pick}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleNext}
            disabled={!step1Valid}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Step 2 — Budget */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white">What&apos;s your budget?</h2>
            <p className="mt-1 text-zinc-400">We&apos;ll filter recommendations to match your pricing preference.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {BUDGET_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setBudget(opt.value)}
                className={`flex flex-col items-start gap-1.5 rounded-xl border p-4 text-left transition-all ${
                  budget === opt.value
                    ? 'border-emerald-600 bg-emerald-950/40 ring-1 ring-emerald-600/50'
                    : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600'
                }`}
              >
                <span className="text-2xl">{opt.icon}</span>
                <span className="font-semibold text-white text-sm">{opt.label}</span>
                <span className="text-xs text-zinc-500">{opt.description}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 rounded-xl border border-zinc-700 px-5 py-3 text-sm text-zinc-400 hover:border-zinc-600 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={!step2Valid}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Skill level */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white">What&apos;s your experience level?</h2>
            <p className="mt-1 text-zinc-400">We&apos;ll match tools to your technical comfort zone.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {LEVEL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setLevel(opt.value)}
                className={`flex flex-col items-start gap-1.5 rounded-xl border p-4 text-left transition-all ${
                  level === opt.value
                    ? 'border-emerald-600 bg-emerald-950/40 ring-1 ring-emerald-600/50'
                    : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600'
                }`}
              >
                <span className="text-2xl">{opt.icon}</span>
                <span className="font-semibold text-white text-sm">{opt.label}</span>
                <span className="text-xs text-zinc-500">{opt.description}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 rounded-xl border border-zinc-700 px-5 py-3 text-sm text-zinc-400 hover:border-zinc-600 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={!step3Valid}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              Get My Recommendations
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
