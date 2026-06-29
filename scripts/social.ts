/**
 * Phase 13 Social — operator CLI for the drafting brain.
 *
 * The brain researches our LIVE data, writes platform-tailored copy + picks a
 * branded graphic, runs every draft through the SOP gate, assigns an optimal
 * schedule slot, and stores each as a DRAFT in social_posts for one-tap approval.
 * Nothing here posts anything.
 *
 * USAGE:
 *   npm run social:pool                         # print the candidate pool (no cost, no write)
 *   npm run social:draft -- --dry               # show the per-platform plan (no API/DB)
 *   npm run social:draft -- --platforms=x,linkedin --limit=2
 *   npm run social:draft                        # draft for all 4 platforms → social_posts
 *   npm run social:status                       # queue counts by status/platform
 *   npm run social:preview -- --id=<uuid>       # print one draft + its graphic preview URL
 *
 * REQUIRED ENV: DEEPSEEK_API_KEY · NEXT_PUBLIC_SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY
 * COST: ~$0.001 per drafted post (DeepSeek). X posting cost is separate + capped (S5).
 */
export {}

import { getAdminClient } from '../lib/cron/supabase-admin'
import { runScriptedPipeline } from '../lib/pipelines/with-logging'
import { buildCandidatePool, draftPosts } from '../lib/social/brain'
import type { Platform } from '../lib/social/types'

const SITE = process.env.SOCIAL_PUBLIC_ORIGIN ?? 'https://rightaichoice.com'
const ALL: Platform[] = ['linkedin', 'x', 'instagram', 'reddit']

const argv = process.argv.slice(2)
const mode =
  argv.find((a) => ['--pool', '--draft', '--status', '--preview'].includes(a)) ?? '--status'
const isDry = argv.includes('--dry') || argv.includes('--dry-run')
const arg = (k: string) => argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1]
const platforms = (arg('platforms')?.split(',').map((s) => s.trim()) as Platform[] | undefined)?.filter((p) =>
  ALL.includes(p),
) ?? ALL
const limit = arg('limit') ? Math.max(1, parseInt(arg('limit')!, 10)) : 2
const xCap = arg('x-cap') ? parseFloat(arg('x-cap')!) : process.env.X_MONTHLY_CAP_USD ? parseFloat(process.env.X_MONTHLY_CAP_USD) : null

async function pool() {
  const cands = await buildCandidatePool()
  console.log(`\n=== ${cands.length} CANDIDATES (live data, ranked) ===\n`)
  for (const c of cands) {
    console.log(`• [${c.key}] score=${c.score}  kind=${c.kind}`)
    console.log(`   topic:  ${c.topic}`)
    console.log(`   facts:  ${c.facts.slice(0, 140)}${c.facts.length > 140 ? '…' : ''}`)
    console.log(`   source: ${c.sources.map((s) => s.url).join(', ')}\n`)
  }
}

async function draft() {
  await runScriptedPipeline({ source: 'gh_actions', pipelineKey: 'social-draft' }, async (ctx) => {
    console.log(`\nDrafting for [${platforms.join(', ')}], up to ${limit}/platform${isDry ? ' (DRY RUN)' : ''}…\n`)
    const { poolSize, outcomes } = await draftPosts({
      platforms,
      perPlatform: limit,
      dryRun: isDry,
      xMonthlyCapUSD: xCap,
    })
    let queued = 0
    let failed = 0
    for (const o of outcomes) {
      const tag =
        o.status === 'queued' ? '✓ QUEUED' : o.status === 'planned' ? '· planned' : `✗ ${o.status}`
      console.log(`${tag.padEnd(18)} ${o.platform.padEnd(10)} ${o.candidateKey}`)
      if (o.angle) console.log(`   angle: ${o.angle}`)
      if (o.scheduledAt) console.log(`   slot:  ${o.scheduledAt}${o.id ? `  id=${o.id}` : ''}`)
      if (o.reasons?.length) console.log(`   why:   ${o.reasons.join('; ')}`)
      if (o.status === 'queued') queued++
      if (o.status === 'error' || o.status === 'rejected') failed++
    }
    ctx.recordItems({ processed: outcomes.length, succeeded: queued, failed })
    ctx.recordMetadata({ poolSize, platforms, dryRun: isDry })
    if (queued < outcomes.length) ctx.setStatus('partial')
    console.log(`\nPool ${poolSize} candidates · ${queued} queued · ${outcomes.length - queued} not queued`)
  })
}

async function status() {
  const supa = getAdminClient()
  const res = await supa.from('social_posts').select('platform, status')
  const rows = (res.data ?? []) as Array<{ platform: string; status: string }>
  console.log(`\n=== SOCIAL QUEUE (${rows.length} total) ===`)
  const byStatus: Record<string, number> = {}
  const byPlatform: Record<string, number> = {}
  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1
    byPlatform[r.platform] = (byPlatform[r.platform] ?? 0) + 1
  }
  console.log('\nby status:')
  for (const s of ['draft', 'approved', 'scheduled', 'posted', 'failed', 'cancelled'])
    console.log(`  ${s.padEnd(11)} ${byStatus[s] ?? 0}`)
  console.log('\nby platform:')
  for (const p of ALL) console.log(`  ${p.padEnd(11)} ${byPlatform[p] ?? 0}`)
}

async function preview() {
  const id = arg('id')
  if (!id) {
    console.error('preview needs --id=<uuid>')
    process.exit(1)
  }
  const supa = getAdminClient()
  const res = await supa.from('social_posts').select('*').eq('id', id).single()
  const p = res.data as Record<string, unknown> | null
  if (!p) {
    console.error('not found')
    process.exit(1)
  }
  console.log(`\n=== DRAFT ${id} ===`)
  console.log(`platform : ${p.platform}   kind: ${p.kind}   status: ${p.status}`)
  if (p.subreddit) console.log(`subreddit: r/${p.subreddit}`)
  console.log(`scheduled: ${p.scheduled_at ?? '(none)'}`)
  console.log(`\n--- COPY ---\n${p.copy}`)
  if (Array.isArray(p.hashtags) && p.hashtags.length) console.log(`\nhashtags: ${(p.hashtags as string[]).join(' ')}`)
  if (p.link_url) console.log(`link: ${p.link_url}`)
  if (p.graphic_template) console.log(`\ngraphic: ${p.graphic_template}  →  ${SITE}/api/social/graphic/${id}`)
  console.log(`sources: ${(p.source_refs as Array<{ url: string }>).map((s) => s.url).join(', ')}`)
}

async function main() {
  if (mode === '--pool') return pool()
  if (mode === '--draft') return draft()
  if (mode === '--preview') return preview()
  return status()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
