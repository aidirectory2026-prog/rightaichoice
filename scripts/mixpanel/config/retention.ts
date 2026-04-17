/** Retention report definitions — configured manually in Mixpanel UI. */

export type RetentionDef = {
  id: string
  name: string
  description: string
  /** "Did" event. */
  cohortEvent: string
  cohortFilter?: string
  /** "Came back and did" event. */
  returnEvent: string
  returnFilter?: string
  window: 'weekly' | 'daily' | 'monthly'
  durationWeeks: number
}

export const RETENTIONS: RetentionDef[] = [
  {
    id: 'new_user_weekly',
    name: 'New user — weekly retention',
    description: 'Classic retention: first-ever page_viewed → return page_viewed by week.',
    cohortEvent: 'page_viewed',
    cohortFilter: 'first_session = true',
    returnEvent: 'page_viewed',
    window: 'weekly',
    durationWeeks: 12,
  },
  {
    id: 'activated_vs_not',
    name: 'Activated vs non-activated retention (overlay)',
    description: 'Two cohorts overlaid — activated users vs. those who never hit a milestone.',
    cohortEvent: 'page_viewed',
    cohortFilter: 'first_session = true; overlay: fired activation_milestone within 24h',
    returnEvent: 'page_viewed',
    window: 'weekly',
    durationWeeks: 12,
  },
  {
    id: 'plan_completer_retention',
    name: 'Plan completer retention',
    description: 'Users who completed a plan — do they come back?',
    cohortEvent: 'plan_completed',
    returnEvent: 'page_viewed',
    window: 'weekly',
    durationWeeks: 8,
  },
  {
    id: 'comparison_user_retention',
    name: 'Comparison user retention',
    description: 'Do users who hit compare flow return?',
    cohortEvent: 'comparison_viewed',
    returnEvent: 'page_viewed',
    window: 'weekly',
    durationWeeks: 8,
  },
  {
    id: 'ai_chat_user_retention',
    name: 'AI chat user retention',
    description: 'Are AI chat users sticky?',
    cohortEvent: 'ai_chat_message',
    returnEvent: 'page_viewed',
    window: 'weekly',
    durationWeeks: 8,
  },
]
