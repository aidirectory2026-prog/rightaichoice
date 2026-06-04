import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { createClient } from '@/lib/supabase/server'
import { verifyRazorpaySignature } from '@/lib/payments/razorpay'
import { serverAnalytics } from '@/lib/mixpanel-server'

export const dynamic = 'force-dynamic'

function getIp(req: Request): string | undefined {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined
}

/**
 * POST /api/payments/razorpay/verify — verify the Checkout signature and grant
 * one paid scan credit. Idempotent via grant_sentiment_credit (keyed on the
 * gateway payment id), so a re-submit or the webhook can't double-credit.
 */
export async function POST(req: NextRequest) {
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
    .select('id, user_id, gateway_order_id')
    .eq('id', payment_id)
    .maybeSingle()
  if (!row || row.user_id !== user.id) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const ok = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)
  if (!ok) {
    await admin.from('sentiment_payments').update({ status: 'failed' }).eq('id', payment_id)
    void serverAnalytics.sentimentEvent('sentiment_payment_failed', user.id, { gateway: 'razorpay', reason: 'bad_signature' }, getIp(req))
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
  }

  const { data: granted } = await admin.rpc('grant_sentiment_credit', { p_payment: payment_id, p_gateway_payment_id: razorpay_payment_id })
  void serverAnalytics.sentimentEvent('sentiment_payment_succeeded', user.id, { gateway: 'razorpay', credits: granted ?? 0 }, getIp(req))

  const { data: quota } = await admin.from('sentiment_quota').select('paid_balance').eq('user_id', user.id).maybeSingle()
  return NextResponse.json({ ok: true, paid_balance: quota?.paid_balance ?? 0 })
}
