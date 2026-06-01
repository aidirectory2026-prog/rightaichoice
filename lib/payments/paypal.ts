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

/** Capture an approved order. Returns the capture id when COMPLETED. */
export async function capturePaypalOrder(orderId: string): Promise<{ captured: boolean; captureId?: string }> {
  const token = await accessToken()
  if (!token) return { captured: false }
  const res = await fetch(`${apiBase()}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`PayPal capture ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const json = (await res.json()) as {
    status?: string
    purchase_units?: { payments?: { captures?: { id?: string; status?: string }[] } }[]
  }
  const capture = json.purchase_units?.[0]?.payments?.captures?.[0]
  const captured = json.status === 'COMPLETED' && capture?.status === 'COMPLETED'
  return { captured: !!captured, captureId: capture?.id }
}
