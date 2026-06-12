/**
 * Phase 10.3 — Property-level event-schema registry (single source of truth).
 *
 * lib/analytics-registry.ts governs event NAMES (lifecycle: fired / planned /
 * deprecated). THIS file governs event PROPERTIES: for every event that
 * actually fires (client call sites in app/+components/, plus the server
 * emitters in lib/mixpanel-server.ts) it declares a strict zod schema, a
 * technical description, and a plain-English one-liner.
 *
 * Powers:
 *   - dev/test validation at the capture() / trackServer() choke points
 *     (lib/analytics.ts, lib/mixpanel-server.ts) — loud locally, free in prod
 *   - production tagging in /api/track-mirror (schema_valid=false on rows
 *     that drift — tag, never drop: capture at any cost)
 *   - the CI guard (scripts/audit/verify-event-registry.ts) — every FIRED
 *     event must have a schema; every JSONB property the admin panel queries
 *     must exist in the right schema
 *   - the auto-generated event dictionary (Phase 8) and property-breakdown
 *     UI (Phase 6)
 *
 * Derivation rule: schemas are derived from the ACTUAL call sites in
 * lib/analytics.ts / lib/mixpanel-server.ts and were cross-checked against
 * the last 30 real rows per event in public.user_events (2026-06-11).
 * TRUST CODE + DATA over docs. When an event has a legacy and a "rich"
 * emitter under the same name, the schema is the union of both shapes.
 */

import { z } from 'zod'

// ── Base context (the envelope) ─────────────────────────────────────
// mirrorContext() in lib/analytics.ts merges these around every mirrored
// event. Most ride as top-level MirrorEvent fields; the starred ones are
// folded INTO `properties` (no DDL needed): session_id*, webdriver*,
// clarity_session_id*, and /api/track-mirror adds first_touch_referrer*,
// first_touch_landing* (+ schema_valid*/schema_issues* when tagging).
// Event prop schemas validate ONLY the event-specific payload; the combined
// validator strips these keys before the strict check.
export const BASE_CONTEXT_SCHEMA = z
  .object({
    // top-level MirrorEvent envelope (lib/analytics.ts mirrorContext ~L232)
    event_name: z.string(),
    distinct_id: z.string(),
    user_id: z.string().nullable(),
    auth_state: z.enum(['anon', 'known']),
    device_type: z.enum(['mobile', 'tablet', 'desktop']),
    page_path: z.string(),
    referrer: z.string(),
    utm_source: z.string(),
    utm_medium: z.string(),
    utm_campaign: z.string(),
    first_touch_utm_source: z.string(),
    first_touch_referrer: z.string(),
    first_touch_landing: z.string(),
    insert_id: z.string(),
    client_time_ms: z.number(),
    // keys that travel INSIDE properties (JSONB)
    session_id: z.string(),
    webdriver: z.boolean(),
    clarity_session_id: z.string(),
    schema_valid: z.boolean(),
    schema_issues: z.array(z.string()),
    // 10.7a — channel classification (lib/analytics/channels.ts), stamped by
    // mirrorContext() on every event from (referrer host at event time,
    // current utm, click-ids in the URL). Named traffic_* because `channel`
    // is ALREADY a payload property of share_clicked (share destination) —
    // a bare `channel` envelope key would be stripped from / clobber that
    // payload (caught by the synthetic suite on first full run).
    traffic_channel: z.enum(['search', 'ai', 'social', 'community', 'email', 'paid', 'referral', 'direct', 'internal']),
    traffic_source: z.string(),
    // 10.7a — ad click-ids, captured into properties when present in the URL.
    gclid: z.string(),
    fbclid: z.string(),
    msclkid: z.string(),
    ttclid: z.string(),
    // 10.7b — device / environment / performance envelope, computed ONCE per
    // page load by getEnvContext() (lib/analytics.ts) and stamped into
    // properties on every mirrored event. Namespaced env_* so they can never
    // collide with real payload properties (the share_clicked `channel`
    // lesson from 10.7a). All optional: older clients / payload recipes /
    // server emitters simply don't carry them.
    env_locale: z.string(), // navigator.language, e.g. 'en-US'
    env_timezone: z.string(), // IANA zone from Intl, e.g. 'Asia/Kolkata'
    env_viewport_w: z.number(), // window.innerWidth at first event
    env_viewport_h: z.number(), // window.innerHeight at first event
    env_screen_w: z.number(), // screen.width (CSS px)
    env_screen_h: z.number(), // screen.height (CSS px)
    env_dpr: z.number(), // devicePixelRatio (retina = 2, …)
    env_connection_type: z.string(), // navigator.connection.effectiveType ('4g', …)
    env_downlink: z.number(), // Mbps estimate (navigator.connection.downlink)
    env_rtt: z.number(), // round-trip ms estimate (navigator.connection.rtt)
    env_device_memory: z.number(), // GB bucket (navigator.deviceMemory: 0.25–8)
    env_cpu_cores: z.number(), // navigator.hardwareConcurrency
    env_touch: z.boolean(), // touch-capable device (maxTouchPoints > 0)
    env_cookie_enabled: z.boolean(), // navigator.cookieEnabled
    env_dnt: z.boolean(), // do-not-track requested (only stamped when true)
    env_color_scheme: z.enum(['dark', 'light', 'no-preference']), // prefers-color-scheme
    // Async signal — true when the Mixpanel API host is unreachable from this
    // browser (ad-blocker) while our own mirror is clearly alive (the event
    // carrying this flag arrived). Absent until the one-time probe resolves.
    env_ad_blocker: z.boolean(),
  })
  .partial()

/**
 * Properties-level base-context keys stripped before the strict check.
 * EXACTLY the keys that ride inside `properties` (verified against live
 * user_events rows 2026-06-11): mirrorContext() folds in session_id,
 * webdriver, clarity_session_id; /api/track-mirror folds in
 * first_touch_referrer/landing and (10.3.2) schema_valid/schema_issues.
 * NOTE: `referrer` / utm_* are NOT here — they travel as top-level
 * MirrorEvent envelope fields, and `referrer` is a real payload prop of
 * page_viewed.
 */
export const BASE_CONTEXT_PROP_KEYS = new Set<string>([
  'session_id',
  'webdriver',
  'clarity_session_id',
  'first_touch_referrer',
  'first_touch_landing',
  'schema_valid',
  'schema_issues',
  // 10.7a — channel classification + ad click-ids (mirrorContext folds these
  // into properties on every event; click-ids only when present in the URL).
  // NOTE: deliberately NOT 'channel' — that is a real payload property of
  // share_clicked; the envelope keys are namespaced traffic_*.
  'traffic_channel',
  'traffic_source',
  'gclid',
  'fbclid',
  'msclkid',
  'ttclid',
  // 10.7b — device/environment envelope (getEnvContext in lib/analytics.ts
  // folds these into properties on every client event; all optional).
  'env_locale',
  'env_timezone',
  'env_viewport_w',
  'env_viewport_h',
  'env_screen_w',
  'env_screen_h',
  'env_dpr',
  'env_connection_type',
  'env_downlink',
  'env_rtt',
  'env_device_memory',
  'env_cpu_cores',
  'env_touch',
  'env_cookie_enabled',
  'env_dnt',
  'env_color_scheme',
  'env_ad_blocker',
])

export type EventCategory =
  | 'navigation'
  | 'tools'
  | 'plan'
  | 'search'
  | 'compare'
  | 'reviews'
  | 'chat'
  | 'sentiment'
  | 'auth'
  | 'engagement'
  | 'discovery'
  | 'content'
  | 'system'

export type EventSource = 'client' | 'server' | 'both'

export interface EventSchemaEntry {
  /** Technical: when it fires, from where (file/component). */
  description: string
  /** One sentence a non-technical owner understands. */
  plainEnglish: string
  category: EventCategory
  source: EventSource
  /** Strict schema (or union of strict shapes) for the event payload. */
  props: z.ZodType
}

// Shared shape for the use-debounced-text-tracking.ts typed events.
const typedFieldProps = z
  .object({
    field_id: z.string(),
    char_count: z.number(),
    word_count: z.number(),
    current_text: z.string().optional(), // only capturePolicy:'text' surfaces
    final_blur: z.boolean().optional(), // only present (true) on blur flush
  })
  .strict()

export const EVENT_SCHEMAS = {
  // ── Navigation & top-level CTAs ───────────────────────────────────
  page_viewed: {
    description: 'Fires on every route change from MixpanelProvider via analytics.pageViewed().',
    plainEnglish: 'Someone opened or navigated to a page on the site.',
    category: 'navigation',
    source: 'client',
    props: z.object({ path: z.string(), url: z.string(), referrer: z.string() }).strict(),
  },
  nav_cta_clicked: {
    description: 'Navbar CTA click — analytics.navCtaClicked(cta, source) from layout nav components.',
    plainEnglish: 'Someone clicked a button in the top navigation bar.',
    category: 'navigation',
    source: 'client',
    props: z.object({ cta: z.string(), source: z.string() }).strict(),
  },
  hero_cta_clicked: {
    description: 'Homepage hero CTA click — analytics.heroCtaClicked(cta, variant).',
    plainEnglish: 'Someone clicked the big call-to-action button on the homepage.',
    category: 'navigation',
    source: 'client',
    props: z.object({ cta: z.string(), variant: z.string() }).strict(),
  },
  navigation_back: {
    description: 'Browser back button (popstate) — GlobalInteractionTracker.',
    plainEnglish: 'Someone pressed the browser back button.',
    category: 'navigation',
    source: 'client',
    props: z.object({ from_path: z.string() }).strict(),
  },

  // ── Tools ─────────────────────────────────────────────────────────
  tool_page_viewed: {
    description: 'Tool detail page view — analytics.toolPageViewed(toolId, toolSlug) from app/tools/[slug].',
    plainEnglish: 'Someone opened the detail page of a specific AI tool.',
    category: 'tools',
    source: 'client',
    props: z.object({ tool_id: z.string(), tool_slug: z.string() }).strict(),
  },
  tool_saved: {
    description:
      'Save/bookmark a tool. Client: SaveToolButton → analytics.toolSaved (tool_id, tool_name, tool_slug). Server: serverAnalytics.toolSavedServer (Mixpanel only, tool_slug + source:"server").',
    plainEnglish: 'Someone saved a tool to their personal list.',
    category: 'tools',
    source: 'both',
    props: z.union([
      z.object({ tool_id: z.string(), tool_name: z.string(), tool_slug: z.string().optional() }).strict(),
      z.object({ tool_id: z.string(), tool_slug: z.string(), source: z.literal('server') }).strict(),
    ]),
  },
  tool_unsaved: {
    description: 'Un-save a tool — SaveToolButton → analytics.toolUnsaved(tool_id, tool_name, tool_slug).',
    plainEnglish: 'Someone removed a tool from their saved list.',
    category: 'tools',
    source: 'client',
    props: z.object({ tool_id: z.string(), tool_name: z.string(), tool_slug: z.string().optional() }).strict(),
  },
  tool_visit_clicked: {
    description:
      'Client half of the "Visit Website" click (attribution) — analytics.toolVisitClicked; server half is tool_visit_redirected.',
    plainEnglish: 'Someone clicked through to a tool’s own website.',
    category: 'tools',
    source: 'client',
    props: z.object({ tool_id: z.string(), tool_slug: z.string(), source: z.string() }).strict(),
  },
  tool_visit_redirected: {
    description:
      'Authoritative affiliate redirect — serverAnalytics.toolVisitRedirected from /api/tools/[slug]/visit (server-only, bot-filtered at source).',
    plainEnglish: 'Our server confirmed sending a visitor to a tool’s website (the revenue click).',
    category: 'tools',
    source: 'server',
    props: z.object({ tool_slug: z.string(), referrer_path: z.string(), source: z.literal('server') }).strict(),
  },
  tool_faq_opened: {
    description: 'FAQ accordion expand on a tool page — analytics.toolFaqOpened.',
    plainEnglish: 'Someone expanded a question in a tool’s FAQ section.',
    category: 'tools',
    source: 'client',
    props: z.object({ tool_slug: z.string(), question_index: z.number(), question_text: z.string() }).strict(),
  },
  viability_badge_clicked: {
    description: 'Viability badge click on a tool page — analytics.viabilityBadgeClicked.',
    plainEnglish: 'Someone clicked a tool’s "safe bet / at risk / rising" badge.',
    category: 'tools',
    source: 'client',
    props: z.object({ tool_slug: z.string(), badge: z.enum(['safe_bet', 'at_risk', 'rising']) }).strict(),
  },
  viability_page_viewed: {
    description: 'Viability hub pages view — analytics.viabilityPageViewed.',
    plainEnglish: 'Someone opened the tool-viability (shutdown-risk) pages.',
    category: 'tools',
    source: 'client',
    props: z.object({ slug: z.string(), page_type: z.enum(['index', 'at_risk', 'safe_bets']) }).strict(),
  },

  // ── Sentiment Checker (client + server family) ────────────────────
  sentiment_card_viewed: {
    description: 'Sentiment Checker card became visible on a tool page — analytics.sentimentCardViewed.',
    plainEnglish: 'Someone saw the Market Sentiment Checker box on a tool page.',
    category: 'sentiment',
    source: 'client',
    props: z.object({ tool_slug: z.string() }).strict(),
  },
  sentiment_scan_started: {
    description: 'User clicked "scan" in the Sentiment Checker UI — analytics.sentimentScanStarted.',
    plainEnglish: 'Someone started a sentiment scan for a tool.',
    category: 'sentiment',
    source: 'client',
    props: z.object({ tool_slug: z.string(), charge_type: z.string() }).strict(),
  },
  sentiment_result_viewed: {
    description: 'Sentiment report rendered to the user — analytics.sentimentResultViewed.',
    plainEnglish: 'Someone viewed a finished sentiment report.',
    category: 'sentiment',
    source: 'client',
    props: z
      .object({ tool_slug: z.string(), sentiment_score: z.string(), result_source: z.enum(['fresh', 'cached']) })
      .strict(),
  },
  sentiment_pay_clicked: {
    description: 'Pay button click in the sentiment paywall — analytics.sentimentPayClicked.',
    plainEnglish: 'Someone clicked the pay button for a sentiment scan.',
    category: 'sentiment',
    source: 'client',
    props: z.object({ tool_slug: z.string(), gateway: z.string() }).strict(),
  },
  sentiment_scan_requested: {
    description: 'Server accepted a scan request — serverAnalytics.sentimentEvent from /api/tools/[slug]/sentiment-checker/scan.',
    plainEnglish: 'Our server accepted and queued a sentiment scan.',
    category: 'sentiment',
    source: 'server',
    props: z.object({ tool_slug: z.string(), charge_type: z.string() }).strict(),
  },
  sentiment_scan_completed: {
    description: 'Scan pipeline finished successfully — serverAnalytics.sentimentEvent in the scan route.',
    plainEnglish: 'A sentiment scan finished and produced a report.',
    category: 'sentiment',
    source: 'server',
    props: z
      .object({
        tool_slug: z.string(),
        charge_type: z.string(),
        duration_ms: z.number(),
        sources: z.array(z.string()),
        mention_count: z.number(),
        sentiment_score: z.string(),
      })
      .strict(),
  },
  sentiment_scan_failed: {
    description: 'Scan pipeline threw (credit refunded) — serverAnalytics.sentimentEvent in the scan route catch.',
    plainEnglish: 'A sentiment scan failed and the user’s credit was refunded.',
    category: 'sentiment',
    source: 'server',
    props: z.object({ tool_slug: z.string(), charge_type: z.string(), error: z.string() }).strict(),
  },
  sentiment_paywall_shown: {
    description: 'Server told the client to show the paywall (no free scans left) — scan route.',
    plainEnglish: 'Someone hit the sentiment paywall (out of free scans).',
    category: 'sentiment',
    source: 'server',
    props: z.object({ tool_slug: z.string(), currency: z.string(), amount_minor: z.number() }).strict(),
  },
  sentiment_payment_initiated: {
    description: 'Payment order created — /api/payments/{paypal,razorpay}/order.',
    plainEnglish: 'Someone started paying for sentiment scans.',
    category: 'sentiment',
    source: 'server',
    props: z
      .object({
        gateway: z.string(),
        currency: z.string(),
        amount_minor: z.number(),
        tool_slug: z.string().nullable(),
      })
      .strict(),
  },
  sentiment_payment_succeeded: {
    description: 'Payment captured/verified, credits granted — /api/payments/{paypal/capture,razorpay/verify}.',
    plainEnglish: 'A sentiment payment went through and credits were added.',
    category: 'sentiment',
    source: 'server',
    props: z.object({ gateway: z.string(), credits: z.number() }).strict(),
  },
  sentiment_payment_failed: {
    description: 'Payment capture/verification failed — paypal capture / razorpay verify routes.',
    plainEnglish: 'A sentiment payment attempt failed.',
    category: 'sentiment',
    source: 'server',
    props: z.object({ gateway: z.string(), reason: z.string() }).strict(),
  },

  // ── Compare ───────────────────────────────────────────────────────
  comparison_viewed: {
    description:
      'Compare page render. Rich shape from compare-view-tracker (comparisonViewedRich: tools array); legacy shape (tools joined string + count) kept for old emitters/cached bundles.',
    plainEnglish: 'Someone viewed a side-by-side comparison of tools.',
    category: 'compare',
    source: 'client',
    props: z.union([
      z
        .object({
          tools: z.array(z.string()),
          tools_count: z.number(),
          is_editorial_compare: z.boolean(),
          compare_slug: z.string(),
          categories_represented: z.array(z.string()),
        })
        .strict(),
      z.object({ tools: z.string(), count: z.number() }).strict(),
    ]),
  },
  compare_tool_added: {
    description:
      'Tool added to compare tray. Legacy shape fires from add-to-compare-button (tool_slug + tray_count); rich shape (compareToolAddedRich) defined for richer surfaces.',
    plainEnglish: 'Someone added a tool to their comparison tray.',
    category: 'compare',
    source: 'client',
    props: z.union([
      z.object({ tool_slug: z.string(), tray_count: z.number() }).strict(),
      z
        .object({
          tool_slug: z.string(),
          source: z.string(),
          tray_count_before: z.number(),
          tray_count_after: z.number(),
          all_tools_in_tray: z.array(z.string()),
          added_from_tool_page: z.boolean(),
        })
        .strict(),
    ]),
  },
  compare_tool_removed: {
    description: 'Tool removed from compare tray — analytics.compareToolRemoved.',
    plainEnglish: 'Someone removed a tool from their comparison tray.',
    category: 'compare',
    source: 'client',
    props: z.object({ tool_slug: z.string(), tray_count: z.number() }).strict(),
  },
  compare_share_clicked: {
    description: 'Share button on a comparison — analytics.compareShareClicked (tools = comma-joined slugs).',
    plainEnglish: 'Someone shared a tool comparison.',
    category: 'compare',
    source: 'client',
    props: z.object({ tools: z.string() }).strict(),
  },
  compare_tray_opened: {
    description: 'Compare tray expanded — analytics.compareTrayOpened.',
    plainEnglish: 'Someone opened the comparison tray.',
    category: 'compare',
    source: 'client',
    props: z.object({ tray_count: z.number() }).strict(),
  },
  compare_tray_cleared: {
    description:
      'Compare tray "Clear" button — analytics.compareTrayCleared from CompareTray (10.7c.6). tool_count = how many selections were discarded; an abandoned-compare-intent signal (vs compare_share_clicked which is the converted path).',
    plainEnglish: 'Someone emptied their comparison tray without comparing.',
    category: 'compare',
    source: 'client',
    props: z.object({ tool_count: z.number() }).strict(),
  },

  // ── Plan flow ─────────────────────────────────────────────────────
  plan_started: {
    description: 'Plan wizard entered — analytics.planStarted(source).',
    plainEnglish: 'Someone started building an AI tool plan.',
    category: 'plan',
    source: 'client',
    props: z.object({ source: z.string() }).strict(),
  },
  plan_intake_submitted: {
    description: 'Full intake form submitted — analytics.planIntakeSubmitted with every input value captured.',
    plainEnglish: 'Someone finished the plan questionnaire (goal, budget, team, tools they already use).',
    category: 'plan',
    source: 'client',
    props: z
      .object({
        skill_level: z.string(),
        budget: z.string(),
        team_size: z.string(),
        industry: z.string(),
        goal_type: z.string(),
        goal_text: z.string(),
        goal_text_word_count: z.number(),
        existing_tools: z.array(z.string()),
        existing_tools_count: z.number(),
        existing_tools_matched_slugs: z.array(z.string()),
        existing_tools_unmatched: z.array(z.string()),
        time_to_complete_intake_ms: z.number(),
        source: z.string(),
      })
      .strict(),
  },
  plan_chip_selected: {
    description: 'Chip selection in the plan wizard — analytics.planChipSelected.',
    plainEnglish: 'Someone picked an answer chip in the plan questionnaire.',
    category: 'plan',
    source: 'client',
    props: z
      .object({
        step: z.string(),
        step_index: z.number(),
        chip_value: z.string(),
        chip_label: z.string(),
        chip_index: z.number(),
        multi_select_count: z.number(),
        all_selected_values: z.array(z.string()),
        time_to_select_ms: z.number(),
      })
      .strict(),
  },
  plan_existing_tool_added: {
    description: 'User added an existing tool during intake — analytics.planExistingToolAdded.',
    plainEnglish: 'Someone told us about a tool they already use.',
    category: 'plan',
    source: 'client',
    props: z
      .object({
        tool_name: z.string(),
        matched_tool_slug: z.string().nullable().optional(),
        matched_tool_id: z.string().nullable().optional(),
        total_count: z.number(),
        source: z.enum(['autocomplete', 'free_text', 'pasted']),
        time_to_add_ms: z.number().optional(),
      })
      .strict(),
  },
  plan_existing_tool_removed: {
    description: 'User removed an existing tool during intake — analytics.planExistingToolRemoved.',
    plainEnglish: 'Someone removed a tool from their "already using" list.',
    category: 'plan',
    source: 'client',
    props: z
      .object({ tool_name: z.string(), matched_tool_slug: z.string().nullable(), total_count: z.number() })
      .strict(),
  },
  plan_completed: {
    description:
      'Plan generation finished. Client: project-planner (use_case + tool_count). Server mirror: planCompletedServer adds recommended_tool_slugs + source:"server".',
    plainEnglish: 'Someone received their finished AI tool plan.',
    category: 'plan',
    source: 'both',
    props: z.union([
      z.object({ use_case: z.string(), tool_count: z.number() }).strict(),
      z
        .object({
          use_case: z.string(),
          tool_count: z.number(),
          recommended_tool_slugs: z.array(z.string()),
          source: z.literal('server'),
        })
        .strict(),
    ]),
  },
  plan_match_tier: {
    description: 'Which matching tier produced a plan stage — analytics.planMatchTier.',
    plainEnglish: 'Internal quality signal: how good the tool match for a plan step was.',
    category: 'plan',
    source: 'client',
    props: z
      .object({ stage_id: z.string(), tier: z.enum(['keyword', 'category_fallback', 'emergency']) })
      .strict(),
  },
  plan_perf: {
    description:
      'Plan pipeline timing marks — analytics.planPerf(timings). Free-form Record<string, number> (e.g. total_ms, search_ms, scoring_ms, cache_hit).',
    plainEnglish: 'Internal speed measurements of plan generation.',
    category: 'plan',
    source: 'client',
    props: z.record(z.string(), z.number()),
  },
  plan_results_displayed: {
    description: 'Plan results rendered — analytics.planResultsDisplayed with full recommendation set.',
    plainEnglish: 'The recommended tools were shown to the user.',
    category: 'plan',
    source: 'client',
    props: z
      .object({
        recommended_tool_slugs: z.array(z.string()),
        recommended_tool_ids: z.array(z.string()),
        recommendation_count: z.number(),
        stages_count: z.number(),
        total_estimated_cost_usd_per_month: z.number(),
        use_case: z.string(),
        matches_existing_tools: z.array(z.string()),
        replaces_existing_tools: z.array(z.string()),
        source_intake_id: z.string(),
      })
      .strict(),
  },
  plan_results_tool_clicked: {
    description: 'Click on a recommended tool in plan results — analytics.planResultsToolClicked.',
    plainEnglish: 'Someone clicked one of the tools we recommended in their plan.',
    category: 'plan',
    source: 'client',
    props: z
      .object({
        tool_slug: z.string(),
        tool_id: z.string().optional(),
        position: z.number(),
        recommendation_tier: z.enum(['top', 'alt', 'budget']),
        stage_id: z.string().optional(),
        user_intake_use_case: z.string().optional(),
        user_intake_skill: z.string().optional(),
        user_intake_budget: z.string().optional(),
        user_intake_team: z.string().optional(),
        total_recommended_count: z.number(),
      })
      .strict(),
  },

  // ── Plan CTA + signup-gate funnel ─────────────────────────────────
  plan_cta_impression: {
    description: 'Plan CTA became visible (scroll-into-view or mount) — analytics.planCtaImpression.',
    plainEnglish: 'A "build your plan" button was shown to someone.',
    category: 'plan',
    source: 'client',
    props: z
      .object({
        surface: z.enum(['sticky_bar', 'inline_card', 'navbar', 'homepage', 'plan_page']),
        page_path: z.string(),
      })
      .strict(),
  },
  plan_cta_clicked: {
    description: 'Plan CTA button click (before any signup gate) — analytics.planCtaClicked.',
    plainEnglish: 'Someone clicked a "build your plan" button.',
    category: 'plan',
    source: 'client',
    props: z
      .object({
        surface: z.enum(['sticky_bar', 'inline_card', 'navbar', 'homepage', 'plan_page']),
        page_path: z.string(),
      })
      .strict(),
  },
  plan_cta_dismissed: {
    description: 'Sticky/inline plan CTA dismissed (×) — analytics.planCtaDismissed.',
    plainEnglish: 'Someone closed the "build your plan" banner.',
    category: 'plan',
    source: 'client',
    props: z.object({ surface: z.enum(['sticky_bar', 'inline_card']), page_path: z.string() }).strict(),
  },
  plan_signup_modal_shown: {
    description: 'OAuth signup modal opened — analytics.planSignupModalShown from plan-signup-modal.tsx.',
    plainEnglish: 'The sign-up popup appeared during the plan flow.',
    category: 'plan',
    source: 'client',
    props: z.object({ source_surface: z.string(), typed_goal_char_count: z.number() }).strict(),
  },
  plan_signup_modal_oauth_clicked: {
    description: 'Provider button click inside the signup modal — analytics.planSignupModalOAuthClicked.',
    plainEnglish: 'Someone chose Google or LinkedIn in the sign-up popup.',
    category: 'plan',
    source: 'client',
    props: z.object({ provider: z.enum(['google', 'linkedin']) }).strict(),
  },
  plan_signup_modal_skipped: {
    description: '"Skip & continue" inside the signup modal — analytics.planSignupModalSkipped.',
    plainEnglish: 'Someone skipped signing up and continued anonymously.',
    category: 'plan',
    source: 'client',
    props: z.object({ typed_goal_char_count: z.number() }).strict(),
  },
  plan_signup_modal_completed: {
    description:
      'Post-OAuth identify completed — auth-provider.tsx. source_surface added 10.3 so /admin plan-conversion per-surface signups stop reading 0.',
    plainEnglish: 'Someone finished signing up through the plan popup.',
    category: 'plan',
    source: 'client',
    props: z
      .object({
        provider: z.enum(['google', 'linkedin']),
        was_anon_to_known: z.boolean(),
        source_surface: z.string().optional(),
      })
      .strict(),
  },

  // ── Recommend wizard ──────────────────────────────────────────────
  // 10.7c.5 — recommendation_requested schema REMOVED: zero call sites for
  // either the client or server emitter (the loose "server emitters always
  // fire" registry rule had been hiding this). Demoted to PLANNED; the
  // emitters remain in lib/analytics.ts + lib/mixpanel-server.ts for when
  // the recommend wizard ships.

  // ── Plan intent persistence (10.7c.5 — promoted from PLANNED) ─────
  plan_intent_persisted: {
    description:
      'A typed plan goal was durably saved to plan_intents via POST /api/plan/intent — lib/cta/persist-intent.ts persistPlanIntent() (called from the plan signup modal + auth provider pending-intent replay). Fires only after the fetch succeeds.',
    plainEnglish: 'A visitor’s typed goal was saved so it survives signup.',
    category: 'plan',
    source: 'client',
    props: z.object({ source_surface: z.string(), char_count: z.number() }).strict(),
  },
  plan_intent_linked_to_user: {
    description:
      'Pre-auth plan_intents rows were stitched to the authenticated user via POST /api/plan/intent/link — lib/cta/persist-intent.ts linkPlanIntentsToUser() after identify() on anon→known. user_id is deliberately empty (server already knows; client must not leak it). Fires only when count_linked > 0.',
    plainEnglish: 'A new signup’s earlier anonymous plan goals were connected to their account.',
    category: 'plan',
    source: 'client',
    props: z.object({ user_id: z.string(), count_linked: z.number() }).strict(),
  },

  // ── Search ────────────────────────────────────────────────────────
  search_query_submitted: {
    description: 'Search query submitted — analytics.searchQuerySubmitted (query capped 100 chars).',
    plainEnglish: 'Someone ran a search.',
    category: 'search',
    source: 'client',
    props: z.object({ query: z.string(), result_count: z.number(), source: z.string() }).strict(),
  },
  search_result_clicked: {
    description:
      'Search result click. Rich shape from search-bar (searchResultClickedRich); legacy 3-prop shape kept for older emitters.',
    plainEnglish: 'Someone clicked a search result.',
    category: 'search',
    source: 'client',
    props: z.union([
      z
        .object({
          query: z.string(),
          tool_slug: z.string(),
          tool_id: z.string(),
          position: z.number(),
          total_results: z.number(),
          page_number: z.number(),
        })
        .strict(),
      z.object({ query: z.string(), tool_slug: z.string(), position: z.number() }).strict(),
    ]),
  },
  search_typing: {
    description: 'Live-search keystroke progression — analytics.searchTyping (debounced upstream).',
    plainEnglish: 'Someone was typing in the search box.',
    category: 'search',
    source: 'client',
    props: z.object({ current_query: z.string(), current_length: z.number(), source: z.string() }).strict(),
  },
  search_query_typed: {
    description:
      'Debounced keystroke capture on the navbar search field — use-debounced-text-tracking via analytics.fieldTextChanged (capturePolicy: text).',
    plainEnglish: 'What someone typed into the search box (after a pause).',
    category: 'search',
    source: 'client',
    props: typedFieldProps,
  },

  // ── Typed-field capture (plan goal) ───────────────────────────────
  plan_goal_typed: {
    description:
      'Debounced keystroke capture on the homepage goal input — goal-input.tsx via analytics.fieldTextChanged (capturePolicy: text).',
    plainEnglish: 'What someone typed as their goal on the homepage (after a pause).',
    category: 'plan',
    source: 'client',
    props: typedFieldProps,
  },

  // ── Discovery / browse ────────────────────────────────────────────
  filter_applied: {
    description:
      'Catalog filter applied — analytics.filterApplied. NOTE: changing the sort select also fires this (filter_type="sort") for historical continuity; the richer sort_changed (with from→to) fires alongside it since 10.7c.6.',
    plainEnglish: 'Someone filtered the tool catalog.',
    category: 'discovery',
    source: 'client',
    props: z.object({ filter_type: z.string(), value: z.string(), source: z.string() }).strict(),
  },
  filter_cleared: {
    description:
      'Catalog filter removed — analytics.filterCleared from ToolFilters (10.7c.6): a FilterPill ✕, clearing a select back to its placeholder, or the "Clear all" button (filter_type="all"). Previously clears were silent (only sets fired filter_applied).',
    plainEnglish: 'Someone removed a catalog filter (or cleared them all).',
    category: 'discovery',
    source: 'client',
    props: z.object({ filter_type: z.string(), page_path: z.string() }).strict(),
  },
  sort_changed: {
    description:
      'Catalog sort order changed — analytics.sortChanged from the ToolFilters sort select (10.7c.6). Carries the PREVIOUS order too (from→to), which filter_applied never captured. Fires alongside the legacy filter_applied(filter_type="sort").',
    plainEnglish: 'Someone changed how the tool list is sorted.',
    category: 'discovery',
    source: 'client',
    props: z.object({ page_path: z.string(), from: z.string(), to: z.string() }).strict(),
  },
  pagination_clicked: {
    description:
      'Listing pagination link clicked (prev/next/numbered) — analytics.paginationClicked from ToolPagination (10.7c.6; /tools, /categories/[slug], /search). Fires on click before the <Link> navigation.',
    plainEnglish: 'Someone moved to another page of a tool listing.',
    category: 'discovery',
    source: 'client',
    props: z
      .object({
        page_path: z.string(),
        from_page: z.number(),
        to_page: z.number(),
        total_pages: z.number(),
      })
      .strict(),
  },
  category_viewed: {
    description: 'Category page view — analytics.categoryViewed.',
    plainEnglish: 'Someone browsed a tool category page.',
    category: 'discovery',
    source: 'client',
    props: z.object({ slug: z.string() }).strict(),
  },
  collection_viewed: {
    description: 'Collection page view — analytics.collectionViewed.',
    plainEnglish: 'Someone browsed a curated tool collection.',
    category: 'discovery',
    source: 'client',
    props: z.object({ slug: z.string() }).strict(),
  },

  // ── AI chat ───────────────────────────────────────────────────────
  ai_chat_message: {
    description:
      'User message in AI chat. Rich shape from chat-interface (aiChatMessageRich, intent nullable); legacy {intent} shape kept.',
    plainEnglish: 'Someone sent a message to the AI assistant.',
    category: 'chat',
    source: 'client',
    props: z.union([
      z
        .object({
          intent: z.string().nullable(),
          message_text: z.string(),
          message_length: z.number(),
          message_word_count: z.number(),
          mentioned_tool_slugs: z.array(z.string()),
          conversation_turn: z.number(),
          is_follow_up: z.boolean(),
        })
        .strict(),
      z.object({ intent: z.string() }).strict(),
    ]),
  },
  ai_chat_response_received: {
    description: 'Assistant response landed — analytics.aiChatResponseReceived.',
    plainEnglish: 'The AI assistant answered someone.',
    category: 'chat',
    source: 'client',
    props: z
      .object({
        tool_count_suggested: z.number(),
        suggested_tool_slugs: z.array(z.string()),
        response_length: z.number(),
        latency_ms: z.number(),
      })
      .strict(),
  },
  ai_chat_tool_clicked: {
    description:
      'Click on a tool inside an AI answer. Rich shape (aiChatToolClickedRich) + legacy {tool_slug} shape.',
    plainEnglish: 'Someone clicked a tool the AI suggested.',
    category: 'chat',
    source: 'client',
    props: z.union([
      z
        .object({
          tool_slug: z.string(),
          position_in_response: z.number(),
          user_message_text: z.string(),
          conversation_turn: z.number(),
        })
        .strict(),
      z.object({ tool_slug: z.string() }).strict(),
    ]),
  },

  // ── Reviews ───────────────────────────────────────────────────────
  review_form_opened: {
    description: 'Review form opened — analytics.reviewFormOpened.',
    plainEnglish: 'Someone opened the "write a review" form.',
    category: 'reviews',
    source: 'client',
    props: z.object({ tool_id: z.string(), tool_slug: z.string(), source: z.string() }).strict(),
  },
  review_rating_set: {
    description: 'Star rating picked — analytics.reviewRatingSet.',
    plainEnglish: 'Someone chose a star rating for a tool.',
    category: 'reviews',
    source: 'client',
    props: z.object({ tool_id: z.string(), rating: z.number(), time_to_rate_ms: z.number() }).strict(),
  },
  review_text_changed: {
    description: 'Review text edited (debounced) — analytics.reviewTextChanged (meta only, no raw text).',
    plainEnglish: 'Someone was writing their review.',
    category: 'reviews',
    source: 'client',
    props: z.object({ tool_id: z.string(), length: z.number(), word_count: z.number() }).strict(),
  },
  review_submitted: {
    description:
      'Review submitted. Rich client shape from review-form (full text); legacy {tool_id, rating}; server shape from serverAnalytics.reviewSubmitted (Mixpanel only).',
    plainEnglish: 'Someone published a review of a tool.',
    category: 'reviews',
    source: 'both',
    props: z.union([
      z
        .object({
          tool_id: z.string(),
          tool_slug: z.string(),
          rating: z.number(),
          text: z.string(),
          text_length: z.number(),
          word_count: z.number(),
          pros_text: z.string(),
          cons_text: z.string(),
          has_pros: z.boolean(),
          has_cons: z.boolean(),
          recommended: z.boolean(),
          use_case_tag: z.string(),
          time_to_submit_ms: z.number(),
        })
        .strict(),
      z.object({ tool_id: z.string(), rating: z.number(), source: z.literal('server') }).strict(),
      z.object({ tool_id: z.string(), rating: z.number() }).strict(),
    ]),
  },

  // ── Auth funnel ───────────────────────────────────────────────────
  signup_started: {
    description: 'Signup page/flow entered — analytics.signupStarted(source).',
    plainEnglish: 'Someone started creating an account.',
    category: 'auth',
    source: 'client',
    props: z.object({ source: z.string() }).strict(),
  },
  signup_email_entered: {
    description:
      'Email field blurred with an @-containing value on the signup page — analytics.signupEmailEntered (10.7c.6, fire-once per page visit). PII rule: only the DOMAIN is captured, never the local part.',
    plainEnglish: 'Someone typed their email into the signup form.',
    category: 'auth',
    source: 'client',
    props: z
      .object({
        email_domain: z.string(),
        method_intent: z.enum(['email', 'google', 'github']),
        source: z.string(),
      })
      .strict(),
  },
  signup_method_selected: {
    description:
      'Signup method chosen on the signup page — analytics.signupMethodSelected (10.7c.6): the Google OAuth button click or the email/password form submit. The step BETWEEN signup_started and signup_completed that shows which method users attempt (vs which completes).',
    plainEnglish: 'Someone picked how to sign up (Google or email).',
    category: 'auth',
    source: 'client',
    props: z
      .object({ method: z.enum(['email', 'google', 'github']), source: z.string() })
      .strict(),
  },
  signup_completed: {
    description:
      'Account created. Server-authoritative (serverAnalytics.signupCompleted, deterministic insert_id, mirrors to user_events); client method exists too.',
    plainEnglish: 'Someone created an account.',
    category: 'auth',
    source: 'both',
    props: z.union([
      z.object({ method: z.string(), source: z.literal('server') }).strict(),
      z.object({ method: z.string() }).strict(),
    ]),
  },
  login_completed: {
    description:
      'Login. Server-authoritative (serverAnalytics.loginCompleted, per-UTC-day insert_id, mirrors to user_events); client method exists too.',
    plainEnglish: 'Someone logged in.',
    category: 'auth',
    source: 'both',
    props: z.union([
      z.object({ method: z.string(), source: z.literal('server') }).strict(),
      z.object({ method: z.string() }).strict(),
    ]),
  },
  password_reset_requested: {
    description:
      'Reset-link request succeeded on /forgot-password — analytics.passwordResetRequested fired from the success state of the forgot-password page (10.7c.5).',
    plainEnglish: 'Someone asked for a password-reset email.',
    category: 'auth',
    source: 'client',
    props: z.object({ method: z.literal('email') }).strict(),
  },
  password_reset_completed: {
    description:
      'Password reset finished. Server-authoritative: actions/auth.ts updatePassword → serverAnalytics.passwordResetCompletedServer (Mixpanel only). A client method with the same shape exists but is unwired.',
    plainEnglish: 'Someone reset their password.',
    category: 'auth',
    source: 'both',
    props: z.union([
      z.object({ method: z.literal('email'), source: z.literal('server') }).strict(),
      z.object({ method: z.literal('email') }).strict(),
    ]),
  },

  // ── Content / growth ──────────────────────────────────────────────
  blog_internal_link_clicked: {
    description: 'Internal link click inside a blog post — analytics.blogInternalLinkClicked.',
    plainEnglish: 'Someone clicked a link inside a blog article.',
    category: 'content',
    source: 'client',
    props: z.object({ from_slug: z.string(), to_path: z.string() }).strict(),
  },
  share_clicked: {
    description: 'Generic share action — analytics.shareClicked(entity, entityId, channel).',
    plainEnglish: 'Someone shared a page.',
    category: 'engagement',
    source: 'client',
    props: z.object({ entity: z.string(), entity_id: z.string(), channel: z.string() }).strict(),
  },
  newsletter_subscribed: {
    description:
      'Newsletter signup. Rich client shape (newsletterSubscribedRich, email reduced to domain); legacy {source}; server shape (newsletterSubscribedServer, Mixpanel only).',
    plainEnglish: 'Someone subscribed to the newsletter.',
    category: 'engagement',
    source: 'both',
    props: z.union([
      z
        .object({
          source: z.string(),
          email_domain: z.string(),
          page_path_at_subscribe: z.string(),
          tool_slug_context: z.string(),
        })
        .strict(),
      z
        .object({
          email_domain: z.string(),
          source: z.string(),
          page_path_at_subscribe: z.string(),
          source_kind: z.literal('server'),
        })
        .strict(),
      z.object({ source: z.string() }).strict(),
    ]),
  },
  // 10.7c.5 — activation_milestone schema REMOVED: zero call sites for
  // either the client or server emitter (hidden by the loose server-emitter
  // registry rule). Demoted to PLANNED; emitters kept for a future genuine
  // first-save/first-plan wiring that knows the "first" server-side.

  // ── Frustration / behavior-depth signals (10.7c) ──────────────────
  rage_click: {
    description:
      '3+ clicks within 1s inside a 30px radius — GlobalInteractionTracker (document-level, throttled 1/10s, max 10/page). Click coordinates and target are from the LAST click of the burst.',
    plainEnglish: 'Someone clicked the same spot repeatedly in frustration.',
    category: 'engagement',
    source: 'client',
    props: z
      .object({ page_path: z.string(), target_element_id: z.string(), click_count: z.number() })
      .strict(),
  },
  dead_click: {
    description:
      'Click on a non-interactive element styled clickable (cursor:pointer, no interactive ancestor) that produced NO UI response — no DOM mutation and no navigation within 600ms (MutationObserver probe). GlobalInteractionTracker, throttled 1/5s, max 10/page.',
    plainEnglish: 'Someone clicked something that looked clickable but nothing happened.',
    category: 'engagement',
    source: 'client',
    props: z.object({ page_path: z.string(), target_element_id: z.string() }).strict(),
  },
  exit_intent: {
    description:
      'Desktop-only (maxTouchPoints=0): mouse left through the top of the viewport (mouseout with relatedTarget=null, clientY<=0) — the classic about-to-close/switch-tab gesture. GlobalInteractionTracker; at most once per page, suppressed in the first 5s after mount.',
    plainEnglish: 'Someone moved their mouse toward closing the tab or leaving the page.',
    category: 'engagement',
    source: 'client',
    props: z.object({ page_path: z.string(), seconds_on_page: z.number() }).strict(),
  },
  error_encountered: {
    description:
      'Client-side error capture — GlobalInteractionTracker wires window "error" (capture phase: distinguishes failed resource loads from JS exceptions), "unhandledrejection", plus the legacy analytics.errorEncountered(boundary, message) call shape for React boundaries. Deduped per message, max 5/page.',
    plainEnglish: 'Something broke in the visitor’s browser on our site.',
    category: 'system',
    source: 'client',
    props: z
      .object({
        boundary: z.string(),
        message: z.string(),
        error_type: z.enum(['js_error', 'unhandled_rejection', 'resource_error', 'react_boundary']).optional(),
        source_url: z.string().optional(),
        line: z.number().optional(),
        col: z.number().optional(),
        page_path: z.string().optional(),
      })
      .strict(),
  },
  external_link_clicked: {
    description:
      'Click on an anchor whose host is not ours — GlobalInteractionTracker document-level capture listener (throttled 1/1s). Affiliate "Visit website" clicks are NOT this event (they navigate via internal /api/tools/[slug]/visit and have their own pair).',
    plainEnglish: 'Someone clicked a link that leads off our site.',
    category: 'engagement',
    source: 'client',
    props: z.object({ url: z.string(), entity: z.string(), entity_id: z.string() }).strict(),
  },

  // ── Form analytics (10.7c.3 — FormAnalyticsTracker, every <form>) ──
  form_field_changed: {
    description:
      'Field blur where the value changed during the focus — FormAnalyticsTracker (document focusin/focusout, every <form>; real forms carry data-form-id: auth_login, auth_signup, review, newsletter_*, site_search, home_goal, plan_intake, qa_question, profile_edit, …). focus_order = 1-based first-focus position within the form; corrections = edit cycles beyond the first (re-edits). Value text itself is NEVER captured — only its length. Password/hidden fields skipped entirely. Max 30/form per page.',
    plainEnglish: 'Someone filled in (or re-edited) one field of a form.',
    category: 'engagement',
    source: 'client',
    props: z
      .object({
        form_id: z.string(),
        field_name: z.string(),
        field_type: z.string(),
        has_value: z.boolean(),
        value_length: z.number(),
        page_path: z.string(),
        focus_order: z.number(),
        corrections: z.number(),
      })
      .strict(),
  },
  form_submitted: {
    description:
      'Native form submit (document capture) — FormAnalyticsTracker. all_field_names_filled = named visible fields with a non-empty value at submit (names only, never values; capped 20); time_to_submit_ms measured from first field focus.',
    plainEnglish: 'Someone submitted a form.',
    category: 'engagement',
    source: 'client',
    props: z
      .object({
        form_id: z.string(),
        all_field_names_filled: z.array(z.string()),
        field_count_filled: z.number(),
        field_count_skipped: z.number(),
        time_to_submit_ms: z.number(),
      })
      .strict(),
  },
  form_validation_failed: {
    description:
      'Native constraint validation blocked a submit — document-level "invalid" capture listener in FormAnalyticsTracker. error_code is the ValidityState flag that fired (valueMissing, typeMismatch, patternMismatch, …). Throttled 1/2s.',
    plainEnglish: 'A form told someone their input was invalid.',
    category: 'engagement',
    source: 'client',
    props: z
      .object({ form_id: z.string(), field_name: z.string(), error_code: z.string() })
      .strict(),
  },
  form_abandoned: {
    description:
      'A form that had at least one focused field was left without submitting — flushed once per form on route change / pagehide by FormAnalyticsTracker. last_field_name is the abandon point; focus_order is the first-focus order of touched fields (names only, capped 15).',
    plainEnglish: 'Someone started filling a form but left without submitting it.',
    category: 'engagement',
    source: 'client',
    props: z
      .object({
        form_id: z.string(),
        page_path: z.string(),
        last_field_name: z.string(),
        fields_touched: z.number(),
        corrections_total: z.number(),
        seconds_on_form: z.number(),
        focus_order: z.array(z.string()),
      })
      .strict(),
  },

  // ── System / performance ──────────────────────────────────────────
  web_vitals: {
    description:
      'Per-page web-vitals beacon — components/analytics/web-vitals-tracker.tsx accumulates useReportWebVitals metrics (LCP/FCP/TTFB/INP/CLS, hard page loads only) and flushes ONE web_vitals event per page load on first visibility-hidden / pagehide / route change. slow_page = any metric in its "poor" band (LCP>4s, INP>500ms, CLS>0.25, TTFB>1.8s, FCP>3s).',
    plainEnglish: 'How fast a page loaded and responded for a real visitor.',
    category: 'system',
    source: 'client',
    props: z
      .object({
        path: z.string(),
        lcp_ms: z.number().optional(),
        fcp_ms: z.number().optional(),
        ttfb_ms: z.number().optional(),
        inp_ms: z.number().optional(),
        cls: z.number().optional(),
        metric_count: z.number(),
        slow_page: z.boolean(),
      })
      .strict(),
  },

  // ── Engagement / passive capture ──────────────────────────────────
  scroll_depth_reached: {
    description:
      'Scroll depth marks — analytics.scrollDepthReached from EngagementCapture. 10.7c widened the marks from 25/50/75/100 to 10/25/50/75/90/100 (finer reading-depth resolution; old rows simply lack the 10/90 marks).',
    plainEnglish: 'How far down a page someone scrolled.',
    category: 'engagement',
    source: 'client',
    props: z
      .object({
        path: z.string(),
        depth: z.union([
          z.literal(10),
          z.literal(25),
          z.literal(50),
          z.literal(75),
          z.literal(90),
          z.literal(100),
        ]),
      })
      .strict(),
  },
  time_on_page: {
    description:
      'Fire-once time-on-page beacon on unmount/pagehide — analytics.timeOnPage (bucketed). 10.7c adds optional max_scroll_pct (deepest scroll position reached on the page, 0-100) — additive only, the nightly behavioral bot classifier keeps reading path/seconds/bucket unchanged.',
    plainEnglish: 'How long someone stayed on a page (and how deep they got).',
    category: 'engagement',
    source: 'client',
    props: z
      .object({
        path: z.string(),
        seconds: z.number(),
        bucket: z.enum(['<5s', '5-15s', '15-30s', '30-60s', '1-3min', '>3min']),
        max_scroll_pct: z.number().optional(),
      })
      .strict(),
  },
  engaged_time_heartbeat: {
    description:
      'Every ~30s of wall time while a page is open — EngagementCapture (mixpanel-provider.tsx). engaged_seconds_delta = seconds within the interval the visitor was actually attentive (tab visible AND input/scroll within the previous 15s); engaged_seconds_total = cumulative for the page. Skipped when delta=0; capped at 40 beats/page (~20 min). Complements — does NOT replace — the fire-once time_on_page the nightly bot classifier reads.',
    plainEnglish: 'Proof someone was actively reading or interacting, in 30-second slices.',
    category: 'engagement',
    source: 'client',
    props: z
      .object({
        path: z.string(),
        heartbeat_n: z.number(),
        engaged_seconds_delta: z.number(),
        engaged_seconds_total: z.number(),
      })
      .strict(),
  },
  copy_text_event: {
    description: 'Text copied (throttled 1/1.5s) — GlobalInteractionTracker.',
    plainEnglish: 'Someone copied text from a page.',
    category: 'engagement',
    source: 'client',
    props: z.object({ selection_length: z.number(), page_path: z.string() }).strict(),
  },
  paste_text_event: {
    description: 'Paste into any element (throttled) — GlobalInteractionTracker.',
    plainEnglish: 'Someone pasted text into a field.',
    category: 'engagement',
    source: 'client',
    props: z.object({ target_element_id: z.string(), page_path: z.string() }).strict(),
  },
  context_menu_opened: {
    description: 'Right-click context menu (throttled 1/3s) — GlobalInteractionTracker.',
    plainEnglish: 'Someone right-clicked on the page.',
    category: 'engagement',
    source: 'client',
    props: z.object({ target_element_id: z.string(), page_path: z.string() }).strict(),
  },
  tab_visibility_changed: {
    description:
      'Tab hidden/visible transitions (throttled 1/5s) — GlobalInteractionTracker. duration_ms only on "hidden" (time the tab was visible).',
    plainEnglish: 'Someone switched away from (or back to) the site’s tab.',
    category: 'engagement',
    source: 'client',
    props: z.object({ state: z.enum(['hidden', 'visible']), duration_ms: z.number().optional() }).strict(),
  },

  // ── Dashboard / profile / saved ───────────────────────────────────
  dashboard_viewed: {
    description: 'Logged-in dashboard view — analytics.dashboardViewed.',
    plainEnglish: 'Someone opened their personal dashboard.',
    category: 'engagement',
    source: 'client',
    props: z.object({ has_saves: z.boolean(), saves_count: z.number(), has_plans: z.boolean() }).strict(),
  },
  saved_list_viewed: {
    description: 'Saved-tools list view — analytics.savedListViewed.',
    plainEnglish: 'Someone looked at their saved tools.',
    category: 'engagement',
    source: 'client',
    props: z.object({ count: z.number() }).strict(),
  },
  profile_viewed: {
    description: 'Public profile view — analytics.profileViewed.',
    plainEnglish: 'Someone viewed a user profile.',
    category: 'engagement',
    source: 'client',
    props: z.object({ username: z.string(), is_own_profile: z.boolean() }).strict(),
  },

  // ── Stacks ────────────────────────────────────────────────────────
  stack_saved: {
    description:
      'Stack saved. Rich shape from save-stack-button (stackSavedRich); legacy {stack_slug} shape kept.',
    plainEnglish: 'Someone saved a bundle of tools as a stack.',
    category: 'tools',
    source: 'client',
    props: z.union([
      z
        .object({
          stack_slug: z.string(),
          stack_name: z.string(),
          tool_slugs: z.array(z.string()),
          tool_ids: z.array(z.string()),
          tool_count: z.number(),
          total_estimated_cost_usd: z.number(),
          source: z.enum(['plan_flow', 'manual_builder', 'compare_page']),
        })
        .strict(),
      z.object({ stack_slug: z.string() }).strict(),
    ]),
  },
} as const satisfies Record<string, EventSchemaEntry>

export type KnownEventName = keyof typeof EVENT_SCHEMAS

/** All schema'd event names (the property-level "known set"). */
export const SCHEMA_EVENT_NAMES: readonly string[] = Object.keys(EVENT_SCHEMAS)

/**
 * Events that exist ONLY in lib/mixpanel-server.ts (no client method with a
 * call site). The CI guard exempts these from the "schema must map to a
 * client FIRED event" check.
 */
export const SERVER_ONLY_EVENTS = new Set<string>([
  'tool_visit_redirected',
  'sentiment_scan_requested',
  'sentiment_scan_completed',
  'sentiment_scan_failed',
  'sentiment_paywall_shown',
  'sentiment_payment_initiated',
  'sentiment_payment_succeeded',
  'sentiment_payment_failed',
])

export type ValidateEventResult = { ok: true } | { ok: false; issues: string[] }

/**
 * Validate one event payload against its schema.
 * - Unknown event name → invalid.
 * - Base-context keys (session_id, webdriver, clarity_session_id,
 *   first_touch_*, schema_valid/issues, …) are stripped before the strict
 *   check, so the same validator works at the capture() choke point (raw
 *   payload) AND in /api/track-mirror (payload + merged envelope keys).
 */
export function validateEvent(name: string, props: unknown): ValidateEventResult {
  const entry = (EVENT_SCHEMAS as Record<string, EventSchemaEntry>)[name]
  if (!entry) {
    return { ok: false, issues: [`unknown event name "${name}" — not in EVENT_SCHEMAS (lib/analytics-schema.ts)`] }
  }
  const raw = props === undefined || props === null ? {} : props
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, issues: [`properties must be an object, got ${Array.isArray(raw) ? 'array' : typeof raw}`] }
  }
  // Strip base-context keys + undefined values (JSON drops undefined anyway).
  const cleaned: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (BASE_CONTEXT_PROP_KEYS.has(k)) continue
    if (v === undefined) continue
    cleaned[k] = v
  }
  const result = entry.props.safeParse(cleaned)
  if (result.success) return { ok: true }
  const issues = result.error.issues.slice(0, 10).map((i) => {
    const path = i.path.length ? i.path.join('.') : '(root)'
    return `${path}: ${i.message}`
  })
  return { ok: false, issues }
}
