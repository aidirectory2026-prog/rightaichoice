// Phase 10.9 (2026-06-13) — shared tracking_health writer.
//
// The nightly verification orchestrator (scripts/audit/nightly-verify.ts) and
// the in-DB invariant suite (run_tracking_invariants() / pg_cron) both land
// rows in public.tracking_health. This helper is the single way the TS leg
// writes a row, so the column contract lives in one place.
//
// Table columns (migration that created it): id, run_at, check_key, status,
// value, threshold, detail. status ∈ {'pass','warn','fail'}. value is the
// numeric/summary the banner shows; detail is free text (failure list).
//
// IMPORTANT — banner semantics: app/admin/layout.tsx getTrackingTrustStatus()
// reads the NEWEST run_at batch and returns 'fail' if ANY row in it is fail.
// So a verification CYCLE must write all its rows under ONE shared run_at
// (caller generates it once and passes it to every writeHealthRow call).

import { getAdminClient } from './supabase-admin'

export type HealthStatus = 'pass' | 'warn' | 'fail'

export interface HealthRow {
  /** Shared per-cycle timestamp — ALL rows of one cycle use the same value. */
  runAt: string
  /** Stable identifier, e.g. 'V_registry', 'V_synthetic', 'V_filters'. */
  checkKey: string
  status: HealthStatus
  /** Numeric summary (counts) the dashboard renders. Null when not numeric. */
  value?: number | null
  /** Pass/fail boundary, when the check has one. */
  threshold?: number | null
  /** Free-text detail — failure summary or a one-line "what it guards". */
  detail?: string | null
}

/** Map a HealthRow to the table's snake_case column shape. */
function toColumns(row: HealthRow) {
  return {
    run_at: row.runAt,
    check_key: row.checkKey,
    status: row.status,
    value: row.value ?? null,
    threshold: row.threshold ?? null,
    detail: row.detail ?? null,
  }
}

/** Insert one tracking_health row via the service-role admin client. */
export async function writeHealthRow(row: HealthRow): Promise<void> {
  // The admin client is generically typed and does not carry the
  // tracking_health table (it isn't in the generated DB types), so inserts
  // resolve to `never`. The same `as any` cast the audit scripts use.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getAdminClient() as any
  const { error } = await db.from('tracking_health').insert(toColumns(row))
  if (error) {
    throw new Error(`tracking_health insert failed for ${row.checkKey}: ${error.message}`)
  }
}

/** Insert many rows under the same cycle in one round trip. */
export async function writeHealthRows(rows: HealthRow[]): Promise<void> {
  if (rows.length === 0) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getAdminClient() as any
  const { error } = await db.from('tracking_health').insert(rows.map(toColumns))
  if (error) {
    throw new Error(`tracking_health bulk insert failed: ${error.message}`)
  }
}
