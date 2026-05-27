import { cronRoute } from '@/lib/pipelines/with-logging'
import { getAdminClient } from '@/lib/cron/supabase-admin'

// Daily Bing direct-submission cron — works regardless of laptop state.
//
// Replaces the local scripts/submit-urls-bing.ts --smart approach for
// background runs. State stored in bing_submit_state (migration 087):
//   - cursor (type + offset) — auto-rotates compare → tool → alt → category
//   - last_run_utc — refuses same-UTC-day double-submission
//   - lifetime_submitted / lifetime_runs — for /admin/daily dashboard
//
// REQUIRED VERCEL ENV:
//   BING_WEBMASTER_API_KEY  (same one your local .env.local has)
//   CRON_SECRET             (existing — same one other crons use)
//
// Scheduled in vercel.json: daily at 09:00 UTC.

export const maxDuration = 60

const SITE_URL = 'https://rightaichoice.com'
const BING_ENDPOINT = 'https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlbatch'
const BING_QUOTA_ENDPOINT = 'https://ssl.bing.com/webmaster/api.svc/json/GetUrlSubmissionQuota'
const PER_REQUEST_CAP = 500

type ContentType = 'compare' | 'tool' | 'alternative' | 'category'
const ROTATION: ContentType[] = ['compare', 'tool', 'alternative', 'category']

type State = {
  id: number
  type: ContentType
  offset_in_pass: number
  last_run_utc: string | null
  lifetime_submitted: number
  lifetime_runs: number
  last_quota: number | null
}

function nextType(t: ContentType): ContentType {
  return ROTATION[(ROTATION.indexOf(t) + 1) % ROTATION.length]
}

async function fetchPool(type: ContentType): Promise<string[]> {
  const supabase = getAdminClient()
  switch (type) {
    case 'compare': {
      // Phase 9 noindex sweep: don't push noindex compares to Bing.
      const { data } = await supabase
        .from('tool_comparisons')
        .select('slug')
        .eq('is_editorial', true)
        .eq('noindex', false)
      return ((data as { slug: string }[]) ?? []).map(
        (c) => `${SITE_URL}/compare/${c.slug}`,
      )
    }
    case 'tool': {
      const { data } = await supabase
        .from('tools')
        .select('slug')
        .eq('is_published', true)
      return ((data as { slug: string }[]) ?? []).map(
        (t) => `${SITE_URL}/tools/${t.slug}`,
      )
    }
    case 'alternative': {
      const { data } = await supabase
        .from('tools')
        .select('slug')
        .eq('is_published', true)
      return ((data as { slug: string }[]) ?? []).map(
        (t) => `${SITE_URL}/tools/${t.slug}/alternatives`,
      )
    }
    case 'category': {
      const { data } = await supabase.from('categories').select('slug')
      return ((data as { slug: string }[]) ?? []).map(
        (c) => `${SITE_URL}/categories/${c.slug}`,
      )
    }
  }
}

async function fetchDailyQuota(apiKey: string): Promise<number | null> {
  try {
    const url = `${BING_QUOTA_ENDPOINT}?siteUrl=${encodeURIComponent(SITE_URL)}&apikey=${encodeURIComponent(apiKey)}`
    const res = await fetch(url)
    const json = (await res.json()) as { d?: { DailyQuota?: number } }
    return json.d?.DailyQuota ?? null
  } catch {
    return null
  }
}

async function submitChunk(apiKey: string, urls: string[]) {
  const url = `${BING_ENDPOINT}?apikey=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ siteUrl: SITE_URL, urlList: urls }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Bing API ${res.status}: ${body.slice(0, 300)}`)
  }
}

const handler = cronRoute({ pipelineKey: 'submit-urls-bing' }, async (ctx) => {
  const apiKey = process.env.BING_WEBMASTER_API_KEY
  if (!apiKey) throw new Error('BING_WEBMASTER_API_KEY missing in Vercel env')

  const supabase = getAdminClient()

  const { data: stateRow, error: stateErr } = await supabase
    .from('bing_submit_state')
    .select('*')
    .eq('id', 1)
    .single()

  if (stateErr || !stateRow) throw new Error(`state read failed: ${stateErr?.message ?? 'no row'}`)

  const state = stateRow as State
  const today = new Date().toISOString().slice(0, 10)
  const lastRunDay = state.last_run_utc?.slice(0, 10) ?? ''

  if (lastRunDay === today) {
    ctx.recordMetadata({ skipped: 'already_ran_today', state })
    return {
      ok: true,
      skipped: 'already_ran_today',
      state: {
        type: state.type,
        offset: state.offset_in_pass,
        last_run_utc: state.last_run_utc,
        lifetime_submitted: state.lifetime_submitted,
      },
    }
  }

  const quota = (await fetchDailyQuota(apiKey)) ?? 100
  const cap = quota

  // Walk forward through rotation types if current pool is exhausted.
  let { type, offset_in_pass: offset } = state
  let pool = await fetchPool(type)
  let advanced = 0
  while (offset >= pool.length && advanced < ROTATION.length) {
    type = nextType(type)
    offset = 0
    pool = await fetchPool(type)
    advanced++
  }

  if (pool.length === 0) {
    ctx.recordMetadata({ skipped: 'no_urls_available' })
    return { ok: true, skipped: 'no_urls_available' }
  }

  const slice = pool.slice(offset, offset + cap)
  if (slice.length === 0) {
    ctx.recordMetadata({ skipped: 'empty_slice', type, offset })
    return { ok: true, skipped: 'empty_slice', type, offset }
  }

  const requestCap = Math.min(PER_REQUEST_CAP, cap)
  for (let i = 0; i < slice.length; i += requestCap) {
    await submitChunk(apiKey, slice.slice(i, i + requestCap))
  }

  // Advance cursor — if we exhausted this type's pool, hop to the next type.
  const newOffset = offset + slice.length
  const exhausted = newOffset >= pool.length
  const newType: ContentType = exhausted ? nextType(type) : type
  const newOffsetInPass = exhausted ? 0 : newOffset

  await supabase
    .from('bing_submit_state')
    .update({
      type: newType,
      offset_in_pass: newOffsetInPass,
      last_run_utc: new Date().toISOString(),
      lifetime_submitted: state.lifetime_submitted + slice.length,
      lifetime_runs: state.lifetime_runs + 1,
      last_quota: quota,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', 1)

  ctx.recordItems({ processed: slice.length, succeeded: slice.length })
  ctx.recordMetadata({
    type,
    offset,
    next_type: newType,
    next_offset: newOffsetInPass,
    exhausted_pass: exhausted,
    quota,
    lifetime_submitted: state.lifetime_submitted + slice.length,
  })

  return {
    ok: true,
    submitted: slice.length,
    type,
    offset,
    next_type: newType,
    next_offset: newOffsetInPass,
    exhausted_pass: exhausted,
    quota,
    lifetime_submitted: state.lifetime_submitted + slice.length,
  }
})

export const POST = handler
export const GET = handler
