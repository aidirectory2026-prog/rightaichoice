import { createClient } from '@/lib/supabase/server'

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
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('review_votes')
    .select('vote')
    .eq('review_id', reviewId)
    .eq('user_id', userId)
    .maybeSingle()

  const { data: review } = await supabase
    .from('reviews')
    .select('upvotes, downvotes')
    .eq('id', reviewId)
    .single()

  if (!review) return { newVote: null }

  if (existing?.vote === direction) {
    // Undo existing vote
    await supabase.from('review_votes').delete().eq('review_id', reviewId).eq('user_id', userId)
    const field = direction === 'up' ? 'upvotes' : 'downvotes'
    const current = direction === 'up' ? review.upvotes : review.downvotes
    await supabase.from('reviews').update({ [field]: Math.max(0, current - 1) }).eq('id', reviewId)
    return { newVote: null }
  }

  if (existing) {
    // Switch vote direction
    await supabase.from('review_votes').update({ vote: direction }).eq('review_id', reviewId).eq('user_id', userId)
    await supabase.from('reviews').update({
      upvotes: direction === 'up' ? review.upvotes + 1 : Math.max(0, review.upvotes - 1),
      downvotes: direction === 'down' ? review.downvotes + 1 : Math.max(0, review.downvotes - 1),
    }).eq('id', reviewId)
    return { newVote: direction }
  }

  // New vote
  await supabase.from('review_votes').insert({ review_id: reviewId, user_id: userId, vote: direction })
  const field = direction === 'up' ? 'upvotes' : 'downvotes'
  const current = direction === 'up' ? review.upvotes : review.downvotes
  await supabase.from('reviews').update({ [field]: current + 1 }).eq('id', reviewId)
  return { newVote: direction }
}
