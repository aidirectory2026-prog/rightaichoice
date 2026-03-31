import { createClient } from '@/lib/supabase/server'

type VoteConfig = {
  voteTable: string
  contentTable: string
  contentIdField: string
  contentId: string
  userId: string
  direction: 'up' | 'down'
  hasDownvotes?: boolean
}

/**
 * Generic vote toggle. Handles insert / switch / undo with atomic counter updates.
 * Replaces 6 copy-pasted toggle functions that had race conditions.
 */
export async function toggleVote(config: VoteConfig): Promise<{ newVote: 'up' | 'down' | null }> {
  const {
    voteTable,
    contentTable,
    contentIdField,
    contentId,
    userId,
    direction,
    hasDownvotes = false,
  } = config
  const supabase = await createClient()

  // 1. Check existing vote
  const { data: existing } = await supabase
    .from(voteTable)
    .select('vote')
    .eq(contentIdField, contentId)
    .eq('user_id', userId)
    .maybeSingle()

  // Helper: atomically adjust a counter
  const adjust = (field: string, delta: number) =>
    supabase.rpc('adjust_counter', {
      target_table: contentTable,
      target_id: contentId,
      counter_field: field,
      delta,
    })

  if (existing?.vote === direction) {
    // Undo existing vote
    await supabase
      .from(voteTable)
      .delete()
      .eq(contentIdField, contentId)
      .eq('user_id', userId)
    await adjust(direction === 'up' ? 'upvotes' : 'downvotes', -1)
    return { newVote: null }
  }

  if (existing) {
    // Switch direction
    await supabase
      .from(voteTable)
      .update({ vote: direction })
      .eq(contentIdField, contentId)
      .eq('user_id', userId)
    // Increment new direction
    await adjust(direction === 'up' ? 'upvotes' : 'downvotes', 1)
    // Decrement old direction (only upvotes tracked unless hasDownvotes)
    const oldField = existing.vote === 'up' ? 'upvotes' : 'downvotes'
    if (oldField === 'upvotes' || hasDownvotes) {
      await adjust(oldField, -1)
    }
    return { newVote: direction }
  }

  // New vote
  await supabase
    .from(voteTable)
    .insert({ [contentIdField]: contentId, user_id: userId, vote: direction })
  await adjust(direction === 'up' ? 'upvotes' : 'downvotes', 1)
  return { newVote: direction }
}
