import { NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cron/auth'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { runIngestion } from '@/lib/cron/ingest'
import { submitToIndexNow } from '@/lib/indexnow'

export const maxDuration = 300

export async function POST(request: Request) {
  const authError = validateCronSecret(request)
  if (authError) return authError

  try {
    const supabase = getAdminClient()
    const result = await runIngestion(supabase)

    // Notify IndexNow about newly inserted tools
    if (result.inserted > 0 && result.insertedSlugs?.length) {
      const urls = result.insertedSlugs.map((s) => `/tools/${s}`)
      await submitToIndexNow(urls)
    }

    return NextResponse.json(result)
  } catch (e) {
    console.error('Ingestion pipeline error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
