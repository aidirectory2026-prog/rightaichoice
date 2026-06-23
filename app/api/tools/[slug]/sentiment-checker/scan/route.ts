import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { createClient } from '@/lib/supabase/server'
import { scrapeAllSources } from '@/lib/scrapers'
import { sourceLabel } from '@/lib/scrapers/source-labels'
import { synthesizeReport } from '@/lib/ai/synthesize-report'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { pricingForRequest, freeScanLimitFromRequest, getCountryFromRequest } from '@/lib/geo/currency'
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

export type LiveMention = { source: string; title: string; snippet: string; date: string | null; url: string | null; score: number | null }

// ── Phase 12 Bug-3 — heuristic relevance + dedupe ──────────────────────────
// The broad keyword sources (Reddit/HN/YouTube/Bluesky/Stack Overflow/Lemmy)
// can return coincidental matches on generic tool names. Drop posts that don't
// actually reference THIS tool (no name token + no domain match) and dedupe.
// The precise sources (Trustpilot/App Store/Product Hunt/GitHub) were matched by
// domain/slug/exact name already, so they bypass the token filter.
const PRECISE_SOURCES = new Set(['trustpilot', 'appstore', 'producthunt', 'github', 'news'])
const NAME_STOP = new Set(['the', 'app', 'ai', 'io', 'inc', 'labs', 'pro', 'studio', 'cloud', 'get', 'use', 'try'])

function domainRoot(url?: string | null): string {
  if (!url) return ''
  try {
    return new URL(url).hostname.replace(/^www\./, '').split('.')[0].toLowerCase()
  } catch {
    return ''
  }
}

function isRelevantPost(
  p: { source: string; title?: string; body: string; url?: string | null },
  nameTokens: string[],
  brand: string,
): boolean {
  if (PRECISE_SOURCES.has(p.source)) return true
  const text = `${p.title ?? ''} ${p.body ?? ''}`.toLowerCase()
  if (brand && (text.replace(/[^a-z0-9]/g, '').includes(brand) || domainRoot(p.url) === brand)) return true
  const distinctive = nameTokens.filter((t) => !NAME_STOP.has(t))
  if (distinctive.length === 0) return true // a generic-only name — can't filter safely, keep it
  return distinctive.some((t) => text.includes(t))
}

/** Filter every source's posts to genuine, de-duplicated mentions of this tool. */
function filterRelevantScrape(
  scrape: Awaited<ReturnType<typeof scrapeAllSources>>,
  toolName: string,
): Awaited<ReturnType<typeof scrapeAllSources>> {
  const nameTokens = toolName.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((t) => t.length >= 3)
  const brand = toolName.toLowerCase().replace(/[^a-z0-9]/g, '')
  const all = scrape.all.map((r) => {
    const seen = new Set<string>()
    const posts = r.posts.filter((p) => {
      const key = p.url ? p.url : `${p.title ?? ''}|${(p.body ?? '').slice(0, 80)}`
      if (seen.has(key)) return false
      seen.add(key)
      return isRelevantPost(p, nameTokens, brand)
    })
    return { ...r, posts }
  })
  const totalPosts = all.reduce((n, r) => n + r.posts.length, 0)
  return { ...scrape, all, totalPosts }
}

export type SourceBreakdown = { source: string; label: string; count: number; positivity: number | null }

/** Per-source mention counts (from the filtered scrape) + the model's per-source
 *  positivity (0-1, keyed by the human label) — drives the sources footer + the
 *  per-source sentiment bar chart, and is itself the provenance signal. */
function buildSourceBreakdown(
  scrape: Awaited<ReturnType<typeof scrapeAllSources>>,
  breakdown: Record<string, number> | undefined,
): SourceBreakdown[] {
  return scrape.all
    .filter((r) => r.posts.length > 0)
    .map((r) => {
      const label = sourceLabel(r.source)
      const pos = breakdown?.[label]
      return { source: r.source, label, count: r.posts.length, positivity: typeof pos === 'number' ? pos : null }
    })
    .sort((a, b) => b.count - a.count)
}

/** Top real posts across all sources — the "live mentions" feed (recency-first). */
function buildMentions(scrape: Awaited<ReturnType<typeof scrapeAllSources>>): LiveMention[] {
  return scrape.all
    .flatMap((r) => r.posts.map((p) => ({ ...p, label: sourceLabel(p.source) })))
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
  const rl = await rateLimit('sentiment-scan', req, { limit: 8, windowMs: 60_000 })
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
  // Free limit is geo-resolved: India 25, everyone else 5 (passed to the RPC so
  // the gate + the stored row reflect the caller's region).
  // Phase 10 #23 — elevated India allowance keys off the trusted Vercel edge
  // header only, so a forged country header cannot raise the free limit off-edge.
  // `country` is recorded on the row for analytics only (not the limit decision).
  const country = getCountryFromRequest(req)
  const { data: claim, error: claimErr } = await admin.rpc('claim_sentiment_scan', { p_user: user.id, p_free_limit: freeScanLimitFromRequest(req) })
  if (claimErr) return NextResponse.json({ error: 'quota_error' }, { status: 500 })
  const chargeType = claim as 'free' | 'paid' | 'payment_required'

  if (chargeType === 'payment_required') {
    const pricing = pricingForRequest(req)
    void serverAnalytics.sentimentEvent('sentiment_paywall_shown', user.id, { tool_slug: tool.slug, currency: pricing.currency, amount_minor: pricing.amountMinor }, getIp(req))
    return NextResponse.json({ error: 'payment_required', pricing }, { status: 402 })
  }

  void serverAnalytics.sentimentEvent('sentiment_scan_requested', user.id, { tool_slug: tool.slug, charge_type: chargeType }, getIp(req))

  // ── Run the scan under a hard cap ─────────────────────────────────────────
  const startedAt = Date.now()
  const { data: searchRow } = await admin
    .from('sentiment_searches')
    .insert({ user_id: user.id, tool_id: tool.id, tool_slug: tool.slug, status: 'running', charge_type: chargeType, country })
    .select('id')
    .single()
  const searchId: string | undefined = searchRow?.id

  try {
    const rawScrape = await scrapeAllSources(tool.name, {
      website: tool.website_url,
      budgetMs: SCAN_BUDGET_MS,
      includeReviewSites: true,
    })
    // Phase 12 Bug-3 — drop coincidental/off-topic + duplicate posts before
    // synthesis AND the live-mentions feed, so the report only reflects genuine
    // mentions of this tool.
    const scrape = filterRelevantScrape(rawScrape, tool.name)

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
    const source_breakdown = buildSourceBreakdown(scrape, report.sentiment_breakdown)
    const fullReport = { ...report, mentions, source_breakdown }

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
        faqs: report.faqs,
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
