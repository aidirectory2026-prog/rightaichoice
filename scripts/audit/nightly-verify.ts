/**
 * Phase 10.9 (2026-06-13) — nightly verification orchestrator (FINAL phase).
 *
 * Runs the FULL verification cycle once, end to end, and lands ONE
 * tracking_health row per "mean" under a SINGLE shared run_at, so that the
 * admin trust banner (app/admin/layout.tsx getTrackingTrustStatus) reflects
 * the whole cycle on the next admin page load. Means, in order:
 *
 *   V_registry    — registry + property-schema guard (verify-event-registry.ts).
 *                   Also regenerates lib/analytics-callsites.gen.json. No server.
 *   V_schema      — schema-violation read: I9_schema_violation_rate from the
 *                   latest in-DB invariant batch (run_tracking_invariants()).
 *                   Surfaced as its own banner row so a spike in
 *                   schema_valid=false events lights the banner directly.
 *   V_synthetic   — synthetic event suite (synthetic-event-suite.ts), 97 events
 *                   + dedup + negative + channel probes. REQUIRES a running app
 *                   at $BASE_URL (the workflow starts it; the suite reuses it).
 *   V_filters     — filter matrix (verify-filters.ts), 36 checks vs raw SQL.
 *                   Hits prod RPCs; no local server needed.
 *   V_mixpanel    — Mixpanel reconciliation smoke (scripts/mixpanel/verify.ts).
 *                   Auth + ingestion. No server.
 *   V_invariants  — roll-up of the in-DB invariant suite's LATEST batch (all
 *                   I* check_keys written nightly by pg_cron, 19:30 UTC). This
 *                   orchestrator runs AFTER that, so it reads a fresh batch.
 *
 * Resilience: each mean is wrapped — a thrown mean writes a `fail` row, it does
 * NOT abort the cycle. ALL rows are written before the process exits. Exit code
 * is non-zero if any mean failed (CI signal), but the rows always land first.
 *
 * Server policy: the orchestrator does NOT start its own app. The synthetic
 * suite is told $BASE_URL (default http://localhost:3000) and reuses the
 * already-running server. Registry / filters / mixpanel / invariants need no
 * server. In CI the workflow builds + starts `next start` and waits for ready
 * before invoking this script.
 *
 * Run locally (server already running on :3000):
 *   npx tsx --env-file=.env.local scripts/audit/nightly-verify.ts
 * Flags:
 *   --base-url=<url>   synthetic target (default http://localhost:3000)
 *   --skip-synthetic   skip the browser suite (e.g. quick CI dry-run)
 *   --dry-run          run every mean but DON'T write tracking_health rows
 *                      (prints what WOULD be written) — for local inspection.
 */

import { spawnSync } from 'node:child_process'
import { getAdminClient } from '../../lib/cron/supabase-admin'
import { writeHealthRows, type HealthRow, type HealthStatus } from '../../lib/cron/tracking-health-writer'

// ── Flags ──────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2)
function flagValue(name: string): string | null {
  const hit = argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : null
}
const BASE_URL = (flagValue('base-url') ?? 'http://localhost:3000').replace(/\/$/, '')
const SKIP_SYNTHETIC = argv.includes('--skip-synthetic')
const DRY_RUN = argv.includes('--dry-run')

// ── Mean result shape ────────────────────────────────────────────────────────
interface MeanResult {
  checkKey: string
  status: HealthStatus
  value: number | null
  threshold: number | null
  detail: string
}

/**
 * Run an existing verification script as a child process and map its exit code
 * to a tracking_health row. Reusing the scripts verbatim (not reimplementing)
 * guarantees the banner reflects the EXACT same logic CI enforces.
 */
function runScript(
  checkKey: string,
  scriptPath: string,
  scriptArgs: string[],
  opts: { withEnvFile?: boolean; passKey?: number | null; threshold?: number | null; guards: string },
): MeanResult {
  const tsxArgs = [
    'tsx',
    ...(opts.withEnvFile ? ['--env-file=.env.local'] : []),
    scriptPath,
    ...scriptArgs,
  ]
  try {
    const res = spawnSync('npx', tsxArgs, {
      cwd: process.cwd(),
      env: process.env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 15 * 60 * 1000, // 15 min ceiling (synthetic suite ~2 min)
    })
    const out = (res.stdout ?? '') + (res.stderr ?? '')
    process.stdout.write(out)
    if (res.error) {
      return { checkKey, status: 'fail', value: null, threshold: opts.threshold ?? null, detail: `spawn error: ${res.error.message}` }
    }
    const code = res.status
    const ok = code === 0
    return {
      checkKey,
      status: ok ? 'pass' : 'fail',
      value: opts.passKey ?? null,
      threshold: opts.threshold ?? null,
      detail: ok ? opts.guards : `exit ${code} — ${summarizeFailure(out)}`,
    }
  } catch (e) {
    return {
      checkKey,
      status: 'fail',
      value: null,
      threshold: opts.threshold ?? null,
      detail: `threw: ${e instanceof Error ? e.message : String(e)}`,
    }
  }
}

/** Pull a short, useful failure line out of a script's combined output. */
function summarizeFailure(out: string): string {
  const lines = out.split('\n').map((l) => l.trim()).filter(Boolean)
  const flagged = lines.filter((l) => /✗|ERROR|MISMATCH|FAIL|fatal/i.test(l)).slice(-3)
  const tail = flagged.length ? flagged : lines.slice(-2)
  return tail.join(' | ').slice(0, 480)
}

// ── V_registry ────────────────────────────────────────────────────────────────
function runRegistry(): MeanResult {
  return runScript('V_registry', 'scripts/audit/verify-event-registry.ts', [], {
    withEnvFile: false,
    threshold: 0,
    guards:
      'event registry consistent — ADMIN_CONSUMED⊆FIRED, FIRED⟷EVENT_SCHEMAS, no admin property drift; callsites regenerated.',
  })
}

// ── V_synthetic ───────────────────────────────────────────────────────────────
function runSynthetic(): MeanResult {
  if (SKIP_SYNTHETIC) {
    return {
      checkKey: 'V_synthetic',
      status: 'warn',
      value: null,
      threshold: 97,
      detail: '--skip-synthetic: browser suite not run this cycle',
    }
  }
  return runScript(
    'V_synthetic',
    'scripts/audit/synthetic-event-suite.ts',
    [`--base-url=${BASE_URL}`],
    {
      withEnvFile: true,
      threshold: 97,
      guards: 'synthetic suite GREEN — 97/97 events fired+asserted, dedup 3/3, negative test pass, channel probes pass.',
    },
  )
}

// ── V_filters ─────────────────────────────────────────────────────────────────
function runFilters(): MeanResult {
  return runScript('V_filters', 'scripts/audit/verify-filters.ts', [], {
    withEnvFile: true,
    threshold: 36,
    guards: 'filter matrix GREEN — every combo matches independent raw SQL over the pinned audit week (36 checks).',
  })
}

// ── V_mixpanel ─────────────────────────────────────────────────────────────────
function runMixpanel(): MeanResult {
  return runScript('V_mixpanel', 'scripts/mixpanel/verify.ts', [], {
    withEnvFile: true,
    threshold: 0,
    guards: 'Mixpanel reconciliation — service-account auth + /track ingestion verified.',
  })
}

// ── V_schema (read I9 from the latest in-DB invariant batch) ───────────────────
async function readSchemaViolation(): Promise<MeanResult> {
  try {
    const db = getAdminClient()
    // Latest batch that contains the DB invariants (I9 specifically).
    const { data, error } = await db
      .from('tracking_health')
      .select('status, value, threshold, detail, run_at')
      .eq('check_key', 'I9_schema_violation_rate')
      .order('run_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(error.message)
    const row = data as { status: HealthStatus; value: number | null; threshold: number | null; run_at: string } | null
    if (!row) {
      return {
        checkKey: 'V_schema',
        status: 'warn',
        value: null,
        threshold: 5,
        detail: 'no I9_schema_violation_rate row yet — pg_cron invariant suite has not run.',
      }
    }
    const stale = Date.now() - new Date(row.run_at).getTime() > 36 * 60 * 60 * 1000
    if (stale) {
      return {
        checkKey: 'V_schema',
        status: 'warn',
        value: row.value,
        threshold: 5,
        detail: `I9 batch is stale (>36h) — last run ${row.run_at}; check pg_cron tracking-invariants-nightly.`,
      }
    }
    return {
      checkKey: 'V_schema',
      status: row.status,
      value: row.value,
      threshold: row.threshold ?? 5,
      detail: `schema_valid=false rate over last 24h = ${row.value ?? 0}% (warn >1, fail >5) — from I9 @ ${row.run_at}.`,
    }
  } catch (e) {
    return { checkKey: 'V_schema', status: 'fail', value: null, threshold: 5, detail: `read failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

// ── V_invariants (roll up the latest in-DB invariant batch) ────────────────────
async function readInvariants(): Promise<MeanResult> {
  try {
    const db = getAdminClient()
    // The in-DB suite writes a batch of I* rows under one run_at (pg_cron).
    // Find that batch's run_at via I9 (always present), then roll up every I*.
    const { data: latest } = await db
      .from('tracking_health')
      .select('run_at')
      .like('check_key', 'I%')
      .order('run_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const runAt = (latest as { run_at: string } | null)?.run_at ?? null
    if (!runAt) {
      return { checkKey: 'V_invariants', status: 'warn', value: null, threshold: 0, detail: 'no in-DB invariant batch found yet.' }
    }
    const { data: rows } = await db
      .from('tracking_health')
      .select('check_key, status')
      .eq('run_at', runAt)
      .like('check_key', 'I%')
    const batch = (rows as { check_key: string; status: HealthStatus }[] | null) ?? []
    const fails = batch.filter((r) => r.status === 'fail')
    const warns = batch.filter((r) => r.status === 'warn')
    const stale = Date.now() - new Date(runAt).getTime() > 36 * 60 * 60 * 1000
    let status: HealthStatus = 'pass'
    if (fails.length > 0) status = 'fail'
    else if (warns.length > 0 || stale) status = 'warn'
    const failList = fails.map((r) => r.check_key).join(', ')
    const warnList = warns.map((r) => r.check_key).join(', ')
    const detail =
      `${batch.length} invariants @ ${runAt}${stale ? ' (STALE >36h)' : ''}` +
      (fails.length ? ` — FAIL: ${failList}` : '') +
      (warns.length ? ` — warn: ${warnList}` : '') +
      (!fails.length && !warns.length ? ' — all pass' : '')
    return { checkKey: 'V_invariants', status, value: batch.length, threshold: 0, detail }
  } catch (e) {
    return { checkKey: 'V_invariants', status: 'fail', value: null, threshold: 0, detail: `read failed: ${e instanceof Error ? e.message : String(e)}` }
  }
}

// ── Orchestrate ──────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase admin env not set (run with --env-file=.env.local)')
  }
  const runAt = new Date().toISOString()
  console.log(`\n════════ Nightly verification cycle — run_at=${runAt} ════════`)
  console.log(`base_url=${BASE_URL}${SKIP_SYNTHETIC ? '  (synthetic skipped)' : ''}${DRY_RUN ? '  (DRY-RUN — no rows written)' : ''}\n`)

  const results: MeanResult[] = []

  // 1. Registry + schema guard (no server). Regenerates callsites.gen.json.
  console.log('── V_registry ─────────────────────────────────────────')
  results.push(runRegistry())

  // 2. Schema-violation read (from the in-DB I9 invariant).
  console.log('\n── V_schema (read I9) ─────────────────────────────────')
  results.push(await readSchemaViolation())

  // 3. Synthetic suite (needs a running server at BASE_URL).
  console.log('\n── V_synthetic ────────────────────────────────────────')
  results.push(runSynthetic())

  // 4. Filter matrix (prod RPCs, no server).
  console.log('\n── V_filters ──────────────────────────────────────────')
  results.push(runFilters())

  // 5. Mixpanel reconciliation (no server).
  console.log('\n── V_mixpanel ─────────────────────────────────────────')
  results.push(runMixpanel())

  // 6. In-DB invariant roll-up (read the latest pg_cron batch).
  console.log('\n── V_invariants (roll-up) ─────────────────────────────')
  results.push(await readInvariants())

  // ── Write all rows under the shared run_at (banner-visible). ────────────────
  const rows: HealthRow[] = results.map((r) => ({
    runAt,
    checkKey: r.checkKey,
    status: r.status,
    value: r.value,
    threshold: r.threshold,
    detail: r.detail,
  }))

  console.log('\n════════ Cycle summary ════════')
  for (const r of results) {
    const mark = r.status === 'pass' ? '✓' : r.status === 'warn' ? '⚠' : '✗'
    console.log(`  ${mark} ${r.checkKey.padEnd(14)} ${r.status.toUpperCase().padEnd(5)} value=${r.value ?? '—'}  ${r.detail}`)
  }

  if (DRY_RUN) {
    console.log('\n--dry-run: NOT writing tracking_health rows. Above is what WOULD be written.')
  } else {
    await writeHealthRows(rows)
    console.log(`\nWrote ${rows.length} tracking_health rows under run_at=${runAt}.`)
  }

  const failed = results.filter((r) => r.status === 'fail')
  if (failed.length > 0) {
    console.log(`\n✗ NIGHTLY VERIFY FAILED — ${failed.length} mean(s): ${failed.map((r) => r.checkKey).join(', ')}`)
    process.exit(1)
  }
  console.log(`\n✓ NIGHTLY VERIFY GREEN — ${results.length} means, 0 fails.`)
}

main().catch((e) => {
  // A fatal here means we could not even write rows — surface loudly so CI/the
  // watchdog notices the orchestrator itself broke (no silent green).
  console.error('FATAL (orchestrator):', e)
  process.exit(2)
})
