import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const slugs = ['palantir-gotham','gemini-for-government','hark-ai','rhoda-ai','aizon','dataiku','tractian','fundraise-up']
const { data, error } = await db.from('tools').select('slug,name,tagline,features,integrations,best_for,use_cases,models,latest_updates,limitations').in('slug', slugs)
if (error) { console.error(error); process.exit(1) }
for (const t of data) {
  console.log(`\n=== ${t.slug} ===`)
  console.log(`name: ${t.name}`)
  console.log(`features: ${(t.features||[]).length}`)
  console.log(`integrations: ${(t.integrations||[]).length}`)
  console.log(`best_for: ${(t.best_for||[]).length}`)
  console.log(`use_cases: ${(t.use_cases||[]).length}`)
  console.log(`models: ${(t.models||[]).length}`)
  console.log(`latest_updates: ${typeof t.latest_updates === 'string' ? t.latest_updates.length : Array.isArray(t.latest_updates) ? t.latest_updates.length : 'missing'}`)
  console.log(`limitations: ${t.limitations ? t.limitations.length+' chars' : 'missing'}`)
}
