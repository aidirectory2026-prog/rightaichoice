import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const sample = async (label, filter) => {
  let q = db.from('tools').select('slug,name,viability_score,features,integrations,best_for,not_for,use_cases,models,tutorial_urls,limitations,latest_updates,latest_updates_at,editorial_verdict,our_views,pricing_details,community_links,description')
  q = filter(q)
  const { data } = await q.limit(10)
  console.log(`\n=== ${label} (${(data||[]).length}) ===`)
  for (const t of data || []) {
    const lu = Array.isArray(t.latest_updates) ? t.latest_updates : []
    const pd = Array.isArray(t.pricing_details) ? t.pricing_details : []
    console.log(`${t.slug.padEnd(28)} viab=${String(t.viability_score ?? 'NULL').padEnd(5)} feat=${(t.features||[]).length} integ=${(t.integrations||[]).length} best=${(t.best_for||[]).length} use=${(t.use_cases||[]).length} model=${(t.models||[]).length} tut=${(t.tutorial_urls||[]).length} pricing=${pd.length} lu=${lu.length} verdict=${t.editorial_verdict?.length||0}ch views=${t.our_views?.length||0}ch desc=${t.description?.length||0}ch`)
  }
}
await sample('OLD (created before 2026-04)', q => q.lt('created_at','2026-04-01'))
await sample('NEW (batch35 today)', q => q.gte('created_at','2026-05-26T20:00:00Z'))
