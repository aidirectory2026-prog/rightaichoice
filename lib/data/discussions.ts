import { createClient } from '@/lib/supabase/server'

// ── Discussions ─────────────────────────────────────────────────────────────

export async function getRecentDiscussions(limit = 20, offset = 0) {
  const supabase = await createClient()

  const { data, count } = await supabase
    .from('discussions')
    .select(
      '*, profiles(id, username, avatar_url, reputation), tools!inner(id, name, slug, logo_url)',
      { count: 'exact' }
    )
    .eq('is_flagged', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  return { discussions: data ?? [], total: count ?? 0 }
}

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
  const { toggleVote } = await import('@/lib/data/votes')
  return toggleVote({
    voteTable: 'discussion_votes',
    contentTable: 'discussions',
    contentIdField: 'discussion_id',
    contentId: discussionId,
    userId,
    direction,
  })
}

export async function toggleReplyVote(
  replyId: string,
  userId: string,
  direction: 'up' | 'down'
): Promise<{ newVote: 'up' | 'down' | null }> {
  const { toggleVote } = await import('@/lib/data/votes')
  return toggleVote({
    voteTable: 'discussion_reply_votes',
    contentTable: 'discussion_replies',
    contentIdField: 'reply_id',
    contentId: replyId,
    userId,
    direction,
  })
}
