/**
 * Phase 9.A.2 — Canonical event registry (source of truth for event lifecycle).
 *
 * `lib/analytics.ts` is the EMITTER (the typed methods). This file is the
 * GOVERNANCE layer: it declares which events the admin dashboards depend on and
 * which events are intentionally defined-but-not-yet-wired, so the CI guard
 * (scripts/audit/verify-event-registry.ts) can fail the build when:
 *   - a dashboard starts depending on an event that never fires, or
 *   - a new event is added without either wiring a call site or acknowledging
 *     it here as planned.
 *
 * Keep these sets in sync with reality — the CI guard enforces it.
 */

/**
 * Events that an /admin surface reads (queries.ts, plan-conversion.ts,
 * analytics/page.tsx). Every one of these MUST have a live call site, or the
 * dashboard shows a permanently-zero metric (the class of bug that left the
 * plan funnel's final step at 0). The CI guard errors if any is never fired.
 */
export const ADMIN_CONSUMED_EVENTS = new Set<string>([
  'page_viewed',
  'signup_completed',
  'newsletter_subscribed',
  'tool_saved',
  'tool_page_viewed',
  'tool_visit_redirected',
  'search_query_submitted',
  'search_result_clicked',
  'ai_chat_message',
  'ai_chat_tool_clicked',
  'comparison_viewed',
  'plan_started',
  'plan_intake_submitted',
  'plan_completed',
  'plan_results_tool_clicked',
  'plan_existing_tool_added',
  'plan_cta_impression',
  'plan_cta_clicked',
  'plan_signup_modal_shown',
  'plan_signup_modal_oauth_clicked',
  'plan_signup_modal_skipped',
  'plan_signup_modal_completed',
  'review_submitted',
])

/**
 * Events defined in analytics.ts but intentionally NOT wired to a call site yet
 * (future instrumentation / passive-capture stubs). Acknowledged so the CI
 * guard doesn't fail, but visible as a backlog of unused instrumentation.
 * Seeded from the live "defined − fired" set (Phase 9.A.2). When you wire one,
 * remove it from here.
 */
export const PLANNED_EVENTS = new Set<string>([
  'ai_chat_tool_suggested', 'best_page_viewed', 'blog_post_viewed',
  'compare_attribute_row_expanded', 'compare_csv_exported', 'dashboard_widget_clicked',
  'discussion_replied', 'element_dwell', 'empty_search',
  // 10.7c — error_encountered + external_link_clicked promoted to FIRED
  // (GlobalInteractionTracker global listeners).
  'filter_no_results', 'form_field_changed', 'form_submitted',
  'form_validation_failed', 'onboarding_completed', 'onboarding_step_completed',
  'password_reset_requested', 'perf_mark', 'plan_abandoned', 'plan_goal_text_changed',
  'plan_goal_text_submitted', 'plan_intent_linked_to_user', 'plan_intent_persisted',
  'plan_results_shared', 'plan_results_tool_saved', 'plan_step_back', 'plan_step_completed',
  'pricing_viewed', 'profile_tool_clicked', 'question_answered', 'question_asked',
  'recommendation_result_clicked', 'recommendation_step_completed', 'role_page_viewed',
  'saved_list_filtered', 'saved_tool_removed_from_list', 'search_no_results',
  'signup_email_entered', 'signup_method_selected', 'stack_exported', 'stack_viewed',
  'tool_alternative_clicked', 'tool_integration_link_clicked', 'tool_pricing_tier_hovered',
  'tool_screenshot_opened', 'tool_share_clicked', 'tool_show_more_alternatives',
  'tool_tab_switched', 'upgrade_clicked', 'workflow_generated', 'workflow_saved',
  'workflow_shared', 'workflow_voted',
  // NOTE: search_no_results is superseded by insights_zero_result_rate (counts
  // result_count='0' on search_query_submitted); kept as a stub, not wired.
  // 10.3.3 — typed-field event names defined in the fieldTextChanged() union
  // (lib/analytics.ts) but with no call site yet. search_query_typed and
  // plan_goal_typed ARE wired (search-bar.tsx, goal-input.tsx); these four
  // are reserved surfaces. Wire one → remove it here + add an EVENT_SCHEMAS
  // entry (the CI guard enforces both).
  'plan_free_text_typed', 'profile_field_typed', 'newsletter_email_typed',
  'compare_search_typed',
])

/** Events kept for historical rows but no longer emitted. */
export const DEPRECATED_EVENTS = new Set<string>([
  // 10.3.1 reality check — rows exist in user_events (last fired 2026-06-04)
  // but no emitter remains in the codebase (removed sentiment modal). Kept
  // here so the name's history is documented; it is intentionally NOT in
  // EVENT_SCHEMAS and NOT in the DB invariant I11 known set — if it ever
  // flows again, I11 flags it as an unknown event.
  'sentiment_modal_opened',
])
