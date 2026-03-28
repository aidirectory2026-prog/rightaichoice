import { createClient } from '@/lib/supabase/server'

// ── Discussions ─────────────────────────────────────────────────────────────

export async function getDiscussionsForTool(
  toolId: string,
  sort: 'newest' | 'popular' = 'newest'
) {
  const supabase = await createClient()

  let query = supabase
    .from('discussions')
    .select('*, profiles(id, username, avatar_url, reputation)')
    .eq('tool_id', toolId)
    .eq('is_flagged', false)

  if (sort === 'popular') {
    query = query
      .order('is_pinned', { ascending: false })
      .order('upvotes', { ascending: false })
  } else {
    query = query
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
  }

  const { data } = await query
  return data ?? []
}

export async function getDiscussionById(discussionId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('discussions')
    .select(
      '*, profiles(id, username, avatar_url, reputation), tools!inner(id, name, slug, logo_url)'
    )
    .eq('id', discussionId)
    .eq('is_flagged', false)
    .single()

  return data
}

// ── Replies ─────────────────────────────────────────────────────────────────

export async function getRepliesForDiscussion(discussionId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('discussion_replies')
    .select('*, profiles(id, username, avatar_url, reputation)')
    .eq('discussion_id', discussionId)
    .eq('is_flagged', false)
    .order('created_at', { ascending: true })

  return data ?? []
}

// ── Voting ──────────────────────────────────────────────────────────────────

export async function getDiscussionVotes(
  discussionIds: string[],
  userId: string
): Promise<Record<string, 'up' | 'down'>> {
  if (discussionIds.length === 0) return {}
  const supabase = await createClient()

  const { data } = await supabase
    .from('discussion_votes')
    .select('discussion_id, vote')
    .in('discussion_id', discussionIds)
    .eq('user_id', userId)

  const map: Record<string, 'up' | 'down'> = {}
  data?.forEach((v) => {
    map[v.discussion_id] = v.vote
  })
  return map
}

export async function getReplyVotes(
  replyIds: string[],
  userId: string
): Promise<Record<string, 'up' | 'down'>> {
  if (replyIds.length === 0) return {}
  const supabase = await createClient()

  const { data } = await supabase
    .from('discussion_reply_votes')
    .select('reply_id, vote')
    .in('reply_id', replyIds)
    .eq('user_id', userId)

  const map: Record<string, 'up' | 'down'> = {}
  data?.forEach((v) => {
    map[v.reply_id] = v.vote
  })
  return map
}

export async function toggleDiscussionVote(
  discussionId: string,
  userId: string,
  direction: 'up' | 'down'
): Promise<{ newVote: 'up' | 'down' | null }> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('discussion_votes')
    .select('vote')
    .eq('discussion_id', discussionId)
    .eq('user_id', userId)
    .maybeSingle()

  const { data: discussion } = await supabase
    .from('discussions')
    .select('upvotes')
    .eq('id', discussionId)
    .single()

  if (!discussion) return { newVote: null }

  if (existing?.vote === direction) {
    // Undo
    await supabase
      .from('discussion_votes')
      .delete()
      .eq('discussion_id', discussionId)
      .eq('user_id', userId)
    if (direction === 'up') {
      await supabase
        .from('discussions')
        .update({ upvotes: Math.max(0, discussion.upvotes - 1) })
        .eq('id', discussionId)
    }
    return { newVote: null }
  }

  if (existing) {
    // Switch direction
    await supabase
      .from('discussion_votes')
      .update({ vote: direction })
      .eq('discussion_id', discussionId)
      .eq('user_id', userId)
    if (direction === 'up') {
      await supabase
        .from('discussions')
        .update({ upvotes: discussion.upvotes + 1 })
        .eq('id', discussionId)
    } else {
      await supabase
        .from('discussions')
        .update({ upvotes: Math.max(0, discussion.upvotes - 1) })
        .eq('id', discussionId)
    }
    return { newVote: direction }
  }

  // New vote
  await supabase
    .from('discussion_votes')
    .insert({ discussion_id: discussionId, user_id: userId, vote: direction })
  if (direction === 'up') {
    await supabase
      .from('discussions')
      .update({ upvotes: discussion.upvotes + 1 })
      .eq('id', discussionId)
  }
  return { newVote: direction }
}

export async function toggleReplyVote(
  replyId: string,
  userId: string,
  direction: 'up' | 'down'
): Promise<{ newVote: 'up' | 'down' | null }> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('discussion_reply_votes')
    .select('vote')
    .eq('reply_id', replyId)
    .eq('user_id', userId)
    .maybeSingle()

  const { data: reply } = await supabase
    .from('discussion_replies')
    .select('upvotes')
    .eq('id', replyId)
    .single()

  if (!reply) return { newVote: null }

  if (existing?.vote === direction) {
    await supabase
      .from('discussion_reply_votes')
      .delete()
      .eq('reply_id', replyId)
      .eq('user_id', userId)
    if (direction === 'up') {
      await supabase
        .from('discussion_replies')
        .update({ upvotes: Math.max(0, reply.upvotes - 1) })
        .eq('id', replyId)
    }
    return { newVote: null }
  }

  if (existing) {
    await supabase
      .from('discussion_reply_votes')
      .update({ vote: direction })
      .eq('reply_id', replyId)
      .eq('user_id', userId)
    if (direction === 'up') {
      await supabase
        .from('discussion_replies')
        .update({ upvotes: reply.upvotes + 1 })
        .eq('id', replyId)
    } else {
      await supabase
        .from('discussion_replies')
        .update({ upvotes: Math.max(0, reply.upvotes - 1) })
        .eq('id', replyId)
    }
    return { newVote: direction }
  }

  await supabase
    .from('discussion_reply_votes')
    .insert({ reply_id: replyId, user_id: userId, vote: direction })
  if (direction === 'up') {
    await supabase
      .from('discussion_replies')
      .update({ upvotes: reply.upvotes + 1 })
      .eq('id', replyId)
  }
  return { newVote: direction }
}
