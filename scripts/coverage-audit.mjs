import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const { count: total } = await db.from('tools').select('id', { count: 'exact', head: true }).eq('is_published', true)
console.log(`Total published tools: ${total}`)

// Page through all tools to inspect arrays
let from = 0
const PAGE = 500
let lu_total = 0
let lu_proper = 0
let lu_broken_old_shape = 0
let lu_empty = 0
let tu_with_urls = 0
let tu_with_links = 0
let tu_links_complete = 0  // links count >= urls count
let tu_empty = 0

while (true) {
  const { data, error } = await db
    .from('tools')
    .select('id,slug,tutorial_urls,tutorial_links,latest_updates')
    .eq('is_published', true)
    .order('id')
    .range(from, from + PAGE - 1)
  if (error) { console.error(error); break }
  if (!data?.length) break

  for (const t of data) {
    // latest_updates
    const lu = Array.isArray(t.latest_updates) ? t.latest_updates : []
    if (lu.length === 0) lu_empty++
    else {
      lu_total++
      const allHaveUrl = lu.every((u) => u && typeof u === 'object' && typeof u.url === 'string' && u.url.startsWith('http'))
      const someBroken = lu.some((u) => u && typeof u === 'object' && (u.headline || u.source_path) && !u.url)
      if (allHaveUrl && !someBroken) lu_proper++
      else if (someBroken) lu_broken_old_shape++
    }
    // tutorial_urls / tutorial_links
    const urls = Array.isArray(t.tutorial_urls) ? t.tutorial_urls.filter((u) => typeof u === 'string' && u.startsWith('http')) : []
    const links = Array.isArray(t.tutorial_links) ? t.tutorial_links : []
    if (urls.length === 0 && links.length === 0) tu_empty++
    else {
      if (urls.length > 0) tu_with_urls++
      if (links.length > 0) tu_with_links++
      if (links.length >= urls.length && urls.length > 0) tu_links_complete++
    }
  }
  if (data.length < PAGE) break
  from += PAGE
}

console.log(`\n=== Latest Updates (news) coverage ===`)
console.log(`  Empty (will show empty-state message): ${lu_empty} (${Math.round(lu_empty/total*100)}%)`)
console.log(`  Has items, ALL proper shape (will render with titles): ${lu_proper} (${Math.round(lu_proper/total*100)}%)`)
console.log(`  Has items, broken old shape (will render badly): ${lu_broken_old_shape}`)
console.log(`  Total with items: ${lu_total}`)

console.log(`\n=== Tutorials coverage ===`)
console.log(`  No tutorial data at all (section hidden): ${tu_empty} (${Math.round(tu_empty/total*100)}%)`)
console.log(`  Has tutorial_urls (raw URLs): ${tu_with_urls}`)
console.log(`  Has tutorial_links (real titles): ${tu_with_links}`)
console.log(`  Fully backfilled (links count >= urls count): ${tu_links_complete}`)
console.log(`  Pending backfill (has urls but missing links): ${tu_with_urls - tu_links_complete}`)
