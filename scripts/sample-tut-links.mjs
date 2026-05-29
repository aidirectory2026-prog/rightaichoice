import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data } = await db.from('tools').select('slug,tutorial_links').in('slug',['inngest','dbos','readme','base44','geotab']).order('slug')
for (const t of data || []) {
  console.log(`\n=== ${t.slug} (${(t.tutorial_links||[]).length} links) ===`)
  for (const l of (t.tutorial_links||[]).slice(0,5)) {
    console.log(`  TITLE: ${l.title}`)
    console.log(`  DESC:  ${l.description?.slice(0,100)}`)
    console.log(`  URL:   ${l.url}`)
  }
}
