import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const slugs = ['dbos','temporal-ai','inngest','alice-technologies','helsing','elevenlabs','cursor']
const { data } = await db.from('tools').select('slug,tutorial_urls').in('slug', slugs)
for (const t of data) {
  console.log(`${t.slug}: ${JSON.stringify(t.tutorial_urls)}`)
}
