import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { count, error } = await db.from('tools').select('id', { count: 'exact', head: true }).eq('is_published', true)
console.log('PUBLISHED:', count, error?.message ?? '')
