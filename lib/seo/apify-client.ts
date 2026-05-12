/**
 * Phase 7A.fallback — Apify run wrapper.
 *
 * Async-and-poll: starts an actor run, polls status until terminal,
 * fetches dataset items. Avoids the run-sync-get-dataset-items 5-min
 * timeout for large batched inputs (Reddit/Quora actors typically
 * take 2-8 min for 300+ search terms).
 */

const APIFY_BASE = 'https://api.apify.com/v2'

function token(): string {
  const t = process.env.APIFY_TOKEN
  if (!t) throw new Error('APIFY_TOKEN not set in .env.local')
  return t
}

export type ApifyRun = {
  id: string
  status:
    | 'READY'
    | 'RUNNING'
    | 'SUCCEEDED'
    | 'FAILED'
    | 'TIMING-OUT'
    | 'TIMED-OUT'
    | 'ABORTING'
    | 'ABORTED'
  defaultDatasetId: string
}

const TERMINAL: ApifyRun['status'][] = [
  'SUCCEEDED',
  'FAILED',
  'TIMED-OUT',
  'ABORTED',
]

/**
 * Start an actor run with the given input. Returns immediately with
 * the run object; does not wait for completion.
 */
export async function startActorRun(
  actorId: string,
  input: Record<string, unknown>
): Promise<ApifyRun> {
  const url = `${APIFY_BASE}/acts/${encodeURIComponent(actorId)}/runs?token=${token()}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Apify start ${res.status}: ${text.slice(0, 500)}`)
  }
  const body = (await res.json()) as { data: ApifyRun }
  return body.data
}

/**
 * Poll a run until it reaches a terminal status. Returns the final
 * run object. Throws if status is non-SUCCEEDED at terminal.
 */
export async function waitForRun(
  runId: string,
  opts: { pollMs?: number; timeoutMs?: number } = {}
): Promise<ApifyRun> {
  const pollMs = opts.pollMs ?? 5_000
  const timeoutMs = opts.timeoutMs ?? 15 * 60_000 // 15 min default
  const deadline = Date.now() + timeoutMs
  while (true) {
    const url = `${APIFY_BASE}/actor-runs/${runId}?token=${token()}`
    const res = await fetch(url)
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Apify poll ${res.status}: ${text.slice(0, 300)}`)
    }
    const body = (await res.json()) as { data: ApifyRun }
    const run = body.data
    if (TERMINAL.includes(run.status)) {
      if (run.status !== 'SUCCEEDED') {
        throw new Error(`Apify run ${runId} ended with status ${run.status}`)
      }
      return run
    }
    if (Date.now() > deadline) {
      throw new Error(`Apify run ${runId} did not complete within ${timeoutMs}ms`)
    }
    await new Promise((r) => setTimeout(r, pollMs))
  }
}

/**
 * Fetch all items from a run's default dataset, paginating if needed.
 * Apify caps each page at 1000 items.
 */
export async function getDatasetItems<T = unknown>(
  datasetId: string
): Promise<T[]> {
  const all: T[] = []
  const PAGE = 1000
  for (let offset = 0; ; offset += PAGE) {
    const url = `${APIFY_BASE}/datasets/${datasetId}/items?token=${token()}&offset=${offset}&limit=${PAGE}&clean=true&format=json`
    const res = await fetch(url)
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Apify dataset ${res.status}: ${text.slice(0, 300)}`)
    }
    const items = (await res.json()) as T[]
    all.push(...items)
    if (items.length < PAGE) break
  }
  return all
}

/**
 * Convenience: start + wait + fetch in one call.
 */
export async function runActorAndCollect<T = unknown>(
  actorId: string,
  input: Record<string, unknown>,
  opts: { pollMs?: number; timeoutMs?: number } = {}
): Promise<T[]> {
  const started = await startActorRun(actorId, input)
  const finished = await waitForRun(started.id, opts)
  return getDatasetItems<T>(finished.defaultDatasetId)
}
