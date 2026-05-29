import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { count: total } = await db.from('tools').select('id',{count:'exact',head:true}).eq('is_published',true).not('tutorial_urls','eq','{}')
console.log('tools with tutorial_urls:', total)
const { count: done } = await db.from('tools').select('id',{count:'exact',head:true}).eq('is_published',true).not('tutorial_links','eq','[]')
console.log('tools with tutorial_links already:', done)
