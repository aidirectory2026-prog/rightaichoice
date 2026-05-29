import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data, error } = await db
  .from('tools')
  .select('slug,name,latest_updates,latest_updates_at')
  .not('latest_updates_at','is',null)
  .order('latest_updates_at',{ascending:false})
  .limit(10)
if (error) console.error(error)
for (const t of data || []) {
  const lu = Array.isArray(t.latest_updates) ? t.latest_updates : []
  console.log(`${t.slug} (${t.name}): ${lu.length} updates`)
  if (lu.length) console.log('  first:', JSON.stringify(lu[0]).slice(0,150))
}
console.log('count returned:', (data||[]).length)
