'use client'

import { useState } from 'react'
import { X, Sparkles } from 'lucide-react'
import type { UserProfile, SkillLevel, Budget, TeamSize, Industry, GoalType } from '@/lib/plan/user-profile'
import {
  SKILL_LABELS,
  BUDGET_LABELS,
  TEAM_LABELS,
  INDUSTRY_LABELS,
  GOAL_LABELS,
} from '@/lib/plan/user-profile'

type Props = {
  initial?: UserProfile | null
  onSubmit: (profile: UserProfile) => void
  onSkip: () => void
  onClose?: () => void
}

const DEFAULT_PROFILE: UserProfile = {
  skill: 'intermediate',
  budget: 'under_50',
  team: 'solo',
  industry: 'other',
  goalType: 'build',
  existingTools: [],
}

export function IntakeModal({ initial, onSubmit, onSkip, onClose }: Props) {
  const [profile, setProfile] = useState<UserProfile>(initial ?? DEFAULT_PROFILE)
  const [existingToolsText, setExistingToolsText] = useState(
    (initial?.existingTools ?? []).join(', ')
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const tools = existingToolsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    onSubmit({ ...profile, existingTools: tools })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            <h2 className="text-base font-semibold text-white">A few decisions before we recommend your stack</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <p className="text-sm text-zinc-400 leading-relaxed">
            The right stack looks completely different depending on who's building it. A solo founder on a tight budget needs different tools than a 20-person team that can afford the premium tier. Take a moment to confirm{' '}
            <span className="text-white font-medium">your skill, budget, team, and goal</span> — these are the decisions that make our recommendation honest and useful to you, not a generic list.
          </p>

          {/* Skill */}
          <Field label="Your skill level">
            <ChipRow<SkillLevel>
              value={profile.skill}
              options={Object.entries(SKILL_LABELS) as [SkillLevel, string][]}
              onChange={(v) => setProfile({ ...profile, skill: v })}
            />
          </Field>

          {/* Budget */}
          <Field label="Monthly budget">
            <ChipRow<Budget>
              value={profile.budget}
              options={Object.entries(BUDGET_LABELS) as [Budget, string][]}
              onChange={(v) => setProfile({ ...profile, budget: v })}
            />
          </Field>

          {/* Team size */}
          <Field label="Team size">
            <ChipRow<TeamSize>
              value={profile.team}
              options={Object.entries(TEAM_LABELS) as [TeamSize, string][]}
              onChange={(v) => setProfile({ ...profile, team: v })}
            />
          </Field>

          {/* Industry */}
          <Field label="Your role / industry">
            <ChipRow<Industry>
              value={profile.industry}
              options={Object.entries(INDUSTRY_LABELS) as [Industry, string][]}
              onChange={(v) => setProfile({ ...profile, industry: v })}
            />
          </Field>

          {/* Goal type */}
          <Field label="Primary goal">
            <ChipRow<GoalType>
              value={profile.goalType}
              options={Object.entries(GOAL_LABELS) as [GoalType, string][]}
              onChange={(v) => setProfile({ ...profile, goalType: v })}
            />
          </Field>

          {/* Existing tools */}
          <Field label="Tools you already use (optional)" hint="Comma-separated, e.g. Notion, Figma, ChatGPT">
            <input
              type="text"
              value={existingToolsText}
              onChange={(e) => setExistingToolsText(e.target.value)}
              placeholder="ChatGPT, Notion, Figma…"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-emerald-700 focus:outline-none"
            />
          </Field>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onSkip}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Skip — recommend without context
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              Recommend my stack
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-2">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-zinc-600">{hint}</p>}
    </div>
  )
}

function ChipRow<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: [T, string][]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            value === v
              ? 'border-emerald-600 bg-emerald-950/50 text-emerald-300'
              : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
