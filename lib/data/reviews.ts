import { createClient } from '@/lib/supabase/server'

export async function getRecentReviews(limit = 20, offset = 0) {
  const supabase = await createClient()

  const { data, count } = await supabase
    .from('reviews')
    .select(
      '*, profiles(id, username, avatar_url, reputation), tools!inner(id, name, slug, logo_url)',
      { count: 'exact' }
    )
    .eq('is_flagged', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  return { reviews: data ?? [], total: count ?? 0 }
}

export async function getReviewsForTool(toolId: string, sort: 'helpful' | 'newest' = 'helpful') {
  const supabase = await createClient()

  let query = supabase
    .from('reviews')
    .select('*, profiles(id, username, avatar_url, reputation)')
    .eq('tool_id', toolId)
    .eq('is_flagged', false)

  if (sort === 'newest') {
    query = query.order('created_at', { ascending: false })
  } else {
    query = query.order('upvotes', { ascending: false })
  }

  const { data } = await query
  return data ?? []
}

export async function hasUserReviewed(toolId: string, userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('reviews')
    .select('id')
    .eq('tool_id', toolId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

export async function getReviewVotes(reviewIds: string[], userId: string) {
  if (reviewIds.length === 0) return {}
  const supabase = await createClient()
  const { data } = await supabase
    .from('review_votes')
    .select('review_id, vote')
    .in('review_id', reviewIds)
    .eq('user_id', userId)

  const voteMap: Record<string, 'up' | 'down'> = {}
  data?.forEach((v) => {
    voteMap[v.review_id] = v.vote
  })
  return voteMap
}

export async function toggleReviewVote(
  reviewId: string,
  userId: string,
  direction: 'up' | 'down'
): Promise<{ newVote: 'up' | 'down' | null }> {
  const { toggleVote } = await import('@/lib/data/votes')
  return toggleVote({
    voteTable: 'review_votes',
    contentTable: 'reviews',
    contentIdField: 'review_id',
    contentId: reviewId,
    userId,
    direction,
    hasDownvotes: true,
  })
}
