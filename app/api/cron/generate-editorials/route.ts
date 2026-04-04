import { NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cron/auth'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { runEditorialGeneration } from '@/lib/cron/editorial'

export const maxDuration = 300

export async function POST(request: Request) {
  const authError = validateCronSecret(request)
  if (authError) return authError

  try {
    const supabase = getAdminClient()
    const result = await runEditorialGeneration(supabase)
    return NextResponse.json(result)
  } catch (e) {
    console.error('Editorial generation error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
