import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'fs'
config({ path: '.env.local' })
const path = process.argv[2]
if (!path) { console.error('usage: node check-batch-slugs.mjs <migration_path>'); process.exit(1) }
const sql = readFileSync(path, 'utf8')
const slugs = []
for (const m of sql.matchAll(/^\('([^']+)',\s*'([^']+)'/gm)) slugs.push(m[2])
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const found = new Set()
for (let i = 0; i < slugs.length; i += 500) {
  const { data } = await db.from('tools').select('slug').in('slug', slugs.slice(i, i+500))
  for (const r of (data||[])) found.add(r.slug)
}
const missing = slugs.filter(s => !found.has(s))
console.log(`${path}: total=${slugs.length} found=${found.size} missing=${missing.length}`)
if (missing.length) console.log('MISSING:', missing.join(','))
