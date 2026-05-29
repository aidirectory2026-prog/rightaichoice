import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// 1. Viability backfill check
const { count: nullViab } = await db.from('tools').select('id', { count: 'exact', head: true }).eq('is_published', true).is('viability_score', null)
const { count: total } = await db.from('tools').select('id', { count: 'exact', head: true }).eq('is_published', true)
console.log(`Viability: ${total - nullViab}/${total} have score (${nullViab} still null)`)

// 2. Latest updates freshness — sample 5 newest tools
const { data: fresh } = await db
  .from('tools')
  .select('slug,name,latest_updates,latest_updates_at')
  .not('latest_updates_at', 'is', null)
  .order('latest_updates_at', { ascending: false })
  .limit(5)
console.log('\nLatest_updates freshness sample:')
for (const t of fresh || []) {
  const lu = Array.isArray(t.latest_updates) ? t.latest_updates : []
  console.log(`  ${t.slug}:`)
  for (const u of lu.slice(0, 2)) {
    console.log(`    [${u.date ?? 'no-date'}] ${u.headline?.slice(0, 80)} (${u.source_path})`)
  }
}

// 3. Tutorial URL sample
const { data: tuts } = await db.from('tools').select('slug,tutorial_urls').not('tutorial_urls', 'eq', '{}').gte('created_at', '2026-05-25T19:00:00Z').limit(5)
console.log('\nTutorial URLs sample (new tools):')
for (const t of tuts || []) {
  console.log(`  ${t.slug}: ${(t.tutorial_urls || []).length} URLs`)
  for (const u of (t.tutorial_urls || []).slice(0, 2)) console.log(`    ${u}`)
}
