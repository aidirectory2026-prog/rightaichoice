/**
 * Phase 10.5b.4 (2026-06-12) — Query helpers for /admin/sentiment.
 *
 * Extracted from the page (snapshot-oracle scope note: pages get their
 * metrics extracted into query modules during the Phase 5 rebuild) and —
 * the F13 fix — made WINDOW-AWARE and BOT-AWARE:
 *
 *   BEFORE (audit F13): every funnel count was an all-time count over
 *   user_events with NO window, NO bot filter, NO p_end; scans/payments
 *   were simply "the most recent 500/200 rows ever".
 *   AFTER: funnel legs are windowed (>= start AND < end), humans-only by
 *   default with the bots toggle, and honor the optional smart filters via
 *   the applyFilters() mirror; scans/payments/revenue are windowed.
 *
 * Bot semantics: ONLY the user_events funnel legs can be bot-filtered —
 * sentiment_searches and sentiment_payments have no bot column (verified
 * against information_schema 2026-06-12), so those panels state that they
 * honor the date range only.
 */

import { getAdminClient } from '@/lib/cron/supabase-admin'
import { applyFilters, type AdminFilters } from './filters'

export const SENTIMENT_FUNNEL: ReadonlyArray<{ event: string; label: string }> = [
  { event: 'sentiment_card_viewed', label: 'Card viewed' },
  { event: 'sentiment_scan_requested', label: 'Scan requested' },
  { event: 'sentiment_scan_completed', label: 'Scan completed' },
  { event: 'sentiment_paywall_shown', label: 'Paywall shown' },
  { event: 'sentiment_payment_succeeded', label: 'Payment succeeded' },
]

export type SentimentFunnelStep = { step: string; label: string; count: number }

/** Acquisition → revenue funnel from user_events — windowed + bot-aware +
 *  smart-filtered (the F13 fix). */
export async function getSentimentFunnel(f: AdminFilters): Promise<SentimentFunnelStep[]> {
  const db = getAdminClient()
  const results = await Promise.all(
    SENTIMENT_FUNNEL.map(async ({ event, label }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (db.from('user_events').select('*', { count: 'exact', head: true }) as any)
        .eq('event_name', event)
        .gte('created_at', f.range.cutoffISO)
        .lt('created_at', f.range.endCutoffISO)
      if (!f.includeBots) q = q.eq('bot_likely', false)
      q = applyFilters(q, f, { dropEvent: true }) // each leg is event-pinned
      const { count } = await q
      return { step: event, label, count: count ?? 0 }
    }),
  )
  return results
}

export type SentimentScanRow = {
  id: string
  tool_slug: string
  status: string
  charge_type: string
  sources: string[] | null
  mention_count: number | null
  duration_ms: number | null
  created_at: string
}

/** Scans in the window (sentiment_searches has no bot column — range only). */
export async function getSentimentScans(f: AdminFilters, limit = 500): Promise<SentimentScanRow[]> {
  const db = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (db
    .from('sentiment_searches')
    .select('id, tool_slug, status, charge_type, sources, mention_count, duration_ms, created_at') as any)
    .gte('created_at', f.range.cutoffISO)
    .lt('created_at', f.range.endCutoffISO)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false }) // deterministic within equal timestamps
    .limit(limit)
  return (data ?? []) as SentimentScanRow[]
}

export type SentimentPaymentRow = {
  id: string
  gateway: string
  amount_minor: number
  currency: string
  status: string
  created_at: string
}

/** Payments in the window (sentiment_payments has no bot column — range only). */
export async function getSentimentPayments(f: AdminFilters, limit = 200): Promise<SentimentPaymentRow[]> {
  const db = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (db
    .from('sentiment_payments')
    .select('id, gateway, amount_minor, currency, status, created_at') as any)
    .gte('created_at', f.range.cutoffISO)
    .lt('created_at', f.range.endCutoffISO)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit)
  return (data ?? []) as SentimentPaymentRow[]
}

export type SentimentRevenueRow = { currency: string; amount_minor: number; payments: number }

/** Paid revenue by currency over the window, deterministic (currency asc). */
export async function getSentimentRevenue(f: AdminFilters): Promise<SentimentRevenueRow[]> {
  const db = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (db
    .from('sentiment_payments')
    .select('amount_minor, currency') as any)
    .eq('status', 'paid')
    .gte('created_at', f.range.cutoffISO)
    .lt('created_at', f.range.endCutoffISO)
  const byCurrency = new Map<string, { amount_minor: number; payments: number }>()
  for (const p of (data ?? []) as Array<{ amount_minor: number; currency: string }>) {
    const cur = byCurrency.get(p.currency) ?? { amount_minor: 0, payments: 0 }
    cur.amount_minor += p.amount_minor
    cur.payments += 1
    byCurrency.set(p.currency, cur)
  }
  return [...byCurrency.entries()]
    .map(([currency, v]) => ({ currency, ...v }))
    .sort((a, b) => a.currency.localeCompare(b.currency))
}
