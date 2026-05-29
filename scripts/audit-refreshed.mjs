import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Random sample of 8 refreshed tools
const { data: sample } = await db
  .from('tools')
  .select('slug,name,features,use_cases,best_for,faqs_long_tail,pricing_details,tutorial_urls,tutorial_links,latest_updates,models,skip_if,hidden_costs,workflow_scenarios')
  .eq('is_published', true)
  .not('last_full_refresh_at', 'is', null)
  .order('last_full_refresh_at', { ascending: false })
  .limit(8)

for (const t of sample) {
  const lu = Array.isArray(t.latest_updates) ? t.latest_updates : []
  const luOk = lu.length > 0 && lu[0]?.title && lu[0]?.url
  console.log(`\n=== ${t.slug} (${t.name}) ===`)
  console.log(`  features: ${(t.features||[]).length} · use_cases: ${(t.use_cases||[]).length} · best_for: ${(t.best_for||[]).length}`)
  console.log(`  faqs: ${(t.faqs_long_tail||[]).length} · pricing tiers: ${(t.pricing_details||[]).length} · workflow_scenarios: ${(t.workflow_scenarios||[]).length}`)
  console.log(`  hidden_costs: ${(t.hidden_costs||[]).length} · skip_if: ${(t.skip_if||'').length > 0 ? 'YES' : 'NO'}`)
  console.log(`  models: ${(t.models||[]).length} · tutorial_urls: ${(t.tutorial_urls||[]).length}`)
  console.log(`  tutorial_links (REAL TITLES): ${(t.tutorial_links||[]).length}`)
  console.log(`  latest_updates: ${lu.length} · schema-correct: ${luOk ? 'YES' : 'NO'}`)
  if (lu[0]) console.log(`    first: [${lu[0].date}] ${(lu[0].title||'').slice(0,60)}`)
}

// Coverage across all refreshed
console.log('\n--- COVERAGE across all 1,935 refreshed ---')
const { count: hasFeatures } = await db.from('tools').select('id',{count:'exact',head:true}).eq('is_published',true).gte('last_full_refresh_at','2026-05-26T00:00:00Z').not('features','eq','{}')
const { count: hasFaqs } = await db.from('tools').select('id',{count:'exact',head:true}).eq('is_published',true).gte('last_full_refresh_at','2026-05-26T00:00:00Z').not('faqs_long_tail','eq','[]')
const { count: hasPricing } = await db.from('tools').select('id',{count:'exact',head:true}).eq('is_published',true).gte('last_full_refresh_at','2026-05-26T00:00:00Z').not('pricing_details','eq','[]')
const { count: hasTutorialUrls } = await db.from('tools').select('id',{count:'exact',head:true}).eq('is_published',true).gte('last_full_refresh_at','2026-05-26T00:00:00Z').not('tutorial_urls','eq','{}')
const { count: hasTutorialLinks } = await db.from('tools').select('id',{count:'exact',head:true}).eq('is_published',true).gte('last_full_refresh_at','2026-05-26T00:00:00Z').not('tutorial_links','eq','[]')
const { count: hasLatestUpdates } = await db.from('tools').select('id',{count:'exact',head:true}).eq('is_published',true).gte('last_full_refresh_at','2026-05-26T00:00:00Z').not('latest_updates','eq','[]')

console.log(`features populated:        ${hasFeatures} / 1935`)
console.log(`faqs populated:            ${hasFaqs} / 1935`)
console.log(`pricing_details populated: ${hasPricing} / 1935`)
console.log(`tutorial_urls populated:   ${hasTutorialUrls} / 1935`)
console.log(`tutorial_links populated:  ${hasTutorialLinks} / 1935  ← real page titles (needs HTTP backfill)`)
console.log(`latest_updates populated:  ${hasLatestUpdates} / 1935`)
