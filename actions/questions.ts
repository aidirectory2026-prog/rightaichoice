'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type ActionState = { error?: string; success?: string } | null

// Phase 1 (2026-05-05): the public Q&A surfaces (/questions list + per-id
// pages, vote buttons, answer flow) were removed. Submission of new
// questions is preserved — it now flows through the QuickFeedback strip on
// the tool page and is admin-triaged via Supabase. The other action
// functions (submitAnswer, acceptAnswer, voteOnQuestion, voteOnAnswer) were
// dropped along with the UI that called them.

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

  // Bump the user's question count
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

  // Revalidate the tool page so the strip's logged-in state refreshes
  const { data: tool } = await supabase
    .from('tools')
    .select('slug')
    .eq('id', tool_id)
    .single()

  if (tool) {
    revalidatePath(`/tools/${tool.slug}`)
  }

  return { success: 'Question submitted. Our editorial team triages new questions weekly.' }
}
