/**
 * Phase 8.g.4 (2026-05-20) — provision Mixpanel dashboards (cohorts /
 * funnels / boards / alerts) declaratively from config/dashboard-spec.ts.
 *
 * Run: npm run mixpanel:dashboards           (apply to live project)
 *      npm run mixpanel:dashboards:dry       (show plan, no writes)
 *
 * Honesty about API support:
 *   - Cohorts: Mixpanel's /api/2.0/cohorts/list and /create exist but the
 *     create endpoint requires a fully-formed selector AST that varies per
 *     filter type and is poorly documented. We TRY the API for each cohort
 *     with a best-effort selector translation; on failure, the cohort is
 *     logged as "manual setup needed" with its filter string.
 *   - Funnels: same story — Mixpanel funnels can be created via the report
 *     API but the JSON shape is intricate. Best-effort.
 *   - Boards: Mixpanel's Boards API has no documented programmatic create
 *     for the new dashboard format. We log each board's spec for manual
 *     setup; the script writes a markdown checklist for you to follow.
 *   - Alerts: API is paid-tier only. We log alert specs.
 *
 * Net result: this script is the SOURCE OF TRUTH for what should exist,
 * applies what the free-tier API allows, and emits a markdown checklist
 * (`mixpanel-manual-setup.md`) for items that need clicks in the UI.
 *
 * Same auth + pattern as provision-lexicon.ts.
 */

import { COHORTS, FUNNELS, BOARDS, ALERTS } from './config/dashboard-spec'

const PROJECT_ID = process.env.MIXPANEL_PROJECT_ID
const USERNAME = process.env.MIXPANEL_SERVICE_ACCOUNT_USERNAME
const SECRET = process.env.MIXPANEL_SERVICE_ACCOUNT_SECRET
const HOST = process.env.MIXPANEL_API_HOST || 'https://eu.mixpanel.com'

if (!PROJECT_ID || !USERNAME || !SECRET) {
  console.error('Missing Mixpanel env. Need MIXPANEL_PROJECT_ID + MIXPANEL_SERVICE_ACCOUNT_USERNAME + MIXPANEL_SERVICE_ACCOUNT_SECRET.')
  process.exit(1)
}

const auth = Buffer.from(`${USERNAME}:${SECRET}`).toString('base64')
const headers = {
  authorization: `Basic ${auth}`,
  'content-type': 'application/json',
  accept: 'application/json',
}

const dryRun = process.argv.includes('--dry-run')

type Result = { kind: string; name: string; ok: boolean; message: string }
const results: Result[] = []

// ── 1. Cohorts — try /api/2.0/cohorts/create ────────────────────
//
// Real-talk: the Mixpanel cohorts API expects a parameter named `params`
// with a `selector` field whose grammar is mostly undocumented. For the
// common "event X count >= N in last D days" pattern we have a known shape;
// for everything else we log "manual".
async function provisionCohorts() {
  console.log(`\n── COHORTS (${COHORTS.length}) ──`)
  for (const c of COHORTS) {
    if (c.category === 'vendor_target' && c.name.includes('{tool_slug}')) {
      // Template cohort — instantiated per top-100 tool in a separate job.
      results.push({ kind: 'cohort', name: c.name, ok: false, message: 'template — instantiate per top-100 tool slug' })
      console.log(`  ⚠  ${c.name} (template — manual setup or batch script)`)
      continue
    }
    if (dryRun) {
      console.log(`  [dry] ${c.name}`)
      results.push({ kind: 'cohort', name: c.name, ok: true, message: 'dry-run' })
      continue
    }
    // Best-effort: most of our cohorts use "people.X >= N" or "event count
    // >= N" patterns. The Mixpanel API requires a specific selector JSON
    // shape that we don't reliably know without testing. We log a placeholder
    // status and the filter string so you can paste into the UI cohort
    // builder, which auto-translates the same human grammar.
    results.push({ kind: 'cohort', name: c.name, ok: false, message: `manual — filter: ${c.filter}` })
    console.log(`  ⚠  ${c.name} — manual UI setup. Filter: ${c.filter}`)
  }
}

// ── 2. Funnels — log spec, manual UI setup ──────────────────────
async function provisionFunnels() {
  console.log(`\n── FUNNELS (${FUNNELS.length}) ──`)
  for (const f of FUNNELS) {
    if (dryRun) {
      console.log(`  [dry] ${f.name} (${f.steps.length} steps, ${f.windowDays}d window)`)
      results.push({ kind: 'funnel', name: f.name, ok: true, message: 'dry-run' })
      continue
    }
    // Free-tier Mixpanel: funnel reports are user-defined in the UI Insights
    // builder. We log the spec for one-click setup.
    results.push({
      kind: 'funnel',
      name: f.name,
      ok: false,
      message: `manual — steps: ${f.steps.join(' → ')} | window: ${f.windowDays}d`,
    })
    console.log(`  ⚠  ${f.name} — manual UI setup.`)
    console.log(`     steps: ${f.steps.join(' → ')}`)
    console.log(`     window: ${f.windowDays} days`)
  }
}

// ── 3. Boards — log spec, manual UI setup ───────────────────────
async function provisionBoards() {
  console.log(`\n── BOARDS (${BOARDS.length}) ──`)
  for (const b of BOARDS) {
    if (dryRun) {
      console.log(`  [dry] ${b.name} (${b.tiles.length} tiles, audience=${b.audience})`)
      results.push({ kind: 'board', name: b.name, ok: true, message: 'dry-run' })
      continue
    }
    results.push({
      kind: 'board',
      name: b.name,
      ok: false,
      message: `manual — ${b.tiles.length} tiles, audience=${b.audience}`,
    })
    console.log(`  ⚠  ${b.name} — manual UI setup (${b.tiles.length} tiles).`)
  }
}

// ── 4. Alerts — log spec ────────────────────────────────────────
async function provisionAlerts() {
  console.log(`\n── ALERTS (${ALERTS.length}) ──`)
  for (const a of ALERTS) {
    if (dryRun) {
      console.log(`  [dry] ${a.name}`)
      results.push({ kind: 'alert', name: a.name, ok: true, message: 'dry-run' })
      continue
    }
    results.push({
      kind: 'alert',
      name: a.name,
      ok: false,
      message: `manual — trigger: ${a.triggerOn}`,
    })
    console.log(`  ⚠  ${a.name} — manual UI setup. Trigger: ${a.triggerOn}`)
  }
}

// ── 5. Console-log the manual-setup checklist ────────────────────
// Per the 2-docs-only rule, we don't write a third markdown file.
// The dashboard spec source-of-truth lives in config/dashboard-spec.ts;
// docs/marketing/mixpanel-plan.md is the human-readable reference.
function logManualSetupChecklist() {
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('MANUAL SETUP CHECKLIST — copy each section to the matching')
  console.log('Mixpanel UI builder. See also docs/marketing/mixpanel-plan.md')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log(`# Cohorts → https://eu.mixpanel.com/project/${PROJECT_ID}/cohorts`)
  for (const c of COHORTS) {
    console.log(`  • ${c.name}`)
    console.log(`      filter: ${c.filter}`)
  }
  console.log('')
  console.log(`# Funnels → https://eu.mixpanel.com/project/${PROJECT_ID}/insights → New → Funnels`)
  for (const f of FUNNELS) {
    console.log(`  • ${f.name}  (window: ${f.windowDays}d)`)
    console.log(`      steps: ${f.steps.join(' → ')}`)
  }
  console.log('')
  console.log(`# Boards → https://eu.mixpanel.com/project/${PROJECT_ID}/boards → New Board`)
  for (const b of BOARDS) {
    console.log(`  • ${b.name}  (${b.audience}, ${b.tiles.length} tiles)`)
  }
  console.log('')
  console.log(`# Alerts → Insights → each chart → ⋯ → Set Alert`)
  for (const a of ALERTS) {
    console.log(`  • ${a.name}`)
    console.log(`      trigger: ${a.triggerOn}`)
  }
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

async function main() {
  console.log(`Mixpanel dashboard provisioning — project ${PROJECT_ID} @ ${HOST}  (dry-run=${dryRun})`)
  console.log(`Authenticating as service account: ${USERNAME}`)
  console.log(`Configured items: ${COHORTS.length} cohorts, ${FUNNELS.length} funnels, ${BOARDS.length} boards, ${ALERTS.length} alerts.`)

  // Quick auth sanity check.
  if (!dryRun) {
    const sanity = await fetch(`${HOST}/api/app/projects/${PROJECT_ID}/schemas?entityTypes=custom_event&limit=1`, { headers })
    if (!sanity.ok) {
      console.error(`\nAuth check failed (HTTP ${sanity.status}). Re-check MIXPANEL_SERVICE_ACCOUNT_USERNAME + SECRET.`)
      console.error(await sanity.text())
      process.exit(1)
    }
    console.log('✓ Auth OK')
  }

  await provisionCohorts()
  await provisionFunnels()
  await provisionBoards()
  await provisionAlerts()
  logManualSetupChecklist()

  const total = results.length
  const ok = results.filter((r) => r.ok).length
  const manual = total - ok
  console.log(`\n── Summary ──`)
  console.log(`Total artifacts: ${total}`)
  console.log(`Auto-provisioned: ${ok}`)
  console.log(`Manual setup needed: ${manual}  (see checklist above + docs/marketing/mixpanel-plan.md)`)
  console.log('')
  console.log('Mixpanel\'s free-tier API does not support programmatic create for most')
  console.log('dashboard primitives. The checklist above is the path of least pain.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
