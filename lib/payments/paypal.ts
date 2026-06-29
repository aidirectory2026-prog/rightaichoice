// Phase 9 S5 — PayPal (international, $1) via Orders v2 REST (no SDK).
// Server-only: PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET. PAYPAL_ENV selects
// 'live' (default) vs 'sandbox'. The public client id is exposed as
// NEXT_PUBLIC_PAYPAL_CLIENT_ID for the client Buttons SDK.

function apiBase(): string {
  return (process.env.PAYPAL_ENV ?? 'live') === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com'
}

export function paypalConfigured(): boolean {
  return !!process.env.PAYPAL_CLIENT_ID && !!process.env.PAYPAL_CLIENT_SECRET
}

/**
 * Phase 10 (Cowork QA) C2 — master kill switch for the PayPal gateway.
 * The PayPal capture/webhook paths never validated the captured amount/currency
 * against our ledger (Razorpay does), so the paid feature was bypassable on
 * PayPal. Owner decision: DISABLE PayPal entirely (default off) until checkout is
 * re-hardened. Set PAYPAL_ENABLED=true to bring the gateway back. Razorpay (India)
 * is a separate path and is unaffected.
 */
export function paypalEnabled(): boolean {
  return process.env.PAYPAL_ENABLED === 'true'
}

/**
 * Public "payments are live" check for the paywall UI. True only when the gateway
 * is enabled AND keys are configured AND we're NOT in sandbox test mode — so while
 * prod runs sandbox keys (owner testing the checkout), real visitors keep the
 * graceful "paid scans coming soon" card instead of a live-looking sandbox button.
 * With PayPal disabled (C2) this is always false → the UI shows the same graceful
 * card and never mounts the PayPal Buttons SDK.
 */
export function paypalLive(): boolean {
  return paypalEnabled() && paypalConfigured() && (process.env.PAYPAL_ENV ?? 'live') !== 'sandbox'
}

async function accessToken(): Promise<string | null> {
  const id = process.env.PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_CLIENT_SECRET
  if (!id || !secret) return null
  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error(`PayPal token ${res.status}`)
  const json = (await res.json()) as { access_token?: string }
  return json.access_token ?? null
}

/** Create a $1 (or amountMinor cents) order. Returns the PayPal order id. */
export async function createPaypalOrder(amountMinor: number, currency: string, reference: string): Promise<{ id: string } | null> {
  const token = await accessToken()
  if (!token) return null
  const value = (amountMinor / 100).toFixed(2)
  const res = await fetch(`${apiBase()}/v2/checkout/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{ amount: { currency_code: currency, value }, custom_id: reference, description: 'RightAIChoice — Market Sentiment Scan' }],
    }),
  })
  if (!res.ok) throw new Error(`PayPal create ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const json = (await res.json()) as { id?: string }
  return json.id ? { id: json.id } : null
}

/**
 * Phase 10 #6 — verify a PayPal webhook against PAYPAL_WEBHOOK_ID using PayPal's
 * verify-webhook-signature API. Returns true only on SUCCESS. Without the env
 * var configured it returns false (fail-closed) so an unverified event is never
 * trusted to grant credit.
 */
export async function verifyPaypalWebhook(headers: Headers, rawBody: string): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID
  if (!webhookId) return false
  const token = await accessToken()
  if (!token) return false
  let event: unknown
  try {
    event = JSON.parse(rawBody)
  } catch {
    return false
  }
  const res = await fetch(`${apiBase()}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_algo: headers.get('paypal-auth-algo'),
      cert_url: headers.get('paypal-cert-url'),
      transmission_id: headers.get('paypal-transmission-id'),
      transmission_sig: headers.get('paypal-transmission-sig'),
      transmission_time: headers.get('paypal-transmission-time'),
      webhook_id: webhookId,
      webhook_event: event,
    }),
  })
  if (!res.ok) return false
  const j = (await res.json()) as { verification_status?: string }
  return j.verification_status === 'SUCCESS'
}

/** Capture an approved order. Returns the capture id when COMPLETED. */
// BUG-05: also return the CAPTURED amount + currency so callers can assert the
// buyer actually paid the price we charged (PayPal returns the captured amount as
// a decimal string in the gateway currency; we convert to minor units to compare
// against sentiment_payments.amount_minor). currency is the ISO code (uppercase).
export async function capturePaypalOrder(
  orderId: string,
): Promise<{ captured: boolean; captureId?: string; amountMinor?: number; currency?: string }> {
  const token = await accessToken()
  if (!token) return { captured: false }
  const res = await fetch(`${apiBase()}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`PayPal capture ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const json = (await res.json()) as {
    status?: string
    purchase_units?: {
      payments?: {
        captures?: { id?: string; status?: string; amount?: { currency_code?: string; value?: string } }[]
      }
    }[]
  }
  const capture = json.purchase_units?.[0]?.payments?.captures?.[0]
  const captured = json.status === 'COMPLETED' && capture?.status === 'COMPLETED'
  const value = capture?.amount?.value
  const amountMinor = value != null && value !== '' ? Math.round(parseFloat(value) * 100) : undefined
  const currency = capture?.amount?.currency_code?.toUpperCase()
  return { captured: !!captured, captureId: capture?.id, amountMinor, currency }
}
