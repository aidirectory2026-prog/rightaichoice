import { createClient } from '@/lib/supabase/server'

// ── Questions ────────────────────────────────────────────────────────────────

export async function getQuestionsForTool(
  toolId: string,
  sort: 'newest' | 'popular' = 'newest'
) {
  const supabase = await createClient()

  let query = supabase
    .from('questions')
    .select('*, profiles(id, username, avatar_url, reputation)')
    .eq('tool_id', toolId)
    .eq('is_flagged', false)

  if (sort === 'popular') {
    query = query.order('upvotes', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data } = await query
  return data ?? []
}

export async function getAllQuestionIds(): Promise<{ id: string; updated_at: string }[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('questions')
    .select('id, updated_at')
    .eq('is_flagged', false)
    .order('updated_at', { ascending: false })
  return data ?? []
}

export async function getRecentQuestions(
  limit = 20,
  offset = 0,
  filters?: {
    answered?: 'yes' | 'no' | 'all'
    sort?: 'newest' | 'popular'
    toolSlug?: string
  }
) {
  const supabase = await createClient()

  let query = supabase
    .from('questions')
    .select(
      '*, profiles(id, username, avatar_url, reputation), tools!inner(id, name, slug, logo_url)',
      { count: 'exact' }
    )
    .eq('is_flagged', false)

  if (filters?.answered === 'yes') query = query.eq('is_answered', true)
  if (filters?.answered === 'no') query = query.eq('is_answered', false)
  if (filters?.toolSlug) query = (query as typeof query).eq('tools.slug', filters.toolSlug)

  if (filters?.sort === 'popular') {
    query = query.order('upvotes', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data, count } = await query.range(offset, offset + limit - 1)

  return { questions: data ?? [], total: count ?? 0 }
}

export async function getQuestionById(questionId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('questions')
    .select(
      '*, profiles(id, username, avatar_url, reputation), tools!inner(id, name, slug, logo_url)'
    )
    .eq('id', questionId)
    .eq('is_flagged', false)
    .single()

  return data
}

// ── Answers ──────────────────────────────────────────────────────────────────

export async function getAnswersForQuestion(questionId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('answers')
    .select('*, profiles(id, username, avatar_url, reputation)')
    .eq('question_id', questionId)
    .eq('is_flagged', false)
    .order('is_accepted', { ascending: false })
    .order('upvotes', { ascending: false })
    .order('created_at', { ascending: true })

  return data ?? []
}

// ── Voting ───────────────────────────────────────────────────────────────────

export async function getQuestionVotes(
  questionIds: string[],
  userId: string
): Promise<Record<string, 'up' | 'down'>> {
  if (questionIds.length === 0) return {}
  const supabase = await createClient()

  const { data } = await supabase
    .from('question_votes')
    .select('question_id, vote')
    .in('question_id', questionIds)
    .eq('user_id', userId)

  const map: Record<string, 'up' | 'down'> = {}
  data?.forEach((v) => {
    map[v.question_id] = v.vote
  })
  return map
}

export async function getAnswerVotes(
  answerIds: string[],
  userId: string
): Promise<Record<string, 'up' | 'down'>> {
  if (answerIds.length === 0) return {}
  const supabase = await createClient()

  const { data } = await supabase
    .from('answer_votes')
    .select('answer_id, vote')
    .in('answer_id', answerIds)
    .eq('user_id', userId)

  const map: Record<string, 'up' | 'down'> = {}
  data?.forEach((v) => {
    map[v.answer_id] = v.vote
  })
  return map
}

export async function toggleQuestionVote(
  questionId: string,
  userId: string,
  direction: 'up' | 'down'
): Promise<{ newVote: 'up' | 'down' | null }> {
  const { toggleVote } = await import('@/lib/data/votes')
  return toggleVote({
    voteTable: 'question_votes',
    contentTable: 'questions',
    contentIdField: 'question_id',
    contentId: questionId,
    userId,
    direction,
  })
}

export async function toggleAnswerVote(
  answerId: string,
  userId: string,
  direction: 'up' | 'down'
): Promise<{ newVote: 'up' | 'down' | null }> {
  const { toggleVote } = await import('@/lib/data/votes')
  return toggleVote({
    voteTable: 'answer_votes',
    contentTable: 'answers',
    contentIdField: 'answer_id',
    contentId: answerId,
    userId,
    direction,
  })
}
