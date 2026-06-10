/**
 * Thin analytics wrapper backed by Mixpanel.
 * All calls are no-ops if NEXT_PUBLIC_MIXPANEL_TOKEN is not set.
 * Only call from client components (server actions use lib/mixpanel-server.ts).
 *
 * RULE: Every tracked interaction goes through a method here — never call
 * mixpanel.track() directly from a feature component. Keeps the event
 * schema auditable. See docs/marketing/tracking-mechanisms-and-goals.md.
 */

// Phase 8.g.2 — widened to accept nested objects (Mixpanel stores them as JSON)
// for events like `recommendation_step_completed` that ship `all_values_so_far`.
type EventPropertyValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | string[]
  | number[]
  | Record<string, string | number | boolean | null>
type EventProperties = Record<string, EventPropertyValue>

// ── Phase 8.h — Supabase mirror batching ─────────────────────────
// Every event captured client-side is also POSTed to /api/track-mirror in
// batches so it lands in public.user_events + drives the per-user behavioural
// profile (public.user_intent_profile). Mirror is fire-and-forget: never
// blocks Mixpanel send, never throws if the endpoint is down.
//
// Batching: events queue in-memory, flush every MIRROR_FLUSH_MS or on
// pagehide (whichever first). sendBeacon used for unload so the last events
// make it even when the page is closing.

type MirrorEvent = {
  event_name: string
  distinct_id: string
  user_id?: string | null
  auth_state?: 'anon' | 'known'
  properties?: Record<string, unknown>
  page_path?: string
  referrer?: string
  device_type?: 'mobile' | 'tablet' | 'desktop'
  first_touch_utm_source?: string
  first_touch_referrer?: string
  first_touch_landing?: string
  insert_id?: string
  client_time_ms?: number
}

const MIRROR_QUEUE: MirrorEvent[] = []
const MIRROR_MAX_QUEUE = 100
const MIRROR_FLUSH_MS = 8_000
// Phase 9 follow-up (2026-05-28) — sessionStorage holding pen for events
// that failed to mirror (Supabase down, 5xx, network error). Replayed on
// the next successful flush so a temporary outage doesn't silently drop
// page_viewed events on the floor. Cap = 500 events + 24h age so a long
// outage doesn't replay stale stuff forever.
const MIRROR_RETRY_KEY = 'mirror_retry_queue_v1'
const MIRROR_RETRY_MAX = 500
const MIRROR_RETRY_MAX_AGE_MS = 24 * 60 * 60 * 1000
let mirrorFlushTimer: ReturnType<typeof setTimeout> | null = null
let mirrorUnloadHooked = false

function loadRetryQueue(): MirrorEvent[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(MIRROR_RETRY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as MirrorEvent[]
    if (!Array.isArray(parsed)) return []
    // Drop events older than 24h so a long outage doesn't replay stale data.
    const cutoff = Date.now() - MIRROR_RETRY_MAX_AGE_MS
    return parsed.filter((e) => !e.client_time_ms || e.client_time_ms >= cutoff)
  } catch {
    return []
  }
}

function saveRetryQueue(events: MirrorEvent[]): void {
  if (typeof window === 'undefined') return
  try {
    // Keep only the most recent MIRROR_RETRY_MAX events — under heavy load
    // we'd rather lose the oldest than blow up sessionStorage quota.
    const tail = events.length > MIRROR_RETRY_MAX
      ? events.slice(events.length - MIRROR_RETRY_MAX)
      : events
    sessionStorage.setItem(MIRROR_RETRY_KEY, JSON.stringify(tail))
  } catch {
    /* quota or private mode — drop silently */
  }
}

function clearRetryQueue(): void {
  if (typeof window === 'undefined') return
  try { sessionStorage.removeItem(MIRROR_RETRY_KEY) } catch { /* ignore */ }
}

function mirrorEnqueue(ev: MirrorEvent) {
  if (typeof window === 'undefined') return
  MIRROR_QUEUE.push(ev)
  if (MIRROR_QUEUE.length >= MIRROR_MAX_QUEUE) {
    void mirrorFlush()
    return
  }
  if (!mirrorFlushTimer) {
    mirrorFlushTimer = setTimeout(() => {
      mirrorFlushTimer = null
      void mirrorFlush()
    }, MIRROR_FLUSH_MS)
  }
  if (!mirrorUnloadHooked) {
    mirrorUnloadHooked = true
    // pagehide fires more reliably than beforeunload on mobile Safari and
    // works during BFCache restore — last events get flushed via sendBeacon.
    window.addEventListener('pagehide', () => {
      const events = MIRROR_QUEUE.splice(0)
      if (events.length === 0) return
      try {
        const blob = new Blob([JSON.stringify({ events })], { type: 'application/json' })
        navigator.sendBeacon('/api/track-mirror', blob)
      } catch {
        // Swallow — never break unload.
      }
    })
  }
}

async function mirrorFlush() {
  // Drain any events left over from a previous failed flush (Supabase
  // outage, 5xx, network error). They go first so chronology is preserved.
  const retryEvents = loadRetryQueue()
  const liveEvents = MIRROR_QUEUE.splice(0)
  const events = retryEvents.concat(liveEvents)
  if (events.length === 0) return
  let ok = false
  try {
    const res = await fetch('/api/track-mirror', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({ events }),
    })
    ok = res.ok
  } catch {
    ok = false
  }
  if (ok) {
    // Success — clear the holding pen so we don't double-send next flush.
    clearRetryQueue()
  } else {
    // Failure (5xx, network drop, Supabase blip). Persist everything we
    // tried so the NEXT successful flush replays them. Without this, a
    // Supabase outage silently drops every event on the floor (which is
    // exactly what happened on 2026-05-28 during a ~7-hour incident).
    saveRetryQueue(events)
  }
}

// Pull super-prop snapshot from mixpanel-browser so each mirrored event
// carries the same context Mixpanel has. Lazy — only on flush, not on every
// enqueue, so we don't import mixpanel-browser repeatedly.
async function mirrorContext(eventName: string, properties?: EventProperties): Promise<MirrorEvent | null> {
  if (typeof window === 'undefined') return null
  const mod = await import('mixpanel-browser').catch(() => null)
  if (!mod) return null
  const mp = mod.default
  let distinctId: string
  let propsSnapshot: Record<string, unknown> = {}
  try {
    distinctId = mp.get_distinct_id() as string
    // get_property reaches into the persisted super-props store.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyMp = mp as any
    propsSnapshot = {
      auth_state: anyMp.get_property?.('auth_state'),
      device_type: anyMp.get_property?.('device_type'),
      page_path: anyMp.get_property?.('page_path'),
      first_touch_utm_source: anyMp.get_property?.('first_touch_utm_source'),
      first_touch_referrer: anyMp.get_property?.('first_touch_referrer'),
      first_touch_landing: anyMp.get_property?.('first_touch_landing'),
      // Phase 8.g.10 — Clarity session id registered as a super-prop by
      // ClarityProvider once the Clarity SDK boots. Folded into properties
      // below so /api/track-mirror can lift it to its own column.
      clarity_session_id: anyMp.get_property?.('clarity_session_id'),
    }
  } catch {
    return null
  }
  // Merge clarity_session_id into the outgoing properties so the mirror
  // endpoint sees it on every event.
  const mergedProps: Record<string, unknown> = { ...(properties ?? {}) }
  if (typeof propsSnapshot.clarity_session_id === 'string' && propsSnapshot.clarity_session_id.length > 0) {
    mergedProps.clarity_session_id = propsSnapshot.clarity_session_id
  }
  return {
    event_name: eventName,
    distinct_id: distinctId,
    auth_state: (propsSnapshot.auth_state as 'anon' | 'known' | undefined) ?? 'anon',
    device_type: propsSnapshot.device_type as 'mobile' | 'tablet' | 'desktop' | undefined,
    page_path: propsSnapshot.page_path as string | undefined,
    first_touch_utm_source: propsSnapshot.first_touch_utm_source as string | undefined,
    first_touch_referrer: propsSnapshot.first_touch_referrer as string | undefined,
    first_touch_landing: propsSnapshot.first_touch_landing as string | undefined,
    referrer: typeof document !== 'undefined' ? document.referrer : undefined,
    properties: mergedProps,
    insert_id: typeof crypto !== 'undefined' ? crypto.randomUUID() : undefined,
    client_time_ms: Date.now(),
  }
}

function capture(event: string, properties?: EventProperties) {
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) return
  import('mixpanel-browser').then(({ default: mixpanel }) => {
    mixpanel.track(event, properties)
  })
  // Phase 8.h — also mirror to our own Supabase backend so data is queryable
  // via SQL (Mixpanel free tier blocks the Query API). Fire-and-forget —
  // never blocks the Mixpanel send, never throws.
  void mirrorContext(event, properties).then((ev) => {
    if (ev) mirrorEnqueue(ev)
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
    // Privacy: never send the raw email address to Mixpanel. Reduce it to the
    // domain only, matching the site-wide email_domain-only policy enforced in
    // track-mirror and the keystroke PII scrub. (Phase 10 #25)
    let safeTraits: EventProperties | undefined = traits
    if (traits && 'email' in traits) {
      const { email, ...rest } = traits
      safeTraits = { ...rest }
      if (typeof email === 'string' && email.includes('@')) {
        safeTraits.email_domain = email.split('@')[1]
      }
    }
    identifyInternal(userId, safeTraits)
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
    // Phase 8.g.1 — auth_state flips to 'known' on identify, back to 'anon'
    // on reset. Every event then splits logged-in vs anonymous without joins.
    auth_state?: 'anon' | 'known'
    // page_path super-prop is updated by MixpanelProvider on every route
    // change — listed here for type-safety when callers want to override.
    page_path?: string
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

  // Generic page view — fires on every route change from MixpanelProvider.
  // Goes through capture() so it dual-writes to Mixpanel + user_events mirror.
  pageViewed(path: string, url: string, referrer: string) {
    capture('page_viewed', { path, url, referrer })
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
  // Phase 9 — Market Sentiment Checker (client half; server half in
  // lib/mixpanel-server.ts serverAnalytics.sentimentEvent). capture()
  // dual-writes to Mixpanel + the user_events mirror → /admin/sentiment.
  // ──────────────────────────────────────────────────────────────
  sentimentCardViewed(toolSlug: string) {
    capture('sentiment_card_viewed', { tool_slug: toolSlug })
  },
  sentimentScanStarted(toolSlug: string, chargeType: string) {
    capture('sentiment_scan_started', { tool_slug: toolSlug, charge_type: chargeType })
  },
  sentimentResultViewed(toolSlug: string, sentimentScore: string, source: 'fresh' | 'cached') {
    capture('sentiment_result_viewed', { tool_slug: toolSlug, sentiment_score: sentimentScore, result_source: source })
  },
  sentimentPayClicked(toolSlug: string, gateway: string) {
    capture('sentiment_pay_clicked', { tool_slug: toolSlug, gateway })
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
  planPerf(timings: Record<string, number>) {
    capture('plan_perf', timings)
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
  // Phase 9 — Global Plan CTA + signup-gate funnel
  // ──────────────────────────────────────────────────────────────
  // 9.A.1 #12 — impression surfaces must MATCH the click surfaces, otherwise
  // CTR (clicks/impressions) for navbar/homepage/plan_page reads as ∞/0%.
  /** Fires when a plan CTA becomes visible (scroll-into-view or mount). */
  planCtaImpression(props: { surface: 'sticky_bar' | 'inline_card' | 'navbar' | 'homepage' | 'plan_page'; page_path: string }) {
    capture('plan_cta_impression', { surface: props.surface, page_path: props.page_path })
  },
  /** Fires when the user clicks the CTA button (before any signup gate). */
  planCtaClicked(props: { surface: 'sticky_bar' | 'inline_card' | 'navbar' | 'homepage' | 'plan_page'; page_path: string }) {
    capture('plan_cta_clicked', { surface: props.surface, page_path: props.page_path })
  },
  /** Fires when the user dismisses (×) the sticky bar. */
  planCtaDismissed(props: { surface: 'sticky_bar' | 'inline_card'; page_path: string }) {
    capture('plan_cta_dismissed', { surface: props.surface, page_path: props.page_path })
  },
  /** Fires when the OAuth signup modal opens. */
  planSignupModalShown(props: { source_surface: string; typed_goal_char_count: number }) {
    capture('plan_signup_modal_shown', {
      source_surface: props.source_surface,
      typed_goal_char_count: props.typed_goal_char_count,
    })
  },
  /** Fires when the user clicks a provider button in the modal. */
  planSignupModalOAuthClicked(props: { provider: 'google' | 'linkedin' }) {
    capture('plan_signup_modal_oauth_clicked', { provider: props.provider })
  },
  /** Fires when the user clicks "Skip & continue" in the modal. */
  planSignupModalSkipped(props: { typed_goal_char_count: number }) {
    capture('plan_signup_modal_skipped', { typed_goal_char_count: props.typed_goal_char_count })
  },
  /** Fires when the post-OAuth identify call completes (was_anon_to_known). */
  planSignupModalCompleted(props: { provider: 'google' | 'linkedin'; was_anon_to_known: boolean }) {
    capture('plan_signup_modal_completed', {
      provider: props.provider,
      was_anon_to_known: props.was_anon_to_known,
    })
  },
  /** Server-side mirror — fires after a POST /api/plan/intent insert succeeds. */
  planIntentPersisted(props: { source_surface: string; char_count: number }) {
    capture('plan_intent_persisted', {
      source_surface: props.source_surface,
      char_count: props.char_count,
    })
  },
  /** Fires after the anon→user_id stitch UPDATE on plan_intents completes. */
  planIntentLinkedToUser(props: { user_id: string; count_linked: number }) {
    capture('plan_intent_linked_to_user', {
      user_id: props.user_id,
      count_linked: props.count_linked,
    })
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

  // ── Phase 8.g.2 — MAX-CAPTURE EVENTS ────────────────────────────
  // Driving principle: capture the actual VALUE the user entered, not just
  // "they completed a step." Every event carries enough context to be
  // joinable into per-user behavioural profiles (the vendor-data artifact).

  // ── Tool-page rich interactions ─────────────────────────────────
  toolTabSwitched(toolSlug: string, tab: string, source: string, timeOnPreviousTabMs?: number) {
    capture('tool_tab_switched', { tool_slug: toolSlug, tab, source, time_on_previous_tab_ms: timeOnPreviousTabMs ?? 0 })
  },
  toolFaqOpened(toolSlug: string, questionIndex: number, questionText: string) {
    capture('tool_faq_opened', { tool_slug: toolSlug, question_index: questionIndex, question_text: questionText.slice(0, 200) })
  },
  toolPricingTierHovered(toolSlug: string, tierName: string, tierPrice: string, position: number) {
    capture('tool_pricing_tier_hovered', { tool_slug: toolSlug, tier_name: tierName, tier_price: tierPrice, position })
  },
  toolAlternativeClicked(toolSlug: string, alternativeSlug: string, position: number) {
    capture('tool_alternative_clicked', { tool_slug: toolSlug, alternative_slug: alternativeSlug, position })
  },
  toolShowMoreAlternatives(toolSlug: string, currentCount: number) {
    capture('tool_show_more_alternatives', { tool_slug: toolSlug, current_count: currentCount })
  },
  toolIntegrationLinkClicked(toolSlug: string, integrationName: string, integrationTargetUrl: string) {
    capture('tool_integration_link_clicked', { tool_slug: toolSlug, integration_name: integrationName, integration_target_url: integrationTargetUrl })
  },
  toolScreenshotOpened(toolSlug: string, index: number) {
    capture('tool_screenshot_opened', { tool_slug: toolSlug, index })
  },
  toolShareClicked(toolSlug: string, channel: string) {
    capture('tool_share_clicked', { tool_slug: toolSlug, channel })
  },
  viabilityBadgeClicked(toolSlug: string, badge: 'safe_bet' | 'at_risk' | 'rising') {
    capture('viability_badge_clicked', { tool_slug: toolSlug, badge })
  },
  viabilityPageViewed(slug: string, pageType: 'index' | 'at_risk' | 'safe_bets') {
    capture('viability_page_viewed', { slug, page_type: pageType })
  },

  // ── Plan flow — every input value captured ───────────────────────
  planIntakeSubmitted(props: {
    skill_level: string
    budget: string
    team_size: string
    industry: string
    goal_type: string
    goal_text: string
    existing_tools: string[]
    existing_tools_matched_slugs?: string[]
    existing_tools_unmatched?: string[]
    time_to_complete_intake_ms: number
    source: string
  }) {
    capture('plan_intake_submitted', {
      skill_level: props.skill_level,
      budget: props.budget,
      team_size: props.team_size,
      industry: props.industry,
      goal_type: props.goal_type,
      goal_text: props.goal_text.slice(0, 500),
      goal_text_word_count: props.goal_text.split(/\s+/).filter(Boolean).length,
      existing_tools: props.existing_tools.slice(0, 25),
      existing_tools_count: props.existing_tools.length,
      existing_tools_matched_slugs: (props.existing_tools_matched_slugs ?? []).slice(0, 25),
      existing_tools_unmatched: (props.existing_tools_unmatched ?? []).slice(0, 25),
      time_to_complete_intake_ms: props.time_to_complete_intake_ms,
      source: props.source,
    })
    // People-property union — accumulate tools/intent across sessions.
    peopleUnion({
      existing_tools_history: props.existing_tools.slice(0, 25),
      plan_use_cases_submitted: [props.goal_text.slice(0, 200)].filter(Boolean),
    })
    peopleSet({
      plan_budget_segment: props.budget,
      plan_team_segment: props.team_size,
      plan_industry_segment: props.industry,
      plan_skill_segment: props.skill_level,
    })
  },
  planChipSelected(props: {
    step: string
    step_index: number
    chip_value: string
    chip_label: string
    chip_index: number
    multi_select_count: number
    all_selected_values: string[]
    time_to_select_ms: number
  }) {
    capture('plan_chip_selected', { ...props })
  },
  planExistingToolAdded(props: {
    tool_name: string
    matched_tool_slug?: string | null
    matched_tool_id?: string | null
    total_count: number
    source: 'autocomplete' | 'free_text' | 'pasted'
    time_to_add_ms?: number
  }) {
    capture('plan_existing_tool_added', { ...props })
    peopleUnion({ existing_tools_history: [props.tool_name] })
  },
  planExistingToolRemoved(toolName: string, matchedToolSlug: string | null, totalCount: number) {
    capture('plan_existing_tool_removed', { tool_name: toolName, matched_tool_slug: matchedToolSlug, total_count: totalCount })
  },
  planGoalTextChanged(currentLength: number, currentWordCount: number, isFirstInput: boolean) {
    capture('plan_goal_text_changed', { current_length: currentLength, current_word_count: currentWordCount, is_first_input: isFirstInput })
  },
  planGoalTextSubmitted(text: string, editedCount: number) {
    const truncated = text.length > 500
    capture('plan_goal_text_submitted', {
      text: text.slice(0, 500),
      full_length: text.length,
      word_count: text.split(/\s+/).filter(Boolean).length,
      edited_count: editedCount,
      truncated,
    })
  },
  planResultsDisplayed(props: {
    recommended_tool_slugs: string[]
    recommended_tool_ids?: string[]
    stages_count: number
    total_estimated_cost_usd_per_month?: number
    use_case: string
    matches_existing_tools?: string[]
    replaces_existing_tools?: string[]
    source_intake_id?: string
  }) {
    capture('plan_results_displayed', {
      recommended_tool_slugs: props.recommended_tool_slugs.slice(0, 30),
      recommended_tool_ids: (props.recommended_tool_ids ?? []).slice(0, 30),
      recommendation_count: props.recommended_tool_slugs.length,
      stages_count: props.stages_count,
      total_estimated_cost_usd_per_month: props.total_estimated_cost_usd_per_month ?? 0,
      use_case: props.use_case.slice(0, 200),
      matches_existing_tools: (props.matches_existing_tools ?? []).slice(0, 15),
      replaces_existing_tools: (props.replaces_existing_tools ?? []).slice(0, 15),
      source_intake_id: props.source_intake_id ?? '',
    })
  },
  planResultsToolClicked(props: {
    tool_slug: string
    tool_id?: string
    position: number
    recommendation_tier: 'top' | 'alt' | 'budget'
    stage_id?: string
    user_intake_use_case?: string
    user_intake_skill?: string
    user_intake_budget?: string
    user_intake_team?: string
    total_recommended_count: number
  }) {
    capture('plan_results_tool_clicked', { ...props })
  },
  planResultsToolSaved(toolSlug: string, position: number) {
    capture('plan_results_tool_saved', { tool_slug: toolSlug, position })
  },
  planResultsShared(planId: string, channel: string) {
    capture('plan_results_shared', { plan_id: planId, channel })
  },
  planStepBack(fromStep: string, toStep: string, timeOnStepMs: number, fieldsFilledInFromStep: number) {
    capture('plan_step_back', { from_step: fromStep, to_step: toStep, time_on_step_ms: timeOnStepMs, fields_filled_in_from_step: fieldsFilledInFromStep })
  },

  // ── Recommend wizard — every input ──────────────────────────────
  recommendationStepCompleted(step: 'use_case' | 'budget' | 'skill_level', value: string, allValuesSoFar: Record<string, string>, timeOnStepMs: number) {
    capture('recommendation_step_completed', { step, value, all_values_so_far: allValuesSoFar, time_on_step_ms: timeOnStepMs })
  },
  recommendationResultClicked(toolSlug: string, position: number, useCase: string, budget: string, skillLevel: string) {
    capture('recommendation_result_clicked', { tool_slug: toolSlug, position, use_case: useCase, budget, skill_level: skillLevel })
  },

  // ── Search progression ─────────────────────────────────────────
  searchTyping(currentQuery: string, source: string) {
    capture('search_typing', { current_query: currentQuery.slice(0, 200), current_length: currentQuery.length, source })
  },

  // ── Phase 8.g.11.b — universal field-keystroke capture ──────────
  // Driven by lib/hooks/use-debounced-text-tracking.ts. Six variants so
  // each surface has a stable event_name in the schema, even though they
  // all carry the same payload shape.
  fieldTextChanged(payload: {
    event_name: 'search_query_typed' | 'plan_goal_typed' | 'plan_free_text_typed' | 'profile_field_typed' | 'newsletter_email_typed' | 'compare_search_typed'
    field_id: string
    char_count: number
    word_count: number
    current_text?: string
    final_blur?: boolean
  }) {
    capture(payload.event_name, {
      field_id: payload.field_id,
      char_count: payload.char_count,
      word_count: payload.word_count,
      ...(payload.current_text !== undefined ? { current_text: payload.current_text } : {}),
      ...(payload.final_blur ? { final_blur: true } : {}),
    })
  },
  searchResultClickedRich(props: {
    query: string
    tool_slug: string
    tool_id?: string
    position: number
    total_results: number
    page_number?: number
  }) {
    capture('search_result_clicked', {
      query: props.query.slice(0, 100),
      tool_slug: props.tool_slug,
      tool_id: props.tool_id ?? '',
      position: props.position,
      total_results: props.total_results,
      page_number: props.page_number ?? 1,
    })
    peopleUnion({ all_search_queries_recent: [props.query.slice(0, 100)] })
  },

  // ── AI chat — every prompt + every tool mention ─────────────────
  aiChatMessageRich(props: {
    intent?: string | null
    message_text: string
    mentioned_tool_slugs?: string[]
    conversation_turn: number
    is_follow_up: boolean
  }) {
    capture('ai_chat_message', {
      intent: props.intent ?? null,
      message_text: props.message_text.slice(0, 500),
      message_length: props.message_text.length,
      message_word_count: props.message_text.split(/\s+/).filter(Boolean).length,
      mentioned_tool_slugs: (props.mentioned_tool_slugs ?? []).slice(0, 20),
      conversation_turn: props.conversation_turn,
      is_follow_up: props.is_follow_up,
    })
    if (props.mentioned_tool_slugs?.length) {
      peopleUnion({ ai_chat_tools_mentioned: props.mentioned_tool_slugs })
    }
  },
  aiChatResponseReceived(toolCountSuggested: number, suggestedToolSlugs: string[], responseLength: number, latencyMs: number) {
    capture('ai_chat_response_received', {
      tool_count_suggested: toolCountSuggested,
      suggested_tool_slugs: suggestedToolSlugs.slice(0, 20),
      response_length: responseLength,
      latency_ms: latencyMs,
    })
  },
  aiChatToolClickedRich(toolSlug: string, positionInResponse: number, userMessageText: string, conversationTurn: number) {
    capture('ai_chat_tool_clicked', {
      tool_slug: toolSlug,
      position_in_response: positionInResponse,
      user_message_text: userMessageText.slice(0, 300),
      conversation_turn: conversationTurn,
    })
  },

  // ── Review form — full text captured ────────────────────────────
  reviewFormOpened(toolId: string, toolSlug: string, source: string) {
    capture('review_form_opened', { tool_id: toolId, tool_slug: toolSlug, source })
  },
  reviewRatingSet(toolId: string, rating: number, timeToRateMs: number) {
    capture('review_rating_set', { tool_id: toolId, rating, time_to_rate_ms: timeToRateMs })
  },
  reviewTextChanged(toolId: string, length: number, wordCount: number) {
    capture('review_text_changed', { tool_id: toolId, length, word_count: wordCount })
  },
  reviewSubmittedRich(props: {
    tool_id: string
    tool_slug: string
    rating: number
    text: string
    pros_text?: string | null
    cons_text?: string | null
    recommended?: boolean
    use_case_tag?: string | null
    time_to_submit_ms: number
  }) {
    capture('review_submitted', {
      tool_id: props.tool_id,
      tool_slug: props.tool_slug,
      rating: props.rating,
      text: props.text.slice(0, 1000),
      text_length: props.text.length,
      word_count: props.text.split(/\s+/).filter(Boolean).length,
      pros_text: (props.pros_text ?? '').slice(0, 500),
      cons_text: (props.cons_text ?? '').slice(0, 500),
      has_pros: !!props.pros_text,
      has_cons: !!props.cons_text,
      recommended: props.recommended ?? false,
      use_case_tag: props.use_case_tag ?? '',
      time_to_submit_ms: props.time_to_submit_ms,
    })
    peopleUnion({ reviews_submitted_for: [props.tool_slug] })
  },

  // ── Newsletter — segment signal via email_domain ────────────────
  newsletterSubscribedRich(source: string, emailDomain: string, pagePath: string, toolSlugContext?: string | null) {
    capture('newsletter_subscribed', {
      source,
      email_domain: emailDomain,
      page_path_at_subscribe: pagePath,
      tool_slug_context: toolSlugContext ?? '',
    })
    peopleSet({ newsletter_subscribed: true })
  },

  // ── Sign-up — pre-auth email-domain capture ─────────────────────
  signupEmailEntered(emailDomain: string, methodIntent: 'email' | 'google' | 'github', source: string) {
    capture('signup_email_entered', { email_domain: emailDomain, method_intent: methodIntent, source })
  },
  signupMethodSelected(method: 'email' | 'google' | 'github', source: string) {
    capture('signup_method_selected', { method, source })
  },

  // ── Compare — full state captured ───────────────────────────────
  compareToolAddedRich(toolSlug: string, source: string, trayCountBefore: number, allToolsInTray: string[], addedFromToolPage: boolean) {
    capture('compare_tool_added', {
      tool_slug: toolSlug,
      source,
      tray_count_before: trayCountBefore,
      tray_count_after: trayCountBefore + 1,
      all_tools_in_tray: allToolsInTray,
      added_from_tool_page: addedFromToolPage,
    })
  },
  comparisonViewedRich(toolSlugs: string[], isEditorialCompare: boolean, compareSlug: string | null, categoriesRepresented: string[]) {
    capture('comparison_viewed', {
      tools: toolSlugs,
      tools_count: toolSlugs.length,
      is_editorial_compare: isEditorialCompare,
      compare_slug: compareSlug ?? '',
      categories_represented: categoriesRepresented.slice(0, 10),
    })
    if (toolSlugs.length >= 2) {
      const pair = [...toolSlugs].sort().join('-vs-')
      peopleUnion({ tools_compared_with: [pair] })
    }
  },
  compareAttributeRowExpanded(attributeName: string, tools: string[], expandedValue?: string) {
    capture('compare_attribute_row_expanded', {
      attribute_name: attributeName,
      tools,
      expanded_value: (expandedValue ?? '').slice(0, 200),
    })
  },
  compareTrayOpened(trayCount: number) {
    capture('compare_tray_opened', { tray_count: trayCount })
  },
  compareCsvExported(toolSlugs: string[]) {
    capture('compare_csv_exported', { tools: toolSlugs, count: toolSlugs.length })
  },

  // ── Saved stacks — capture full contents ────────────────────────
  stackSavedRich(props: {
    stack_slug?: string | null
    stack_name: string
    tool_slugs: string[]
    tool_ids?: string[]
    total_estimated_cost_usd?: number
    source: 'plan_flow' | 'manual_builder' | 'compare_page'
  }) {
    capture('stack_saved', {
      stack_slug: props.stack_slug ?? '',
      stack_name: props.stack_name.slice(0, 200),
      tool_slugs: props.tool_slugs.slice(0, 50),
      tool_ids: (props.tool_ids ?? []).slice(0, 50),
      tool_count: props.tool_slugs.length,
      total_estimated_cost_usd: props.total_estimated_cost_usd ?? 0,
      source: props.source,
    })
  },

  // ── Dashboard / Profile / Saved ─────────────────────────────────
  dashboardViewed(hasSaves: boolean, savesCount: number, hasPlans: boolean) {
    capture('dashboard_viewed', { has_saves: hasSaves, saves_count: savesCount, has_plans: hasPlans })
  },
  dashboardWidgetClicked(widgetId: string) {
    capture('dashboard_widget_clicked', { widget_id: widgetId })
  },
  savedListViewed(count: number) {
    capture('saved_list_viewed', { count })
  },
  savedListFiltered(filterType: string, value: string) {
    capture('saved_list_filtered', { filter_type: filterType, value })
  },
  savedToolRemovedFromList(toolSlug: string, position: number) {
    capture('saved_tool_removed_from_list', { tool_slug: toolSlug, position })
  },
  profileViewed(username: string, isOwnProfile: boolean) {
    capture('profile_viewed', { username, is_own_profile: isOwnProfile })
  },
  profileToolClicked(profileUsername: string, toolSlug: string, position: number) {
    capture('profile_tool_clicked', { profile_username: profileUsername, tool_slug: toolSlug, position })
  },

  // ── Auth (forgot/reset password — server too) ───────────────────
  passwordResetRequested(method: 'email') {
    capture('password_reset_requested', { method })
  },
  passwordResetCompleted(method: 'email') {
    capture('password_reset_completed', { method })
  },

  // ── Catch-all form events (covers anything not specifically wired) ──
  formFieldChanged(props: { form_id: string; field_name: string; field_type: 'text' | 'select' | 'checkbox' | 'textarea'; has_value: boolean; value_length: number; page_path: string }) {
    capture('form_field_changed', { ...props })
  },
  formSubmitted(formId: string, allFieldNamesFilled: string[], fieldCountSkipped: number, timeToSubmitMs: number) {
    capture('form_submitted', {
      form_id: formId,
      all_field_names_filled: allFieldNamesFilled,
      field_count_filled: allFieldNamesFilled.length,
      field_count_skipped: fieldCountSkipped,
      time_to_submit_ms: timeToSubmitMs,
    })
  },

  // ── Phase 8.g.11.d — passive browser-API capture ────────────────
  // Wired by components/analytics/global-interaction-tracker.tsx
  // mounted from the root layout. All throttled inside the tracker
  // (1/5s for visibility, 1/3s for context-menu) so volume stays sane.
  copyTextEvent(props: { selection_length: number; page_path: string }) {
    capture('copy_text_event', props)
  },
  pasteTextEvent(props: { target_element_id: string; page_path: string }) {
    capture('paste_text_event', props)
  },
  contextMenuOpened(props: { target_element_id: string; page_path: string }) {
    capture('context_menu_opened', props)
  },
  tabVisibilityChanged(props: { state: 'hidden' | 'visible'; duration_ms?: number }) {
    capture('tab_visibility_changed', props)
  },
  navigationBack(props: { from_path: string }) {
    capture('navigation_back', props)
  },
  formValidationFailed(props: { form_id: string; field_name: string; error_code: string }) {
    capture('form_validation_failed', props)
  },
  elementDwell(props: { element_id: string; dwell_ms: number; page_path: string }) {
    capture('element_dwell', props)
  },
}

// ── People-property helpers (used by max-capture events) ─────────
// Lazy-imports mixpanel-browser so server-side bundle stays clean.
function peopleSet(props: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  import('mixpanel-browser').then(({ default: mixpanel }) => {
    try {
      mixpanel.people.set(props)
    } catch {
      // Swallow — never let analytics break the app.
    }
  })
}

function peopleUnion(props: Record<string, unknown[]>) {
  if (typeof window === 'undefined') return
  import('mixpanel-browser').then(({ default: mixpanel }) => {
    try {
      mixpanel.people.union(props)
    } catch {
      // Swallow.
    }
  })
}
