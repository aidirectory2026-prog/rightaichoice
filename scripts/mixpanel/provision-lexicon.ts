/**
 * Writes event + property descriptions into Mixpanel's Lexicon so the UI
 * shows human-readable purpose next to every event name.
 *
 * Run: npm run mixpanel:lexicon        (applies to live project)
 *      npm run mixpanel:lexicon:dry    (no writes — shows plan)
 *
 * Free-tier notes:
 * - Mixpanel's Lexicon endpoint accepts entityType `custom_event` or
 *   `custom_property` (not `event` / `property`).
 * - Schema updates are rate-limited to 5 requests/minute per org. The
 *   endpoint accepts batched `entries`, so we group and pace.
 * - On 429, we back off and retry once per batch.
 */

import { EVENTS } from './config/events'

const PROJECT_ID = process.env.MIXPANEL_PROJECT_ID
const USERNAME = process.env.MIXPANEL_SERVICE_ACCOUNT_USERNAME
const SECRET = process.env.MIXPANEL_SERVICE_ACCOUNT_SECRET
const HOST = process.env.MIXPANEL_API_HOST || 'https://eu.mixpanel.com'

if (!PROJECT_ID || !USERNAME || !SECRET) {
  console.error('Missing Mixpanel env. Need MIXPANEL_PROJECT_ID, MIXPANEL_SERVICE_ACCOUNT_USERNAME, MIXPANEL_SERVICE_ACCOUNT_SECRET.')
  process.exit(1)
}

const auth = Buffer.from(`${USERNAME}:${SECRET}`).toString('base64')

type Entry = {
  entityType: 'custom_event'
  name: string
  schemaJson: Record<string, unknown>
}

function buildEntries(): Entry[] {
  // Free-tier Lexicon API accepts entity types from the "event-like" enum —
  // properties can only be described through the UI. We ship event entries
  // with a rich description that includes the property names + their roles,
  // so the team still sees property context next to each event in Lexicon.
  return EVENTS.map((def) => {
    const propLine =
      def.properties.length > 0
        ? ` — Properties: ${def.properties.map((p) => `${p.name} (${p.type}) — ${p.description}`).join('; ')}`
        : ''
    return {
      entityType: 'custom_event' as const,
      name: def.name,
      schemaJson: {
        $schema: 'http://json-schema.org/draft-07/schema',
        description: `[${def.category}] ${def.description} — Fires: ${def.firesOn} — Why: ${def.whyItMatters}${propLine}`,
        additionalProperties: true,
      },
    }
  })
}

async function pushBatch(entries: Entry[]): Promise<{ ok: boolean; status: number; message: string }> {
  const res = await fetch(`${HOST}/api/app/projects/${PROJECT_ID}/schemas`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${auth}`,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({ entries }),
  })
  const text = await res.text()
  return { ok: res.ok, status: res.status, message: text.slice(0, 200) }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  console.log(`Mixpanel project ${PROJECT_ID} @ ${HOST}  (dry-run=${dryRun})`)

  const entries = buildEntries()
  console.log(`Prepared ${entries.length} event entries. (Properties ride along in each event's description — free-tier Lexicon API does not accept standalone property writes.)`)

  if (dryRun) {
    console.log('Dry-run — no writes. First 5 entries:')
    for (const e of entries.slice(0, 5)) console.log(` - ${e.entityType}  ${e.name}`)
    return
  }

  const BATCH_SIZE = 25
  const SLEEP_MS = 15_000
  const batches: Entry[][] = []
  for (let i = 0; i < entries.length; i += BATCH_SIZE) batches.push(entries.slice(i, i + BATCH_SIZE))

  let applied = 0
  const failures: string[] = []

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]
    process.stdout.write(`Batch ${i + 1}/${batches.length} (${batch.length} entries)... `)
    let result = await pushBatch(batch)
    if (result.status === 429) {
      process.stdout.write('429, waiting 60s and retrying... ')
      await sleep(60_000)
      result = await pushBatch(batch)
    }
    if (result.ok) {
      applied += batch.length
      console.log('ok')
    } else {
      console.log(`fail (${result.status})`)
      failures.push(`Batch ${i + 1}: ${result.status} ${result.message}`)
    }
    if (i < batches.length - 1) await sleep(SLEEP_MS)
  }

  console.log(`\nApplied: ${applied} / ${entries.length}`)
  if (failures.length > 0) {
    console.log('\nFailures:')
    for (const f of failures) console.log('  -', f)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
