import { NextResponse } from 'next/server'
import { env } from '@/lib/env'

export function validateCronSecret(request: Request): NextResponse | null {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!env.CRON_SECRET || token !== env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
