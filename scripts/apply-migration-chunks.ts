/**
 * Phase 8.h (2026-05-25) — applies a directory of SQL chunks to Supabase via
 * the _apply_migration_chunk helper RPC (defined in DB this session).
 *
 * Use:
 *   npx tsx --env-file=.env.local scripts/apply-migration-chunks.ts /tmp/sql_chunks
 *
 * Reads every *.sql file in the directory (sorted), calls the helper for each,
 * logs success/fail.
 */
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { getAdminClient } from '../lib/cron/supabase-admin'

async function main(): Promise<void> {
  const dir = process.argv[2] || '/tmp/sql_chunks'
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
  // Apply tool inserts first, then category joins (cats reference tool IDs)
  const toolFiles = files.filter((f) => f.startsWith('tool_') || f.startsWith('tools_'))
  const catFiles = files.filter((f) => f.startsWith('cat_') || f.startsWith('cats_') || f.startsWith('zcat_'))
  const ordered = [...toolFiles, ...catFiles]
  console.log(`Found ${files.length} chunk files (${toolFiles.length} tools + ${catFiles.length} cats).`)

  const db = getAdminClient()
  let ok = 0
  let failed = 0

  for (const f of ordered) {
    const sql = readFileSync(join(dir, f), 'utf8').trim()
    if (!sql) continue
    process.stdout.write(`[${f}] ${(sql.length / 1024).toFixed(1)}KB… `)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any).rpc('_apply_migration_chunk', { p_sql: sql })
    if (error) {
      failed++
      console.log(`FAIL: ${error.message.slice(0, 200)}`)
    } else {
      ok++
      console.log('ok')
    }
  }

  console.log(`\nDone. ${ok} chunks applied, ${failed} failed.`)

  // Verify
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error: countErr } = await (db as any)
    .from('tools')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true)
  if (countErr) console.error('count failed:', countErr.message)
  else console.log(`Published tools in DB: ${(data as { count?: number } | null)?.count ?? '?'}`)
}

void main().catch((e: unknown) => {
  console.error('Fatal:', e)
  process.exit(1)
})
