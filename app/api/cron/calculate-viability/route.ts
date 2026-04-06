import { NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cron/auth'
import { calculateViabilityBatch } from '@/lib/cron/viability'

export const maxDuration = 60

export async function POST(request: Request) {
  const unauthorized = validateCronSecret(request)
  if (unauthorized) return unauthorized

  const { processed, errors } = await calculateViabilityBatch(50)

  return NextResponse.json({
    ok: true,
    processed,
    errors: errors.length > 0 ? errors : undefined,
  })
}
