import { NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cron/auth'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { runRefresh } from '@/lib/cron/refresh'

export const maxDuration = 300

// Phase 8 freshness contract (2026-05-16):
// Scheduled hourly in vercel.json (`0 * * * *`). Each fire processes
// 10 stalest tools → 240 refreshes/day. Comfortably exceeds the
// "200 tools/day" freshness target with 20% headroom for failures.
//
// Manual ad-hoc fires can override the batch via `?batch=N`:
//   curl -H "Authorization: Bearer $CRON_SECRET" \
//     "https://rightaichoice.com/api/cron/refresh-tools?batch=15"

async function handle(request: Request) {
  const authError = validateCronSecret(request)
  if (authError) return authError

  const url = new URL(request.url)
  const batchParam = Number(url.searchParams.get('batch'))
  const batchSize =
    Number.isFinite(batchParam) && batchParam > 0 && batchParam <= 25 ? batchParam : 10

  try {
    const supabase = getAdminClient()
    const result = await runRefresh(supabase, batchSize)
    return NextResponse.json({ ...result, batchSize })
  } catch (e) {
    console.error('Refresh pipeline error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return handle(request)
}

// Vercel cron always fires GET; manual triggers can use either.
export async function GET(request: Request) {
  return handle(request)
}
