/**
 * Cohort definitions. Mixpanel free tier blocks the Cohorts API, so this
 * file serves as the authoritative spec. Every cohort in the Mixpanel UI
 * must match one entry here. See docs/marketing/mixpanel-playbook.md for
 * click-by-click recreation.
 */

export type CohortDef = {
  id: string
  name: string
  description: string
  /** Human-readable filter — translates to the UI builder 1:1. */
  definition: string
  /** Which Boards consume this cohort. */
  usedIn: string[]
  /** Refresh cadence in hours (Mixpanel default is 1h). */
  refreshHours: number
}

export const COHORTS: CohortDef[] = [
  {
    id: 'activated_users',
    name: 'Activated users',
    description: 'Users who fired any activation_milestone event.',
    definition: 'Did activation_milestone ≥ 1 time ever.',
    usedIn: ['North Star', 'Growth'],
    refreshHours: 1,
  },
  {
    id: 'power_users_14d',
    name: 'Power users (14d)',
    description: 'Users who saved ≥3 tools in the last 14 days.',
    definition: 'Did tool_saved ≥ 3 times in the last 14 days.',
    usedIn: ['North Star', 'Discovery'],
    refreshHours: 1,
  },
  {
    id: 'comparison_users',
    name: 'Comparison-driven users',
    description: 'Users who hit the compare flow (high-intent research).',
    definition: 'Did comparison_viewed ≥ 1 time ever.',
    usedIn: ['Discovery', 'Revenue proxy'],
    refreshHours: 1,
  },
  {
    id: 'plan_completers',
    name: 'Plan completers',
    description: 'Users who finished the /plan wizard.',
    definition: 'Did plan_completed ≥ 1 time ever.',
    usedIn: ['North Star', 'Revenue proxy'],
    refreshHours: 1,
  },
  {
    id: 'ai_chat_users',
    name: 'AI chat users',
    description: 'Users who sent any AI chat message.',
    definition: 'Did ai_chat_message ≥ 1 time in the last 30 days.',
    usedIn: ['North Star', 'Discovery'],
    refreshHours: 1,
  },
  {
    id: 'at_risk',
    name: 'At-risk users',
    description: 'Users active in the prior 14-day window but silent in the last 14 days.',
    definition: 'Did page_viewed ≥ 1 time in days 14–28 ago AND did NOT do page_viewed in the last 14 days.',
    usedIn: ['Quality', 'Growth'],
    refreshHours: 6,
  },
  {
    id: 'high_intent_leavers',
    name: 'High-intent leavers',
    description: 'Viewed pricing but did not upgrade — revenue re-engagement target.',
    definition: 'Did pricing_viewed ≥ 1 time in the last 30 days AND did NOT do upgrade_clicked in the last 30 days.',
    usedIn: ['Revenue proxy'],
    refreshHours: 6,
  },
]
