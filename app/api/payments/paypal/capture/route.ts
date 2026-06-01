import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { createClient } from '@/lib/supabase/server'
import { capturePaypalOrder } from '@/lib/payments/paypal'
import { serverAnalytics } from '@/lib/mixpanel-server'

export const dynamic = 'force-dynamic'

function getIp(req: Request): string | undefined {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined
}

/**
 * POST /api/payments/paypal/capture — capture an approved order and grant one
 * paid scan credit. Idempotent via grant_sentiment_credit (keyed on capture id).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return NextResponse.json({ error: 'auth_required' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as { payment_id?: string; order_id?: string }
  if (!body.payment_id || !body.order_id) return NextResponse.json({ error: 'missing_fields' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getAdminClient() as any
  const { data: row } = await admin
    .from('sentiment_payments')
    .select('id, user_id, gateway_order_id')
    .eq('id', body.payment_id)
    .maybeSingle()
  if (!row || row.user_id !== user.id) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (row.gateway_order_id && row.gateway_order_id !== body.order_id) {
    return NextResponse.json({ error: 'order_mismatch' }, { status: 400 })
  }

  try {
    const { captured, captureId } = await capturePaypalOrder(body.order_id)
    if (!captured) {
      await admin.from('sentiment_payments').update({ status: 'failed' }).eq('id', body.payment_id)
      void serverAnalytics.sentimentEvent('sentiment_payment_failed', user.id, { gateway: 'paypal', reason: 'not_captured' }, getIp(req))
      return NextResponse.json({ error: 'not_captured' }, { status: 402 })
    }
    const { data: granted } = await admin.rpc('grant_sentiment_credit', { p_payment: body.payment_id, p_gateway_payment_id: captureId ?? body.order_id })
    void serverAnalytics.sentimentEvent('sentiment_payment_succeeded', user.id, { gateway: 'paypal', credits: granted ?? 0 }, getIp(req))

    const { data: quota } = await admin.from('sentiment_quota').select('paid_balance').eq('user_id', user.id).maybeSingle()
    return NextResponse.json({ ok: true, paid_balance: quota?.paid_balance ?? 0 })
  } catch (e) {
    await admin.from('sentiment_payments').update({ status: 'failed' }).eq('id', body.payment_id)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'capture_failed' }, { status: 502 })
  }
}
