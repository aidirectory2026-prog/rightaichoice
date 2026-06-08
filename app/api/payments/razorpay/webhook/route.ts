import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { verifyRazorpayWebhook } from '@/lib/payments/razorpay'

export const dynamic = 'force-dynamic'

/**
 * POST /api/payments/razorpay/webhook — server-to-server safety net (Phase 10 #6).
 *
 * The client verify route depends on the browser returning after payment; if the
 * tab closes or the network drops, money is taken but no credit granted. This
 * webhook grants the credit independently. Idempotent via grant_sentiment_credit
 * (the payment row's status='paid' guard), so it never double-credits alongside
 * the client path. Configure the endpoint + RAZORPAY_WEBHOOK_SECRET in the
 * Razorpay dashboard for `payment.captured`.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig = req.headers.get('x-razorpay-signature') ?? ''
  if (!verifyRazorpayWebhook(rawBody, sig)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
  }

  let event: {
    event?: string
    payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number; status?: string } } }
  }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 })
  }

  if (event.event === 'payment.captured') {
    const entity = event.payload?.payment?.entity
    const orderId = entity?.order_id
    const paymentId = entity?.id
    const amount = entity?.amount
    if (orderId && paymentId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const admin = getAdminClient() as any
      const { data: row } = await admin
        .from('sentiment_payments')
        .select('id, amount_minor, status')
        .eq('gateway_order_id', orderId)
        .maybeSingle()
      // Only grant when the row exists, isn't already paid, and the amount matches.
      if (row && row.status !== 'paid' && (amount == null || amount === row.amount_minor)) {
        await admin.rpc('grant_sentiment_credit', { p_payment: row.id, p_gateway_payment_id: paymentId })
      }
    }
  }

  return NextResponse.json({ ok: true })
}
