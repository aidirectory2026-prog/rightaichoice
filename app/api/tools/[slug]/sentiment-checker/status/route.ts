import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { createClient } from '@/lib/supabase/server'
import { pricingForRequest } from '@/lib/geo/currency'
import { razorpayConfigured } from '@/lib/payments/razorpay'
import { paypalConfigured } from '@/lib/payments/paypal'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ slug: string }> }

/**
 * GET /api/tools/[slug]/sentiment-checker/status
 * Powers the checker card/modal: geo pricing, the signed-in user's remaining
 * free scans + paid balance, and their most recent report for this tool (so a
 * returning user can re-view without paying again). Auth-optional — anonymous
 * callers just get pricing + authed:false.
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const { slug } = await params
  const pricing = pricingForRequest(req)
  // Whether the gateway for THIS user's region actually has live keys. When
  // false (e.g. Razorpay pre-KYC, or PayPal before live creds are set) the
  // client shows a "paid scans coming soon" message instead of a dead payment
  // box once the free allowance is used. Flips on automatically when keys land.
  const paymentsLive = pricing.gateway === 'razorpay' ? razorpayConfigured() : paypalConfigured()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.id) {
    return NextResponse.json({ authed: false, pricing, paymentsLive })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getAdminClient() as any
  const [{ data: quota }, { data: last }] = await Promise.all([
    admin.from('sentiment_quota').select('free_used, free_limit, paid_balance').eq('user_id', user.id).maybeSingle(),
    admin
      .from('sentiment_searches')
      .select('id, status, result, sources, mention_count, created_at')
      .eq('user_id', user.id)
      .eq('tool_slug', slug)
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const freeUsed = quota?.free_used ?? 0
  const freeLimit = quota?.free_limit ?? 3
  const paidBalance = quota?.paid_balance ?? 0

  return NextResponse.json({
    authed: true,
    pricing,
    paymentsLive,
    quota: {
      freeRemaining: Math.max(freeLimit - freeUsed, 0),
      freeLimit,
      paidBalance,
      canScanFree: freeUsed < freeLimit,
    },
    lastResult: last
      ? { report: last.result, sources: last.sources, mention_count: last.mention_count, created_at: last.created_at }
      : null,
  })
}
