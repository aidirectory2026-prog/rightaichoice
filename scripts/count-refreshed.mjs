import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const { count: total } = await db.from('tools').select('id', { count: 'exact', head: true }).eq('is_published', true)
const { count: refreshedToday } = await db.from('tools').select('id', { count: 'exact', head: true }).eq('is_published', true).gte('last_full_refresh_at', '2026-05-26T20:00:00Z')
const { count: everRefreshed } = await db.from('tools').select('id', { count: 'exact', head: true }).eq('is_published', true).not('last_full_refresh_at', 'is', null)
const { count: hasFreshLatest } = await db.from('tools').select('id', { count: 'exact', head: true }).eq('is_published', true).gte('latest_updates_at', '2026-05-26T20:00:00Z')

console.log(`Total published: ${total}`)
console.log(`Refreshed in this session (since 26-May 20:00 UTC): ${refreshedToday}`)
console.log(`Ever-refreshed: ${everRefreshed}`)
console.log(`Has latest_updates updated this session: ${hasFreshLatest}`)
