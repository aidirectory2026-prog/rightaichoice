/**
 * Thin analytics wrapper.
 * All calls are no-ops if NEXT_PUBLIC_POSTHOG_KEY is not set.
 * Only call from client components.
 *
 * RULE: Every tracked interaction goes through a method here — never call
 * posthog.capture() directly from a feature component. Keeps the event
 * schema auditable. See docs/marketing/10-tracking-implementation.md.
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
  // ──────────────────────────────────────────────────────────────
  // Tool interactions (core decision actions)
  // ──────────────────────────────────────────────────────────────
  toolSaved(toolId: string, toolName: string) {
    capture('tool_saved', { tool_id: toolId, tool_name: toolName })
  },
  toolUnsaved(toolId: string, toolName: string) {
    capture('tool_unsaved', { tool_id: toolId, tool_name: toolName })
  },
  toolPageViewed(toolId: string, toolSlug: string) {
    capture('tool_page_viewed', { tool_id: toolId, tool_slug: toolSlug })
  },
  toolVisitClicked(toolId: string, toolSlug: string, source: string) {
    // Fires on "Visit Website" button. The server-side /api/tools/[slug]/visit
    // handles the affiliate redirect + server log; this captures client-side
    // attribution (which page referred the click).
    capture('tool_visit_clicked', { tool_id: toolId, tool_slug: toolSlug, source })
  },

  // ──────────────────────────────────────────────────────────────
  // Compare flow
  // ──────────────────────────────────────────────────────────────
  comparisonViewed(toolSlugs: string[]) {
    capture('comparison_viewed', { tools: toolSlugs.join(','), count: toolSlugs.length })
  },
  compareToolAdded(toolSlug: string, trayCount: number) {
    capture('compare_tool_added', { tool_slug: toolSlug, tray_count: trayCount })
  },
  compareToolRemoved(toolSlug: string, trayCount: number) {
    capture('compare_tool_removed', { tool_slug: toolSlug, tray_count: trayCount })
  },
  compareShareClicked(toolSlugs: string[]) {
    capture('compare_share_clicked', { tools: toolSlugs.join(',') })
  },

  // ──────────────────────────────────────────────────────────────
  // Plan / Recommendation flow (/plan, /recommend)
  // ──────────────────────────────────────────────────────────────
  recommendationRequested(useCase: string, budget: string, level: string) {
    capture('recommendation_requested', { use_case: useCase, budget, level })
  },
  planStarted(source: string) {
    capture('plan_started', { source })
  },
  planStepCompleted(step: string, stepIndex: number) {
    capture('plan_step_completed', { step, step_index: stepIndex })
  },
  planCompleted(useCase: string, toolCount: number) {
    capture('plan_completed', { use_case: useCase, tool_count: toolCount })
  },
  planAbandoned(lastStep: string) {
    capture('plan_abandoned', { last_step: lastStep })
  },

  // ──────────────────────────────────────────────────────────────
  // Workflow builder
  // ──────────────────────────────────────────────────────────────
  workflowGenerated(goal: string, stepCount: number) {
    capture('workflow_generated', { goal, step_count: stepCount })
  },
  workflowSaved(workflowId: string) {
    capture('workflow_saved', { workflow_id: workflowId })
  },
  workflowShared(workflowId: string, channel: string) {
    capture('workflow_shared', { workflow_id: workflowId, channel })
  },
  workflowVoted(workflowId: string, direction: 'up' | 'down') {
    capture('workflow_voted', { workflow_id: workflowId, direction })
  },

  // ──────────────────────────────────────────────────────────────
  // Stacks
  // ──────────────────────────────────────────────────────────────
  stackViewed(stackSlug: string) {
    capture('stack_viewed', { stack_slug: stackSlug })
  },
  stackSaved(stackSlug: string) {
    capture('stack_saved', { stack_slug: stackSlug })
  },
  stackExported(stackSlug: string, format: string) {
    capture('stack_exported', { stack_slug: stackSlug, format })
  },

  // ──────────────────────────────────────────────────────────────
  // AI chat
  // ──────────────────────────────────────────────────────────────
  aiChatMessage(intent: string) {
    capture('ai_chat_message', { intent })
  },
  aiChatToolSuggested(toolSlug: string) {
    capture('ai_chat_tool_suggested', { tool_slug: toolSlug })
  },
  aiChatToolClicked(toolSlug: string) {
    capture('ai_chat_tool_clicked', { tool_slug: toolSlug })
  },

  // ──────────────────────────────────────────────────────────────
  // Reviews, Q&A, Community
  // ──────────────────────────────────────────────────────────────
  reviewSubmitted(toolId: string, rating: number) {
    capture('review_submitted', { tool_id: toolId, rating })
  },
  questionAsked(category: string) {
    capture('question_asked', { category })
  },
  questionAnswered(questionId: string) {
    capture('question_answered', { question_id: questionId })
  },
  discussionReplied(discussionId: string) {
    capture('discussion_replied', { discussion_id: discussionId })
  },

  // ──────────────────────────────────────────────────────────────
  // Auth funnel
  // ──────────────────────────────────────────────────────────────
  signupStarted(source: string) {
    capture('signup_started', { source })
  },
  signupCompleted(method: string) {
    capture('signup_completed', { method })
  },
  loginCompleted(method: string) {
    capture('login_completed', { method })
  },

  // ──────────────────────────────────────────────────────────────
  // Navigation & top-level CTAs
  // ──────────────────────────────────────────────────────────────
  navCtaClicked(cta: string, source: string) {
    // For persistent nav / header / footer CTAs. Use `cta` to identify which
    // ("plan_your_stack", "sign_up", "browse_tools") and `source` for context
    // ("navbar_desktop", "navbar_mobile", "footer").
    capture('nav_cta_clicked', { cta, source })
  },
  heroCtaClicked(cta: string, variant: string) {
    capture('hero_cta_clicked', { cta, variant })
  },

  // ──────────────────────────────────────────────────────────────
  // Content / Blog / SEO pages
  // ──────────────────────────────────────────────────────────────
  blogPostViewed(slug: string) {
    capture('blog_post_viewed', { slug })
  },
  blogInternalLinkClicked(fromSlug: string, toPath: string) {
    capture('blog_internal_link_clicked', { from_slug: fromSlug, to_path: toPath })
  },
  bestPageViewed(slug: string) {
    capture('best_page_viewed', { slug })
  },
  rolePageViewed(slug: string) {
    capture('role_page_viewed', { slug })
  },

  // ──────────────────────────────────────────────────────────────
  // Share & social
  // ──────────────────────────────────────────────────────────────
  shareClicked(entity: string, entityId: string, channel: string) {
    capture('share_clicked', { entity, entity_id: entityId, channel })
  },

  // ──────────────────────────────────────────────────────────────
  // Search
  // ──────────────────────────────────────────────────────────────
  searchQuerySubmitted(query: string, resultCount: number, source: string) {
    capture('search_query_submitted', {
      query: query.slice(0, 100),
      result_count: resultCount,
      source,
    })
  },
  searchResultClicked(query: string, toolSlug: string, position: number) {
    capture('search_result_clicked', {
      query: query.slice(0, 100),
      tool_slug: toolSlug,
      position,
    })
  },
}
