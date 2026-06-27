import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Star,
  Globe,
  FileCode2,
  BookOpen,
  Calendar,
  Eye,
  ChevronRight,
  Check,
  Layers,
  Zap,
  ArrowRight,
  MessagesSquare,
  TrendingUp,
  ShieldCheck,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Cpu,
  ListChecks,
  ExternalLink,
  BarChart3,
} from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { ToolCard } from '@/components/tools/tool-card'
import { SaveToolButton } from '@/components/tools/save-tool-button'
import { VisitWebsiteButton } from '@/components/tools/visit-website-button'
import { PageViewTracker } from '@/components/tools/page-view-tracker'
import { AddToCompareButton } from '@/components/compare/add-to-compare-button'
import { AiPanel } from '@/components/tools/ai-panel'
import { TutorialVideos } from '@/components/tools/tutorial-videos'
import { FaqSection } from '@/components/tools/faq-section'
import { SentimentSynthesis } from '@/components/tools/sentiment-synthesis'
import { SentimentCTA } from '@/components/cta/sentiment-cta'
import { ViabilityBadge } from '@/components/tools/viability-badge'
import { ToolLogo } from '@/components/tools/tool-logo'
import { QuickFeedback } from '@/components/tools/quick-feedback'
import { MobileActionBar } from '@/components/tools/mobile-action-bar'
import { BackToTop } from '@/components/ui/back-to-top'
import { TutorialLink } from '@/components/tools/tutorial-link'
import { PlanCTAInline } from '@/components/cta/plan-cta-inline'
// Phase 3 density-replacement sections
import { CollapsibleProse } from '@/components/tools/collapsible-prose'
import { CostCalculator } from '@/components/tools/cost-calculator'
import { HiddenCosts } from '@/components/tools/hidden-costs'
import { PricingPowerMatch } from '@/components/tools/pricing-power-match'
import { WorkflowFit } from '@/components/tools/workflow-fit'
import { SetupTimeline } from '@/components/tools/setup-timeline'
import { MigrationPaths } from '@/components/tools/migration-paths'
import { StackPairings } from '@/components/tools/stack-pairings'
import { PricingPlansComparison } from '@/components/tools/pricing-plans-comparison'
import { getToolBySlug, getAlternativeTools, getTopInCategory, getIntegrationLinks } from '@/lib/data/tools'
import { getEditorialComparisonsForTool } from '@/lib/data/comparisons'
import { getFaqsForTool } from '@/lib/data/faqs'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { pricingLabel, pricingColor, formatNumber, timeAgo } from '@/lib/utils'
import { ShareButton } from '@/components/shared/share-button'
import { SectionErrorBoundary } from '@/components/shared/section-error-boundary'
import { RecordRecentView } from '@/components/tools/record-recent-view'
import { StickyToc } from '@/components/tools/sticky-toc'
import { ViewTracker } from '@/components/analytics/view-tracker'
import { LatestUpdatesSection } from '@/components/tools/latest-updates-section'
import { breadcrumbJsonLd, faqPageJsonLd, jsonLdScriptProps } from '@/lib/seo/json-ld'
import { buildToolPageMeta } from '@/lib/seo/metadata'
import { getTitleOverride } from '@/lib/seo/title-overrides'
import { AuthorByline } from '@/components/shared/author-byline'
import { findUseCaseLink } from '@/lib/use-case-link'
import { getRelatedBestPages } from '@/lib/seo/best-page-links'

// Caching Layer 3 (fable-5, 2026-06-16): tool pages no longer read cookies
// (per-user saved/reviewed moved client-side via /api/me/tool-state), verified
// with a `dynamic='error'` build. Opt into static ISR so the #1 traffic
// surface serves from the edge instead of rendering 1-2s per request. The
// freshness cascade's revalidatePath(/tools/<slug>) refreshes on data change.
export const dynamic = 'force-static'
export const revalidate = 300

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const tool = await getToolBySlug(slug)
  if (!tool) return { title: 'Tool Not Found' }

  const categories = tool.tool_categories
    ?.map((tc: { categories: { name: string } }) => tc.categories?.name)
    .filter(Boolean) ?? []

  // Phase 7J: feed last-modified into article:modified_time so SERPs
  // surface freshness. Prefer the explicit refresh timestamp from the
  // SOP, fall back to row.updated_at (auto-bumped on any column change).
  const base = buildToolPageMeta(
    {
      name: tool.name,
      tagline: tool.tagline,
      pricing_type: tool.pricing_type,
      updated_at: tool.last_full_refresh_at ?? tool.updated_at ?? null,
      created_at: tool.created_at ?? null,
    },
    slug,
  )

  // Phase 9 Tier-1: per-page title overrides (CTR-rewrite experiments).
  // Override uses `title.absolute` to bypass the root layout's template
  // suffix — the prompt already includes "| RightAIChoice" in suggestions.
  const override = await getTitleOverride(`/tools/${slug}`)
  const titleField = override ? { absolute: override } : base.title

  return {
    ...base,
    title: titleField,
    keywords: [
      tool.name,
      `${tool.name} pricing`,
      `${tool.name} alternatives`,
      `${tool.name} features`,
      ...categories.map((c: string) => `best ${c} AI tools`),
      'AI tools',
    ],
    openGraph: {
      ...base.openGraph,
      ...(tool.logo_url && { images: [{ url: tool.logo_url, alt: tool.name }] }),
    },
    twitter: {
      ...base.twitter,
      ...(tool.logo_url && { images: [tool.logo_url] }),
    },
  }
}

export default async function ToolDetailPage({ params }: PageProps) {
  const { slug } = await params
  const tool = await getToolBySlug(slug)
  if (!tool) {
    // Phase 4 dedup (migration 076): if this slug was merged into a canonical
    // row, the original is_published=false. Check merged_into and 308-redirect
    // to the canonical slug. Preserves SEO equity from external backlinks.
    // Phase 10 fix — use the ADMIN client: the merged row is is_published=false,
    // and the anon client's RLS only exposes published rows, so the lookup
    // returned null and the redirect silently never fired (soft-404 instead).
    const admin = getAdminClient()
    const { data: merged } = await admin
      .from('tools')
      .select('merged_into')
      .eq('slug', slug)
      .not('merged_into', 'is', null)
      .maybeSingle() as { data: { merged_into: string | null } | null }
    if (merged?.merged_into) {
      permanentRedirect(`/tools/${merged.merged_into}`)
    }
    notFound()
  }

  // Extract categories and tags from joined data
  const categories = tool.tool_categories?.map((tc: { categories: { id: string; name: string; slug: string; icon: string | null } }) => tc.categories).filter(Boolean) ?? []
  const tags = tool.tool_tags?.map((tt: { tags: { id: string; name: string; slug: string } }) => tt.tags).filter(Boolean) ?? []
  const categoryIds = categories.map((c: { id: string }) => c.id)
  const tagSlugs = tags.map((t: { slug: string }) => t.slug)

  // Dept D — contextual /best guide links (static config match, no DB cost).
  const relatedBestPages = getRelatedBestPages({
    categorySlugs: categories.map((c: { slug: string }) => c.slug),
    text: `${tool.tagline ?? ''} ${tool.description ?? ''} ${tags.map((t: { name: string }) => t.name).join(' ')}`,
    limit: 4,
  })

  // Caching Layer 3 (fable-5, 2026-06-16): this page is now statically
  // edge-cached, so it no longer reads cookies / resolves the user
  // server-side. The two per-user bits it used to compute here (saved,
  // alreadyReviewed) are resolved CLIENT-SIDE by SaveToolButton + QuickFeedback
  // via /api/me/tool-state/[toolId]. Everything below is tool-scoped (cacheable).
  const [alternatives, categorySiblings, faqs, integrationLinks, editorialCompares] = await Promise.all([
    // Phase 7 Step 50 (BUG-015): pass slug + tag slugs + tagline so the
    // ranker can apply the general-LLM whitelist (Claude, ChatGPT, Gemini …)
    // and the IDENTITY_TAGS gate for image/video/voice tools.
    getAlternativeTools(tool.id, categoryIds, 4, {
      sourceSlug: tool.slug,
      sourceTagSlugs: tagSlugs,
      sourceTagline: tool.tagline ?? '',
      sourceName: tool.name,
    }).catch(() => [] as Awaited<ReturnType<typeof getAlternativeTools>>),
    // Phase 4.5 audit fix (2026-05-09): permissive category fallback used
    // when the strict alternatives ranker returns nothing (was the case
    // for 934 of 1,178 pages — the section disappeared entirely).
    getTopInCategory(categoryIds, tool.id, 4).catch(() => [] as Awaited<ReturnType<typeof getTopInCategory>>),
    // Phase 4 SOP populates tool.faqs_long_tail (jsonb on tools) which
    // supersedes the legacy tool_faqs table. We prefer the new column when
    // present and fall back to getFaqsForTool only for tools the SOP
    // hasn't refreshed yet. Once the full catalog is refreshed (Phase 4
    // --apply complete), the legacy fetch always returns [] for current
    // tools, which is fine.
    Promise.resolve([] as Awaited<ReturnType<typeof getFaqsForTool>>).then(async () => {
      const longTail = (tool as { faqs_long_tail?: Array<{ question: string; answer: string; target_keyword?: string }> | null }).faqs_long_tail
      if (Array.isArray(longTail) && longTail.length > 0) {
        return longTail.map((f, i) => ({ id: `lt-${i}`, question: f.question, answer: f.answer, source: 'sop' as const }))
      }
      return getFaqsForTool(tool.id).catch(() => [] as Awaited<ReturnType<typeof getFaqsForTool>>)
    }),
    getIntegrationLinks(tool.integrations ?? []).catch(() => new Map<string, string>()),
    getEditorialComparisonsForTool(tool.id).catch(() => [] as Awaited<ReturnType<typeof getEditorialComparisonsForTool>>),
  ])

  const skillLabels: Record<string, string> = {
    beginner: 'Beginner-friendly',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
  }

  const platformLabels: Record<string, string> = {
    web: 'Web',
    mobile: 'Mobile',
    desktop: 'Desktop',
    api: 'API',
    plugin: 'Plugin',
    cli: 'CLI',
  }

  // Phase 9 (2026-06-04) — multi-tier pricing schema. The May-2026 AI-search
  // shift rewards machine-readable pricing ("X pricing" is our biggest tool-page
  // query intent). Build an AggregateOffer (starting-price → "from $X") from the
  // real pricing tiers instead of a single price:0 Offer. See doc 21.
  const pricingTiers = (Array.isArray(tool.pricing_details) ? tool.pricing_details : []) as Array<{ plan?: string; price?: string | number }>
  const tierPrices = pricingTiers
    .map((t) => parseFloat(String(t?.price ?? '').replace(/[^0-9.]/g, '')))
    .filter((n) => Number.isFinite(n))
  const hasFreeTier =
    tool.pricing_type === 'free' ||
    tool.pricing_type === 'freemium' ||
    tierPrices.includes(0) ||
    pricingTiers.some((t) => /free/i.test(String(t?.price ?? '')))
  const lowPrice = hasFreeTier ? 0 : tierPrices.length ? Math.min(...tierPrices) : undefined
  const offers =
    pricingTiers.length > 0
      ? {
          '@type': 'AggregateOffer',
          priceCurrency: 'USD',
          offerCount: pricingTiers.length,
          ...(lowPrice !== undefined ? { lowPrice } : {}),
          ...(tierPrices.length ? { highPrice: Math.max(...tierPrices) } : {}),
        }
      : {
          '@type': 'Offer',
          price: tool.pricing_type === 'free' ? '0' : undefined,
          priceCurrency: 'USD',
          description: pricingLabel(tool.pricing_type),
        }

  // Phase 9 (2026-06-05) — above-the-fold direct-answer line (what it is + who
  // for + cost) for AI-Overview / featured-snippet extraction on "what is X" +
  // "X pricing". Built from the same pricing tiers as the schema. See doc 22.
  const minPaidPrice = tierPrices.filter((p) => p > 0)
  const pricingSentence = hasFreeTier
    ? minPaidPrice.length
      ? `Free to start; paid plans from $${Math.min(...minPaidPrice)}/mo.`
      : 'Free to use.'
    : tierPrices.length
      ? `Plans from $${Math.min(...tierPrices)}/mo.`
      : `${pricingLabel(tool.pricing_type)} pricing.`
  const bestForLine =
    tool.best_for && tool.best_for.length > 0
      ? ` Best for ${tool.best_for.slice(0, 3).join(', ')}.`
      : ''

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: tool.name,
    description: tool.description,
    url: tool.website_url,
    applicationCategory: categories[0]?.name ?? 'AIApplication',
    operatingSystem: (tool.platforms ?? []).join(', ') || 'Web',
    offers,
    // H5 (Cowork QA): only emit AggregateRating when there is at least one real
    // review AND a valid rating. A seed rating with reviewCount:0 is invalid
    // structured data and makes Google suppress all rich results on the page.
    ...(tool.avg_rating >= 1 && tool.review_count > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: Number(tool.avg_rating).toFixed(1),
        reviewCount: tool.review_count,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    ...(tool.logo_url && { image: tool.logo_url }),
    ...(tool.github_url && { codeRepository: tool.github_url }),
    ...(tool.docs_url && { documentation: tool.docs_url }),
  }

  return (
    <>
      <Navbar />
      <PageViewTracker path={`/tools/${slug}`} toolId={tool.id} toolSlug={tool.slug} />
      {/* Phase 6.4 (2026-05-11): cookie-set sibling that powers the
          "Recently viewed" rail on homepage + /tools index. Pure side-
          effect; renders nothing. */}
      <RecordRecentView slug={slug} />
      {/* Phase 8.next Stage 3 (2026-05-13): increments tools.view_count
          via /api/views/tool/[id] on mount. Server dedups per (IP+id)
          in a 30-min sliding window via cookie. */}
      <ViewTracker entityType="tool" entityId={tool.id} />
      {/* H1 (Cowork QA): jsonLdScriptProps applies safeJsonLd escaping so a
          tool description / FAQ answer containing </script> can't break out. */}
      <script
        {...jsonLdScriptProps([
          jsonLd,
          breadcrumbJsonLd([
            { name: 'Home', url: 'https://rightaichoice.com' },
            { name: 'Tools', url: 'https://rightaichoice.com/tools' },
            { name: tool.name, url: `https://rightaichoice.com/tools/${slug}` },
          ]),
          ...(faqs.length > 0 ? [faqPageJsonLd(faqs.map((f) => ({ question: f.question, answer: f.answer })))] : []),
        ])}
      />

      <main className="flex-1 pb-20 lg:pb-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-1.5 text-sm text-zinc-500">
            <Link href="/tools" className="hover:text-white transition-colors">
              Tools
            </Link>
            {categories.length > 0 && (
              <>
                <ChevronRight className="h-3.5 w-3.5" />
                <Link
                  href={`/tools?category=${categories[0].slug}`}
                  className="hover:text-white transition-colors"
                >
                  {categories[0].icon} {categories[0].name}
                </Link>
              </>
            )}
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-zinc-300">{tool.name}</span>
          </nav>

          {/* ── Hero Section ─────────────────────────────────────── */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Left: Logo + Info */}
            <div className="flex items-start gap-5">
              <ToolLogo
                tool={tool}
                size={80}
                className="flex shrink-0 items-center justify-center rounded-2xl bg-zinc-800 overflow-hidden border border-zinc-700"
              />
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-white">{tool.name}</h1>
                  <span
                    className={`inline-flex rounded-md px-2.5 py-0.5 text-xs font-medium ${pricingColor(tool.pricing_type)}`}
                  >
                    {pricingLabel(tool.pricing_type)}
                  </span>
                </div>
                <p className="mt-1.5 text-base text-zinc-400 max-w-xl">
                  {tool.tagline}
                </p>

                <AuthorByline lastVerifiedAt={tool.last_verified_at} />

                {/* Submitted by */}
                {tool.submitter && (
                  <div className="mt-2 flex items-center gap-1.5 text-sm">
                    <span className="text-zinc-500">Submitted by</span>
                    <Link
                      href={`/u/${tool.submitter.username}`}
                      className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      <span>@{tool.submitter.username}</span>
                      <span title="Tool Creator">🔧</span>
                    </Link>
                  </div>
                )}

                {/* Quick stats row */}
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-zinc-500">
                  {tool.avg_rating > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span className="text-white font-medium">
                        {Number(tool.avg_rating).toFixed(1)}
                      </span>
                      <span>({tool.review_count} reviews)</span>
                    </div>
                  )}
                  {/* Phase 8.next Stage 3 (2026-05-13): view_count >= 25
                      gate removed. After Stage 2 backfill every tool has a
                      seeded count in 2,700-6,500 range, so the metric is
                      always meaningful and worth surfacing. */}
                  <div className="flex items-center gap-1.5">
                    <Eye className="h-4 w-4" />
                    <span>{formatNumber(tool.view_count)} views</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>Added {timeAgo(tool.created_at)}</span>
                  </div>
                  {tool.viability_score != null && (
                    <ViabilityBadge score={tool.viability_score} size="md" showLabel />
                  )}
                </div>
              </div>
            </div>

            {/* Right: Action buttons */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:shrink-0">
              <AddToCompareButton
                tool={{
                  id: tool.id,
                  slug: tool.slug,
                  name: tool.name,
                  logo_url: tool.logo_url,
                }}
                size="md"
              />
              <SaveToolButton toolId={tool.id} toolName={tool.name} toolSlug={tool.slug} />
              <ShareButton
                url={`/tools/${tool.slug}`}
                title={`${tool.name} — ${tool.tagline}`}
                text={`Check out ${tool.name} — ${tool.tagline} | Found on RightAIChoice`}
              />
              <VisitWebsiteButton slug={tool.slug} url={tool.website_url} toolId={tool.id} source="tool_page" />
            </div>
          </div>

          {/* Phase 9 (2026-06-05): above-the-fold direct-answer / TL;DR block.
              Concise, extractable "what is X + who for + cost" for AI Overviews
              and featured snippets ("what is {tool}", "{tool} pricing"). */}
          <div className="mt-6 rounded-xl border border-emerald-900/40 bg-emerald-950/15 p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-500">In short</p>
            <p className="text-sm leading-relaxed text-zinc-200">
              <strong className="text-white">{tool.name}</strong>
              {tool.tagline ? ` — ${tool.tagline.replace(/\.$/, '')}.` : ' is an AI tool.'}
              {bestForLine} {pricingSentence}
            </p>
          </div>

          {/* Phase 9 B1 (2026-05-28): elevated "Compared with" strip.
              Editorial compares are only 34% indexed (vs tools at 93%) because
              they're orphans linked only from a sidebar rail. Hoisting them to
              an above-the-fold strip transfers crawl-priority authority from
              this already-indexed tool page. The buried sidebar block at
              line ~895 stays as long-form context with verdict snippets.
              Anchor text uses "vs {OtherTool}" per doc 07 strategy. */}
          {editorialCompares.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 shrink-0">
                Compared with
              </span>
              {editorialCompares.slice(0, 6).map((c) => {
                const parts = c.slug.split('-vs-')
                const otherSlug = parts.find((p) => p !== tool.slug) ?? parts[parts.length - 1]
                const otherName = otherSlug
                  .split('-')
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(' ')
                return (
                  <Link
                    key={c.slug}
                    href={`/compare/${c.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-900/40 bg-emerald-950/20 px-3 py-1 text-xs font-medium text-emerald-300 hover:border-emerald-700 hover:bg-emerald-950/40 hover:text-emerald-200 transition-colors"
                  >
                    vs {otherName}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )
              })}
            </div>
          )}

          {/* Bug-4.2 (2026-06-27): inline affiliate disclosure removed from the
              tool page. It now lives only on the policy pages (/methodology,
              /terms) where it belongs; repeating it on every content page added
              clutter near the primary CTA. */}

          {/* Phase 9 S6: prominent CTA → live Market Sentiment page */}
          <SentimentCTA toolSlug={tool.slug} toolName={tool.name} />

          {/* ── Main Content Grid ────────────────────────────────── */}
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column (2/3) — Description, Features, etc. */}
            <div className="lg:col-span-2 space-y-8">
              {/* Editorial Verdict (most prominent) — Phase 4.5 follow-up
                  (2026-05-12): always renders. When best_for / not_for /
                  editorial_verdict / skip_if are all empty (506 prod
                  pages), a single honest placeholder line lists the
                  three labels so the page-flow + audit signal stay
                  consistent and SOP backfill replaces it with real
                  content over time. */}
              {(() => {
                const hasBestFor = tool.best_for && tool.best_for.length > 0
                const hasNotFor = tool.not_for && tool.not_for.length > 0
                const hasVerdict = !!tool.editorial_verdict
                const hasSkipIf = !!(tool.skip_if && String(tool.skip_if).trim())
                const hasAnyVerdictContent = hasBestFor || hasNotFor || hasVerdict || hasSkipIf
                return (
                <section className="rounded-xl border border-emerald-900/40 bg-gradient-to-b from-emerald-950/10 to-zinc-900/50 p-5">
                  <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                    Editorial Verdict
                  </h2>

                  {hasAnyVerdictContent ? (
                    <>
                  <div className="flex flex-wrap gap-x-8 gap-y-3 mb-4">
                    {hasBestFor && (
                      <div>
                        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 mb-1.5">
                          <ThumbsUp className="h-3.5 w-3.5" /> Best for
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {tool.best_for.map((segment: string) => (
                            <span key={segment} className="rounded-full border border-emerald-800/40 bg-emerald-950/30 px-2.5 py-0.5 text-xs text-emerald-300">
                              {segment}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {hasNotFor && (
                      <div>
                        <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 mb-1.5">
                          <ThumbsDown className="h-3.5 w-3.5" /> Not ideal for
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {tool.not_for.map((segment: string) => (
                            <span key={segment} className="rounded-full border border-zinc-700 bg-zinc-800/50 px-2.5 py-0.5 text-xs text-zinc-400">
                              {segment}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {hasVerdict && (
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      {tool.editorial_verdict}
                    </p>
                  )}

                  {/* Bug-4.2 (2026-06-27): the "Skip {tool} if …" sentence now
                      lives INSIDE the verdict band, right under "Not ideal for",
                      as one consolidated "who should skip" treatment. It used to
                      render again as a standalone strip below, which read as the
                      skip section appearing twice. */}
                  {hasSkipIf && (
                    <div className="mt-4 rounded-lg border-l-2 border-zinc-600 bg-zinc-900/30 px-4 py-2.5">
                      <p className="text-sm text-zinc-400 leading-relaxed">
                        <span className="font-medium text-zinc-200">Skip {tool.name} if </span>
                        {String(tool.skip_if).trim()}
                      </p>
                    </div>
                  )}
                    </>
                  ) : (
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      <span className="font-medium text-zinc-300">Best for / Not for / Skip if</span> — refreshing soon. In the meantime see <span className="text-zinc-300">Use cases</span> below for context, or jump to{' '}
                      <Link href={`/plan?q=${encodeURIComponent(tool.name)}`} className="text-emerald-400 hover:text-emerald-300 transition-colors">
                        Plan My Stack
                      </Link>{' '}
                      for a personalized fit.
                    </p>
                  )}

                  {/* Alternatives link — links directly to /compare so users
                      land on a head-to-head page (fewer clicks, higher intent). */}
                  {alternatives.length > 0 && (
                    <p className="mt-3 text-xs text-zinc-500">
                      Compare with:{' '}
                      {alternatives.slice(0, 3).map((alt, i) => (
                        <span key={alt.id}>
                          {i > 0 && ', '}
                          <Link
                            href={`/compare?tools=${tool.slug},${alt.slug}`}
                            className="text-emerald-400 hover:text-emerald-300 transition-colors"
                          >
                            {tool.name} vs {alt.name}
                          </Link>
                        </span>
                      ))}
                    </p>
                  )}

                  {tool.last_verified_at && (
                    <p className="mt-3 text-xs text-zinc-600">
                      Last verified: {new Date(tool.last_verified_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </section>
                )
              })()}

              {/* Bug-4.1 (2026-06-27): "Behind the Verdict" long-form prose used
                  to open here, right under the Editorial Verdict — a wall of
                  300–800 words before any scannable content. It now renders
                  lower down as a CollapsibleProse (after Key Features + About),
                  so the page opens with structured/visual signal instead. */}

              {/* Bug-4.2 (2026-06-27): the standalone <SkipIfLine> was removed —
                  the skip-if sentence now renders inside the Editorial Verdict
                  band above, so "who should skip" appears exactly once. */}

              {/* Phase 8.next Stage 5 (2026-05-13): "Latest from {Tool}"
                  freshness section — chronological timeline of vendor
                  changelog + blog + news + HN + Twitter mentions,
                  refreshed weekly. Position chosen for max prominence
                  immediately after the Verdict band; users browsing for
                  decision-relevant info see CURRENT signal before
                  scrolling further. */}
              <SectionErrorBoundary fallbackTitle="Latest updates couldn't load right now.">
                <LatestUpdatesSection
                  toolName={tool.name}
                  items={tool.latest_updates as never}
                  updatedAt={tool.latest_updates_at as string | null}
                />
              </SectionErrorBoundary>

              {/* Sentiment synthesis — independent-user research pass (Phase 3 rewrite) */}
              <SectionErrorBoundary fallbackTitle="Sentiment synthesis couldn't load right now.">
                <SentimentSynthesis toolId={tool.id} toolName={tool.name} />
              </SectionErrorBoundary>
              {/* Phase 9 S6: the paid live Market Sentiment Checker now lives on its
                  own page (/tools/[slug]/sentiment), reached via the header button. */}

              {/* Viability Score — Phase 4.5 audit fix (2026-05-09): renders
                  even when viability_score is null. Was hidden on 540 of
                  1,178 pages whose Phase 4 SOP didn't compute a score yet,
                  leaving a visible gap in the page-flow. Placeholder copy
                  is honest ("Score in progress — refreshing soon") and
                  links to /viability so users can read about the methodology
                  while they wait. */}
              {tool.viability_score != null ? (
                <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-emerald-400" />
                      Viability Score
                    </h2>
                    <ViabilityBadge score={tool.viability_score} size="lg" showLabel />
                  </div>

                  <p className="text-sm text-zinc-400 mb-4">
                    How likely is {tool.name} to still be operational in 12 months? Based on 4 signals —
                    momentum (how recently it shipped), wrapper dependency, revenue model, and web presence.
                  </p>

                  {tool.viability_signals && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(tool.viability_signals as Record<string, number>).map(([key, value]) => (
                        <div key={key} className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2">
                          <span className="text-xs text-zinc-500 block mb-0.5 capitalize">
                            {key.replace(/_/g, ' ')}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  value >= 70 ? 'bg-emerald-500' :
                                  value >= 40 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${value}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono text-zinc-400">{value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between">
                    {tool.viability_updated_at && (
                      <p className="text-xs text-zinc-600">
                        Last calculated: {new Date(tool.viability_updated_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                    )}
                    <Link
                      href="/viability"
                      className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      How we score &rarr;
                    </Link>
                  </div>
                </section>
              ) : (
                <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-zinc-500" />
                      Viability Score
                    </h2>
                    <span className="rounded-full border border-zinc-700 bg-zinc-800/60 px-2.5 py-0.5 text-[11px] uppercase tracking-wide text-zinc-400">
                      In progress
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400">
                    We&apos;re still computing {tool.name}&apos;s viability across our signals (momentum, wrapper risk, revenue model, web presence). Refreshing soon —{' '}
                    <Link href="/viability" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                      read how we score
                    </Link>
                    .
                  </p>
                </section>
              )}

              {/* Bug-4.1 (2026-06-27): engagement-first reorder. Key Features
                  (scannable, structured) now comes BEFORE the long-form prose;
                  About + Behind-the-Verdict are demoted into CollapsibleProse so
                  the page no longer opens with a wall of text. Full prose stays
                  in the DOM (visual line-clamp only) for SEO/GEO extraction. */}

              {/* Features */}
              {tool.features && tool.features.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-emerald-400" />
                    Key Features
                  </h2>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {tool.features.map((feature: string, i: number) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300"
                      >
                        <Check className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* About {tool} — collapsible (demoted below Key Features) */}
              <CollapsibleProse title={`About ${tool.name}`} text={tool.description} />

              {/* Behind the Verdict — collapsible (demoted from the top of page) */}
              <CollapsibleProse
                title="Behind the Verdict"
                icon={<Eye className="h-5 w-5 text-cyan-400" />}
                text={tool.our_views}
                footer={
                  tool.our_views_generated_at ? (
                    <p className="mt-2 text-xs text-zinc-600">
                      Last updated:{' '}
                      {new Date(tool.our_views_generated_at).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  ) : null
                }
              />

              {/* Phase 9 — inline Plan-Your-Stack CTA, after the About block.
                  Places the strongest conversion ask above-the-fold for users
                  who scrolled past the description. Context-aware copy. */}
              <PlanCTAInline context={tool.name} />

              {/* Phase 4.5 audit fix (2026-05-09): Integrations moved from
                  here to AFTER PricingPlansComparison so the rendered order
                  matches the Phase 4 canonical spec:
                  Features → Use cases → ... → Plans Compared → Integrations
                  → Hidden Costs. Was rendering ~5 sections too early on 720
                  of 1,178 pages. */}

              {/* Phase 3: real-world workflow scenarios */}
              <WorkflowFit toolName={tool.name} scenarios={tool.workflow_scenarios} />

              {/* Use Cases — concrete, curated (from tool.use_cases) */}
              {Array.isArray(tool.use_cases) && tool.use_cases.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <ListChecks className="h-5 w-5 text-purple-400" />
                    Use Cases
                  </h2>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {tool.use_cases.map((uc: string, i: number) => {
                      const href = findUseCaseLink(uc)
                      const inner = (
                        <>
                          <ArrowRight className="h-4 w-4 shrink-0 text-purple-400 mt-0.5" />
                          {uc}
                        </>
                      )
                      const base = 'flex items-start gap-2.5 rounded-lg border bg-zinc-900/50 px-4 py-3 text-sm transition-colors'
                      return (
                        <li key={i}>
                          {href ? (
                            <Link
                              href={href}
                              className={`${base} border-purple-900/40 text-zinc-200 hover:border-purple-600 hover:text-white`}
                            >
                              {inner}
                            </Link>
                          ) : (
                            <span className={`${base} border-zinc-800 text-zinc-300`}>
                              {inner}
                            </span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )}

              {/* Models — underlying LLMs / AI models (from tool.models) */}
              {Array.isArray(tool.models) && tool.models.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-cyan-400" />
                    Models Under the Hood
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {tool.models.map((m: string, i: number) => (
                      <span
                        key={i}
                        className="rounded-lg border border-cyan-900/40 bg-cyan-950/20 px-3 py-1.5 text-sm font-mono text-cyan-300"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Limitations — honest constraints (from tool.limitations) */}
              {tool.limitations && (
                <section className="rounded-xl border border-amber-900/40 bg-amber-950/10 p-5">
                  <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                    Limitations
                  </h2>
                  <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                    {tool.limitations}
                  </p>
                </section>
              )}

              {/* Phase 3 — Pricing & cost band */}
              <CostCalculator pricingDetails={tool.pricing_details} />
              <PricingPlansComparison
                toolName={tool.name}
                pricingDetails={tool.pricing_details}
                pricingPlanGuides={tool.pricing_plan_guides}
              />

              {/* Integrations — moved here in Phase 4.5 (2026-05-09) per the
                  canonical section spec: Plans Compared → Integrations →
                  Hidden Costs. Links to the integration's tool page when we
                  have one. */}
              {tool.integrations && tool.integrations.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Layers className="h-5 w-5 text-blue-400" />
                    Integrations
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {tool.integrations.map((integration: string, i: number) => {
                      const slug = integrationLinks.get(integration.toLowerCase())
                      const baseClass = 'rounded-lg border px-3 py-1.5 text-sm transition-colors'
                      if (slug) {
                        return (
                          <Link
                            key={i}
                            href={`/tools/${slug}`}
                            className={`${baseClass} border-emerald-800/60 bg-emerald-900/20 text-emerald-300 hover:border-emerald-600 hover:text-emerald-200`}
                          >
                            {integration}
                          </Link>
                        )
                      }
                      return (
                        <span
                          key={i}
                          className={`${baseClass} border-zinc-800 bg-zinc-900/50 text-zinc-400`}
                        >
                          {integration}
                        </span>
                      )
                    })}
                  </div>
                </section>
              )}

              <HiddenCosts toolName={tool.name} hiddenCosts={tool.hidden_costs} />
              <PricingPowerMatch toolName={tool.name} text={tool.pricing_power_text} />

              {/* Phase 3 — Adoption-friction band: setup, migration
                  — both answer "what's the commitment / what risk am I taking" */}
              <SetupTimeline toolName={tool.name} text={tool.setup_time_text} />
              <MigrationPaths
                toolName={tool.name}
                migrationIn={tool.migration_in}
                migrationOut={tool.migration_out}
              />
              {/* Bug-4.5 (2026-06-27): the standalone "Recent changes" section was
                  removed — it overlapped the "What's new in {tool}" feed above.
                  One consolidated release/change surface now (release-notes only,
                  skipped when there's nothing real to show). */}

              {/* Topics moved to right rail (Phase 3c) — they were redundant with
                  Categories which already lives in the rail, and they broke the
                  main-column flow between commitment band and tutorials. Tags
                  still feed search via the right-rail entries. */}

              {/* Tutorials & Guides — always renders so the page-flow is consistent.
                  Order of preference: enriched tutorial_links (real <title>) →
                  bare tutorial_urls → fallback derived from docs_url / changelog_url /
                  github_url / community links / website. Worst case: a single
                  Visit Website card so every tool has SOMETHING actionable here. */}
              {(() => {
                const enriched = Array.isArray(tool.tutorial_links) ? tool.tutorial_links as Array<{url: string; title?: string | null; description?: string | null}> : []
                const bare = Array.isArray(tool.tutorial_urls) ? tool.tutorial_urls as string[] : []
                let items: Array<string | { url: string; title?: string | null; description?: string | null }> = enriched.length > 0 ? enriched : bare
                if (items.length === 0) {
                  // Synthesize a resources list from sibling URL fields
                  const cl = (tool.community_links ?? {}) as Record<string, unknown>
                  const fallback: string[] = []
                  const add = (u: unknown) => { if (typeof u === 'string' && /^https?:\/\//.test(u) && !fallback.includes(u)) fallback.push(u) }
                  add(tool.docs_url)
                  add(tool.changelog_url)
                  add(tool.github_url)
                  add(cl.g2_url)
                  add(cl.producthunt_url)
                  add(tool.website_url)
                  items = fallback
                }
                if (items.length === 0) return null
                return (
                  <section>
                    <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-blue-400" />
                      Resources & Guides
                    </h2>
                    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {items.map((it, i) => (
                        <li key={i}>
                          <TutorialLink item={it} toolName={tool.name} />
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              })()}

              {/* ── Tutorial Videos ───────────────────────────── */}
              <TutorialVideos tutorials={tool.tutorial_videos ?? []} />

              {/* Phase 3c (2026-05-07): the standalone RSS/Atom changelog feed
                  was removed. The structured Recent Changes section above now
                  carries material change-history; the raw RSS feed was a noisy
                  signal few users wanted in the middle of the page. */}

              {/* ── AI Panel ─────────────────────────────────── */}
              <AiPanel
                tool={{
                  name: tool.name,
                  slug: tool.slug,
                  tagline: tool.tagline,
                  description: tool.description,
                  pricing_type: tool.pricing_type,
                  skill_level: tool.skill_level,
                  features: tool.features ?? [],
                  has_api: tool.has_api,
                  platforms: tool.platforms ?? [],
                }}
                reviews={[]}
              />

              {/* ── FAQs ──────────────────────────────────────── */}
              <FaqSection faqs={faqs} toolName={tool.name} toolSlug={tool.slug} />

              {/* Phase 3: Stack-pairing recommendations — composes well with this tool */}
              <StackPairings
                toolName={tool.name}
                pairings={alternatives.slice(0, 3).map((alt) => ({
                  id: alt.id,
                  slug: alt.slug,
                  name: alt.name,
                  tagline: alt.tagline,
                  logo_url: alt.logo_url,
                  pairing_reason: null,
                }))}
              />

              {/* Featured in Head-to-Head Comparisons — editorial only */}
              {editorialCompares.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-emerald-400" />
                    Featured Head-to-Head Comparisons
                  </h2>
                  <div className="space-y-3">
                    {editorialCompares.map((c) => {
                      const title = c.slug
                        .split('-vs-')
                        .map((s) => s.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
                        .join(' vs ')
                      return (
                        <Link
                          key={c.slug}
                          href={`/compare/${c.slug}`}
                          className="block rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 hover:border-emerald-800/50 hover:bg-zinc-800/40 transition-colors group"
                        >
                          <p className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">
                            {title}
                          </p>
                          {c.verdict && (
                            <p className="mt-1 text-xs text-zinc-500 leading-relaxed line-clamp-2">
                              {c.verdict}
                            </p>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* Alternatives — Phase 4.5 follow-up (2026-05-12, audit
                  recheck): h2 is always "Alternatives to {Tool}" (was
                  switching to "Top tools in this category" when the strict
                  ranker returned nothing — auditor flagged this as both a
                  data-completeness signal AND a source of the literal
                  "coming soon" sub-line being detected as placeholder
                  copy). Now we ALWAYS show the same header; we top up
                  to 3 cards by mixing strict alts + category siblings,
                  deduped. Section hides only when both pools are empty
                  (truly uncategorized + no strict ranker hits). */}
              {(() => {
                // Phase 11 (2026-06-20): "Alternatives to X" now shows ONLY the
                // genuine relevance-ranked alternatives — we no longer pad it with
                // arbitrary popular siblings from a (possibly catch-all) category,
                // which read as absurd ("Alternatives to <niche tool>: Monday.com").
                // Category siblings get their own honest "Popular in {category}"
                // block so the page stays useful without mislabeling.
                const TARGET = 3
                const strictIds = new Set(alternatives.map((a) => a.id))
                const popular = categorySiblings
                  .filter((s) => !strictIds.has(s.id))
                  .slice(0, TARGET)
                const categoryName = categories[0]?.name as string | undefined
                if (alternatives.length === 0 && popular.length === 0) return null
                return (
                  <>
                    {alternatives.length > 0 && (
                      <section>
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-lg font-semibold text-white">
                            Alternatives to {tool.name}
                          </h2>
                          <Link
                            href={`/tools/${tool.slug}/alternatives`}
                            className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                          >
                            View all
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {alternatives.slice(0, TARGET).map((alt) => (
                            <ToolCard key={alt.id} tool={alt as React.ComponentProps<typeof ToolCard>['tool']} />
                          ))}
                        </div>
                      </section>
                    )}
                    {/* Show "Popular in {category}" only to fill the page when we
                        don't already have a full set of genuine alternatives. */}
                    {popular.length > 0 && alternatives.length < TARGET && (
                      <section>
                        <h2 className="text-lg font-semibold text-white mb-4">
                          {categoryName ? `Popular in ${categoryName}` : 'Popular AI tools'}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {popular.slice(0, Math.max(TARGET - alternatives.length, 0) || TARGET).map((alt) => (
                            <ToolCard key={alt.id} tool={alt as React.ComponentProps<typeof ToolCard>['tool']} />
                          ))}
                        </div>
                      </section>
                    )}
                  </>
                )
              })()}

              {/* End-of-page CTA: Quick Feedback. Phase 3c moved here from
                  mid-page so the user reads the full editorial first; feedback
                  is the natural close, not an interruption. */}
              <QuickFeedback
                toolId={tool.id}
                toolSlug={tool.slug}
                toolName={tool.name}
              />
            </div>

            {/* Right column (1/3) — Sidebar.
                Phase 3b (2026-05-05): sticky on desktop so the at-a-glance
                details / categories / resources stay in view as the long
                main column scrolls. Internal scroll kicks in when the rail
                is taller than the available viewport height (top-20 leaves
                room for the navbar). */}
            <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
              {/* Phase 6.7 (2026-05-12): sticky table-of-contents.
                  Auto-discovers <h2> elements in <main> at runtime,
                  slugifies them into stable IDs, and uses
                  IntersectionObserver to highlight the section in
                  view. Hidden below lg: because the right rail
                  collapses there too. */}
              <StickyToc />

              {/* Quick Info Card */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Details</h3>
                <dl className="space-y-3.5">
                  <InfoRow label="Pricing" value={pricingLabel(tool.pricing_type)} />
                  <InfoRow
                    label="Skill Level"
                    value={skillLabels[tool.skill_level] ?? tool.skill_level}
                  />
                  {tool.platforms && tool.platforms.length > 0 && (
                    <InfoRow
                      label="Platforms"
                      value={tool.platforms
                        .map((p: string) => platformLabels[p] ?? p)
                        .join(', ')}
                    />
                  )}
                  <InfoRow label="API Available" value={tool.has_api ? 'Yes' : 'No'} />
                  {tool.updated_at && (
                    <InfoRow label="Last Updated" value={timeAgo(tool.updated_at)} />
                  )}
                </dl>
              </div>

              {/* Phase 1 (2026-05-05): the rating-distribution sidebar block
                  was removed alongside the Reviews / Questions / Discussions
                  sections. Phase 3 will replace it with a synthesized
                  sentiment block ("What independent users actually report
                  about [Tool]") sourced from broader research, not the
                  internal reviews pool. */}

              {/* Categories */}
              {categories.length > 0 && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                  <h3 className="text-sm font-semibold text-white mb-3">Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat: { id: string; name: string; slug: string; icon: string | null }) => (
                      <Link
                        key={cat.id}
                        href={`/tools?category=${cat.slug}`}
                        className="rounded-lg border border-zinc-800 px-3 py-1.5 text-sm text-zinc-400 hover:border-zinc-600 hover:text-white transition-colors"
                      >
                        {cat.icon} {cat.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Dept D (fable 5 review) — contextual internal links into the
                  /best guides. GSC diagnosis: the 64 niche pages are indexed
                  but rank ~pos 69 with only the footer hub linking to them;
                  ~2,000 tool pages linking contextually is the cheapest
                  authority lever. */}
              {relatedBestPages.length > 0 && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                  <h3 className="text-sm font-semibold text-white mb-3">Best-of guides</h3>
                  <div className="flex flex-wrap gap-2">
                    {relatedBestPages.map((bp) => (
                      <Link
                        key={bp.slug}
                        href={`/best/${bp.slug}`}
                        className="rounded-lg border border-zinc-800 px-3 py-1.5 text-sm text-zinc-400 hover:border-emerald-700 hover:text-emerald-300 transition-colors"
                      >
                        {bp.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Topics (Phase 3c: moved from main column to right rail —
                  they're tags, not editorial content; the rail is the right
                  home for taxonomy / discovery affordances). */}
              {tags.length > 0 && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                  <h3 className="text-sm font-semibold text-white mb-3">Topics</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag: { id: string; name: string; slug: string }) => (
                      <Link
                        key={tag.id}
                        href={`/tools?search=${encodeURIComponent(tag.name)}`}
                        className="rounded-full border border-zinc-800 bg-zinc-950/40 px-2.5 py-0.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-white transition-colors"
                      >
                        {tag.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Resources</h3>
                <div className="space-y-2">
                  <ResourceLink
                    href={tool.website_url}
                    icon={<Globe className="h-4 w-4" />}
                    label="Official Website"
                  />
                  {tool.docs_url && (
                    <ResourceLink
                      href={tool.docs_url}
                      icon={<BookOpen className="h-4 w-4" />}
                      label="Documentation"
                    />
                  )}
                  {tool.github_url && (
                    <ResourceLink
                      href={tool.github_url}
                      icon={<FileCode2 className="h-4 w-4" />}
                      label={
                        tool.github_stars > 0
                          ? `GitHub (${formatNumber(tool.github_stars)} stars)`
                          : 'GitHub Repository'
                      }
                    />
                  )}
                  {tool.changelog_url && (
                    <ResourceLink
                      href={tool.changelog_url}
                      icon={<Calendar className="h-4 w-4" />}
                      label="Changelog"
                    />
                  )}
                  {(() => {
                    const cl = (tool.community_links ?? {}) as {
                      g2_url?: string | null
                      g2_rating?: number | null
                      producthunt_url?: string | null
                      reddit_threads?: string[] | null
                    }
                    return (
                      <>
                        {cl.g2_url && (
                          <ResourceLink
                            href={cl.g2_url}
                            icon={<Star className="h-4 w-4" />}
                            label={cl.g2_rating ? `G2 (${cl.g2_rating.toFixed(1)}★)` : 'G2 reviews'}
                          />
                        )}
                        {cl.producthunt_url && (
                          <ResourceLink
                            href={cl.producthunt_url}
                            icon={<TrendingUp className="h-4 w-4" />}
                            label="Product Hunt"
                          />
                        )}
                        {Array.isArray(cl.reddit_threads) && cl.reddit_threads[0] && (
                          <ResourceLink
                            href={cl.reddit_threads[0]}
                            icon={<MessagesSquare className="h-4 w-4" />}
                            label={cl.reddit_threads.length > 1 ? `Reddit (${cl.reddit_threads.length} threads)` : 'Reddit thread'}
                          />
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>

              {/* Bug-4.2 (2026-06-27): removed the duplicate sidebar "Pricing
                  Plans" card. The main column already owns the authoritative
                  pricing surface — 12-month CostCalculator + PricingPlansComparison
                  (with per-tier "ideal for"/"what this adds") + Hidden costs. The
                  sidebar copy was a thinner, redundant repeat of the same
                  pricing_details, which made the page feel like it was
                  re-listing plans/payment details. One pricing surface now. */}
            </aside>
          </div>
        </div>
      </main>

      {/* Phase 3b: mobile-only sticky action bar (lg:hidden inside the component) */}
      <MobileActionBar
        tool={{
          id: tool.id,
          slug: tool.slug,
          name: tool.name,
          logo_url: tool.logo_url,
          website_url: tool.website_url,
        }}
      />

      {/* Bug-4.2 (2026-06-27): back-to-top control for the long tool page */}
      <BackToTop />

      <Footer />
    </>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-zinc-300 font-medium">{value}</dd>
    </div>
  )
}

function ResourceLink({
  href,
  icon,
  label,
}: {
  href: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
    >
      {icon}
      {label}
    </a>
  )
}
