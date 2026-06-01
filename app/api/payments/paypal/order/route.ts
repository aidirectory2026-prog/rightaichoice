import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { pricingForRequest } from '@/lib/geo/currency'
import { createPaypalOrder, paypalConfigured } from '@/lib/payments/paypal'
import { serverAnalytics } from '@/lib/mixpanel-server'

export const dynamic = 'force-dynamic'

function getIp(req: Request): string | undefined {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined
}

/** POST /api/payments/paypal/order — create a $1 order for one sentiment scan. */
export async function POST(req: NextRequest) {
  const rl = rateLimit('pp-order', req, { limit: 10, windowMs: 60_000 })
  if (!rl.ok) return rateLimitResponse(rl)
  if (!paypalConfigured()) return NextResponse.json({ error: 'paypal_unconfigured' }, { status: 503 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return NextResponse.json({ error: 'auth_required' }, { status: 401 })

  // International pricing ($1/USD). India is routed to Razorpay instead.
  const pricing = pricingForRequest(req)
  const currency = pricing.gateway === 'paypal' ? pricing.currency : 'USD'
  const amountMinor = pricing.gateway === 'paypal' ? pricing.amountMinor : 100

  const body = (await req.json().catch(() => ({}))) as { tool_slug?: string }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getAdminClient() as any

  const { data: row, error: rowErr } = await admin
    .from('sentiment_payments')
    .insert({ user_id: user.id, gateway: 'paypal', amount_minor: amountMinor, currency, status: 'created' })
    .select('id')
    .single()
  if (rowErr || !row) return NextResponse.json({ error: 'ledger_error' }, { status: 500 })

  try {
    const order = await createPaypalOrder(amountMinor, currency, `scan_${row.id}`)
    if (!order) return NextResponse.json({ error: 'order_failed' }, { status: 502 })
    await admin.from('sentiment_payments').update({ gateway_order_id: order.id }).eq('id', row.id)

    void serverAnalytics.sentimentEvent('sentiment_payment_initiated', user.id, {
      gateway: 'paypal', currency, amount_minor: amountMinor, tool_slug: body.tool_slug ?? null,
    }, getIp(req))

    return NextResponse.json({ payment_id: row.id, order_id: order.id, currency, amount_minor: amountMinor })
  } catch (e) {
    await admin.from('sentiment_payments').update({ status: 'failed' }).eq('id', row.id)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'order_failed' }, { status: 502 })
  }
}
