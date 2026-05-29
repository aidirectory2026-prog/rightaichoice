import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data } = await db.from('tools').select('slug,last_full_refresh_at').not('last_full_refresh_at','is',null).order('last_full_refresh_at',{ascending:false}).limit(5)
console.log('Top 5 most-recent refreshes:')
for (const t of data) console.log(`  ${t.slug}: ${t.last_full_refresh_at}`)

const { count: today } = await db.from('tools').select('id',{count:'exact',head:true}).eq('is_published',true).gte('last_full_refresh_at','2026-05-26T00:00:00Z')
console.log(`\nRefreshed since 2026-05-26 00:00 UTC: ${today}`)
const { count: last24h } = await db.from('tools').select('id',{count:'exact',head:true}).eq('is_published',true).gte('last_full_refresh_at', new Date(Date.now() - 24*60*60*1000).toISOString())
console.log(`Refreshed in last 24h: ${last24h}`)
