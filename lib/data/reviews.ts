import { createClient } from '@/lib/supabase/server'

export async function getReviewsForTool(toolId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('reviews')
    .select('*, profiles(username, avatar_url)')
    .eq('tool_id', toolId)
    .order('upvotes', { ascending: false })

  return data ?? []
}

export async function getUserReviews(userId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('reviews')
    .select('*, tools(name, slug, logo_url)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return data ?? []
}
