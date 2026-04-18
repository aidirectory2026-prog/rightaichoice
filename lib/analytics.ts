/**
 * Thin analytics wrapper backed by Mixpanel.
 * All calls are no-ops if NEXT_PUBLIC_MIXPANEL_TOKEN is not set.
 * Only call from client components (server actions use lib/mixpanel-server.ts).
 *
 * RULE: Every tracked interaction goes through a method here — never call
 * mixpanel.track() directly from a feature component. Keeps the event
 * schema auditable. See docs/marketing/tracking-mechanisms-and-goals.md.
 */

type EventProperties = Record<string, string | number | boolean | null | undefined | string[]>

function capture(event: string, properties?: EventProperties) {
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) return
  import('mixpanel-browser').then(({ default: mixpanel }) => {
    mixpanel.track(event, properties)
  })
}

function identifyInternal(userId: string, traits?: EventProperties) {
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) return
  import('mixpanel-browser').then(({ default: mixpanel }) => {
    mixpanel.identify(userId)
    if (traits) mixpanel.people.set(traits)
  })
}

function registerSuperPropertiesInternal(props: EventProperties) {
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) return
  import('mixpanel-browser').then(({ default: mixpanel }) => {
    mixpanel.register(props)
  })
}

function setGroupInternal(groupKey: string, groupId: string, traits?: EventProperties) {
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) return
  import('mixpanel-browser').then(({ default: mixpanel }) => {
    mixpanel.set_group(groupKey, groupId)
    if (traits) mixpanel.get_group(groupKey, groupId).set(traits)
  })
}

function resetInternal() {
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) return
  import('mixpanel-browser').then(({ default: mixpanel }) => {
    mixpanel.reset()
  })
}

/**
 * Expose the Mixpanel distinct_id for linking to other tools (Sentry,
 * server-side tracking). Returns null until the SDK is initialized.
 */
export function getMixpanelDistinctId(): string | null {
  if (typeof window === 'undefined') return null
  if (!process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) return null
  try {
    const mp = (window as unknown as { mixpanel?: { get_distinct_id?: () => string } }).mixpanel
    return mp?.get_distinct_id?.() ?? null
  } catch {
    return null
  }
}

export const analytics = {
  // ──────────────────────────────────────────────────────────────
  // Identity + profile (must run on login/signup so anon → known is stitched)
  // ──────────────────────────────────────────────────────────────
  identify(
    userId: string,
    traits?: {
      email?: string
      plan?: string
      signup_source?: string
      signup_at?: string
      role?: string
    },
  ) {
    identifyInternal(userId, traits)
  },
  /**
   * Super properties are attached to every subsequent event. Use this for
   * user-scoped slices you'll always break down by: plan, role, experiment.
   */
  registerSuperProperties(props: {
    user_plan?: string
    user_role?: string
    is_admin?: boolean
    experiment_bucket?: string
  }) {
    registerSuperPropertiesInternal(props as EventProperties)
  },
  /**
   * Group Analytics — Mixpanel free tier allows one group key. We use
   * "user_plan" so charts can be sliced by Free / Pro / etc.
   */
  setPlanGroup(plan: string, traits?: { seats?: number; started_at?: string }) {
    setGroupInternal('user_plan', plan, traits as EventProperties | undefined)
  },
  reset() {
    resetInternal()
  },

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
    // Fires on "Visit Website" button. Server-side route /api/tools/[slug]/visit
    // handles the affiliate redirect + server log; this captures the client-side
    // attribution (which page referred the click). Paired server event is
    // "tool_visit_clicked_server" from lib/mixpanel-server.ts — revenue-critical
    // events fire both client + server so ad-blockers can't kill them.
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
  planMatchTier(stageId: string, tier: 'keyword' | 'category_fallback' | 'emergency') {
    capture('plan_match_tier', { stage_id: stageId, tier })
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
  /** Fires when search returns zero results — content-gap detector. */
  searchNoResults(query: string, source: string) {
    capture('search_no_results', { query: query.slice(0, 100), source })
  },

  // ──────────────────────────────────────────────────────────────
  // Discovery / browse
  // ──────────────────────────────────────────────────────────────
  filterApplied(filterType: string, value: string, source: string) {
    capture('filter_applied', { filter_type: filterType, value, source })
  },
  /** Fires when applied filter set returns zero tools — inventory gap. */
  filterNoResults(filters: string, source: string) {
    capture('filter_no_results', { filters, source })
  },
  categoryViewed(slug: string) {
    capture('category_viewed', { slug })
  },
  collectionViewed(slug: string) {
    capture('collection_viewed', { slug })
  },

  // ──────────────────────────────────────────────────────────────
  // Strategic / high-level events (activation, monetization, discovery)
  // ──────────────────────────────────────────────────────────────
  activationMilestone(milestone: string, value?: number) {
    // e.g. "first_tool_saved", "three_tools_compared", "first_plan_completed"
    // North-star activation signal — fires once per milestone per user.
    capture('activation_milestone', { milestone, value })
  },
  onboardingStepCompleted(step: string, stepIndex: number) {
    capture('onboarding_step_completed', { step, step_index: stepIndex })
  },
  onboardingCompleted(path: string) {
    capture('onboarding_completed', { path })
  },
  pricingViewed(source: string) {
    capture('pricing_viewed', { source })
  },
  upgradeClicked(plan: string, source: string) {
    capture('upgrade_clicked', { plan, source })
  },
  emptySearch(query: string, source: string) {
    capture('empty_search', { query: query.slice(0, 100), source })
  },
  scrollDepthReached(path: string, depth: 25 | 50 | 75 | 100) {
    capture('scroll_depth_reached', { path, depth })
  },
  /**
   * Time-on-page beacon. Fire once on unmount/pagehide with bucketed seconds.
   * Useful for content-quality grading alongside scroll_depth_reached.
   */
  timeOnPage(path: string, seconds: number) {
    const bucket =
      seconds < 5 ? '<5s' : seconds < 15 ? '5-15s' : seconds < 30 ? '15-30s' : seconds < 60 ? '30-60s' : seconds < 180 ? '1-3min' : '>3min'
    capture('time_on_page', { path, seconds: Math.floor(seconds), bucket })
  },
  newsletterSubscribed(source: string) {
    capture('newsletter_subscribed', { source })
  },
  externalLinkClicked(url: string, entity: string, entityId: string) {
    capture('external_link_clicked', { url, entity, entity_id: entityId })
  },
  errorEncountered(boundary: string, message: string) {
    capture('error_encountered', { boundary, message: message.slice(0, 200) })
  },
  /** Generic client-side perf marker — e.g. "ai_chat_first_token", "plan_llm_response". */
  perfMark(marker: string, duration_ms: number, context?: string) {
    capture('perf_mark', { marker, duration_ms, context: context ?? '' })
  },
}
