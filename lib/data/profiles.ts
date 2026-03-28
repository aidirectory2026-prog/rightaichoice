import { createClient } from '@/lib/supabase/server'

export async function getProfile(userId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  return data
}

export async function getProfileByUsername(username: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  return data
}

export async function getUserBadges(userId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('user_badges')
    .select('badge, awarded_at')
    .eq('user_id', userId)
    .order('awarded_at', { ascending: false })

  return data ?? []
}

export async function getUserSavedTools(userId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('user_saved_tools')
    .select('created_at, tools(id, name, slug, tagline, logo_url, pricing_type, avg_rating, review_count)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  // Each row has { created_at, tools: {...} }
  return (
    data?.map((row: Record<string, unknown>) => row.tools).filter(Boolean) ?? []
  )
}

export async function getUserReviews(userId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('reviews')
    .select('id, rating, pros, cons, use_case, skill_level, upvotes, created_at, tools(id, name, slug, logo_url)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function getUserQuestions(userId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('questions')
    .select('id, title, upvotes, answer_count, is_answered, created_at, tools(id, name, slug)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function getUserAnswers(userId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('answers')
    .select('id, body, upvotes, is_accepted, created_at, questions(id, title, tool_id, tools(name, slug))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function getReputationHistory(userId: string, limit = 20) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('reputation_logs')
    .select('id, delta, reason, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return data ?? []
}
