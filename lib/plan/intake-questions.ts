/**
 * Phase 12 Bug-1 — single source of truth for the stepped intake questions.
 *
 * The stepped wizard (`components/cta/stack-wizard.tsx`) renders one of these per
 * screen. Labels/options are imported from `user-profile.ts` (the canonical
 * enum→label maps) so there is no second copy to drift; this file only adds the
 * ordering, the per-screen copy (headline + subhead), and the analytics
 * `step_index` that MUST stay identical to the legacy IntakeModal (0–4) so the
 * `plan_chip_selected` step indices don't shift in the funnel.
 */

import {
  SKILL_LABELS,
  BUDGET_LABELS,
  TEAM_LABELS,
  INDUSTRY_LABELS,
  GOAL_LABELS,
  type UserProfile,
} from '@/lib/plan/user-profile'

/** Analytics step key — matches the legacy IntakeModal `planChipSelected` step. */
export type IntakeStepKey = 'skill' | 'budget' | 'team' | 'industry' | 'goal_type'

export type IntakeQuestion = {
  /** Analytics step name (kept identical to the legacy modal). */
  key: IntakeStepKey
  /** Analytics step_index (0–4) — kept identical to the legacy modal. */
  stepIndex: number
  /** The `UserProfile` field this screen writes. */
  field: keyof Pick<UserProfile, 'skill' | 'budget' | 'team' | 'industry' | 'goalType'>
  /** 1–2 line headline shown big on the screen. */
  headline: string
  /** Supporting line under the headline. */
  subhead: string
  /** [value, label] option pairs straight from the canonical label maps. */
  options: [string, string][]
}

/** The 5 structured questions, in screen order. */
export const INTAKE_QUESTIONS: IntakeQuestion[] = [
  {
    key: 'skill',
    stepIndex: 0,
    field: 'skill',
    headline: 'How comfortable are you with AI tools?',
    subhead: "We'll match the setup effort to your level — no jargon if you're just starting out.",
    options: Object.entries(SKILL_LABELS) as [string, string][],
  },
  {
    key: 'budget',
    stepIndex: 1,
    field: 'budget',
    headline: "What's your monthly budget?",
    subhead: 'We only recommend tools you can actually afford — and always surface the free options.',
    options: Object.entries(BUDGET_LABELS) as [string, string][],
  },
  {
    key: 'team',
    stepIndex: 2,
    field: 'team',
    headline: "Who's this stack for?",
    subhead: 'A solo founder and a 20-person team need very different tools at very different prices.',
    options: Object.entries(TEAM_LABELS) as [string, string][],
  },
  {
    key: 'industry',
    stepIndex: 3,
    field: 'industry',
    headline: "What's your role?",
    subhead: 'So we lead with the tools built for the way you actually work.',
    options: Object.entries(INDUSTRY_LABELS) as [string, string][],
  },
  {
    key: 'goal_type',
    stepIndex: 4,
    field: 'goalType',
    headline: 'What are you mainly trying to do?',
    subhead: 'This shapes which stage of your stack we optimise first.',
    options: Object.entries(GOAL_LABELS) as [string, string][],
  },
]
