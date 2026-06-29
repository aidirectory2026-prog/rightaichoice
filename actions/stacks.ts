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

  // Phase 10 #17 — the stages/summary blob is user-supplied and was inserted
  // raw; bound it so a multi-megabyte payload can't bloat the DB / public page.
  if (!Array.isArray(input.stages)) {
    return { error: 'Invalid stack data.' }
  }
  const stages = input.stages.slice(0, 20)
  const summary = input.summary && typeof input.summary === 'object' ? input.summary : null
  if (JSON.stringify({ stages, summary }).length > 100_000) {
    return { error: 'This stack is too large to save.' }
  }

  const title = input.title.slice(0, 200)
  const goal = input.goal.slice(0, 500)

  // BUG-27e: idempotent save. The auto-save-after-login effect + a manual click
  // (or a double-click / two tabs) can fire saveStack twice; without this each
  // call inserts a fresh row → duplicate stacks in the user's library. An exact
  // (user, title, goal, source) match is almost certainly the same stack, so
  // return the existing id instead of inserting again.
  const { data: existing } = await supabase
    .from('saved_stacks')
    .select('id')
    .eq('user_id', user.id)
    .eq('title', title)
    .eq('goal', goal)
    .eq('source', input.source)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (existing?.id) {
    return { success: 'Stack saved!', id: (existing as { id: string }).id }
  }

  const { data, error } = await supabase
    .from('saved_stacks')
    .insert({
      user_id: user.id,
      title,
      goal,
      description: input.description?.slice(0, 1000) || null,
      stages,
      summary,
      source: input.source,
      source_slug: input.sourceSlug?.slice(0, 200) || null,
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
  // Phase 10 #32 — do NOT fall back to `update({ view_count: 1 })`: that RESET
  // the counter to 1 on every call. A missed view bump is harmless; clobbering
  // the real count is not. Just log if the atomic RPC is unavailable.
  if (error) {
    console.warn('[incrementStackView] increment_counter failed:', error.message)
  }
}
