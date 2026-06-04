import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { pricingForRequest } from '@/lib/geo/currency'
import { createRazorpayOrder, razorpayConfigured } from '@/lib/payments/razorpay'
import { serverAnalytics } from '@/lib/mixpanel-server'

export const dynamic = 'force-dynamic'

function getIp(req: Request): string | undefined {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined
}

/** POST /api/payments/razorpay/order — create a ₹20 order for one sentiment scan. */
export async function POST(req: NextRequest) {
  const rl = rateLimit('rzp-order', req, { limit: 10, windowMs: 60_000 })
  if (!rl.ok) return rateLimitResponse(rl)
  if (!razorpayConfigured()) return NextResponse.json({ error: 'razorpay_unconfigured' }, { status: 503 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return NextResponse.json({ error: 'auth_required' }, { status: 401 })

  const pricing = pricingForRequest(req)
  if (pricing.gateway !== 'razorpay') return NextResponse.json({ error: 'wrong_gateway', pricing }, { status: 400 })

  const body = (await req.json().catch(() => ({}))) as { tool_slug?: string }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getAdminClient() as any

  const { data: row, error: rowErr } = await admin
    .from('sentiment_payments')
    .insert({ user_id: user.id, gateway: 'razorpay', amount_minor: pricing.amountMinor, currency: pricing.currency, status: 'created' })
    .select('id')
    .single()
  if (rowErr || !row) return NextResponse.json({ error: 'ledger_error' }, { status: 500 })

  try {
    // Razorpay caps `receipt` at 40 chars; `scan_` + a 36-char UUID = 41 and
    // gets rejected (400 → 502). A 2-char prefix + UUID = 38 stays under.
    const order = await createRazorpayOrder(pricing.amountMinor, pricing.currency, `s_${row.id}`)
    if (!order) return NextResponse.json({ error: 'order_failed' }, { status: 502 })
    await admin.from('sentiment_payments').update({ gateway_order_id: order.id }).eq('id', row.id)

    void serverAnalytics.sentimentEvent('sentiment_payment_initiated', user.id, {
      gateway: 'razorpay', currency: pricing.currency, amount_minor: pricing.amountMinor, tool_slug: body.tool_slug ?? null,
    }, getIp(req))

    return NextResponse.json({
      payment_id: row.id,
      order_id: order.id,
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID,
      amount_minor: pricing.amountMinor,
      currency: pricing.currency,
    })
  } catch (e) {
    await admin.from('sentiment_payments').update({ status: 'failed' }).eq('id', row.id)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'order_failed' }, { status: 502 })
  }
}
