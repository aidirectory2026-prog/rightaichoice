import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { createClient } from '@/lib/supabase/server'
import { pricingForRequest } from '@/lib/geo/currency'
import { razorpayConfigured } from '@/lib/payments/razorpay'
import { paypalLive } from '@/lib/payments/paypal'
import { payTestOverride } from '@/lib/payments/pay-test'

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
  let pricing = pricingForRequest(req)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.id) {
    const paymentsLive = pricing.gateway === 'razorpay' ? razorpayConfigured() : paypalLive()
    return NextResponse.json({ authed: false, pricing, paymentsLive })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getAdminClient() as any

  // TEMP admin-only `?paytest=` override — force a gateway/region so an admin can
  // test a checkout their geo wouldn't show (e.g. India → the PayPal flow).
  const ptPricing = await payTestOverride(req, admin, user.id)
  const adminTest = !!ptPricing
  if (ptPricing) pricing = ptPricing

  // Whether the gateway for this user's region is live for the PUBLIC — drives the
  // "paid scans coming soon" card vs a real payment box. In sandbox test mode
  // this is false for real visitors; the admin `?paytest=` path forces it on so
  // the owner can exercise the sandbox checkout without exposing it to users.
  const paymentsLive = adminTest
    ? true
    : pricing.gateway === 'razorpay'
      ? razorpayConfigured()
      : paypalLive()
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
