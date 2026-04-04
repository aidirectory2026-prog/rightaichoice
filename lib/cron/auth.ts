import { NextResponse } from 'next/server'

export function validateCronSecret(request: Request): NextResponse | null {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  const secret = process.env.CRON_SECRET

  if (!secret || token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
