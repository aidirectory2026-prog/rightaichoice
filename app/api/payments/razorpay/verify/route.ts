import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { createClient } from '@/lib/supabase/server'
import { verifyRazorpaySignature, fetchRazorpayPayment } from '@/lib/payments/razorpay'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { serverAnalytics } from '@/lib/mixpanel-server'

export const dynamic = 'force-dynamic'

function getIp(req: Request): string | undefined {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined
}

/**
 * POST /api/payments/razorpay/verify — verify the Checkout signature and grant
 * one paid scan credit. Idempotent via grant_sentiment_credit (keyed on the
 * payment row), so a re-submit or the webhook can't double-credit.
 *
 * Phase 10 #5 — the signature alone only proves Razorpay vouches for the
 * (order,payment) pair the client sent; it does NOT prove that's the order we
 * created or the amount we charged. We now (a) bind razorpay_order_id to the
 * row's gateway_order_id and (b) re-fetch the payment to confirm order + amount
 * + captured status before granting. Also rate-limited (#2.5).
 */
export async function POST(req: NextRequest) {
  const rl = rateLimit('rzp-verify', req, { limit: 10, windowMs: 60_000 })
  if (!rl.ok) return rateLimitResponse(rl)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return NextResponse.json({ error: 'auth_required' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as {
    payment_id?: string
    razorpay_order_id?: string
    razorpay_payment_id?: string
    razorpay_signature?: string
  }
  const { payment_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body
  if (!payment_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getAdminClient() as any
  const { data: row } = await admin
    .from('sentiment_payments')
    .select('id, user_id, gateway_order_id, amount_minor, currency, status')
    .eq('id', payment_id)
    .maybeSingle()
  if (!row || row.user_id !== user.id) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // (a) Bind the signed order to the exact order WE created for this row.
  if (!row.gateway_order_id || razorpay_order_id !== row.gateway_order_id) {
    await admin.from('sentiment_payments').update({ status: 'failed' }).eq('id', payment_id)
    void serverAnalytics.sentimentEvent('sentiment_payment_failed', user.id, { gateway: 'razorpay', reason: 'order_mismatch' }, getIp(req))
    return NextResponse.json({ error: 'order_mismatch' }, { status: 400 })
  }

  const ok = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)
  if (!ok) {
    await admin.from('sentiment_payments').update({ status: 'failed' }).eq('id', payment_id)
    void serverAnalytics.sentimentEvent('sentiment_payment_failed', user.id, { gateway: 'razorpay', reason: 'bad_signature' }, getIp(req))
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
  }

  // (b) Re-fetch the payment server-side: confirm it belongs to our order, is
  // captured, and matches the amount we charged. Closes amount-substitution.
  const payment = await fetchRazorpayPayment(razorpay_payment_id)
  if (
    !payment ||
    payment.order_id !== row.gateway_order_id ||
    payment.amount !== row.amount_minor ||
    payment.status !== 'captured'
  ) {
    await admin.from('sentiment_payments').update({ status: 'failed' }).eq('id', payment_id)
    void serverAnalytics.sentimentEvent('sentiment_payment_failed', user.id, { gateway: 'razorpay', reason: 'verify_mismatch' }, getIp(req))
    return NextResponse.json({ error: 'verification_failed' }, { status: 400 })
  }

  const { data: granted } = await admin.rpc('grant_sentiment_credit', { p_payment: payment_id, p_gateway_payment_id: razorpay_payment_id })
  void serverAnalytics.sentimentEvent('sentiment_payment_succeeded', user.id, { gateway: 'razorpay', credits: granted ?? 0 }, getIp(req))

  const { data: quota } = await admin.from('sentiment_quota').select('paid_balance').eq('user_id', user.id).maybeSingle()
  return NextResponse.json({ ok: true, paid_balance: quota?.paid_balance ?? 0 })
}
