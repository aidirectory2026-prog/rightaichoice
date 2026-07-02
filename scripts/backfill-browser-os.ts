/**
 * Phase 14b Wave 2 — one-off backfill of user_events.browser / .os
 * (migration 184) from the stored user_agent, using the SAME parser the
 * ingest path uses (lib/ua-parse.ts) so historical and new rows agree.
 *
 * Cursor-paged by id (uuid order — stable, not time-ordered, which is fine:
 * we visit every row exactly once). Unparseable UAs stay NULL, exactly like
 * the ingest path, so "browser is null" means the same thing everywhere.
 * Re-runnable: already-stamped rows are skipped by the browser-is-null check.
 *
 * USAGE: npx tsx --env-file=.env.local scripts/backfill-browser-os.ts
 */
export {}

import { getAdminClient } from '@/lib/cron/supabase-admin'
import { parseBrowser, parseOs } from '@/lib/ua-parse'

const PAGE = 1000

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase admin env not set (run with --env-file=.env.local)')
  }
  const db = getAdminClient()
  let cursor: string | null = null
  let scanned = 0
  let updated = 0

  for (;;) {
    let q = db
      .from('user_events')
      .select('id, user_agent')
      .is('browser', null)
      .not('user_agent', 'is', null)
      .order('id', { ascending: true })
      .limit(PAGE)
    if (cursor) q = q.gt('id', cursor)
    const { data, error } = await q
    if (error) throw new Error(`select failed: ${error.message}`)
    const rows = (data ?? []) as Array<{ id: string; user_agent: string }>
    if (rows.length === 0) break
    cursor = rows[rows.length - 1].id
    scanned += rows.length

    // Group ids by parsed (browser, os) so each distinct pair is ONE update.
    const groups = new Map<string, { browser: string | null; os: string | null; ids: string[] }>()
    for (const r of rows) {
      const browser = parseBrowser(r.user_agent)
      const os = parseOs(r.user_agent)
      if (browser === null && os === null) continue // stays NULL, like ingest
      const key = `${browser}|${os}`
      const g = groups.get(key) ?? { browser, os, ids: [] }
      g.ids.push(r.id)
      groups.set(key, g)
    }

    for (const g of groups.values()) {
      // PostgREST puts .in() ids in the query string — chunk to keep URLs sane.
      for (let i = 0; i < g.ids.length; i += 150) {
        const chunk = g.ids.slice(i, i + 150)
        const { error: e } = await db
          .from('user_events')
          .update({ browser: g.browser, os: g.os } as never)
          .in('id', chunk)
        if (e) throw new Error(`update failed: ${e.message}`)
        updated += chunk.length
      }
    }
    console.log(`…scanned ${scanned}, stamped ${updated}`)
  }

  console.log(`DONE: scanned ${scanned} null-browser rows, stamped ${updated}; ${scanned - updated} left NULL (unparseable UA, same as ingest).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
