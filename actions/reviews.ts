'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { toggleReviewVote } from '@/lib/data/reviews'

type ActionState = { error?: string; success?: string } | null

export async function submitReview(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to write a review.' }

  const toolId = formData.get('tool_id') as string
  const rating = parseInt(formData.get('rating') as string, 10)
  const pros = (formData.get('pros') as string)?.trim()
  const cons = (formData.get('cons') as string)?.trim()
  const use_case = (formData.get('use_case') as string)?.trim()
  const skill_level = formData.get('skill_level') as string

  if (!toolId || !rating || !pros || !cons || !use_case || !skill_level) {
    return { error: 'All fields are required.' }
  }

  if (rating < 1 || rating > 5) {
    return { error: 'Rating must be between 1 and 5.' }
  }

  if (pros.length < 10) return { error: 'Pros must be at least 10 characters.' }
  if (cons.length < 10) return { error: 'Cons must be at least 10 characters.' }
  if (use_case.length < 10) return { error: 'Use case must be at least 10 characters.' }

  // Check for duplicate
  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('tool_id', toolId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    return { error: 'You have already reviewed this tool.' }
  }

  const { error } = await supabase.from('reviews').insert({
    tool_id: toolId,
    user_id: user.id,
    rating,
    pros,
    cons,
    use_case,
    skill_level,
  })

  if (error) return { error: error.message }

  // Update review_count on tools and profiles
  await Promise.all([
    supabase.from('tools').select('review_count').eq('id', toolId).single().then(({ data }) => {
      if (data) supabase.from('tools').update({ review_count: data.review_count + 1 }).eq('id', toolId)
    }),
    supabase.from('profiles').select('review_count').eq('id', user.id).single().then(({ data }) => {
      if (data) supabase.from('profiles').update({ review_count: data.review_count + 1 }).eq('id', user.id)
    }),
  ])

  // Recalculate avg_rating
  const { data: allReviews } = await supabase
    .from('reviews')
    .select('rating')
    .eq('tool_id', toolId)

  if (allReviews && allReviews.length > 0) {
    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
    await supabase.from('tools').update({
      avg_rating: Math.round(avg * 100) / 100,
      review_count: allReviews.length,
    }).eq('id', toolId)
  }

  const { data: toolData } = await supabase.from('tools').select('slug').eq('id', toolId).single()
  if (toolData) revalidatePath(`/tools/${toolData.slug}`)

  return { success: 'Review submitted! Thanks for sharing your experience.' }
}

export async function voteOnReview(
  reviewId: string,
  direction: 'up' | 'down'
): Promise<{ newVote: 'up' | 'down' | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { newVote: null, error: 'Not authenticated' }

  const result = await toggleReviewVote(reviewId, user.id, direction)
  return { ...result, error: null }
}
