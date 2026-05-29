/**
 * Phase 9.A.2 — Event-registry CI guard.
 *
 * Closes the "38 of ~99 events ever fire / dashboard reads an event that never
 * fires" gap (e.g. plan_results_tool_clicked was a dead funnel step). It derives
 * the truth from the code and enforces three invariants against the declarative
 * registry in lib/analytics-registry.ts:
 *
 *   1. ADMIN_CONSUMED ⊆ DEFINED          (typo guard — dashboard names a real event)
 *   2. ADMIN_CONSUMED ⊆ FIRED            (no dashboard depends on a never-firing event)
 *   3. DEFINED ⊆ FIRED ∪ PLANNED ∪ DEPRECATED   (every event is wired OR explicitly acknowledged)
 *
 * Run: `npx tsx scripts/audit/verify-event-registry.ts`  (exit 1 on violation)
 * Wired into .github/workflows/tracking-watchdog.yml.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ADMIN_CONSUMED_EVENTS, PLANNED_EVENTS, DEPRECATED_EVENTS } from '../../lib/analytics-registry'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

function read(p: string): string {
  try { return readFileSync(join(ROOT, p), 'utf8') } catch { return '' }
}

// ── DEFINED: every event-name literal the code emits ───────────────────────
const analyticsSrc = read('lib/analytics.ts')
const serverSrc = read('lib/mixpanel-server.ts')
const defined = new Set<string>()
for (const m of analyticsSrc.matchAll(/capture\('([a-z_]+)'/g)) defined.add(m[1])
for (const m of serverSrc.matchAll(/event: '([a-z_]+)'/g)) defined.add(m[1])

// ── method → event map (each analytics.X method emits one event) ───────────
// Single pass: remember the most recent `methodName(` and bind the next capture.
const methodToEvent = new Map<string, string>()
{
  let currentMethod: string | null = null
  for (const line of analyticsSrc.split('\n')) {
    const mDef = line.match(/^\s{2}([a-zA-Z][a-zA-Z0-9]*)\s*[(:]/) // 2-space indent method
    if (mDef) currentMethod = mDef[1]
    const mCap = line.match(/capture\('([a-z_]+)'/)
    if (mCap && currentMethod) methodToEvent.set(currentMethod, mCap[1])
  }
}

// ── FIRED: events whose emitting method has a call site in app/ or components/
function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, name)
    const full = join(ROOT, rel)
    if (statSync(full).isDirectory()) { if (!name.startsWith('.') && name !== 'node_modules') walk(rel, acc) }
    else if (/\.(tsx?|ts)$/.test(name)) acc.push(rel)
  }
  return acc
}
const callSiteFiles = [...walk('app'), ...walk('components')]
  .filter((f) => f !== 'lib/analytics.ts')
const callSiteBlob = callSiteFiles.map(read).join('\n')

const calledMethods = new Set<string>()
for (const [method] of methodToEvent) {
  if (new RegExp(`analytics\\.${method}\\b`).test(callSiteBlob)) calledMethods.add(method)
}
const fired = new Set<string>()
for (const [method, event] of methodToEvent) if (calledMethods.has(method)) fired.add(event)
// server-side emitters always fire from server routes
for (const m of serverSrc.matchAll(/event: '([a-z_]+)'/g)) fired.add(m[1])

// ── Enforce ────────────────────────────────────────────────────────────────
const errors: string[] = []
const warnings: string[] = []

for (const e of ADMIN_CONSUMED_EVENTS) {
  if (!defined.has(e)) errors.push(`ADMIN_CONSUMED "${e}" is not DEFINED in analytics.ts/mixpanel-server.ts (typo or removed).`)
  else if (!fired.has(e)) errors.push(`ADMIN_CONSUMED "${e}" is never FIRED (no call site) — a dashboard depends on a dead event.`)
}
for (const e of defined) {
  if (!fired.has(e) && !PLANNED_EVENTS.has(e) && !DEPRECATED_EVENTS.has(e)) {
    errors.push(`DEFINED "${e}" never fires and is not marked PLANNED/DEPRECATED — wire a call site or add it to PLANNED_EVENTS.`)
  }
}
for (const e of PLANNED_EVENTS) {
  if (fired.has(e)) warnings.push(`PLANNED "${e}" now fires — promote it out of PLANNED_EVENTS.`)
  if (!defined.has(e)) warnings.push(`PLANNED "${e}" is not defined in analytics.ts (stale entry).`)
}

console.log(`event-registry: ${defined.size} defined, ${fired.size} fired, ${PLANNED_EVENTS.size} planned, ${ADMIN_CONSUMED_EVENTS.size} admin-consumed.`)
if (warnings.length) { console.log('\nWARNINGS:'); warnings.forEach((w) => console.log('  ⚠ ' + w)) }
if (errors.length) {
  console.error('\nERRORS:'); errors.forEach((e) => console.error('  ✗ ' + e))
  process.exit(1)
}
console.log('✓ event registry consistent.')
