export type SkillLevel = 'beginner' | 'intermediate' | 'expert'
export type Budget = 'free' | 'under_50' | '50_200' | 'over_200' | 'no_limit'
export type TeamSize = 'solo' | '2_5' | '6_20' | '20_plus'
export type Industry = 'marketing' | 'dev' | 'design' | 'sales' | 'education' | 'content' | 'other'
export type GoalType = 'build' | 'automate' | 'learn' | 'create' | 'research'

export type UserProfile = {
  skill: SkillLevel
  budget: Budget
  team: TeamSize
  industry: Industry
  goalType: GoalType
  existingTools: string[]
}

const STORAGE_KEY = 'riac_user_profile'

export function loadProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as UserProfile
  } catch {
    return null
  }
}

export function saveProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  } catch {
    // Ignore quota errors
  }
}

export function clearProfile(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore
  }
}

export const SKILL_LABELS: Record<SkillLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  expert: 'Expert',
}

export const BUDGET_LABELS: Record<Budget, string> = {
  free: 'Free only',
  under_50: 'Under $50/mo',
  '50_200': '$50–200/mo',
  over_200: '$200+/mo',
  no_limit: 'No limit',
}

export const BUDGET_MAX: Record<Budget, number> = {
  free: 0,
  under_50: 50,
  '50_200': 200,
  over_200: 1000,
  no_limit: Infinity,
}

export const TEAM_LABELS: Record<TeamSize, string> = {
  solo: 'Just me',
  '2_5': '2–5',
  '6_20': '6–20',
  '20_plus': '20+',
}

export const INDUSTRY_LABELS: Record<Industry, string> = {
  marketing: 'Marketing',
  dev: 'Development',
  design: 'Design',
  sales: 'Sales',
  education: 'Education',
  content: 'Content',
  other: 'Other',
}

export const GOAL_LABELS: Record<GoalType, string> = {
  build: 'Build something',
  automate: 'Automate work',
  learn: 'Learn',
  create: 'Create content',
  research: 'Research',
}

export function profileSummary(profile: UserProfile): string {
  return `${SKILL_LABELS[profile.skill]} · ${BUDGET_LABELS[profile.budget]} · ${TEAM_LABELS[profile.team]}`
}
