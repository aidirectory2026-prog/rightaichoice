/**
 * Phase 13 D2.1 — directory submission engine (operator CLI).
 *
 * The operator does the actual (human, CAPTCHA-gated) submission; this prepares
 * the queue + the copy-paste kit and verifies backlinks once listings go live.
 *
 * USAGE:
 *   npm run authority:seed                  # populate directory_submissions from the target list (idempotent)
 *   npm run authority:next                  # show the next directories to submit + the paste-ready kit
 *   npm run authority:next -- --limit=3
 *   npm run authority:check                 # re-fetch submitted/live listings, detect backlinks → referring_domains
 *   npm run authority:status                # pipeline counts
 *
 * REQUIRED ENV: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */
export {}

import { getAdminClient } from '../lib/cron/supabase-admin'
import { runScriptedPipeline } from '../lib/pipelines/with-logging'
import { DIRECTORY_TARGETS } from '../lib/authority/directory-targets'
import { buildSubmissionKit } from '../lib/authority/submission-kit'
import { detectBacklink } from '../lib/authority/backlink-check'

const args = process.argv.slice(2)
const mode = args.find((a) => ['--seed', '--next', '--check', '--status', '--mark'].includes(a)) ?? '--status'
const arg = (k: string) => args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1]
const limit = arg('limit') ? parseInt(arg('limit')!, 10) : 5
const markKey = args[args.indexOf('--mark') + 1] // key after --mark

async function seed() {
  const db = getAdminClient()
  // Upsert metadata; preserve operator-set status/submitted_at/live_url via ignoreDuplicates=false but
  // only overwriting descriptive fields. We do a manual "insert if absent" to avoid clobbering progress.
  const { data: existing } = await db.from('directory_submissions').select('directory_key')
  const have = new Set(((existing ?? []) as Array<{ directory_key: string }>).map((r) => r.directory_key))
  const toInsert = DIRECTORY_TARGETS.filter((d) => !have.has(d.key)).map((d) => ({
    directory_key: d.key,
    directory_name: d.name,
    directory_url: d.url,
    submit_url: d.submitUrl ?? null,
    authority_tier: d.authorityTier,
    da_estimate: d.daEstimate ?? null,
    pricing: d.pricing,
    dofollow: d.dofollow ?? null,
    category: d.category,
    notes: d.notes ?? null,
  }))
  if (toInsert.length === 0) {
    console.log(`Seed: all ${DIRECTORY_TARGETS.length} targets already present. Nothing to insert.`)
    return
  }
  const { error } = await db.from('directory_submissions').insert(toInsert as never)
  if (error) throw new Error(`seed insert failed: ${error.message}`)
  console.log(`Seed: inserted ${toInsert.length} new directories (${have.size} already present).`)
}

async function next() {
  const db = getAdminClient()
  const { data } = await db
    .from('directory_submissions')
    .select('directory_key, directory_name, submit_url, authority_tier, da_estimate, pricing, dofollow, notes')
    .eq('status', 'queued')
    .order('authority_tier', { ascending: true })
    .limit(limit)
  const rows = (data ?? []) as Array<Record<string, unknown>>
  if (rows.length === 0) {
    console.log('No queued directories. Run `npm run authority:seed` first, or all are submitted.')
    return
  }
  console.log(`\n=== NEXT ${rows.length} DIRECTORIES TO SUBMIT (operator action) ===\n`)
  for (const r of rows) {
    console.log(
      `• [T${r.authority_tier}] ${r.directory_name} — DA~${r.da_estimate ?? '?'} · ${r.dofollow ? 'dofollow' : 'nofollow/?'} · ${r.pricing}`,
    )
    console.log(`  submit: ${r.submit_url ?? '(find the submit form on their site)'}`)
    if (r.notes) console.log(`  note:   ${r.notes}`)
    console.log(
      `  after submitting: npx tsx --env-file=.env.local scripts/authority-directories.ts --mark ${r.directory_key} (or update via /admin/authority)`,
    )
    console.log('')
  }
  console.log('=== PASTE-READY SUBMISSION KIT (identical copy everywhere) ===\n')
  console.log(buildSubmissionKit())
}

async function check(): Promise<{ checked: number; backlinks: number }> {
  const db = getAdminClient()
  const { data } = await db
    .from('directory_submissions')
    .select('id, directory_key, directory_name, live_url, status')
    .in('status', ['submitted', 'live'])
    .not('live_url', 'is', null)
  const rows = (data ?? []) as Array<{ id: string; directory_key: string; directory_name: string; live_url: string }>
  let backlinks = 0
  for (const r of rows) {
    const res = await detectBacklink(r.live_url)
    const now = new Date().toISOString()
    await db
      .from('directory_submissions')
      .update({ last_checked_at: now, backlink_detected: res.found, status: res.found ? 'live' : 'submitted', updated_at: now } as never)
      .eq('id', r.id)
    console.log(`${res.found ? '✓ backlink' : '· no link '} ${r.directory_name} (${r.live_url}) [http ${res.status ?? 'err'}]`)
    if (res.found) {
      backlinks++
      // Feed the existing /admin/authority dashboard (referring_domains, channel=directory).
      const host = r.live_url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
      await db
        .from('referring_domains')
        .upsert(
          {
            domain: host,
            source_channel: 'other',
            target_url: 'https://rightaichoice.com',
            source_url: r.live_url,
            notes: `directory:${r.directory_key}`,
          } as never,
          { onConflict: 'domain', ignoreDuplicates: true },
        )
    }
  }
  return { checked: rows.length, backlinks }
}

async function status() {
  const db = getAdminClient()
  const { data } = await db.from('directory_submissions').select('status, backlink_detected')
  const rows = (data ?? []) as Array<{ status: string; backlink_detected: boolean }>
  const by: Record<string, number> = {}
  for (const r of rows) by[r.status] = (by[r.status] ?? 0) + 1
  const backlinks = rows.filter((r) => r.backlink_detected).length
  console.log(`Directory pipeline (${rows.length} total):`)
  for (const s of ['queued', 'submitted', 'live', 'rejected', 'skipped']) console.log(`  ${s.padEnd(10)} ${by[s] ?? 0}`)
  console.log(`  backlinks  ${backlinks}`)
}

async function mark() {
  if (!markKey || markKey.startsWith('--')) throw new Error('usage: --mark <directory_key> [--status=submitted|live|rejected|skipped] [--live-url=URL]')
  const db = getAdminClient()
  const newStatus = arg('status') || 'submitted'
  const liveUrl = arg('live-url')
  const now = new Date().toISOString()
  const patch: Record<string, unknown> = { status: newStatus, updated_at: now }
  if (newStatus === 'submitted' || newStatus === 'live') patch.submitted_at = now
  if (liveUrl) patch.live_url = liveUrl
  const { error, count } = await db
    .from('directory_submissions')
    .update(patch as never, { count: 'exact' })
    .eq('directory_key', markKey)
  if (error) throw new Error(`mark failed: ${error.message}`)
  console.log(`Marked ${markKey} → ${newStatus}${liveUrl ? ` (live_url=${liveUrl})` : ''} [${count ?? 0} row].`)
}

async function main() {
  if (mode === '--seed') await seed()
  else if (mode === '--mark') await mark()
  else if (mode === '--next') await next()
  else if (mode === '--check') {
    const res = await runScriptedPipeline({ source: 'gh_actions', pipelineKey: 'authority-directory-check' }, async (ctx) => {
      const r = await check()
      ctx.recordItems({ processed: r.checked, succeeded: r.backlinks })
      ctx.recordMetadata({ backlinks: r.backlinks })
      return r
    })
    console.log(`\nChecked ${res.checked} listings · ${res.backlinks} backlinks confirmed.`)
  } else await status()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
