import crypto from 'crypto'

// Phase 9 S5 — Razorpay (India, ₹20) via REST (no SDK). Server-only:
// RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET. The public key id is also exposed as
// NEXT_PUBLIC_RAZORPAY_KEY_ID for the client Checkout widget.

const API = 'https://api.razorpay.com/v1'

function auth(): string | null {
  const id = process.env.RAZORPAY_KEY_ID
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!id || !secret) return null
  return `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`
}

export function razorpayConfigured(): boolean {
  return !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET
}

/** Create a Razorpay order. amountMinor is paise (₹20 = 2000). */
export async function createRazorpayOrder(amountMinor: number, currency: string, receipt: string): Promise<{ id: string } | null> {
  const a = auth()
  if (!a) return null
  const res = await fetch(`${API}/orders`, {
    method: 'POST',
    headers: { Authorization: a, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amountMinor, currency, receipt, payment_capture: 1 }),
  })
  if (!res.ok) throw new Error(`Razorpay order ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const json = (await res.json()) as { id?: string }
  return json.id ? { id: json.id } : null
}

/**
 * Verify the Checkout callback signature: HMAC-SHA256(order_id|payment_id,
 * key_secret) === razorpay_signature. Returns true only on an exact match.
 */
export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret) return false
  const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex')
  // timing-safe compare
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/**
 * Phase 10 #5 — fetch a payment server-side to confirm it really belongs to our
 * order and matches the amount we charged. The Checkout signature only proves
 * Razorpay vouches for the (order,payment) pair the CLIENT sent; it says nothing
 * about which order or how much. This closes the "pay a cheap order, submit its
 * signed ids" substitution.
 */
export async function fetchRazorpayPayment(
  paymentId: string,
): Promise<{ status: string; amount: number; order_id: string; currency: string } | null> {
  const a = auth()
  if (!a) return null
  const res = await fetch(`${API}/payments/${paymentId}`, { headers: { Authorization: a } })
  if (!res.ok) return null
  const j = (await res.json()) as { status?: string; amount?: number; order_id?: string; currency?: string }
  if (!j.order_id) return null
  return { status: j.status ?? '', amount: j.amount ?? 0, order_id: j.order_id, currency: j.currency ?? '' }
}

/** Verify a webhook payload signature: HMAC-SHA256(body, webhook_secret). */
export function verifyRazorpayWebhook(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
