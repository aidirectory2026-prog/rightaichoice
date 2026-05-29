import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const WEIGHTS = { wrapper_dependency: 0.3, github_activity: 0.2, funding_runway: 0.2, hyperscaler_overlap: 0.15, category_mortality: 0.1, website_health: 0.05 }

function calcGithub(stars, hasUrl) {
  if (!hasUrl) return 50
  if (stars >= 10000) return 100
  if (stars >= 1000) return 85
  if (stars >= 100) return 65
  if (stars >= 10) return 45
  return 25
}
function calcFunding(pt) {
  if (pt === 'paid' || pt === 'freemium') return 80
  if (pt === 'free') return 40
  return 60
}
function calcSignals(t) {
  return {
    wrapper_dependency: t.is_wrapper ? 0 : 100,
    github_activity: calcGithub(t.github_stars ?? 0, !!t.github_url),
    funding_runway: calcFunding(t.pricing_type),
    hyperscaler_overlap: 80,
    category_mortality: 70,
    website_health: t.website_url ? 90 : 0,
  }
}
function score(sig) {
  let s = 0
  for (const [k, w] of Object.entries(WEIGHTS)) s += (sig[k] ?? 50) * w
  return Math.round(Math.max(0, Math.min(100, s)))
}

let total = 0
for (;;) {
  const { data: tools, error } = await db
    .from('tools')
    .select('id, slug, is_wrapper, github_url, github_stars, pricing_type, website_url')
    .eq('is_published', true)
    .is('viability_score', null)
    .limit(200)
  if (error) { console.error(error); break }
  if (!tools?.length) break
  for (const t of tools) {
    const signals = calcSignals(t)
    const s = score(signals)
    const { error: upErr } = await db.from('tools').update({
      viability_score: s,
      viability_signals: signals,
      viability_updated_at: new Date().toISOString(),
    }).eq('id', t.id)
    if (upErr) console.error(t.slug, upErr.message)
    else total++
  }
  console.log(`processed batch of ${tools.length}, running total ${total}`)
}
console.log(`done — backfilled ${total} viability scores`)
