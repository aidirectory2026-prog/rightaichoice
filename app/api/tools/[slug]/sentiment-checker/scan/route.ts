import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { createClient } from '@/lib/supabase/server'
import { scrapeAllSources } from '@/lib/scrapers'
import { synthesizeReport } from '@/lib/ai/synthesize-report'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { pricingForRequest, getCountryFromRequest } from '@/lib/geo/currency'
import { serverAnalytics } from '@/lib/mixpanel-server'
import { payTestOverride } from '@/lib/payments/pay-test'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type RouteContext = { params: Promise<{ slug: string }> }

// Hard ceiling on the whole scan so we never blow the 45s promise to the user.
const SCAN_BUDGET_MS = 30_000 // per-source scrape budget
const TOTAL_CAP_MS = 42_000 // scrape + synthesis combined

function getIp(req: Request): string | undefined {
  const h = req.headers
  return h.get('cf-connecting-ip') ?? h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined
}

const SOURCE_LABELS: Record<string, string> = {
  reddit: 'Reddit', hn: 'Hacker News', youtube: 'YouTube', producthunt: 'Product Hunt',
  appstore: 'App Store', trustpilot: 'Trustpilot', google: 'Google', twitter: 'X', quora: 'Quora',
}

export type LiveMention = { source: string; title: string; snippet: string; date: string | null; url: string | null; score: number | null }

/** Top real posts across all sources — the "live mentions" feed (recency-first). */
function buildMentions(scrape: Awaited<ReturnType<typeof scrapeAllSources>>): LiveMention[] {
  return scrape.all
    .flatMap((r) => r.posts.map((p) => ({ ...p, label: SOURCE_LABELS[p.source] ?? p.source })))
    .filter((p) => (p.body && p.body.length > 20) || p.title)
    .sort((a, b) => (Date.parse(b.date ?? '') || 0) - (Date.parse(a.date ?? '') || 0) || (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 18)
    .map((p) => ({
      source: p.label,
      title: (p.title ?? '').slice(0, 140),
      snippet: (p.body ?? '').slice(0, 280),
      date: p.date ?? null,
      url: p.url ?? null,
      score: p.score ?? null,
    }))
}

/**
 * POST /api/tools/[slug]/sentiment-checker/scan
 * Auth-gated, quota-metered real-time sentiment scan. Returns the synthesized
 * report directly (the modal animates progress while awaiting). Enforces a hard
 * <45s budget and never charges a user for a scan that errors.
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const rl = rateLimit('sentiment-scan', req, { limit: 8, windowMs: 60_000 })
  if (!rl.ok) return rateLimitResponse(rl)

  const { slug } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getAdminClient() as any

  // ── Auth gate ────────────────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) {
    return NextResponse.json({ error: 'auth_required' }, { status: 401 })
  }

  // ── Tool ─────────────────────────────────────────────────────────────────
  const { data: tool } = await admin
    .from('tools')
    .select('id, name, slug, tagline, description, pricing_type, pricing_details, skill_level, features, integrations, platforms, website_url')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()
  if (!tool) return NextResponse.json({ error: 'tool_not_found' }, { status: 404 })

  // ── TEMP admin `?paytest=` override ───────────────────────────────────────
  // Force the paywall (in the chosen gateway/region) until the admin holds a
  // paid credit, so they can test a checkout their geo hides. Once they pay,
  // paid_balance>0 and we fall through to the normal claim → the scan runs.
  const ptPricing = await payTestOverride(req, admin, user.id)
  if (ptPricing) {
    const { data: q } = await admin.from('sentiment_quota').select('paid_balance').eq('user_id', user.id).maybeSingle()
    if ((q?.paid_balance ?? 0) <= 0) {
      void serverAnalytics.sentimentEvent('sentiment_paywall_shown', user.id, { tool_slug: tool.slug, currency: ptPricing.currency, amount_minor: ptPricing.amountMinor }, getIp(req))
      return NextResponse.json({ error: 'payment_required', pricing: ptPricing }, { status: 402 })
    }
  }

  // ── Quota claim (free → paid → payment_required) ──────────────────────────
  const { data: claim, error: claimErr } = await admin.rpc('claim_sentiment_scan', { p_user: user.id })
  if (claimErr) return NextResponse.json({ error: 'quota_error' }, { status: 500 })
  const chargeType = claim as 'free' | 'paid' | 'payment_required'

  if (chargeType === 'payment_required') {
    const pricing = pricingForRequest(req)
    void serverAnalytics.sentimentEvent('sentiment_paywall_shown', user.id, { tool_slug: tool.slug, currency: pricing.currency, amount_minor: pricing.amountMinor }, getIp(req))
    return NextResponse.json({ error: 'payment_required', pricing }, { status: 402 })
  }

  void serverAnalytics.sentimentEvent('sentiment_scan_requested', user.id, { tool_slug: tool.slug, charge_type: chargeType }, getIp(req))

  // ── Run the scan under a hard cap ─────────────────────────────────────────
  const country = getCountryFromRequest(req)
  const startedAt = Date.now()
  const { data: searchRow } = await admin
    .from('sentiment_searches')
    .insert({ user_id: user.id, tool_id: tool.id, tool_slug: tool.slug, status: 'running', charge_type: chargeType, country })
    .select('id')
    .single()
  const searchId: string | undefined = searchRow?.id

  try {
    const scrape = await scrapeAllSources(tool.name, {
      website: tool.website_url,
      budgetMs: SCAN_BUDGET_MS,
      includeReviewSites: true,
    })

    const report = await Promise.race([
      synthesizeReport(
        {
          name: tool.name,
          tagline: tool.tagline ?? '',
          description: tool.description ?? '',
          pricing_type: tool.pricing_type ?? 'unknown',
          pricing_details: tool.pricing_details ?? null,
          skill_level: tool.skill_level ?? 'beginner',
          features: tool.features ?? undefined,
        },
        scrape,
      ),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('synthesis_timeout')), Math.max(TOTAL_CAP_MS - (Date.now() - startedAt), 4000)),
      ),
    ])

    const durationMs = Date.now() - startedAt
    const status = scrape.sourcesSucceeded.length === 0 ? 'partial' : 'ready'

    // Attach the real "live mentions" feed so the report shows actual posts,
    // not just the synthesis — stored inside result jsonb (no schema change).
    const mentions = buildMentions(scrape)
    const fullReport = { ...report, mentions }

    if (searchId) {
      await admin
        .from('sentiment_searches')
        .update({
          status,
          result: fullReport,
          sources: scrape.sourcesSucceeded,
          mention_count: scrape.totalPosts,
          duration_ms: durationMs,
        })
        .eq('id', searchId)
    }

    // Opportunistically refresh the shared cache (free section benefits too).
    void admin.from('tool_sentiment_cache').upsert(
      {
        tool_id: tool.id,
        ai_verdict: report.ai_verdict,
        pros: report.pros,
        cons: report.cons,
        sentiment_score: report.sentiment_score,
        sentiment_breakdown: report.sentiment_breakdown,
        themes: report.themes,
        best_for: report.best_for,
        not_for: report.not_for,
        pricing_analysis: report.pricing_analysis,
        community_buzz: report.community_buzz,
        learning_curve: report.learning_curve,
        integration_insights: report.integration_insights,
        mention_count: scrape.totalPosts,
        sources_scraped: scrape.sourcesSucceeded,
        status: 'ready',
        scraped_at: new Date().toISOString(),
        synthesized_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: 'tool_id' },
    )

    void serverAnalytics.sentimentEvent('sentiment_scan_completed', user.id, {
      tool_slug: tool.slug, charge_type: chargeType, duration_ms: durationMs,
      sources: scrape.sourcesSucceeded, mention_count: scrape.totalPosts, sentiment_score: report.sentiment_score,
    }, getIp(req))

    return NextResponse.json({ ok: true, charge_type: chargeType, report: fullReport, sources: scrape.sourcesSucceeded, mention_count: scrape.totalPosts, duration_ms: durationMs })
  } catch (err) {
    // Refund the claimed credit — never charge for a failed scan.
    await admin.rpc('refund_sentiment_scan', { p_user: user.id, p_charge_type: chargeType })
    if (searchId) {
      await admin.from('sentiment_searches').update({ status: 'failed', error: err instanceof Error ? err.message : 'error' }).eq('id', searchId)
    }
    void serverAnalytics.sentimentEvent('sentiment_scan_failed', user.id, { tool_slug: tool.slug, charge_type: chargeType, error: err instanceof Error ? err.message : 'error' }, getIp(req))
    return NextResponse.json({ error: 'scan_failed' }, { status: 500 })
  }
}
