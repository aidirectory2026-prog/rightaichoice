'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type SaveStackInput = {
  title: string
  goal: string
  description?: string
  stages: unknown[]
  summary?: Record<string, unknown>
  source: 'planner' | 'curated' | 'custom'
  sourceSlug?: string
}

export async function saveStack(input: SaveStackInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to save a stack.' }
  }

  const { data, error } = await supabase
    .from('saved_stacks')
    .insert({
      user_id: user.id,
      title: input.title.slice(0, 200),
      goal: input.goal.slice(0, 500),
      description: input.description?.slice(0, 1000) || null,
      stages: input.stages,
      summary: input.summary || null,
      source: input.source,
      source_slug: input.sourceSlug || null,
    })
    .select('id')
    .single()

  if (error) {
    return { error: 'Failed to save stack. Please try again.' }
  }

  revalidatePath('/dashboard')
  return { success: 'Stack saved!', id: data.id }
}

export async function deleteStack(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in.' }
  }

  const { error } = await supabase
    .from('saved_stacks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: 'Failed to delete stack.' }
  }

  revalidatePath('/dashboard')
  return { success: 'Stack deleted.' }
}

export async function incrementStackView(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('increment_counter', {
    table_name: 'saved_stacks',
    column_name: 'view_count',
    row_id: id,
  })
  if (error) {
    // Fallback: direct update if RPC doesn't exist
    await supabase
      .from('saved_stacks')
      .update({ view_count: 1 })
      .eq('id', id)
  }
}
