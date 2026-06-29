/**
 * Phase 13 D2.2b — Digital-PR / data-journalism engine (operator CLI).
 *
 * Derives newsworthy angles from our LIVE data, drafts a personalized pitch per
 * (angle × target) with DeepSeek, and stores each as a DRAFT in pr_pitches for the
 * operator to review, edit, approve, and send. Also writes a CSV working file.
 *
 * USAGE:
 *   npm run pr:angles                      # print the data angles (no cost, no write)
 *   npm run pr:draft:dry                   # show the angle×target plan, no API/DB
 *   npm run pr:draft -- --limit=8          # draft 8 pitches → pr_pitches + CSV
 *   npm run pr:draft -- --angle=pricing    # only the pricing angle
 *   npm run pr:draft -- --target=bens-bites
 *   npm run pr:status                      # pitch pipeline counts
 *
 * REQUIRED ENV: DEEPSEEK_API_KEY · NEXT_PUBLIC_SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY
 * COST: ~$0.001 per drafted pitch (DeepSeek). Operator decides which to actually send.
 */
export {}

import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { getAdminClient } from '../lib/cron/supabase-admin'
import { runScriptedPipeline } from '../lib/pipelines/with-logging'
import { buildStoryAngles, type StoryAngle } from '../lib/pr/story-angles'
import { PR_TARGETS, type PrTarget } from '../lib/pr/targets'
import { draftPitch } from '../lib/pr/draft-pitch'

const args = process.argv.slice(2)
const mode = args.find((a) => ['--angles', '--draft', '--status'].includes(a)) ?? '--status'
const isDry = args.includes('--dry-run') || args.includes('--dry')
const arg = (k: string) => args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1]
const limit = arg('limit') ? parseInt(arg('limit')!, 10) : 8
const onlyAngle = arg('angle')
const onlyTarget = arg('target')

function csvEscape(s: string): string {
  return `"${(s ?? '').replace(/"/g, '""')}"`
}

async function printAngles() {
  const angles = await buildStoryAngles()
  console.log(`\n=== ${angles.length} DATA ANGLES (live) ===\n`)
  for (const a of angles) {
    console.log(`• [${a.key}] ${a.headline}`)
    console.log(`   stat:  ${a.stat}`)
    console.log(`   beat:  ${a.beat}\n`)
  }
}

function pairs(angles: StoryAngle[], targets: PrTarget[]): Array<{ angle: StoryAngle; target: PrTarget }> {
  const out: Array<{ angle: StoryAngle; target: PrTarget }> = []
  for (const angle of angles) for (const target of targets) out.push({ angle, target })
  return out
}

async function draft() {
  let angles = await buildStoryAngles()
  if (onlyAngle) angles = angles.filter((a) => a.key === onlyAngle)
  let targets = PR_TARGETS
  if (onlyTarget) targets = targets.filter((t) => t.key === onlyTarget)

  const plan = pairs(angles, targets).slice(0, limit)
  console.log(`Angles: ${angles.length} · Targets: ${targets.length} · Drafting ${plan.length} pitches (limit ${limit})`)
  console.log(`Mode: ${isDry ? 'DRY (no API/DB)' : 'APPLY'}\n`)
  if (isDry) {
    for (const { angle, target } of plan) console.log(`  ${angle.key.padEnd(12)} → ${target.key} (${target.method})`)
    console.log('\nDRY — no drafts generated.')
    return
  }

  await runScriptedPipeline({ source: 'gh_actions', pipelineKey: 'pr-pitch-draft' }, async (ctx) => {
    const supa = getAdminClient()
    const rows: Array<Record<string, unknown>> = []
    let ok = 0
    let failed = 0
    for (const { angle, target } of plan) {
      try {
        const p = await draftPitch(angle, target)
        rows.push({
          angle_key: angle.key,
          angle_title: angle.headline,
          target_key: target.key,
          target_name: target.name,
          target_outlet: target.outlet,
          target_contact: target.url,
          pitch_subject: p.subject,
          pitch_body: p.body,
          model: p.model,
          status: 'draft',
        })
        ok++
        console.log(`✓ ${angle.key} → ${target.key}: ${p.subject.slice(0, 60)}`)
      } catch (err) {
        failed++
        console.log(`✗ ${angle.key} → ${target.key}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    if (rows.length) {
      const { error } = await supa
        .from('pr_pitches')
        .upsert(rows as never, { onConflict: 'angle_key,target_key' })
      if (error) throw new Error(`pr_pitches upsert failed: ${error.message}`)

      // CSV working file for the operator.
      const dir = join(process.cwd(), 'logs')
      mkdirSync(dir, { recursive: true })
      const file = join(dir, `pr-pitches-${new Date().toISOString().slice(0, 10)}.csv`)
      const header = 'angle,target,outlet,method_contact,subject,body\n'
      const body = rows
        .map((r) =>
          [r.angle_key, r.target_key, r.target_outlet, r.target_contact, r.pitch_subject, r.pitch_body]
            .map((v) => csvEscape(String(v ?? '')))
            .join(','),
        )
        .join('\n')
      writeFileSync(file, header + body)
      console.log(`\n✓ wrote ${rows.length} drafts to pr_pitches + ${file}`)
    }

    ctx.recordItems({ processed: plan.length, succeeded: ok, failed })
    return { drafted: ok, failed }
  })
}

async function status() {
  const supa = getAdminClient()
  const { data } = await supa.from('pr_pitches').select('status')
  const rows = (data ?? []) as Array<{ status: string }>
  const by: Record<string, number> = {}
  for (const r of rows) by[r.status] = (by[r.status] ?? 0) + 1
  console.log(`PR pitch pipeline (${rows.length} total):`)
  for (const s of ['draft', 'approved', 'sent', 'responded', 'landed', 'declined'])
    console.log(`  ${s.padEnd(10)} ${by[s] ?? 0}`)
}

async function main() {
  if (mode === '--angles') await printAngles()
  else if (mode === '--draft') await draft()
  else await status()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
