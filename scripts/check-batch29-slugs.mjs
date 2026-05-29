import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'fs'
config({ path: '.env.local' })
const sql = readFileSync('supabase/migrations/051_seed_tools_batch29.sql', 'utf8')
const slugs = []
for (const m of sql.matchAll(/^\('([^']+)',\s*'([^']+)'/gm)) {
  slugs.push(m[2])
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data } = await db.from('tools').select('slug').in('slug', slugs)
const found = new Set((data||[]).map(d=>d.slug))
const missing = slugs.filter(s => !found.has(s))
console.log('batch29 total:', slugs.length, 'in DB:', found.size, 'MISSING:', missing.length)
if (missing.length) console.log('missing slugs:', missing.slice(0, 30).join(', '))
