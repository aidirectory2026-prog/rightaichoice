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

export async function getRecentQuestions(limit = 20, offset = 0) {
  const supabase = await createClient()

  const { data, count } = await supabase
    .from('questions')
    .select(
      '*, profiles(id, username, avatar_url, reputation), tools!inner(id, name, slug, logo_url)',
      { count: 'exact' }
    )
    .eq('is_flagged', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

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
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('question_votes')
    .select('vote')
    .eq('question_id', questionId)
    .eq('user_id', userId)
    .maybeSingle()

  const { data: question } = await supabase
    .from('questions')
    .select('upvotes')
    .eq('id', questionId)
    .single()

  if (!question) return { newVote: null }

  if (existing?.vote === direction) {
    // Undo
    await supabase
      .from('question_votes')
      .delete()
      .eq('question_id', questionId)
      .eq('user_id', userId)
    if (direction === 'up') {
      await supabase
        .from('questions')
        .update({ upvotes: Math.max(0, question.upvotes - 1) })
        .eq('id', questionId)
    }
    return { newVote: null }
  }

  if (existing) {
    // Switch direction
    await supabase
      .from('question_votes')
      .update({ vote: direction })
      .eq('question_id', questionId)
      .eq('user_id', userId)
    if (direction === 'up') {
      await supabase
        .from('questions')
        .update({ upvotes: question.upvotes + 1 })
        .eq('id', questionId)
    } else {
      await supabase
        .from('questions')
        .update({ upvotes: Math.max(0, question.upvotes - 1) })
        .eq('id', questionId)
    }
    return { newVote: direction }
  }

  // New vote
  await supabase
    .from('question_votes')
    .insert({ question_id: questionId, user_id: userId, vote: direction })
  if (direction === 'up') {
    await supabase
      .from('questions')
      .update({ upvotes: question.upvotes + 1 })
      .eq('id', questionId)
  }
  return { newVote: direction }
}

export async function toggleAnswerVote(
  answerId: string,
  userId: string,
  direction: 'up' | 'down'
): Promise<{ newVote: 'up' | 'down' | null }> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('answer_votes')
    .select('vote')
    .eq('answer_id', answerId)
    .eq('user_id', userId)
    .maybeSingle()

  const { data: answer } = await supabase
    .from('answers')
    .select('upvotes')
    .eq('id', answerId)
    .single()

  if (!answer) return { newVote: null }

  if (existing?.vote === direction) {
    // Undo
    await supabase
      .from('answer_votes')
      .delete()
      .eq('answer_id', answerId)
      .eq('user_id', userId)
    if (direction === 'up') {
      await supabase
        .from('answers')
        .update({ upvotes: Math.max(0, answer.upvotes - 1) })
        .eq('id', answerId)
    }
    return { newVote: null }
  }

  if (existing) {
    // Switch direction
    await supabase
      .from('answer_votes')
      .update({ vote: direction })
      .eq('answer_id', answerId)
      .eq('user_id', userId)
    if (direction === 'up') {
      await supabase
        .from('answers')
        .update({ upvotes: answer.upvotes + 1 })
        .eq('id', answerId)
    } else {
      await supabase
        .from('answers')
        .update({ upvotes: Math.max(0, answer.upvotes - 1) })
        .eq('id', answerId)
    }
    return { newVote: direction }
  }

  // New vote
  await supabase
    .from('answer_votes')
    .insert({ answer_id: answerId, user_id: userId, vote: direction })
  if (direction === 'up') {
    await supabase
      .from('answers')
      .update({ upvotes: answer.upvotes + 1 })
      .eq('id', answerId)
  }
  return { newVote: direction }
}
