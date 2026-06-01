/**
 * Phase 9 (Automations & Catalog) — backfill tags for published tools missing
 * them. Tags (controlled ~31-slug vocab) power the alternatives ranker, Topics
 * sidebar, and search relevance, but only ~14% of the catalog had any. Reuses
 * the onboard SOP's assignTags (DeepSeek predict from the existing vocabulary).
 * Idempotent: only touches tools with zero tags.
 *
 *   tsx --env-file=.env.local scripts/backfill-tags.ts              # all untagged published
 *   tsx --env-file=.env.local scripts/backfill-tags.ts --limit=50   # cap
 *   tsx --env-file=.env.local scripts/backfill-tags.ts --slugs=vercel,linear
 */
export {}
import { getAdminClient } from '../lib/cron/supabase-admin'
import { assignTags, loadValidTagSlugs } from '../lib/cron/onboard-tags'

type Row = { id: string; slug: string; name: string; tagline: string | null; description: string | null; features: string[] | null }

const args = process.argv.slice(2)
const limitArg = args.find((a) => a.startsWith('--limit='))
const slugsArg = args.find((a) => a.startsWith('--slugs='))
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity
const SLUGS = slugsArg ? slugsArg.split('=')[1].split(',').map((s) => s.trim()).filter(Boolean) : null
const CONCURRENCY = 6

async function fetchUntagged(sb: ReturnType<typeof getAdminClient>): Promise<Row[]> {
  const pageSize = 1000
  let from = 0
  const all: Row[] = []
  for (;;) {
    let q = sb
      .from('tools')
      .select('id, slug, name, tagline, description, features, tool_tags(tag_id)')
      .eq('is_published', true)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)
    if (SLUGS) q = q.in('slug', SLUGS)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as unknown as (Row & { tool_tags: unknown[] })[]
    for (const r of rows) if (!r.tool_tags || r.tool_tags.length === 0) all.push(r)
    if (rows.length < pageSize) break
    from += pageSize
  }
  return all
}

async function pool<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let next = 0
  const run = async () => {
    for (;;) {
      const i = next++
      if (i >= items.length) return
      await worker(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run))
}

async function main() {
  const sb = getAdminClient()
  const vocab = await loadValidTagSlugs(sb)
  let tools = await fetchUntagged(sb)
  if (LIMIT !== Infinity) tools = tools.slice(0, LIMIT)
  console.log(`[backfill-tags] ${tools.length} untagged published tools; vocab=${vocab.length} tags; concurrency=${CONCURRENCY}`)
  let tagged = 0
  let zero = 0
  let done = 0
  await pool(tools, CONCURRENCY, async (t) => {
    done++
    try {
      const n = await assignTags(sb, t, vocab)
      if (n > 0) tagged++
      else zero++
    } catch (e) {
      zero++
      console.error(`  ${t.slug}: ${e instanceof Error ? e.message : 'err'}`)
    }
    if (done % 50 === 0) console.log(`  [${done}/${tools.length}] tagged=${tagged} zero=${zero}`)
  })
  console.log(`[backfill-tags] DONE: tagged=${tagged}, zero/skipped=${zero}, of ${tools.length}`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
