import type { NextRequest } from 'next/server'
import { pricingForCountry, type Pricing } from '@/lib/geo/currency'

/**
 * TEMPORARY admin-only payment-test override.
 *
 * Appending `?paytest=paypal` (or `=razorpay`) to the sentiment page forces that
 * gateway/region regardless of the caller's real geo, so an admin can test a
 * checkout their own region wouldn't surface (e.g. India → Razorpay can't reach
 * the international PayPal flow). Honored ONLY for `is_admin` users; a no-op for
 * everyone else and for requests without the param — so normal traffic is
 * completely unaffected.
 *
 * REMOVE this (and its call sites in status/scan routes + the client) once
 * payment testing is finished.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function payTestOverride(req: NextRequest, admin: any, userId: string): Promise<Pricing | null> {
  const pt = req.nextUrl.searchParams.get('paytest')
  if (pt !== 'paypal' && pt !== 'razorpay') return null
  const { data } = await admin.from('profiles').select('is_admin').eq('id', userId).maybeSingle()
  if (!data?.is_admin) return null
  return pt === 'paypal' ? pricingForCountry('US') : pricingForCountry('IN')
}
