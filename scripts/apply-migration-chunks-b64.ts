/**
 * Phase 8.h (2026-05-25) — base64-safe applier for SQL chunks.
 * Bypasses the JSON/PostgREST escape collisions that caused 30% chunk
 * failures in the v1 applier. Reads each SQL chunk, base64-encodes it,
 * calls _apply_migration_chunk_b64 RPC which decodes + EXECUTEs.
 */
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { getAdminClient } from '../lib/cron/supabase-admin'

async function main(): Promise<void> {
  const dir = process.argv[2] || '/tmp/sql_chunks'
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
  const toolFiles = files.filter((f) => f.startsWith('tool_') || f.startsWith('tools_'))
  const catFiles = files.filter((f) => f.startsWith('cat_') || f.startsWith('cats_') || f.startsWith('zcat_'))
  const ordered = [...toolFiles, ...catFiles]
  console.log(`Found ${files.length} files (${toolFiles.length} tools + ${catFiles.length} cats) in ${dir}`)

  const db = getAdminClient()
  let ok = 0
  let failed = 0
  const failedFiles: string[] = []

  for (const f of ordered) {
    const sql = readFileSync(join(dir, f), 'utf8').trim()
    if (!sql) continue
    const b64 = Buffer.from(sql, 'utf8').toString('base64')
    process.stdout.write(`[${f}] ${(sql.length / 1024).toFixed(1)}KB… `)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db as any).rpc('_apply_migration_chunk_b64', { p_sql_b64: b64 })
    if (error) {
      failed++
      failedFiles.push(f)
      console.log(`FAIL: ${error.message.slice(0, 200)}`)
    } else {
      ok++
      console.log('ok')
    }
  }

  console.log(`\nDone. ${ok} chunks applied, ${failed} failed.`)
  if (failedFiles.length > 0) {
    console.log(`Failed files: ${failedFiles.join(', ')}`)
  }
}

void main().catch((e: unknown) => {
  console.error('Fatal:', e)
  process.exit(1)
})
