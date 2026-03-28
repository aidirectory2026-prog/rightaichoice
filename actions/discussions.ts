'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { toggleDiscussionVote, toggleReplyVote } from '@/lib/data/discussions'

type ActionState = { error?: string; success?: string } | null

// ── Submit discussion ───────────────────────────────────────────────────────

export async function submitDiscussion(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in to start a discussion.' }

  const toolId = formData.get('tool_id') as string
  const title = (formData.get('title') as string)?.trim()
  const body = (formData.get('body') as string)?.trim()

  if (!title || title.length < 5) {
    return { error: 'Title must be at least 5 characters.' }
  }
  if (!body || body.length < 10) {
    return { error: 'Body must be at least 10 characters.' }
  }

  const { error } = await supabase.from('discussions').insert({
    tool_id: toolId,
    user_id: user.id,
    title,
    body,
  })

  if (error) return { error: 'Failed to post discussion. Please try again.' }

  // Fire-and-forget: update discussion_count on profile (if column exists)
  supabase.rpc('increment_field', {
    table_name: 'profiles',
    field_name: 'discussion_count',
    row_id: user.id,
  }).then(() => {})

  revalidatePath(`/tools/[slug]`, 'page')
  return { success: 'Discussion posted!' }
}

// ── Submit reply ────────────────────────────────────────────────────────────

export async function submitReply(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in to reply.' }

  const discussionId = formData.get('discussion_id') as string
  const body = (formData.get('body') as string)?.trim()

  if (!body || body.length < 5) {
    return { error: 'Reply must be at least 5 characters.' }
  }

  const { error } = await supabase.from('discussion_replies').insert({
    discussion_id: discussionId,
    user_id: user.id,
    body,
  })

  if (error) return { error: 'Failed to post reply. Please try again.' }

  // reply_count on discussions auto-updated by DB trigger
  revalidatePath(`/tools/[slug]`, 'page')
  return { success: 'Reply posted!' }
}

// ── Vote on discussion ──────────────────────────────────────────────────────

export async function voteOnDiscussion(
  discussionId: string,
  direction: 'up' | 'down'
): Promise<{ newVote: 'up' | 'down' | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { newVote: null, error: 'Sign in to vote.' }

  const result = await toggleDiscussionVote(discussionId, user.id, direction)
  return { ...result, error: null }
}

// ── Vote on reply ───────────────────────────────────────────────────────────

export async function voteOnReply(
  replyId: string,
  direction: 'up' | 'down'
): Promise<{ newVote: 'up' | 'down' | null; error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { newVote: null, error: 'Sign in to vote.' }

  const result = await toggleReplyVote(replyId, user.id, direction)
  return { ...result, error: null }
}
