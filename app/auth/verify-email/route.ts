import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/email-verification'

// Phase 11 (2026-06-21): email-verification link target. The link in the
// verification email points here with ?token=<raw>. We consume the token,
// flip profiles.email_verified, and bounce to the dashboard.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token = searchParams.get('token')
  if (!token) return NextResponse.redirect(`${origin}/login?error=verify_failed`)
  const res = await verifyToken(token)
  return NextResponse.redirect(
    `${origin}${res.ok ? '/dashboard?verified=1' : '/login?error=verify_failed'}`,
  )
}
