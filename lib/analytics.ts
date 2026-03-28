/**
 * Thin analytics wrapper.
 * All calls are no-ops if NEXT_PUBLIC_POSTHOG_KEY is not set.
 * Only call from client components.
 */

type EventProperties = Record<string, string | number | boolean | null | undefined>

function capture(event: string, properties?: EventProperties) {
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
  import('posthog-js').then(({ default: posthog }) => {
    posthog.capture(event, properties)
  })
}

export const analytics = {
  toolSaved(toolId: string, toolName: string) {
    capture('tool_saved', { tool_id: toolId, tool_name: toolName })
  },
  toolUnsaved(toolId: string, toolName: string) {
    capture('tool_unsaved', { tool_id: toolId, tool_name: toolName })
  },
  reviewSubmitted(toolId: string, rating: number) {
    capture('review_submitted', { tool_id: toolId, rating })
  },
  workflowGenerated(goal: string, stepCount: number) {
    capture('workflow_generated', { goal, step_count: stepCount })
  },
  workflowSaved(workflowId: string) {
    capture('workflow_saved', { workflow_id: workflowId })
  },
  recommendationRequested(useCase: string, budget: string, level: string) {
    capture('recommendation_requested', { use_case: useCase, budget, level })
  },
  comparisonViewed(toolSlugs: string[]) {
    capture('comparison_viewed', { tools: toolSlugs.join(','), count: toolSlugs.length })
  },
  aiChatMessage(intent: string) {
    capture('ai_chat_message', { intent })
  },
}
