/**
 * Phase 9.A.2 — Event-registry CI guard. Extended in Phase 10.3.3 with the
 * property-level layer (lib/analytics-schema.ts).
 *
 * Closes the "38 of ~99 events ever fire / dashboard reads an event that never
 * fires" gap (e.g. plan_results_tool_clicked was a dead funnel step). It derives
 * the truth from the code and enforces five invariants against the declarative
 * registries in lib/analytics-registry.ts + lib/analytics-schema.ts:
 *
 *   1. ADMIN_CONSUMED ⊆ DEFINED          (typo guard — dashboard names a real event)
 *   2. ADMIN_CONSUMED ⊆ FIRED            (no dashboard depends on a never-firing event)
 *   3. DEFINED ⊆ FIRED ∪ PLANNED ∪ DEPRECATED   (every event is wired OR explicitly acknowledged)
 *   4. FIRED = EVENT_SCHEMAS keys        (every firing event has a property schema, and
 *                                         no schema exists for an event that never fires)
 *   5. every (event, property) pair the admin panel reads from the JSONB
 *      `properties` column exists in that event's schema (or is a base-context
 *      key present on every mirrored event) — dashboard property drift is a
 *      build failure, not a silent zero.
 *
 * Run: `npx tsx scripts/audit/verify-event-registry.ts` or `npm run tracking:schema`
 * (exit 1 on violation). Wired into .github/workflows/tracking-watchdog.yml.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ZodType } from 'zod'
import { ADMIN_CONSUMED_EVENTS, PLANNED_EVENTS, DEPRECATED_EVENTS } from '../../lib/analytics-registry'
import { EVENT_SCHEMAS, BASE_CONTEXT_PROP_KEYS, type EventSchemaEntry } from '../../lib/analytics-schema'

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
// 10.3.3 — two literal families the simple regexes miss:
//  (a) typed-field events: fieldTextChanged() captures a DYNAMIC name from
//      its event_name union ('search_query_typed' | 'plan_goal_typed' | …)
const typedEvents = new Set<string>()
for (const m of analyticsSrc.matchAll(/'([a-z_]+_typed)'/g)) {
  typedEvents.add(m[1])
  defined.add(m[1])
}
//  (b) sentiment server events: serverAnalytics.sentimentEvent() takes the
//      name as a union-typed argument ('sentiment_scan_requested' | …)
const sentimentServerEvents = new Set<string>()
for (const m of serverSrc.matchAll(/'(sentiment_[a-z_]+)'/g)) {
  sentimentServerEvents.add(m[1])
  defined.add(m[1])
}

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
// 10.7c.5 — call sites also live in lib/ (e.g. lib/cta/persist-intent.ts
// fires plan_intent_persisted/linked) and actions/ (server actions call
// serverAnalytics.*). Walking only app/ + components/ hid those real
// emitters as "planned". The analytics core files are excluded: schema
// descriptions mention method names in prose and would self-certify.
const CALL_SITE_EXCLUDED = new Set([
  'lib/analytics.ts',
  'lib/analytics-schema.ts',
  'lib/analytics-registry.ts',
  'lib/mixpanel-server.ts',
])
// app/admin/resources/** is the in-admin learning guide (Phase 8): it
// DESCRIBES events in prose with code-like snippets (analytics.x(), capture())
// that would otherwise read as fake firing sites — documentation never emits.
const isDocFile = (f: string) => f.startsWith('app/admin/resources/')
const callSiteFiles = [...walk('app'), ...walk('components'), ...walk('lib'), ...walk('actions')]
  .filter((f) => !CALL_SITE_EXCLUDED.has(f) && !isDocFile(f))
const callSiteBlob = callSiteFiles.map(read).join('\n')

const calledMethods = new Set<string>()
for (const [method] of methodToEvent) {
  if (new RegExp(`analytics\\.${method}\\b`).test(callSiteBlob)) calledMethods.add(method)
}
const fired = new Set<string>()
for (const [method, event] of methodToEvent) if (calledMethods.has(method)) fired.add(event)
// 10.7c.5 — TIGHTENED server rule. Previously every `event:` literal in
// mixpanel-server.ts counted as fired ("server emitters always fire"),
// which hid dead server emitters: activation_milestone and
// recommendation_requested had ZERO callers anywhere yet showed as FIRED.
// Now a server event fires only when its serverAnalytics method has a real
// call site (app/, components/, lib/, actions/).
const serverMethodToEvent = new Map<string, string>()
{
  let currentMethod: string | null = null
  for (const line of serverSrc.split('\n')) {
    const mDef = line.match(/^\s{2}([a-zA-Z][a-zA-Z0-9]*)\s*\(/) // 2-space indent method
    if (mDef) currentMethod = mDef[1]
    const mCap = line.match(/event: '([a-z_]+)'/)
    if (mCap && currentMethod) serverMethodToEvent.set(currentMethod, mCap[1])
  }
}
for (const [method, event] of serverMethodToEvent) {
  if (new RegExp(`serverAnalytics\\.${method}\\b`).test(callSiteBlob)) fired.add(event)
}
// 10.3.3 — typed-field events fire when a call site passes their literal to
// fieldTextChanged({ event_name: 'x_typed', … })
for (const e of typedEvents) {
  if (callSiteBlob.includes(`event_name: '${e}'`)) fired.add(e)
}
// 10.3.3 — sentimentEvent('name', …) call sites live in app/api (server routes)
for (const e of sentimentServerEvents) {
  if (new RegExp(`sentimentEvent\\(\\s*'${e}'`).test(callSiteBlob)) fired.add(e)
}

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

// ── 4. FIRED ⟷ EVENT_SCHEMAS (property-level coverage, both directions) ────
const schemaNames = new Set(Object.keys(EVENT_SCHEMAS))
for (const e of fired) {
  if (!schemaNames.has(e)) {
    errors.push(`FIRED "${e}" has no EVENT_SCHEMAS entry — add its property schema to lib/analytics-schema.ts (iron rule: nothing fires unschema'd).`)
  }
}
for (const e of schemaNames) {
  if (!fired.has(e)) {
    errors.push(`EVENT_SCHEMAS entry "${e}" maps to an event that never fires (no client call site, no server emit) — remove the schema or wire the event.`)
  }
}

// ── 5. Admin-panel JSONB property reads ⊆ schemas ───────────────────────────
// Every (event, property) pair the admin panel pulls out of user_events
// `properties` must exist in that event's schema, otherwise the panel reads a
// permanent zero (the tool_saved→tool_slug / modal_completed→source_surface
// class of bug). Base-context keys are valid on every mirrored event.
function schemaPropKeys(schema: ZodType): Set<string> | 'any' {
  // zod v4 introspection: objects expose .shape, unions expose .def.options,
  // records accept any key.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anySchema = schema as any
  const def = anySchema.def ?? anySchema._def
  const typeName: string | undefined = def?.type ?? def?.typeName
  if (typeName === 'record') return 'any'
  if (anySchema.shape) return new Set(Object.keys(anySchema.shape))
  if (def?.options) {
    const keys = new Set<string>()
    for (const opt of def.options as ZodType[]) {
      const k = schemaPropKeys(opt)
      if (k === 'any') return 'any'
      for (const key of k) keys.add(key)
    }
    return keys
  }
  return 'any' // unknown zod node — don't false-positive
}

const ADMIN_PROPERTY_FILES = [
  'app/admin/insights/queries.ts',
  'lib/admin/plan-conversion.ts',
  'app/admin/sentiment/page.tsx',
]
type PropPair = { file: string; event: string | '*'; prop: string }
const pairs: PropPair[] = []
for (const file of ADMIN_PROPERTY_FILES) {
  const src = read(file)
  if (!src) continue
  // (a) insights_top_jsonb_property RPC args: { p_event_name: 'x', p_property: 'y' }
  for (const m of src.matchAll(/insights_top_jsonb_property',\s*\{([\s\S]*?)\}/g)) {
    const ev = m[1].match(/p_event_name:\s*'([a-z_]+)'/)
    const prop = m[1].match(/p_property:\s*'([a-z_]+)'/)
    if (ev && prop) pairs.push({ file, event: ev[1], prop: prop[1] })
  }
  // (b) insights_top_property RPC (no event scope → property must be base-context)
  for (const m of src.matchAll(/insights_top_property',\s*\{([\s\S]*?)\}/g)) {
    const prop = m[1].match(/p_property:\s*'([a-z_]+)'/)
    if (prop) pairs.push({ file, event: '*', prop: prop[1] })
  }
  // (c) supabase-js JSONB filters: .eq/.filter('properties->>X', …) — pair with
  // the nearest .eq('event_name', 'Y') within the preceding lines of the chain.
  const lines = src.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('--')) continue
    const m = lines[i].match(/properties->>'?([a-zA-Z_]+)'?/)
    if (!m) continue
    let event: string | '*' = '*'
    for (let j = i; j >= Math.max(0, i - 8); j--) {
      const ev = lines[j].match(/event_name'\s*,\s*'([a-z_]+)'/)
      if (ev) { event = ev[1]; break }
    }
    pairs.push({ file, event, prop: m[1] })
  }
}
for (const { file, event, prop } of pairs) {
  if (BASE_CONTEXT_PROP_KEYS.has(prop)) continue // valid on every mirrored event
  if (event === '*') {
    errors.push(`${file} reads properties->>'${prop}' without an event scope and "${prop}" is not a base-context key — scope the query or add the key to BASE_CONTEXT_PROP_KEYS.`)
    continue
  }
  const entry = (EVENT_SCHEMAS as Record<string, EventSchemaEntry>)[event]
  if (!entry) {
    errors.push(`${file} reads properties->>'${prop}' of "${event}" but that event has no EVENT_SCHEMAS entry.`)
    continue
  }
  const keys = schemaPropKeys(entry.props)
  if (keys !== 'any' && !keys.has(prop)) {
    errors.push(`${file} reads properties->>'${prop}' of "${event}" but the schema has no such property — the panel reads a permanent zero. Schema keys: [${[...keys].join(', ')}].`)
  }
}

// ── 6. Firing-sites map (Phase 10.6.3) ──────────────────────────────────────
// Emits lib/analytics-callsites.gen.json: event → [{file, line, method}] for
// every place the code fires it, by grepping the typed emitter methods through
// app/ + components/ + lib/ (the emitters themselves excluded). Committed and
// regenerated by `npm run tracking:schema`; the events explorer renders it as
// the "where it fires" list. No timestamp — regeneration is idempotent.
type CallSite = { file: string; line: number; method: string }
{
  // serverAnalytics method → event (same single-pass binding as analytics.ts).
  const serverMethodToEvent = new Map<string, string>()
  {
    let currentMethod: string | null = null
    for (const line of serverSrc.split('\n')) {
      const mDef = line.match(/^\s{2}([a-zA-Z][a-zA-Z0-9]*)\s*[(:]/)
      if (mDef) currentMethod = mDef[1]
      const mCap = line.match(/event: '([a-z_]+)'/)
      if (mCap && currentMethod) serverMethodToEvent.set(currentMethod, mCap[1])
    }
  }

  // The emitters and the registry/docs layers are not call sites: analytics.ts
  // and mixpanel-server.ts DEFINE the methods; analytics-schema.ts and
  // analytics-registry.ts only DESCRIBE them (their description strings would
  // otherwise read as fake sites).
  const NON_SITE_FILES = new Set(
    ['analytics.ts', 'mixpanel-server.ts', 'analytics-schema.ts', 'analytics-registry.ts']
      .map((f) => join('lib', f)),
  )
  // 10.7c.5 — actions/ added: server actions are real firing sites
  // (e.g. actions/auth.ts → serverAnalytics.passwordResetCompletedServer).
  const siteFiles = [...walk('app'), ...walk('components'), ...walk('lib'), ...walk('actions')]
    .filter((f) => !NON_SITE_FILES.has(f) && !isDocFile(f))
  const sites = new Map<string, CallSite[]>()
  const addSite = (event: string, site: CallSite) => {
    if (!sites.has(event)) sites.set(event, [])
    sites.get(event)!.push(site)
  }

  for (const file of siteFiles) {
    const lines = read(file).split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue
      // client emitter methods: analytics.pageViewed(…)
      for (const m of line.matchAll(/\banalytics\.([a-zA-Z][a-zA-Z0-9]*)\b/g)) {
        const event = methodToEvent.get(m[1])
        if (event) addSite(event, { file, line: i + 1, method: `analytics.${m[1]}` })
      }
      // server emitter methods: serverAnalytics.signupCompleted(…)
      for (const m of line.matchAll(/\bserverAnalytics\.([a-zA-Z][a-zA-Z0-9]*)\b/g)) {
        const event = serverMethodToEvent.get(m[1])
        if (event) addSite(event, { file, line: i + 1, method: `serverAnalytics.${m[1]}` })
      }
      // typed-field events: fieldTextChanged({ event_name: 'x_typed', … })
      for (const m of line.matchAll(/event_name: '([a-z_]+_typed)'/g)) {
        if (typedEvents.has(m[1])) addSite(m[1], { file, line: i + 1, method: 'analytics.fieldTextChanged' })
      }
      // sentiment server events: sentimentEvent('sentiment_x', …)
      for (const m of line.matchAll(/sentimentEvent\(\s*'(sentiment_[a-z_]+)'/g)) {
        addSite(m[1], { file, line: i + 1, method: 'serverAnalytics.sentimentEvent' })
      }
    }
  }

  const out: Record<string, CallSite[]> = {}
  for (const event of [...sites.keys()].sort()) {
    out[event] = sites.get(event)!.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
  }
  const genPath = join(ROOT, 'lib', 'analytics-callsites.gen.json')
  writeFileSync(genPath, JSON.stringify(out, null, 2) + '\n')
  const totalSites = [...sites.values()].reduce((a, s) => a + s.length, 0)
  console.log(`✓ wrote lib/analytics-callsites.gen.json — ${sites.size} events, ${totalSites} firing sites.`)
}

console.log(`event-registry: ${defined.size} defined, ${fired.size} fired, ${PLANNED_EVENTS.size} planned, ${ADMIN_CONSUMED_EVENTS.size} admin-consumed, ${schemaNames.size} schema'd, ${pairs.length} admin property reads checked.`)
if (warnings.length) { console.log('\nWARNINGS:'); warnings.forEach((w) => console.log('  ⚠ ' + w)) }
if (errors.length) {
  console.error('\nERRORS:'); errors.forEach((e) => console.error('  ✗ ' + e))
  process.exit(1)
}
console.log('✓ event registry consistent.')
