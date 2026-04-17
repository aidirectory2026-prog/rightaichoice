/**
 * Source-of-truth catalog for every Mixpanel event fired by RightAIChoice.
 * Paired with lib/analytics.ts (client) and lib/mixpanel-server.ts (server).
 *
 * Used by:
 *   - scripts/mixpanel/provision-lexicon.ts — writes descriptions into
 *     the Mixpanel Lexicon so team-members see purpose in the UI.
 *   - docs/marketing/tracking-mechanisms-and-goals.md — human-readable
 *     expansion of the same content.
 *
 * Adding an event: add a method to lib/analytics.ts, add an entry here,
 * add a row to the tracking doc. No event ships without all three.
 */

export type EventCategory =
  | 'identity'
  | 'tool'
  | 'compare'
  | 'plan'
  | 'workflow'
  | 'stack'
  | 'ai_chat'
  | 'community'
  | 'auth'
  | 'nav'
  | 'content'
  | 'search'
  | 'discovery'
  | 'strategic'
  | 'performance'
  | 'system'

export type EventSource = 'client' | 'server' | 'both'

export interface EventDef {
  name: string
  category: EventCategory
  source: EventSource
  description: string
  firesOn: string
  whyItMatters: string
  properties: PropertyDef[]
  /** Target monthly volume by month (Jun..Sep 2026). */
  targets?: { jun?: number; jul?: number; aug?: number; sep?: number }
}

export interface PropertyDef {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array'
  description: string
  example?: string | number | boolean | string[]
}

export const EVENTS: EventDef[] = [
  // ──────────────────────────────────────────────────────────────
  // Identity
  // ──────────────────────────────────────────────────────────────
  {
    name: 'identify',
    category: 'identity',
    source: 'client',
    description: 'Associates anonymous distinct_id with a known user_id after login/signup.',
    firesOn: 'AuthProvider mount when user is present.',
    whyItMatters: 'Without this, return visits look like new anonymous users and retention curves collapse.',
    properties: [
      { name: '$email', type: 'string', description: 'User email.' },
      { name: 'plan', type: 'string', description: 'Current plan.', example: 'free' },
    ],
  },
  {
    name: 'reset',
    category: 'identity',
    source: 'client',
    description: 'Clears distinct_id on sign-out so the next anon session is not attributed.',
    firesOn: 'AuthProvider mount when user is null.',
    whyItMatters: 'Prevents cross-user contamination on shared devices.',
    properties: [],
  },

  // ──────────────────────────────────────────────────────────────
  // Tool
  // ──────────────────────────────────────────────────────────────
  {
    name: 'tool_page_viewed',
    category: 'tool',
    source: 'client',
    description: 'Rendered a /tools/[slug] detail page.',
    firesOn: 'Client mount of the tool detail route.',
    whyItMatters: 'Denominator for every tool-level funnel (save rate, visit rate).',
    properties: [
      { name: 'tool_id', type: 'string', description: 'UUID of the tool.' },
      { name: 'tool_slug', type: 'string', description: 'URL slug of the tool.', example: 'chatgpt' },
    ],
  },
  {
    name: 'tool_saved',
    category: 'tool',
    source: 'client',
    description: 'User saved a tool to their library.',
    firesOn: 'Save button click on any tool card / detail page.',
    whyItMatters: 'Strongest free-tier engagement proxy — predicts week-2 retention.',
    properties: [
      { name: 'tool_id', type: 'string', description: 'UUID of the tool.' },
      { name: 'tool_name', type: 'string', description: 'Human-readable tool name.' },
    ],
  },
  {
    name: 'tool_unsaved',
    category: 'tool',
    source: 'client',
    description: 'User removed a tool from their library.',
    firesOn: 'Unsave button click.',
    whyItMatters: 'Indicates decision reversal — watch for spikes after ranking changes.',
    properties: [
      { name: 'tool_id', type: 'string', description: 'UUID of the tool.' },
      { name: 'tool_name', type: 'string', description: 'Human-readable tool name.' },
    ],
  },
  {
    name: 'tool_visit_clicked',
    category: 'tool',
    source: 'both',
    description: 'Clicked "Visit Website" on a tool card/detail page (affiliate link).',
    firesOn: 'Click on visit CTA. Server pair fires on /api/tools/[slug]/visit redirect.',
    whyItMatters: 'Revenue-adjacent — every click is a potential affiliate conversion.',
    properties: [
      { name: 'tool_id', type: 'string', description: 'UUID of the tool.' },
      { name: 'tool_slug', type: 'string', description: 'URL slug.' },
      { name: 'source', type: 'string', description: 'Where the CTA was clicked.', example: 'tool_detail' },
    ],
    targets: { jun: 400, jul: 900, aug: 1800, sep: 3500 },
  },
  {
    name: 'tool_visit_redirected',
    category: 'tool',
    source: 'server',
    description: 'Authoritative server-side pairing of tool_visit_clicked fired from the affiliate redirect handler.',
    firesOn: 'Server hit on /api/tools/[slug]/visit before the 302 redirect.',
    whyItMatters: 'Ad-blockers kill client events; this is the source of truth for revenue reports.',
    properties: [
      { name: 'tool_slug', type: 'string', description: 'URL slug.' },
      { name: 'referrer_path', type: 'string', description: 'Path the click came from.' },
      { name: 'source', type: 'string', description: 'Always "server".' },
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // Compare
  // ──────────────────────────────────────────────────────────────
  {
    name: 'compare_tool_added',
    category: 'compare',
    source: 'client',
    description: 'User added a tool to the compare tray.',
    firesOn: 'Compare tray add button.',
    whyItMatters: 'Tray depth is proxy for serious research intent.',
    properties: [
      { name: 'tool_slug', type: 'string', description: 'URL slug of added tool.' },
      { name: 'tray_count', type: 'number', description: 'Tray size after adding.' },
    ],
  },
  {
    name: 'compare_tool_removed',
    category: 'compare',
    source: 'client',
    description: 'User removed a tool from the compare tray.',
    firesOn: 'Compare tray remove button.',
    whyItMatters: 'Churn within session — high remove rate hints at UX friction.',
    properties: [
      { name: 'tool_slug', type: 'string', description: 'URL slug of removed tool.' },
      { name: 'tray_count', type: 'number', description: 'Tray size after removing.' },
    ],
  },
  {
    name: 'comparison_viewed',
    category: 'compare',
    source: 'client',
    description: 'User landed on /compare and saw a rendered comparison.',
    firesOn: 'Client mount of /compare with ≥2 tools.',
    whyItMatters: 'Activation event — users who hit this retain 3–5× better.',
    properties: [
      { name: 'tools', type: 'string', description: 'Comma-separated slugs.' },
      { name: 'count', type: 'number', description: 'Number of tools compared.' },
    ],
  },
  {
    name: 'compare_share_clicked',
    category: 'compare',
    source: 'client',
    description: 'User clicked share on a /compare view.',
    firesOn: 'Share button on comparison page.',
    whyItMatters: 'Viral loop entry point — each share = potential new visitor.',
    properties: [{ name: 'tools', type: 'string', description: 'Comma-separated slugs.' }],
  },

  // ──────────────────────────────────────────────────────────────
  // Plan / Recommendation
  // ──────────────────────────────────────────────────────────────
  {
    name: 'plan_started',
    category: 'plan',
    source: 'client',
    description: 'User entered /plan wizard.',
    firesOn: 'Plan wizard mount.',
    whyItMatters: 'Top of the plan funnel.',
    properties: [{ name: 'source', type: 'string', description: 'Where the wizard was entered from.', example: 'hero_cta' }],
  },
  {
    name: 'plan_step_completed',
    category: 'plan',
    source: 'client',
    description: 'User completed a wizard step.',
    firesOn: 'Each step transition inside the plan wizard.',
    whyItMatters: 'Identifies step-level drop-offs so we can fix the worst one.',
    properties: [
      { name: 'step', type: 'string', description: 'Step id.', example: 'use_case' },
      { name: 'step_index', type: 'number', description: '0-based index.' },
    ],
  },
  {
    name: 'plan_completed',
    category: 'plan',
    source: 'client',
    description: 'User finished the plan wizard and saw results.',
    firesOn: 'Final step submit.',
    whyItMatters: 'Activation event. Strongest single-session value signal we have.',
    properties: [
      { name: 'use_case', type: 'string', description: 'User-selected use case.' },
      { name: 'tool_count', type: 'number', description: 'Tools recommended.' },
    ],
    targets: { jun: 80, jul: 200, aug: 450, sep: 900 },
  },
  {
    name: 'plan_abandoned',
    category: 'plan',
    source: 'client',
    description: 'User unmounted the plan wizard before completion.',
    firesOn: 'Unmount with last-step state.',
    whyItMatters: 'Complement of plan_completed — prioritise UX fixes on the last step before exit.',
    properties: [{ name: 'last_step', type: 'string', description: 'Last step reached.' }],
  },
  {
    name: 'recommendation_requested',
    category: 'plan',
    source: 'client',
    description: 'User submitted the /recommend single-form entrypoint.',
    firesOn: '/recommend form submit.',
    whyItMatters: 'Direct demand signal — what problems people actually want solved.',
    properties: [
      { name: 'use_case', type: 'string', description: 'Use case text.' },
      { name: 'budget', type: 'string', description: 'Budget band.', example: 'under_20' },
      { name: 'level', type: 'string', description: 'Skill level.', example: 'beginner' },
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // Workflow
  // ──────────────────────────────────────────────────────────────
  {
    name: 'workflow_generated',
    category: 'workflow',
    source: 'client',
    description: 'AI generated a workflow for a user goal.',
    firesOn: 'Workflow builder "Generate" response received.',
    whyItMatters: 'Volume of AI workflow invocations.',
    properties: [
      { name: 'goal', type: 'string', description: 'User-provided goal.' },
      { name: 'step_count', type: 'number', description: 'Number of generated steps.' },
    ],
  },
  {
    name: 'workflow_saved',
    category: 'workflow',
    source: 'client',
    description: 'User persisted a workflow.',
    firesOn: 'Workflow Save button.',
    whyItMatters: 'Non-throwaway usage — users valuing the output enough to keep it.',
    properties: [{ name: 'workflow_id', type: 'string', description: 'Saved workflow id.' }],
  },
  {
    name: 'workflow_shared',
    category: 'workflow',
    source: 'client',
    description: 'User shared a workflow externally.',
    firesOn: 'Workflow share CTA.',
    whyItMatters: 'Viral loop — each share is a free acquisition channel.',
    properties: [
      { name: 'workflow_id', type: 'string', description: 'Workflow id.' },
      { name: 'channel', type: 'string', description: 'Share channel.', example: 'twitter' },
    ],
  },
  {
    name: 'workflow_voted',
    category: 'workflow',
    source: 'client',
    description: 'User upvoted/downvoted a community workflow.',
    firesOn: 'Vote button on workflow card.',
    whyItMatters: 'Community engagement ratio + ranking feedback.',
    properties: [
      { name: 'workflow_id', type: 'string', description: 'Workflow id.' },
      { name: 'direction', type: 'string', description: 'up or down.' },
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // Stacks
  // ──────────────────────────────────────────────────────────────
  {
    name: 'stack_viewed',
    category: 'stack',
    source: 'client',
    description: 'User viewed a stack detail page.',
    firesOn: 'Stack page mount.',
    whyItMatters: 'SEO landing quality indicator.',
    properties: [{ name: 'stack_slug', type: 'string', description: 'URL slug.' }],
  },
  {
    name: 'stack_saved',
    category: 'stack',
    source: 'client',
    description: 'User saved a stack to their library.',
    firesOn: 'Stack Save button.',
    whyItMatters: 'Stickiness — users returning to assembled stacks.',
    properties: [{ name: 'stack_slug', type: 'string', description: 'URL slug.' }],
  },
  {
    name: 'stack_exported',
    category: 'stack',
    source: 'client',
    description: 'User exported a stack (CSV, Notion, markdown).',
    firesOn: 'Export CTA.',
    whyItMatters: 'Highest-intent signal — user is acting on the stack.',
    properties: [
      { name: 'stack_slug', type: 'string', description: 'URL slug.' },
      { name: 'format', type: 'string', description: 'Export format.', example: 'csv' },
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // AI chat
  // ──────────────────────────────────────────────────────────────
  {
    name: 'ai_chat_message',
    category: 'ai_chat',
    source: 'client',
    description: 'User sent a message to the AI chat.',
    firesOn: 'Chat send button.',
    whyItMatters: 'Volume + intent clustering input.',
    properties: [{ name: 'intent', type: 'string', description: 'Classified intent.', example: 'recommendation' }],
  },
  {
    name: 'ai_chat_tool_suggested',
    category: 'ai_chat',
    source: 'client',
    description: 'The AI suggested a tool inside a chat turn.',
    firesOn: 'Model response parsed for tool mentions.',
    whyItMatters: 'Model quality check — is the bot actually recommending tools?',
    properties: [{ name: 'tool_slug', type: 'string', description: 'URL slug.' }],
  },
  {
    name: 'ai_chat_tool_clicked',
    category: 'ai_chat',
    source: 'client',
    description: 'User clicked a tool link inside an AI chat response.',
    firesOn: 'Click on tool in chat.',
    whyItMatters: 'Recommendation → action conversion. <10% means recs are poor.',
    properties: [{ name: 'tool_slug', type: 'string', description: 'URL slug.' }],
  },

  // ──────────────────────────────────────────────────────────────
  // Community
  // ──────────────────────────────────────────────────────────────
  {
    name: 'review_submitted',
    category: 'community',
    source: 'both',
    description: 'User submitted a tool review.',
    firesOn: 'Review form submit. Server pair fires from actions/reviews.ts.',
    whyItMatters: 'UGC volume — drives long-tail SEO.',
    properties: [
      { name: 'tool_id', type: 'string', description: 'UUID.' },
      { name: 'rating', type: 'number', description: '1–5.' },
    ],
  },
  {
    name: 'question_asked',
    category: 'community',
    source: 'client',
    description: 'User posted a question in Q&A.',
    firesOn: 'Question submit form.',
    whyItMatters: 'Top of community health ratio (asked vs answered).',
    properties: [{ name: 'category', type: 'string', description: 'Q&A category.' }],
  },
  {
    name: 'question_answered',
    category: 'community',
    source: 'client',
    description: 'User answered a Q&A question.',
    firesOn: 'Answer submit form.',
    whyItMatters: 'Bottom of community health ratio.',
    properties: [{ name: 'question_id', type: 'string', description: 'Question id.' }],
  },
  {
    name: 'discussion_replied',
    category: 'community',
    source: 'client',
    description: 'User replied in a discussion thread.',
    firesOn: 'Reply submit form.',
    whyItMatters: 'Retention signal — repeat engagement.',
    properties: [{ name: 'discussion_id', type: 'string', description: 'Thread id.' }],
  },

  // ──────────────────────────────────────────────────────────────
  // Auth
  // ──────────────────────────────────────────────────────────────
  {
    name: 'signup_started',
    category: 'auth',
    source: 'client',
    description: 'User opened the signup form / modal.',
    firesOn: 'Signup route mount or modal open.',
    whyItMatters: 'Top of auth funnel.',
    properties: [{ name: 'source', type: 'string', description: 'Where signup was initiated.', example: 'hero_cta' }],
  },
  {
    name: 'signup_completed',
    category: 'auth',
    source: 'both',
    description: 'Authoritative signup confirmation.',
    firesOn: 'Supabase auth callback. Server pair fires from actions/auth.ts.',
    whyItMatters: 'Ad-blocker safe — server-side fire is the source of truth for signup metrics.',
    properties: [{ name: 'method', type: 'string', description: 'Auth method.', example: 'google' }],
    targets: { jun: 120, jul: 300, aug: 700, sep: 1500 },
  },
  {
    name: 'login_completed',
    category: 'auth',
    source: 'both',
    description: 'Returning user signed in.',
    firesOn: 'Auth callback after non-signup session creation.',
    whyItMatters: 'Return-visit signal feeding into retention curves.',
    properties: [{ name: 'method', type: 'string', description: 'Auth method.' }],
  },

  // ──────────────────────────────────────────────────────────────
  // Nav / CTAs
  // ──────────────────────────────────────────────────────────────
  {
    name: 'nav_cta_clicked',
    category: 'nav',
    source: 'client',
    description: 'Click on any persistent navigation CTA.',
    firesOn: 'Header / mobile-nav CTA click.',
    whyItMatters: 'Signals which persistent CTA actually pulls traffic.',
    properties: [
      { name: 'cta', type: 'string', description: 'CTA identifier.' },
      { name: 'source', type: 'string', description: 'header | mobile-nav | footer.' },
    ],
  },
  {
    name: 'hero_cta_clicked',
    category: 'nav',
    source: 'client',
    description: 'Click on a homepage hero CTA.',
    firesOn: 'Hero primary/secondary CTA.',
    whyItMatters: 'A/B input — which homepage variant converts.',
    properties: [
      { name: 'cta', type: 'string', description: 'CTA label.' },
      { name: 'variant', type: 'string', description: 'Experiment variant id.' },
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // Content / Blog / SEO
  // ──────────────────────────────────────────────────────────────
  {
    name: 'blog_post_viewed',
    category: 'content',
    source: 'client',
    description: 'User viewed a blog post.',
    firesOn: 'Blog post route mount.',
    whyItMatters: 'Baseline for content depth/time analysis.',
    properties: [{ name: 'slug', type: 'string', description: 'Post slug.' }],
  },
  {
    name: 'blog_internal_link_clicked',
    category: 'content',
    source: 'client',
    description: 'Internal link clicked from blog body.',
    firesOn: 'Blog post internal anchor click.',
    whyItMatters: 'Inbound funnel strength from content to product pages.',
    properties: [
      { name: 'from_slug', type: 'string', description: 'Source post.' },
      { name: 'to_path', type: 'string', description: 'Target path.' },
    ],
  },
  {
    name: 'best_page_viewed',
    category: 'content',
    source: 'client',
    description: 'Viewed a /best/* landing page.',
    firesOn: '/best/[slug] mount.',
    whyItMatters: 'SEO landing performance — highest-intent keyword surface.',
    properties: [{ name: 'slug', type: 'string', description: 'Best-of page slug.' }],
  },
  {
    name: 'role_page_viewed',
    category: 'content',
    source: 'client',
    description: 'Viewed a role-based landing page.',
    firesOn: '/for/[role] mount.',
    whyItMatters: 'Role-based acquisition funnels.',
    properties: [{ name: 'slug', type: 'string', description: 'Role slug.' }],
  },

  // ──────────────────────────────────────────────────────────────
  // Search
  // ──────────────────────────────────────────────────────────────
  {
    name: 'search_query_submitted',
    category: 'search',
    source: 'client',
    description: 'User submitted a search query.',
    firesOn: 'Search bar submit.',
    whyItMatters: 'Demand signal + query→click conversion baseline.',
    properties: [
      { name: 'query', type: 'string', description: 'First 100 chars of query.' },
      { name: 'result_count', type: 'number', description: 'Results returned.' },
      { name: 'source', type: 'string', description: 'Where search was invoked.' },
    ],
  },
  {
    name: 'search_result_clicked',
    category: 'search',
    source: 'client',
    description: 'User clicked a search result.',
    firesOn: 'Click on result list item.',
    whyItMatters: 'Click position + CTR per position — ranking quality.',
    properties: [
      { name: 'query', type: 'string', description: 'First 100 chars.' },
      { name: 'tool_slug', type: 'string', description: 'Clicked tool slug.' },
      { name: 'position', type: 'number', description: '1-based rank.' },
    ],
  },
  {
    name: 'search_no_results',
    category: 'search',
    source: 'client',
    description: 'Query returned zero results.',
    firesOn: 'Search response with result_count === 0.',
    whyItMatters: 'Content-gap detector — top empty queries = next tools to ingest.',
    properties: [
      { name: 'query', type: 'string', description: 'First 100 chars.' },
      { name: 'source', type: 'string', description: 'Where search was invoked.' },
    ],
  },
  {
    name: 'empty_search',
    category: 'search',
    source: 'client',
    description: 'Alias for search_no_results retained for back-compat.',
    firesOn: 'Same as search_no_results.',
    whyItMatters: 'Legacy — prefer search_no_results for new dashboards.',
    properties: [
      { name: 'query', type: 'string', description: 'First 100 chars.' },
      { name: 'source', type: 'string', description: 'Where search was invoked.' },
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // Discovery
  // ──────────────────────────────────────────────────────────────
  {
    name: 'filter_applied',
    category: 'discovery',
    source: 'client',
    description: 'User applied a filter (category, price, tag, etc.).',
    firesOn: 'Filter chip toggle.',
    whyItMatters: 'Discovery patterns — which filters are actually used.',
    properties: [
      { name: 'filter_type', type: 'string', description: 'Filter category.' },
      { name: 'value', type: 'string', description: 'Applied value.' },
      { name: 'source', type: 'string', description: 'Listing page id.' },
    ],
  },
  {
    name: 'filter_no_results',
    category: 'discovery',
    source: 'client',
    description: 'Applied filter set returned zero tools.',
    firesOn: 'Listing render with 0 items and ≥1 active filter.',
    whyItMatters: 'Inventory gap — users asking for tools we do not have.',
    properties: [
      { name: 'filters', type: 'string', description: 'Serialised filter state.' },
      { name: 'source', type: 'string', description: 'Listing page id.' },
    ],
  },
  {
    name: 'category_viewed',
    category: 'discovery',
    source: 'client',
    description: 'User viewed a category listing.',
    firesOn: '/category/[slug] mount.',
    whyItMatters: 'SEO surface health per category.',
    properties: [{ name: 'slug', type: 'string', description: 'Category slug.' }],
  },
  {
    name: 'collection_viewed',
    category: 'discovery',
    source: 'client',
    description: 'User viewed an editorial collection.',
    firesOn: '/collections/[slug] mount.',
    whyItMatters: 'Editorial lift — measure how much a collection pulls vs a category.',
    properties: [{ name: 'slug', type: 'string', description: 'Collection slug.' }],
  },

  // ──────────────────────────────────────────────────────────────
  // Strategic / high-level
  // ──────────────────────────────────────────────────────────────
  {
    name: 'activation_milestone',
    category: 'strategic',
    source: 'both',
    description: 'User hit an activation milestone.',
    firesOn: 'First time user hits: save 1 tool, compare 3 tools, complete 1 plan, save 1 workflow.',
    whyItMatters: 'North-star activation — users hitting ≥1 milestone retain 3–5× better.',
    properties: [
      { name: 'milestone', type: 'string', description: 'Milestone id.', example: 'first_tool_saved' },
      { name: 'value', type: 'number', description: 'Optional numeric context.' },
    ],
  },
  {
    name: 'onboarding_step_completed',
    category: 'strategic',
    source: 'client',
    description: 'Step inside the onboarding flow completed.',
    firesOn: 'Each onboarding step submit.',
    whyItMatters: 'Per-step drop-off detection.',
    properties: [
      { name: 'step', type: 'string', description: 'Step id.' },
      { name: 'step_index', type: 'number', description: '0-based.' },
    ],
  },
  {
    name: 'onboarding_completed',
    category: 'strategic',
    source: 'client',
    description: 'User finished onboarding.',
    firesOn: 'Final onboarding step submit.',
    whyItMatters: 'Separates "curious visitor" from "setup user."',
    properties: [{ name: 'path', type: 'string', description: 'Onboarding variant path.' }],
  },
  {
    name: 'pricing_viewed',
    category: 'strategic',
    source: 'client',
    description: 'User viewed /pricing.',
    firesOn: '/pricing mount.',
    whyItMatters: 'Monetisation intent.',
    properties: [{ name: 'source', type: 'string', description: 'Where the user came from.' }],
  },
  {
    name: 'upgrade_clicked',
    category: 'strategic',
    source: 'client',
    description: 'User clicked an upgrade CTA.',
    firesOn: 'Upgrade button click.',
    whyItMatters: 'Pre-revenue conversion signal.',
    properties: [
      { name: 'plan', type: 'string', description: 'Target plan id.' },
      { name: 'source', type: 'string', description: 'Click origin.' },
    ],
  },
  {
    name: 'newsletter_subscribed',
    category: 'strategic',
    source: 'client',
    description: 'User submitted newsletter signup.',
    firesOn: 'Newsletter form submit.',
    whyItMatters: 'Cheapest re-engagement channel.',
    properties: [{ name: 'source', type: 'string', description: 'Form placement.' }],
  },
  {
    name: 'external_link_clicked',
    category: 'strategic',
    source: 'client',
    description: 'Outbound link clicked outside the affiliate visit path.',
    firesOn: 'Click on any external anchor not covered by tool_visit_clicked.',
    whyItMatters: 'Identifies leaks to competitors and referral traffic we send out.',
    properties: [
      { name: 'url', type: 'string', description: 'Destination URL.' },
      { name: 'entity', type: 'string', description: 'Entity type.', example: 'blog_post' },
      { name: 'entity_id', type: 'string', description: 'Entity id/slug.' },
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // Page / behavior
  // ──────────────────────────────────────────────────────────────
  {
    name: 'page_viewed',
    category: 'system',
    source: 'client',
    description: 'Any client-side pageview (SPA navigation + initial load).',
    firesOn: 'Every pathname/searchParams change.',
    whyItMatters: 'WAU/MAU and top-of-funnel measurement.',
    properties: [
      { name: 'path', type: 'string', description: 'Pathname.' },
      { name: 'url', type: 'string', description: 'Full URL with query.' },
      { name: 'referrer', type: 'string', description: 'document.referrer at time of nav.' },
    ],
  },
  {
    name: 'scroll_depth_reached',
    category: 'content',
    source: 'client',
    description: 'User scrolled past 25/50/75/100% of a long page.',
    firesOn: 'IntersectionObserver on marker elements.',
    whyItMatters: 'Content-quality signal for blog and /best pages.',
    properties: [
      { name: 'path', type: 'string', description: 'Pathname.' },
      { name: 'depth', type: 'number', description: '25 | 50 | 75 | 100.' },
    ],
  },
  {
    name: 'time_on_page',
    category: 'content',
    source: 'client',
    description: 'Time spent on a page, fired on pagehide/unload.',
    firesOn: 'pagehide listener; uses performance.now() baseline.',
    whyItMatters: 'Engagement quality — paired with scroll_depth_reached.',
    properties: [
      { name: 'path', type: 'string', description: 'Pathname.' },
      { name: 'seconds', type: 'number', description: 'Floor of seconds.' },
      { name: 'bucket', type: 'string', description: 'Coarse bucket for dashboards.' },
    ],
  },
  {
    name: 'share_clicked',
    category: 'strategic',
    source: 'client',
    description: 'Generic share CTA click (entity-agnostic).',
    firesOn: 'Any share button not covered by compare_share_clicked.',
    whyItMatters: 'Cross-surface virality measure.',
    properties: [
      { name: 'entity', type: 'string', description: 'Entity type.' },
      { name: 'entity_id', type: 'string', description: 'Entity id/slug.' },
      { name: 'channel', type: 'string', description: 'twitter, linkedin, etc.' },
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // Performance / errors
  // ──────────────────────────────────────────────────────────────
  {
    name: 'perf_mark',
    category: 'performance',
    source: 'client',
    description: 'Ad-hoc perf marker for critical client paths.',
    firesOn: 'Explicit analytics.perfMark() call.',
    whyItMatters: 'Correlate drop-offs with latency on AI chat / plan flows.',
    properties: [
      { name: 'marker', type: 'string', description: 'Marker id.' },
      { name: 'duration_ms', type: 'number', description: 'Duration in ms.' },
      { name: 'context', type: 'string', description: 'Optional context.' },
    ],
  },
  {
    name: 'error_encountered',
    category: 'performance',
    source: 'client',
    description: 'Error boundary caught an unhandled error.',
    firesOn: 'Client error boundary.',
    whyItMatters: 'Correlate quality regressions with funnel drop-offs.',
    properties: [
      { name: 'boundary', type: 'string', description: 'Boundary name.' },
      { name: 'message', type: 'string', description: 'First 200 chars of error message.' },
    ],
  },
]
