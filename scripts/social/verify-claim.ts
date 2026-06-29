/**
 * Phase 13 R2 — verify the atomic publish-claim prevents double-posting.
 * Inserts a throwaway approved+due row, runs the SAME claim query twice, and
 * asserts the FIRST claims it (1 row) and the SECOND gets nothing (0 rows) —
 * i.e. two overlapping cron runs cannot both post the same row. Cleans up after.
 *
 * Run: npm run social:verify-claim
 */
export {}

import { getAdminClient } from '../../lib/cron/supabase-admin'

const noMs = (iso: string) => iso.replace(/\.\d{3}Z$/, 'Z')
const CLAIM_STALE_MS = 10 * 60 * 1000

async function claim(db: ReturnType<typeof getAdminClient>, id: string): Promise<number> {
  const claimISO = new Date().toISOString()
  const staleISO = noMs(new Date(Date.now() - CLAIM_STALE_MS).toISOString())
  const res = await db
    .from('social_posts')
    .update({ publish_started_at: claimISO, updated_at: claimISO } as never)
    .eq('id', id)
    .eq('status', 'approved')
    .or(`publish_started_at.is.null,publish_started_at.lt.${staleISO}`)
    .select('id')
  if (res.error) throw new Error(`claim query errored (PostgREST filter?): ${res.error.message}`)
  return ((res.data ?? []) as unknown[]).length
}

async function main() {
  const db = getAdminClient()
  const past = new Date(Date.now() - 3_600_000).toISOString()
  const ins = (await db
    .from('social_posts')
    .insert({ platform: 'x', kind: 'text', status: 'approved', copy: 'claim test', content_hash: `claimtest-${Date.now()}`, scheduled_at: past } as never)
    .select('id')
    .single()) as { data: { id: string } | null; error: { message: string } | null }
  if (ins.error || !ins.data) throw new Error(`insert failed: ${ins.error?.message}`)
  const id = ins.data.id
  console.log(`inserted throwaway approved row ${id}`)

  const first = await claim(db, id)
  const second = await claim(db, id)
  console.log(`first claim: ${first} row(s) · second claim: ${second} row(s)`)

  await db.from('social_posts').delete().eq('id', id)
  console.log('cleaned up')

  const ok = first === 1 && second === 0
  console.log(ok ? '\n✓ atomic claim works: first wins, second gets nothing (no double-post)' : '\n✗ claim did NOT behave atomically')
  if (!ok) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
