/**
 * Daily growth orchestrator — run every morning.
 *
 *   npm run daily            # auto-runs everything automatable + prints manual checklist
 *   npm run daily -- --dry   # show what would happen, don't actually submit
 *
 * What it does AUTOMATICALLY:
 *   1. Bing direct submission (smart-mode rotation: compares → tools → alts → categories)
 *   2. GSC sitemap re-ping (throttled — only fires if >7 days since last submit)
 *   3. IndexNow batch on URLs modified in the last 24 hours
 *
 * What it REMINDS you to do manually:
 *   - Review /admin/authority (any new RDs to log?)
 *   - Send today's batch of outreach emails (5–10 from logs/outreach-*.csv)
 *   - Check HARO / Qwoted / Featured.com inbox (15 min, 2–3 quotes max)
 *   - Bing Webmaster dashboard spot-check (any sudden index drops?)
 *
 * Designed to be called by a macOS launchd plist at 9am every weekday.
 * The plist + install instructions live in scripts/launchd/. After
 * install, you literally never have to remember Bing/GSC/IndexNow
 * again — it just happens, and you get a Notification Center alert
 * when the run completes.
 */
export {}

import { execFileSync, spawnSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const DRY = process.argv.includes('--dry')
const STATE_FILE = join(process.cwd(), 'scripts', '.daily-orchestrator-state.json')
const LOGS_DIR = join(process.cwd(), 'logs')

type State = {
  lastGscSitemapSubmit: string
  lastIndexNowRecent: string
  runHistory: Array<{ date: string; ok: boolean; summary: string }>
}

function loadState(): State {
  if (!existsSync(STATE_FILE)) {
    return { lastGscSitemapSubmit: '', lastIndexNowRecent: '', runHistory: [] }
  }
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8')) as State
  } catch {
    return { lastGscSitemapSubmit: '', lastIndexNowRecent: '', runHistory: [] }
  }
}

function saveState(s: State) {
  if (!existsSync(join(process.cwd(), 'scripts'))) {
    mkdirSync(join(process.cwd(), 'scripts'), { recursive: true })
  }
  writeFileSync(STATE_FILE, JSON.stringify(s, null, 2))
}

function daysSince(iso: string): number {
  if (!iso) return Infinity
  return (Date.now() - new Date(iso).getTime()) / 86_400_000
}

// Run an npm script via execFile (no shell, no injection vector).
// All args are static literals defined in THIS file.
function runNpm(
  scriptName: string,
  extraArgs: string[],
  label: string,
): { ok: boolean; output: string } {
  console.log(`\n──── ${label} ────`)
  if (DRY) {
    console.log(`  [dry] would run: npm run ${scriptName} ${extraArgs.join(' ')}`)
    return { ok: true, output: '[dry]' }
  }
  const result = spawnSync('npm', ['run', scriptName, '--', ...extraArgs], {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const output = (result.stdout ?? '') + (result.stderr ?? '')
  process.stdout.write(output)
  return { ok: result.status === 0, output }
}

function macNotify(title: string, body: string) {
  if (DRY) return
  if (process.platform !== 'darwin') return
  try {
    // osascript args are passed as array — no shell parsing of title/body.
    execFileSync(
      'osascript',
      ['-e', `display notification ${JSON.stringify(body.slice(0, 220))} with title ${JSON.stringify(title)}`],
      { stdio: 'ignore' },
    )
  } catch {
    // Notification failure is non-fatal; the log on disk is the real record.
  }
}

async function main() {
  if (!existsSync(LOGS_DIR)) mkdirSync(LOGS_DIR, { recursive: true })
  const state = loadState()
  const today = new Date().toISOString().slice(0, 10)
  const summary: string[] = []

  console.log(`\n╔════════════════════════════════════════════════╗`)
  console.log(`║  RightAIChoice — Daily Growth Run · ${today}  ║`)
  console.log(`╚════════════════════════════════════════════════╝`)

  // ── 1. Bing direct submission (smart rotation, daily) ──────────
  const bing = runNpm(
    'bing:submit',
    DRY ? ['--smart', '--dry'] : ['--smart'],
    'Bing direct submission (smart rotation)',
  )
  summary.push(`Bing: ${bing.ok ? '✓' : '✗'}`)

  // ── 2. GSC sitemap re-ping (throttled — once per 7 days) ───────
  if (daysSince(state.lastGscSitemapSubmit) >= 7) {
    const gsc = runNpm('gsc:sitemap:submit', [], 'GSC sitemap re-submit (weekly)')
    if (gsc.ok && !DRY) state.lastGscSitemapSubmit = new Date().toISOString()
    summary.push(`GSC: ${gsc.ok ? '✓' : '✗'}`)
  } else {
    const days = daysSince(state.lastGscSitemapSubmit).toFixed(1)
    const wait = (7 - daysSince(state.lastGscSitemapSubmit)).toFixed(1)
    console.log(`\n──── GSC sitemap re-submit ────`)
    console.log(`  skipped — last ran ${days}d ago (re-runs every 7d, ${wait}d to next)`)
    summary.push(`GSC: skip`)
  }

  // ── 3. IndexNow for recent updates ─────────────────────────────
  // The Vercel cron at /api/cron/indexnow-recent already runs daily,
  // but a manual nudge here guarantees fresh URLs get pushed even if
  // the cron skips a day.
  if (daysSince(state.lastIndexNowRecent) >= 1) {
    const indexnow = runNpm(
      'indexnow:submit',
      DRY ? ['--dry-run'] : [],
      'IndexNow batch (Bing/Yandex)',
    )
    if (indexnow.ok && !DRY) state.lastIndexNowRecent = new Date().toISOString()
    summary.push(`IndexNow: ${indexnow.ok ? '✓' : '✗'}`)
  } else {
    console.log(`\n──── IndexNow ────`)
    console.log(`  skipped — already ran today`)
    summary.push(`IndexNow: skip`)
  }

  // ── 4. Operator checklist (manual tasks) ───────────────────────
  console.log(`\n╔══════════════════════════════════════════════╗`)
  console.log(`║  MANUAL TASKS — ~15 min total, do these now ║`)
  console.log(`╚══════════════════════════════════════════════╝`)

  console.log(`
  ☐ 1. /admin/authority → log any new referring domains spotted yesterday
       https://rightaichoice.com/admin/authority

  ☐ 2. Send today's outreach batch (5-10 emails from latest CSV)
       open ${LOGS_DIR}/outreach-*.csv
       Paste rows into Gmail / Apollo / Instantly. Mark sent_at in
       outreach_log when done.

  ☐ 3. HARO / Qwoted / Featured.com inbox (15 min cap)
       Templates: lib/outreach/quote-templates.md
       2-3 replies max. Log to outreach_log with source_channel='haro'.

  ☐ 4. Bing Webmaster dashboard spot-check
       https://www.bing.com/webmasters — has indexed-page count moved?
       Sudden drop = act now (sitemap broken? deploy regression?).

  ☐ 5. GSC indexed-page count (weekly, Mondays only)
       https://search.google.com/search-console — track week-over-week
       net-new indexed URLs. Target: 50+/week from current trajectory.
`)

  // ── Record run history ────────────────────────────────────────
  state.runHistory.unshift({
    date: today,
    ok: bing.ok,
    summary: summary.join(' · '),
  })
  state.runHistory = state.runHistory.slice(0, 30)
  if (!DRY) saveState(state)

  // ── macOS notification ────────────────────────────────────────
  const allOk = summary.every((s) => s.endsWith('✓') || s.endsWith('skip'))
  macNotify(
    allOk ? 'RAC daily growth — all green' : 'RAC daily growth — needs attention',
    summary.join(' · ') + ' · Manual checklist in terminal',
  )

  console.log(`\n${allOk ? '✓ Daily run complete.' : '⚠ Daily run finished with issues.'}`)
  console.log(`  Recent runs:`)
  state.runHistory.slice(0, 7).forEach((r) => {
    console.log(`    ${r.date}  ${r.ok ? '✓' : '✗'}  ${r.summary}`)
  })
}

main().catch((err) => {
  console.error(err)
  macNotify('RAC daily growth FAILED', String(err).slice(0, 200))
  process.exit(1)
})
