import { createClient } from '@/lib/supabase/server'
import { fetchAllPages } from '@/lib/data/_pagination'
import type { Workflow, WorkflowStep } from '@/types'

export async function getWorkflows(limit = 12) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('workflows')
    .select('*, profiles(username, full_name, avatar_url)')
    .eq('is_published', true)
    .order('upvotes', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return data.map((w) => ({
    ...w,
    steps: (w.steps ?? []) as WorkflowStep[],
    profile: (w.profiles as unknown as Workflow['profile']) ?? undefined,
  })) as Workflow[]
}

export async function getWorkflowById(id: string): Promise<Workflow | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('workflows')
    .select('*, profiles(username, full_name, avatar_url)')
    .eq('id', id)
    .eq('is_published', true)
    .single()

  if (error || !data) return null

  return {
    ...data,
    steps: (data.steps ?? []) as WorkflowStep[],
    profile: (data.profiles as unknown as Workflow['profile']) ?? undefined,
  } as Workflow
}

export async function saveWorkflow(params: {
  title: string
  description: string
  goal: string
  steps: WorkflowStep[]
  userId: string
}): Promise<string | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('workflows')
    .insert({
      title: params.title,
      description: params.description,
      goal: params.goal,
      steps: params.steps,
      user_id: params.userId,
      is_ai_generated: true,
      is_published: true,
    })
    .select('id')
    .single()

  if (error || !data) return null
  return data.id
}

export async function hasVotedOnWorkflow(workflowId: string, userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('workflow_votes')
    .select('workflow_id')
    .eq('workflow_id', workflowId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

async function adjustWorkflowUpvotes(workflowId: string, delta: 1 | -1) {
  const supabase = await createClient()
  await supabase.rpc('adjust_counter', {
    target_table: 'workflows',
    target_id: workflowId,
    counter_field: 'upvotes',
    delta,
  })
}

export async function getAllWorkflowIds(): Promise<{ id: string; updated_at: string }[]> {
  const supabase = await createClient()
  return fetchAllPages<{ id: string; updated_at: string }>((from, to) =>
    supabase
      .from('workflows')
      .select('id, updated_at')
      .eq('is_published', true)
      .order('updated_at', { ascending: false })
      .range(from, to)
  )
}

export async function getWorkflowsForTool(toolSlug: string, limit = 4): Promise<Workflow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('workflows')
    .select('*, profiles(username, full_name, avatar_url)')
    .eq('is_published', true)
    .filter('steps', 'cs', JSON.stringify([{ tool_slug: toolSlug }]))
    .order('upvotes', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return data.map((w) => ({
    ...w,
    steps: (w.steps ?? []) as WorkflowStep[],
    profile: (w.profiles as unknown as Workflow['profile']) ?? undefined,
  })) as Workflow[]
}

export async function toggleWorkflowVote(workflowId: string, userId: string): Promise<boolean> {
  const supabase = await createClient()
  const voted = await hasVotedOnWorkflow(workflowId, userId)

  if (voted) {
    await supabase
      .from('workflow_votes')
      .delete()
      .eq('workflow_id', workflowId)
      .eq('user_id', userId)
    await adjustWorkflowUpvotes(workflowId, -1)
    return false
  } else {
    await supabase.from('workflow_votes').insert({ workflow_id: workflowId, user_id: userId })
    await adjustWorkflowUpvotes(workflowId, 1)
    return true
  }
}
