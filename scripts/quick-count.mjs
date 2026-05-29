import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const since = new Date(Date.now() - 24*60*60*1000).toISOString()
const { count } = await db.from('tools').select('id',{count:'exact',head:true}).eq('is_published',true).gte('last_full_refresh_at', since)
const { count: total } = await db.from('tools').select('id',{count:'exact',head:true}).eq('is_published',true)
console.log(`Refreshed in last 24h: ${count} / ${total} = ${(count/total*100).toFixed(1)}%`)
