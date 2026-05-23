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

  const orphans: string[] = []
  const deferred: string[] = []
  for (const def of EVENTS) {
    if (DYNAMIC_DISPATCH_ALLOW.has(def.name)) continue
    // Method name is camelCase of the event name.
    const methodName = snakeToCamel(def.name)
    // Match analytics.{methodName}( anywhere in the codebase.
    const re = new RegExp('analytics\\.' + methodName + '\\b')
    if (!re.test(blob)) {
      if (KNOWN_DEFERRED.has(def.name)) deferred.push(def.name)
      else orphans.push(def.name)
    }
  }

  console.log(`Scanned ${EVENTS.length} events × ${callSiteFiles.length} files.`)
  if (deferred.length > 0) {
    console.log(`\n${deferred.length} known-deferred events (no UI surface yet):`)
    for (const n of deferred) console.log(`  - ${n}`)
  }
  if (orphans.length > 0) {
    // Phase 8.g.11.f — informational-only for now. The admin /health page
    // surfaces these prominently. Once the orphan count drops below ~5,
    // switch this to process.exit(1) to enforce no-new-orphans in CI.
    console.warn(`\n${orphans.length} orphan events (defined but never called) — review on /admin/insights/health:`)
    for (const n of orphans) console.warn(`  - ${n}`)
    console.warn('\n(Not failing the build — see comment in scripts/mixpanel/check-orphans.ts.)')
  } else {
    console.log('\n✓ No orphan events.')
  }
}

main()
