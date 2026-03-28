'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { toggleQuestionVote, toggleAnswerVote } from '@/lib/data/questions'

type ActionState = { error?: string; success?: string } | null

// ── Submit Question ──────────────────────────────────────────────────────────

export async function submitQuestion(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to ask a question.' }

  const tool_id = formData.get('tool_id') as string
  const title = (formData.get('title') as string)?.trim()
  const body = (formData.get('body') as string)?.trim()

  if (!tool_id || !title || !body) {
    return { error: 'All fields are required.' }
  }

  if (title.length < 10) {
    return { error: 'Title must be at least 10 characters.' }
  }

  if (body.length < 20) {
    return { error: 'Description must be at least 20 characters.' }
  }

  const { error } = await supabase.from('questions').insert({
    tool_id,
    user_id: user.id,
    title,
    body,
  })

  if (error) {
    return { error: 'Failed to submit question. Please try again.' }
  }

  // Update question_count on profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('question_count')
    .eq('id', user.id)
    .single()

  if (profile) {
    await supabase
      .from('profiles')
      .update({ question_count: profile.question_count + 1 })
      .eq('id', user.id)
  }

  // Get tool slug for revalidation
  const { data: tool } = await supabase
    .from('tools')
    .select('slug')
    .eq('id', tool_id)
    .single()

  if (tool) {
    revalidatePath(`/tools/${tool.slug}`)
  }
  revalidatePath('/questions')

  return { success: 'Question posted! The community can now help you.' }
}

// ── Submit Answer ────────────────────────────────────────────────────────────

export async function submitAnswer(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to answer.' }

  const question_id = formData.get('question_id') as string
  const body = (formData.get('body') as string)?.trim()

  if (!question_id || !body) {
    return { error: 'Answer cannot be empty.' }
  }

  if (body.length < 20) {
    return { error: 'Answer must be at least 20 characters.' }
  }

  const { error } = await supabase.from('answers').insert({
    question_id,
    user_id: user.id,
    body,
  })

  if (error) {
    return { error: 'Failed to submit answer. Please try again.' }
  }

  // Update answer_count on profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('answer_count')
    .eq('id', user.id)
    .single()

  if (profile) {
    await supabase
      .from('profiles')
      .update({ answer_count: profile.answer_count + 1 })
      .eq('id', user.id)
  }

  // answer_count + is_answered on questions table updated by DB trigger (sync_question_answers)

  // Revalidate question page
  revalidatePath(`/questions/${question_id}`)

  return { success: 'Answer posted!' }
}

// ── Accept Answer ────────────────────────────────────────────────────────────

export async function acceptAnswer(
  answerId: string,
  questionId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Only question author can accept
  const { data: question } = await supabase
    .from('questions')
    .select('user_id')
    .eq('id', questionId)
    .single()

  if (!question || question.user_id !== user.id) {
    return { error: 'Only the question author can accept an answer.' }
  }

  // Unaccept all other answers for this question first
  await supabase
    .from('answers')
    .update({ is_accepted: false })
    .eq('question_id', questionId)

  // Accept the selected answer
  await supabase
    .from('answers')
    .update({ is_accepted: true })
    .eq('id', answerId)

  // is_answered on questions table updated by DB trigger

  revalidatePath(`/questions/${questionId}`)

  return { error: null }
}

// ── Vote on Question ─────────────────────────────────────────────────────────

export async function voteOnQuestion(
  questionId: string,
  direction: 'up' | 'down'
): Promise<{ newVote: 'up' | 'down' | null; error: string | null }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { newVote: null, error: 'Not authenticated.' }

  const result = await toggleQuestionVote(questionId, user.id, direction)
  return { ...result, error: null }
}

// ── Vote on Answer ───────────────────────────────────────────────────────────

export async function voteOnAnswer(
  answerId: string,
  direction: 'up' | 'down'
): Promise<{ newVote: 'up' | 'down' | null; error: string | null }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { newVote: null, error: 'Not authenticated.' }

  const result = await toggleAnswerVote(answerId, user.id, direction)
  return { ...result, error: null }
}
