'use server'

import { createClient } from '@/lib/supabase/server'
import { saveWorkflow, toggleWorkflowVote } from '@/lib/data/workflows'
import type { WorkflowStep } from '@/types'
import { redirect } from 'next/navigation'

export async function saveWorkflowAction(params: {
  title: string
  description: string
  goal: string
  steps: WorkflowStep[]
}): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to save workflows.' }

  const id = await saveWorkflow({
    ...params,
    userId: user.id,
  })

  if (!id) return { error: 'Failed to save workflow. Please try again.' }
  return { id }
}

export async function voteOnWorkflowAction(workflowId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await toggleWorkflowVote(workflowId, user.id)
}
