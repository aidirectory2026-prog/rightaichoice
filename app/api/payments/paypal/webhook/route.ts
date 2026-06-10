import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { verifyPaypalWebhook } from '@/lib/payments/paypal'

export const dynamic = 'force-dynamic'

/**
 * POST /api/payments/paypal/webhook — server-to-server safety net (Phase 10 #6).
 *
 * Grants the scan credit even if the buyer's browser never returns to /capture.
 * Idempotent via grant_sentiment_credit (status='paid' guard). The order's
 * custom_id was set to `scan_<paymentRowId>`, which PayPal echoes on the capture
 * resource, so we can map back to our ledger row. Configure the endpoint +
 * PAYPAL_WEBHOOK_ID in the PayPal dashboard for PAYMENT.CAPTURE.COMPLETED.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const ok = await verifyPaypalWebhook(req.headers, rawBody)
  if (!ok) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
  }

  let event: { event_type?: string; resource?: { id?: string; custom_id?: string } }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 })
  }

  if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
    const captureId = event.resource?.id
    const customId = event.resource?.custom_id
    const rowId = customId?.startsWith('scan_') ? customId.slice('scan_'.length) : undefined
    if (rowId && captureId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const admin = getAdminClient() as any
      const { data: row } = await admin
        .from('sentiment_payments')
        .select('id, status')
        .eq('id', rowId)
        .maybeSingle()
      if (row && row.status !== 'paid') {
        await admin.rpc('grant_sentiment_credit', { p_payment: row.id, p_gateway_payment_id: captureId })
      }
    }
  }

  return NextResponse.json({ ok: true })
}
