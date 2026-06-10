// Phase 9 S5 — geo → currency/gateway/price resolution for the Sentiment
// Checker. India (Vercel geo header `x-vercel-ip-country` = 'IN') pays ₹20 via
// Razorpay; everyone else pays $1 via PayPal. Amounts are in the gateway's
// minor unit (paise / cents). Falls back to USD/PayPal when geo is unknown.

export type Currency = 'INR' | 'USD'
export type Gateway = 'razorpay' | 'paypal'

export type Pricing = {
  country: string
  currency: Currency
  gateway: Gateway
  amountMinor: number // 2000 paise (₹20) | 100 cents ($1)
  amountDisplay: string // '₹20' | '$1'
}

const INDIA: Pricing = { country: 'IN', currency: 'INR', gateway: 'razorpay', amountMinor: 2000, amountDisplay: '₹20' }
const INTL = (country: string): Pricing => ({ country, currency: 'USD', gateway: 'paypal', amountMinor: 100, amountDisplay: '$1' })

/** Two-letter country from Vercel's geo header (fallbacks for local/dev). */
export function getCountryFromRequest(request: Request): string {
  // Local/dev override: set DEV_FORCE_COUNTRY=IN in .env.local to simulate a
  // region (localhost has no geo header, so it would otherwise default to US →
  // PayPal). Ignored in production.
  if (process.env.NODE_ENV !== 'production' && process.env.DEV_FORCE_COUNTRY) {
    return process.env.DEV_FORCE_COUNTRY.toUpperCase()
  }
  const h = request.headers
  return (
    h.get('x-vercel-ip-country') ||
    h.get('cf-ipcountry') ||
    'US'
  ).toUpperCase()
}

/** Resolve pricing/gateway from a country code. */
export function pricingForCountry(country: string): Pricing {
  return country === 'IN' ? INDIA : INTL(country)
}

/**
 * Free on-demand scans per user before the paywall. India gets a generous 25
 * (no easy paid path yet — Razorpay KYC pending); everyone else gets 5. Resolved
 * from the same Vercel geo header as pricing, so the limit follows the request
 * region and existing users self-correct without a backfill.
 */
export const FREE_SCANS_IN = 25
export const FREE_SCANS_INTL = 5
export function freeScanLimit(country: string): number {
  return country === 'IN' ? FREE_SCANS_IN : FREE_SCANS_INTL
}

/**
 * Phase 10 #23 — the free-scan LIMIT (25 vs 5) is the abuse target, so the
 * elevated India allowance must rely ONLY on the Vercel edge header, which the
 * platform sets and strips from client input on the canonical domain. We do not
 * honour the generic `cf-ipcountry` fallback here: that header is meaningful for
 * currency display, but must never be able to *raise* a user's free allowance
 * via a forged request that bypasses the edge. Defaults to the conservative
 * limit unless the trusted header confirms India.
 */
export function freeScanLimitFromRequest(request: Request): number {
  if (process.env.NODE_ENV !== 'production' && process.env.DEV_FORCE_COUNTRY) {
    return process.env.DEV_FORCE_COUNTRY.toUpperCase() === 'IN' ? FREE_SCANS_IN : FREE_SCANS_INTL
  }
  const vercelCountry = request.headers.get('x-vercel-ip-country')?.toUpperCase()
  return vercelCountry === 'IN' ? FREE_SCANS_IN : FREE_SCANS_INTL
}

/** Convenience: resolve pricing straight from the request. */
export function pricingForRequest(request: Request): Pricing {
  return pricingForCountry(getCountryFromRequest(request))
}
