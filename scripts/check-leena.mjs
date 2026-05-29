import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data } = await db.from('tools').select('slug,tutorial_urls,tutorial_links,latest_updates,models,community_links,pricing_details,last_full_refresh_at,features,use_cases,faqs_long_tail,skip_if,hidden_costs').eq('slug','leena-ai').single()
console.log(JSON.stringify({
  slug: data.slug,
  last_full_refresh_at: data.last_full_refresh_at,
  tutorial_urls: data.tutorial_urls,
  tutorial_links_count: (data.tutorial_links||[]).length,
  tutorial_links_first: (data.tutorial_links||[])[0],
  latest_updates_count: (data.latest_updates||[]).length,
  latest_updates_first: (data.latest_updates||[])[0],
  models: data.models,
  community_links: data.community_links,
  pricing_details_count: (data.pricing_details||[]).length,
  features_count: (data.features||[]).length,
  use_cases_count: (data.use_cases||[]).length,
  faqs_count: (data.faqs_long_tail||[]).length,
  skip_if_len: (data.skip_if||'').length,
  hidden_costs_count: (data.hidden_costs||[]).length,
}, null, 2))
