import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data: dbos } = await db.from('tools').select('slug,created_at,last_verified_at,viability_score,features,integrations,best_for,use_cases,latest_updates,tutorial_urls,pricing_details,editorial_verdict,our_views').eq('slug','dbos').single()
console.log('DBOS:', JSON.stringify({
  ...dbos,
  features: dbos.features?.length,
  integrations: dbos.integrations?.length,
  best_for: dbos.best_for?.length,
  use_cases: dbos.use_cases?.length,
  latest_updates: dbos.latest_updates?.length,
  tutorial_urls: dbos.tutorial_urls?.length,
  pricing_details: dbos.pricing_details?.length,
}, null, 2))
const { data: d2 } = await db.from('tools').select('slug,created_at').order('created_at',{ascending:false}).limit(5)
console.log('\nLatest created:', d2)
