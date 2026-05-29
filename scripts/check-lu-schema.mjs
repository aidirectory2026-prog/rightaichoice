import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
// Compare: old well-known tool vs newly added
const { data: old } = await db.from('tools').select('slug,latest_updates').eq('slug','elevenlabs').single()
const { data: nw } = await db.from('tools').select('slug,latest_updates').eq('slug','dbos').single()
console.log('=== elevenlabs (OLD) first item ===')
console.log(JSON.stringify((old?.latest_updates||[])[0], null, 2))
console.log('\n=== dbos (NEW) first item ===')
console.log(JSON.stringify((nw?.latest_updates||[])[0], null, 2))
