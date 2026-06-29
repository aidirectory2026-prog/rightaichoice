/**
 * Phase 8.g.11.f (2026-05-23) — orphan-event detector.
 *
 * Reads the event catalog from scripts/mixpanel/config/events.ts and
 * greps the React tree for `analytics.{methodName}` call sites. Any
 * event whose method doesn't appear at any call site is flagged as
 * an "orphan" — defined in the lexicon, never fired.
 *
 * Exit codes:
 *   0 — all events are wired
 *   1 — orphans detected (build should fail)
 *
 * Run: npm run check:tracking-orphans
 */

import { EVENTS } from './config/events'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const ROOT = process.cwd()
const SCAN_DIRS = ['app', 'components', 'lib', 'actions']
const SCAN_EXTS = new Set(['.ts', '.tsx'])

// Allow-list of dynamic-dispatch event names that the grep wouldn't
// catch but are wired indirectly (e.g. via analytics.fieldTextChanged
// dispatching to one of six event_names by string).
const DYNAMIC_DISPATCH_ALLOW: Set<string> = new Set([
  'search_query_typed',
  'plan_goal_typed',
  'plan_free_text_typed',
  'profile_field_typed',
  'newsletter_email_typed',
  'compare_search_typed',
])

// Event names that the catalog defines but for which there's no UI
// surface yet — won't fail the build but will warn.
const KNOWN_DEFERRED: Set<string> = new Set([
  'tool_tab_switched',
  'tool_pricing_tier_hovered',
  'tool_alternative_clicked',
  'tool_show_more_alternatives',
  'tool_integration_link_clicked',
  'tool_screenshot_opened',
  'tool_share_clicked',
  'compare_attribute_row_expanded',
  'compare_csv_exported',
  'compare_tool_added_rich',
  'comparison_viewed_rich',
  'plan_results_tool_saved',
  'plan_results_shared',
  'plan_step_back',
  'recommendation_result_clicked',
  'ai_chat_tool_clicked_rich',
  'onboarding_step_completed',
  'onboarding_completed',
  'activation_milestone',
  'filter_no_results',
  'collection_viewed',
  'form_field_changed',
  'form_submitted',
  'form_validation_failed',
  'element_dwell',
  'dashboard_widget_clicked',
  'stack_tool_removed',
  'stack_exported',
  'embed_snippet_copied',
  // BUG-19 (Phase 13): lexicon-defined events with no call site yet, confirmed
  // against analytics-callsites.gen.json (no firing site) + the grep fallback.
  // Declaring them here lets the orphan gate flip to a hard exit(1) below so any
  // NEW undeclared orphan fails CI, while these known-pending events only warn.
  'plan_step_completed',
  'plan_abandoned',
  'recommendation_requested',
  'workflow_generated',
  'workflow_saved',
  'workflow_shared',
  'workflow_voted',
  'stack_viewed',
  'ai_chat_tool_suggested',
  'question_asked',
  'question_answered',
  'discussion_replied',
  'blog_post_viewed',
  'best_page_viewed',
  'role_page_viewed',
  'search_no_results',
  'empty_search',
  'pricing_viewed',
  'upgrade_clicked',
  'perf_mark',
])

function snakeToCamel(snake: string): string {
  return snake.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
}

function walkDir(dir: string, out: string[] = []): string[] {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const entry of entries) {
    if (entry.startsWith('.') || entry === 'node_modules') continue
    const full = join(dir, entry)
    let st
    try { st = statSync(full) } catch { continue }
    if (st.isDirectory()) walkDir(full, out)
    else if (SCAN_EXTS.has(entry.slice(entry.lastIndexOf('.')))) out.push(full)
  }
  return out
}

function main(): void {
  const allFiles: string[] = []
  for (const d of SCAN_DIRS) {
    walkDir(join(ROOT, d), allFiles)
  }
  // Skip lib/analytics.ts itself (where every method is defined).
  const callSiteFiles = allFiles.filter((f) => !f.endsWith('lib/analytics.ts'))
  const blob = callSiteFiles.map((f) => readFileSync(f, 'utf8')).join('\n')

  // BUG-19: primary source of truth is analytics-callsites.gen.json (written by
  // `npm run tracking:schema`). It records the ACTUAL firing method per event —
  // including `…Rich` wrappers and acronym camelCase that the regex grep below
  // would miss — so it eliminates false orphans. The grep is kept as a fallback
  // that additionally catches SDK methods (analytics.identify / .reset) which
  // aren't tracked as events in the gen file.
  let fired = new Set<string>()
  try {
    const gen = JSON.parse(readFileSync(join(ROOT, 'lib/analytics-callsites.gen.json'), 'utf8')) as Record<string, unknown[]>
    fired = new Set(Object.keys(gen).filter((k) => Array.isArray(gen[k]) && gen[k].length > 0))
  } catch {
    console.warn('⚠ analytics-callsites.gen.json missing/unreadable — run `npm run tracking:schema` first. Falling back to grep only.')
  }

  const orphans: string[] = []
  const deferred: string[] = []
  for (const def of EVENTS) {
    if (DYNAMIC_DISPATCH_ALLOW.has(def.name)) continue
    // Wired iff the gen file records a firing site OR the grep finds the call.
    const re = new RegExp('analytics\\.' + snakeToCamel(def.name) + '\\b')
    const wired = fired.has(def.name) || re.test(blob)
    if (!wired) {
      if (KNOWN_DEFERRED.has(def.name)) deferred.push(def.name)
      else orphans.push(def.name)
    }
  }

  console.log(`Scanned ${EVENTS.length} events × ${callSiteFiles.length} files (gen file: ${fired.size} fired).`)
  if (deferred.length > 0) {
    console.log(`\n${deferred.length} known-deferred events (no UI surface yet):`)
    for (const n of deferred) console.log(`  - ${n}`)
  }
  if (orphans.length > 0) {
    // BUG-19: now ENFORCED. Every known lexicon-defined-but-unsurfaced event is
    // declared in KNOWN_DEFERRED above, so a non-deferred orphan here is a NEW
    // one — either wire it, add it to KNOWN_DEFERRED, or remove it from the
    // lexicon. Failing the build keeps the catalog honest.
    console.error(`\n✗ ${orphans.length} NEW orphan event(s) — defined in the lexicon, no firing site:`)
    for (const n of orphans) console.error(`  - ${n}`)
    console.error('\nWire each one, add it to KNOWN_DEFERRED, or drop it from config/events.ts.')
    process.exit(1)
  }
  console.log('\n✓ No new orphan events.')
}

main()
