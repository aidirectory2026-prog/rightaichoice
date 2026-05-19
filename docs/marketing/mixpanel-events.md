# Mixpanel — Events captured

**One of two canonical Mixpanel docs.** The other is [mixpanel-plan.md](mixpanel-plan.md) (implementation + dashboard).

Source of truth for event definitions: [`scripts/mixpanel/config/events.ts`](../../scripts/mixpanel/config/events.ts). This doc is the human-readable mirror.

---

## Why we track this much

The business goal is **selling user-behaviour data to AI tool vendors**. A vendor pitch like *"23 users on teams of 5-10 with $100-500/mo budget who currently use [Competitor X] told us they want to switch in the last 7 days"* is only buyable if we captured:
1. The user's intake context (skill, budget, team, industry, goal).
2. Every tool they mentioned they currently use.
3. The actual text of what they searched / asked AI chat / wrote in reviews.
4. Every tool they clicked, saved, compared, or visited externally.

That's why every event below carries the full payload (truncated to Mixpanel property limits), and why per-user `people.union()` accumulates running history (`existing_tools_history`, `all_search_queries_recent`, `ai_chat_tools_mentioned`, `tools_compared_with`).

## Privacy guardrails (baked into every event)

- **Never capture:** passwords, payment numbers, full credit card data, full SSNs
- **Always capture (with ToS consent):** emails, names, search queries, free-text inputs, tool names, chip values, dropdown selections, form field values
- **Truncate** free-text properties to ≤500 chars (≤1000 for review bodies) so each event fits Mixpanel's property size cap
- **Email handling:** full email goes to `$email` people property only; individual events carry `email_domain` only (e.g. `gmail.com`, `acme.io`) — that's the vendor-segment signal anyway

---

## Super-properties (auto-attached to EVERY event)

Set by [`mixpanel-provider.tsx`](../../components/providers/mixpanel-provider.tsx) and [`auth-provider.tsx`](../../components/providers/auth-provider.tsx).

| Property | Type | Source | Why |
|---|---|---|---|
| `app` | string | constant `'rightaichoice'` | multi-product splitter |
| `app_version` | string | `NEXT_PUBLIC_APP_VERSION` | regression attribution |
| `viewport` | string | `${width}x${height}` | device split |
| `env` | string | `NODE_ENV` | prod/preview/dev filter |
| `device_type` | string | computed from viewport: `mobile` (<640px) / `tablet` (<1024) / `desktop` | mobile vs desktop slicing on every funnel |
| `session_n` | number | per-tab counter, persisted via localStorage | nth-session attribution (cold vs returning) |
| `auth_state` | string | `'anon'` until `identify()` runs, then `'known'`; back to `'anon'` on `reset()` | logged-in vs anonymous slice without joining tables |
| `page_path` | string | updated on every route change | every event carries current page |
| `first_touch_referrer` | string | document.referrer at first visit | acquisition channel |
| `first_touch_landing` | string | first pathname | landing-page attribution |
| `first_touch_utm_*` | string × 5 | utm_source/medium/campaign/content/term at first visit | first-touch attribution |
| `last_touch_utm_*` | string × 5 | utm_* at current request | campaign attribution |

## People properties (per-user accumulators)

Set via `mixpanel.people.set()` and `mixpanel.people.union()`. These build over time into the per-user behavioural record that vendors buy.

### Identity
- `$email`, `$name`, `plan`, `role`, `is_admin`, `signup_at`

### Engagement counters
- `saves_count`, `stacks_count`, `reviews_count`, `comparisons_count`, `plans_completed_count`

### Milestones (set_once)
- `first_save_at`, `first_plan_at`, `first_visit_at`, `last_active_at`, `last_tool_visited`

### THE VENDOR-DATA ARRAYS (set via people.union())

| Property | Captures | Vendor value |
|---|---|---|
| `existing_tools_history` | Every tool name the user told us they currently use, accumulated across sessions (cap 50) | "users who currently use TOOL_X" → segment for X's competitors |
| `all_search_queries_recent` | Last 50 search queries they submitted | demand-signal segment |
| `tools_visited_externally` | Every tool slug they affiliate-clicked through to | proven buyer intent |
| `tools_compared_with` | Every comparison pair (e.g. `notion-vs-airtable`) | "users who compared X against Y" |
| `plan_use_cases_submitted` | Every goal text they entered in the planner (cap 20) | what they're trying to BUILD |
| `ai_chat_tools_mentioned` | Every tool slug they named in AI chat | unsolicited mention = strongest competitor signal |
| `reviews_submitted_for` | Every tool they reviewed | engaged advocate cohort |

### Segments (set, latest value wins)
- `plan_budget_segment`, `plan_team_segment`, `plan_industry_segment`, `plan_skill_segment` — derived from latest `plan_intake_submitted`

---

## Events — full catalog

### Identity (2)
- **`identify`** — fires from AuthProvider on user login. Properties: `$email`, `plan`. With Mixpanel project Identity Merge = Simplified, this also merges any pre-signup anon distinct_id into the user_id profile automatically.
- **`reset`** — fires on logout. Clears distinct_id; `auth_state` super-prop flips back to `'anon'`.

### Tool (10+)
- **`tool_page_viewed`** — `tool_id`, `tool_slug`
- **`tool_saved`** — `tool_id`, `tool_name`. Also fires server-side on `toggleSave` action (ad-block resilient; deterministic insert_id dedup).
- **`tool_unsaved`** — same shape
- **`tool_visit_clicked`** — `tool_id`, `tool_slug`, `source`. Affiliate-revenue event.
- **`tool_visit_redirected`** — server fire on `/api/tools/[slug]/visit` redirect. Source-of-truth for affiliate clicks.
- **`tool_tab_switched`** — `tool_slug`, `tab`, `source`, `time_on_previous_tab_ms` — which sections users read
- **`tool_faq_opened`** — `tool_slug`, `question_index`, `question_text` (first 200 chars). **Content gold:** which questions users ACTUALLY need answered on each tool.
- **`tool_pricing_tier_hovered`** — `tool_slug`, `tier_name`, `tier_price`, `position` — pricing-attention signal
- **`tool_alternative_clicked`** — `tool_slug`, `alternative_slug`, `position` — competitor signal
- **`tool_integration_link_clicked`** — `tool_slug`, `integration_name`, `integration_target_url` — third-party integration interest

### Plan flow — THE GOLDMINE (10)
The `/plan` flow captures everything the user enters about their stack-building intent.

- **`plan_started`** — `source`. Top of funnel.
- **`plan_chip_selected`** — fires on EVERY chip click (not just final submit). `step`, `chip_value`, `chip_label`, `chip_index`, `time_to_select_ms`. Captures decision indecision.
- **`plan_existing_tool_added`** — **VENDOR-GOLD EVENT.** `tool_name`, `matched_tool_slug` (null if user typed a product not in our catalog), `total_count`, `source` (`autocomplete` / `free_text` / `pasted`). Each fire union()s the name into `people.existing_tools_history`. "Users who told us they currently use TOOL_X" is a directly-segmentable cohort.
- **`plan_existing_tool_removed`** — distinguishes typos / accidental adds from intent
- **`plan_goal_text_submitted`** — `text` (up to 500 chars), `word_count`, `truncated`. The actual goal the user wrote.
- **`plan_intake_submitted`** — FULL payload: `skill_level`, `budget`, `team_size`, `industry`, `goal_type`, `goal_text`, `existing_tools[]`, `existing_tools_matched_slugs[]`, `existing_tools_unmatched[]`, `time_to_complete_intake_ms`. Also `people.set()`s the 4 segment properties.
- **`plan_step_completed`** — `step`, `step_index`. Per-stage progress.
- **`plan_step_back`** — `from_step`, `to_step`, `time_on_step_ms`, `fields_filled_in_from_step`. Friction signal.
- **`plan_completed`** — `use_case`, `tool_count`. Also fires server-side mirror.
- **`plan_results_displayed`** — `recommended_tool_slugs[]`, `recommendation_count`, `stages_count`, `use_case`, `matches_existing_tools[]`, `replaces_existing_tools[]`. **The recommendation set we shipped back.** Joins with intake for sellable insight.
- **`plan_results_tool_clicked`** — `tool_slug`, `position`, `recommendation_tier`, `stage_id`, `user_intake_use_case`, `user_intake_budget`, `user_intake_team`. **Click event enriched with the intake context** so per-event analysis doesn't need a join.
- **`plan_abandoned`** — `last_step`, `time_on_step_ms`, `fields_filled_count`. Funnel drop-off detail.

### Recommend wizard (3)
- **`recommendation_requested`** — `use_case`, `budget`, `level`, `result_count`, `result_tool_slugs[]`. Server mirror.
- **`recommendation_step_completed`** — `step` (`use_case`/`budget`/`skill_level`), `value`, `all_values_so_far`, `time_on_step_ms`
- **`recommendation_result_clicked`** — `tool_slug`, `position`, `use_case`, `budget`, `skill_level`

### Search (4)
- **`search_typing`** — DEBOUNCED 250ms. `current_query` (up to 200 chars), `current_length`, `source`. Captures abandoned searches.
- **`search_query_submitted`** — `query`, `query_length`, `query_word_count`, `result_count`, `zero_results`, `active_filters{}`, `source`
- **`search_result_clicked`** — `query`, `tool_slug`, `position`, `total_results`, `page_number`. union()s into `all_search_queries_recent`.
- **`search_no_results`** — `query`, `source`. Catalog-gap signal.

### Compare (5)
- **`compare_tool_added`** — `tool_slug`, `source`, `tray_count_before`, `tray_count_after`, `all_tools_in_tray[]`, `added_from_tool_page`
- **`compare_tool_removed`** — `tool_slug`, `tray_count`
- **`compare_tray_opened`** — `tray_count`. Once per session when items first appear.
- **`comparison_viewed`** — `tools[]`, `tools_count`, `is_editorial_compare`, `compare_slug`, `categories_represented[]`. union()s the comparison pair into `tools_compared_with`.
- **`compare_attribute_row_expanded`** — `attribute_name`, `tools[]`, `expanded_value`. **Vendor gold:** which spec rows users dig into when comparing.
- **`compare_share_clicked`** — `tools[]` and **`compare_csv_exported`** — `tools[]`, `count`

### Reviews (4)
- **`review_form_opened`** — `tool_id`, `tool_slug`, `source`
- **`review_rating_set`** — `tool_id`, `rating`, `time_to_rate_ms`. Mid-funnel signal.
- **`review_text_changed`** — `tool_id`, `length`, `word_count`. Debounced 2s engagement signal.
- **`review_submitted`** — `tool_id`, `tool_slug`, `rating`, `text` (up to 1000 chars), `pros_text`, `cons_text`, `recommended`, `use_case_tag`, `time_to_submit_ms`. Also fires server-side. union()s tool_slug into `reviews_submitted_for`.

### AI Chat (3)
- **`ai_chat_message`** — `intent`, `message_text` (up to 500 chars), `message_length`, `message_word_count`, `mentioned_tool_slugs[]`, `conversation_turn`, `is_follow_up`. union()s mentioned tools into `ai_chat_tools_mentioned`. **This is one of the highest-signal events: users telling us in their own words what they want from AI tools.**
- **`ai_chat_response_received`** — `tool_count_suggested`, `suggested_tool_slugs[]`, `response_length`, `latency_ms`
- **`ai_chat_tool_clicked`** — `tool_slug`, `position_in_response`, `user_message_text` (the prompt that led to the suggestion), `conversation_turn`

### Auth (8)
- **`signup_started`** — `source`
- **`signup_email_entered`** — `email_domain`, `method_intent`, `source`. Pre-auth segment signal.
- **`signup_method_selected`** — `method` (`email`/`google`/`github`), `source`
- **`signup_completed`** — server-side. `method`, `email_domain`, `signup_source`, `first_touch_utm_*`, `time_to_signup_from_first_visit_ms`, `pages_viewed_before_signup`, `tools_viewed_before_signup`, `used_plan_flow_before_signup`
- **`login_completed`** — server-side. `method`
- **`password_reset_requested`** — server-side. `method`
- **`password_reset_completed`** — server-side mirror
- **`email_verification_sent`** + **`email_verified`** — server-side

### Newsletter
- **`newsletter_subscribed`** — `source`, `email_domain` (vendor-segment signal), `page_path_at_subscribe`, `tool_slug_context`. Server mirror.

### Dashboard / Profile / Saved (7)
- **`dashboard_viewed`** — `has_saves`, `saves_count`, `has_plans`
- **`dashboard_widget_clicked`** — `widget_id`
- **`saved_list_viewed`** — `count`
- **`saved_list_filtered`** — `filter_type`, `value`
- **`saved_tool_removed_from_list`** — `tool_slug`, `position`
- **`profile_viewed`** — `username`, `is_own_profile`
- **`profile_tool_clicked`** — `profile_username`, `tool_slug`, `position`

### Viability (2)
- **`viability_badge_clicked`** — `tool_slug`, `badge` (`safe_bet` / `at_risk` / `rising`)
- **`viability_page_viewed`** — `slug`, `page_type` (`index` / `at_risk` / `safe_bets`)

### Stacks (3)
- **`stack_viewed`**, **`stack_saved`** (full `tool_slugs[]`), **`stack_exported`** (`format`, `tool_slugs`)

### Workflow (4)
- **`workflow_generated`**, **`workflow_saved`**, **`workflow_shared`**, **`workflow_voted`**

### Community (3)
- **`question_asked`**, **`question_answered`**, **`discussion_replied`**

### Navigation (2)
- **`nav_cta_clicked`**, **`hero_cta_clicked`** — `cta`, `source`

### Content (4)
- **`blog_post_viewed`** — `slug`
- **`blog_internal_link_clicked`** — `from_slug`, `to_path`
- **`best_page_viewed`**, **`role_page_viewed`** — `slug`

### Discovery (4)
- **`filter_applied`** — `filter_type`, `value`, `source`
- **`filter_no_results`** — `filters{}`, `source`
- **`category_viewed`**, **`collection_viewed`** — `slug`

### Strategic / Activation (6)
- **`activation_milestone`** — `milestone`, `value` (server too)
- **`onboarding_step_completed`**, **`onboarding_completed`**
- **`pricing_viewed`**, **`upgrade_clicked`**
- **`external_link_clicked`** — `url`, `entity`, `entity_id`

### System (6)
- **`page_viewed`** — every route change. Auto from MixpanelProvider.
- **`scroll_depth_reached`** — `path`, `depth` (25/50/75/100)
- **`time_on_page`** — `path`, `seconds`, `bucket`
- **`share_clicked`** — generic share. `entity`, `entity_id`, `channel`
- **`perf_mark`** — `marker`, `duration_ms`, `context`
- **`error_encountered`** — `boundary`, `message` (first 200 chars)
- **`form_field_changed`** + **`form_submitted`** — catch-all for forms not specifically wired

### Phase 8.d cross-cutting (pipeline observability)
Pipelines emit their own rows into Supabase `pipeline_runs`. Not Mixpanel events. See [`Phase8(site-overhaul-v2)/build-log.md`](../../../Phase8(site-overhaul-v2)/build-log.md).

---

## Adding a new event

1. Add to [`scripts/mixpanel/config/events.ts`](../../scripts/mixpanel/config/events.ts) — name, category, source, description, firesOn, whyItMatters, properties.
2. Add a typed method to [`lib/analytics.ts`](../../lib/analytics.ts).
3. Wire the call site.
4. Run `npm run mixpanel:lexicon` so Mixpanel's UI shows your description next to the event name.
5. Update this doc's catalog section if the event is high-signal.

## See also

- [`mixpanel-plan.md`](mixpanel-plan.md) — implementation, identity rules, dashboard map, alert specs, cost projection
- [`Phase8(site-overhaul-v2)/plan.md`](../../../Phase8(site-overhaul-v2)/plan.md) — the umbrella plan that produced this work (Phase 8.g)
