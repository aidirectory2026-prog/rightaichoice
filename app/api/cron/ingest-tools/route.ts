import { NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cron/auth'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { runIngestion } from '@/lib/cron/ingest'
import { submitToIndexNow } from '@/lib/indexnow'

export const maxDuration = 300

// Phase 8 freshness contract (2026-05-16):
// Fires twice daily (01:00 + 13:00 UTC) via vercel.json. Each fire
// enriches up to 25 candidates → 50 inserts/day target. Actual yield
// depends on what discovery sources return; some days hit 50, some
// fall short, occasional bursts exceed.

async function handle(request: Request) {
  const authError = validateCronSecret(request)
  if (authError) return authError

  const url = new URL(request.url)
  const batchParam = Number(url.searchParams.get('batch'))
  const batchSize =
    Number.isFinite(batchParam) && batchParam > 0 && batchParam <= 50 ? batchParam : 25

  try {
    const supabase = getAdminClient()
    const result = await runIngestion(supabase, batchSize)

    // Notify IndexNow about newly inserted tools so Bing/Yandex see
    // them within minutes of insert.
    if (result.inserted > 0 && result.insertedSlugs?.length) {
      const urls = result.insertedSlugs.map((s) => `/tools/${s}`)
      await submitToIndexNow(urls)
    }

    return NextResponse.json({ ...result, batchSize })
  } catch (e) {
    console.error('Ingestion pipeline error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return handle(request)
}

export async function GET(request: Request) {
  return handle(request)
}
