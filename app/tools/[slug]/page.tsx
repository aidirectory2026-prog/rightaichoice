import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Star,
  Globe,
  FileCode2,
  BookOpen,
  Calendar,
  Eye,
  Tag,
  ChevronRight,
  Check,
  Layers,
  Zap,
  ArrowRight,
  MessageSquare,
  MessagesSquare,
  GitBranch,
  TrendingUp,
  ShieldCheck,
  ThumbsUp,
  ThumbsDown,
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
import { SentimentBlock } from '@/components/tools/sentiment-block'
import { ViabilityBadge } from '@/components/tools/viability-badge'
import { getToolBySlug, getAlternativeTools, isToolSaved } from '@/lib/data/tools'
import { getFaqsForTool } from '@/lib/data/faqs'
import { getWorkflowsForTool } from '@/lib/data/workflows'
import { getReviewsForTool, hasUserReviewed, getReviewVotes } from '@/lib/data/reviews'
import { getQuestionsForTool, getQuestionVotes } from '@/lib/data/questions'
import {
  getDiscussionsForTool,
  getRepliesForDiscussion,
  getDiscussionVotes,
  getReplyVotes,
} from '@/lib/data/discussions'
import { DiscussionForm } from '@/components/discussions/discussion-form'
import { DiscussionList } from '@/components/discussions/discussion-list'
import { ReviewForm } from '@/components/reviews/review-form'
import { ReviewList } from '@/components/reviews/review-list'
import { QuestionForm } from '@/components/qa/question-form'
import { QuestionList } from '@/components/qa/question-list'
import { createClient } from '@/lib/supabase/server'
import { pricingLabel, pricingColor, formatNumber, timeAgo } from '@/lib/utils'
import { ShareButton } from '@/components/shared/share-button'
import { SectionErrorBoundary } from '@/components/shared/section-error-boundary'
import { breadcrumbJsonLd } from '@/lib/seo/json-ld'

// Revalidate tool pages every 5 minutes (ISR)
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

  const description = tool.tagline.length > 155
    ? tool.tagline.slice(0, 152) + '…'
    : tool.tagline

  return {
    title: `${tool.name} — Reviews, Pricing & Alternatives`,
    description,
    keywords: [
      tool.name,
      `${tool.name} review`,
      `${tool.name} pricing`,
      `${tool.name} alternatives`,
      ...categories.map((c: string) => `best ${c} AI tools`),
      'AI tools',
    ],
    alternates: { canonical: `/tools/${slug}` },
    openGraph: {
      title: `${tool.name} — Reviews, Pricing & Alternatives`,
      description,
      url: `/tools/${slug}`,
      type: 'website',
      ...(tool.logo_url && { images: [{ url: tool.logo_url, alt: tool.name }] }),
    },
    twitter: {
      card: 'summary',
      title: `${tool.name} — RightAIChoice`,
      description,
      ...(tool.logo_url && { images: [tool.logo_url] }),
    },
  }
}

export default async function ToolDetailPage({ params }: PageProps) {
  const { slug } = await params
  const tool = await getToolBySlug(slug)
  if (!tool) notFound()

  // Extract categories and tags from joined data
  const categories = tool.tool_categories?.map((tc: { categories: { id: string; name: string; slug: string; icon: string | null } }) => tc.categories).filter(Boolean) ?? []
  const tags = tool.tool_tags?.map((tt: { tags: { id: string; name: string; slug: string } }) => tt.tags).filter(Boolean) ?? []
  const categoryIds = categories.map((c: { id: string }) => c.id)

  // Get alternatives + check saved status in parallel
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch community data in parallel — each section is fault-tolerant
  const [alternatives, saved, reviews, alreadyReviewed, questions, discussions, relatedWorkflows, faqs] = await Promise.all([
    getAlternativeTools(tool.id, categoryIds, 4).catch(() => [] as Awaited<ReturnType<typeof getAlternativeTools>>),
    user ? isToolSaved(tool.id, user.id).catch(() => false) : Promise.resolve(false),
    getReviewsForTool(tool.id).catch(() => [] as Awaited<ReturnType<typeof getReviewsForTool>>),
    user ? hasUserReviewed(tool.id, user.id).catch(() => false) : Promise.resolve(false),
    getQuestionsForTool(tool.id).catch(() => [] as Awaited<ReturnType<typeof getQuestionsForTool>>),
    getDiscussionsForTool(tool.id).catch(() => [] as Awaited<ReturnType<typeof getDiscussionsForTool>>),
    getWorkflowsForTool(tool.slug).catch(() => [] as Awaited<ReturnType<typeof getWorkflowsForTool>>),
    getFaqsForTool(tool.id).catch(() => [] as Awaited<ReturnType<typeof getFaqsForTool>>),
  ])

  // Get user's votes on reviews, questions, and discussions
  const reviewIds = reviews.map((r: { id: string }) => r.id)
  const questionIds = questions.map((q: { id: string }) => q.id)
  const discussionIds = discussions.map((d: { id: string }) => d.id)

  // Fetch replies for each discussion (limit to first 5 discussions shown)
  const shownDiscussions = discussions.slice(0, 5)
  const repliesArrays = await Promise.all(
    shownDiscussions.map((d: { id: string }) => getRepliesForDiscussion(d.id).catch(() => [] as Awaited<ReturnType<typeof getRepliesForDiscussion>>))
  )
  const repliesMap: Record<string, typeof repliesArrays[number]> = {}
  const allReplyIds: string[] = []
  shownDiscussions.forEach((d: { id: string }, i: number) => {
    repliesMap[d.id] = repliesArrays[i]
    repliesArrays[i].forEach((r: { id: string }) => allReplyIds.push(r.id))
  })

  const emptyVotes: Record<string, 'up' | 'down'> = {}
  const [userVotes, questionVotes, discussionVotes, replyVotes] = await Promise.all([
    user ? getReviewVotes(reviewIds, user.id).catch(() => emptyVotes) : Promise.resolve(emptyVotes),
    user ? getQuestionVotes(questionIds, user.id).catch(() => emptyVotes) : Promise.resolve(emptyVotes),
    user ? getDiscussionVotes(discussionIds, user.id).catch(() => emptyVotes) : Promise.resolve(emptyVotes),
    user ? getReplyVotes(allReplyIds, user.id).catch(() => emptyVotes) : Promise.resolve(emptyVotes),
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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: tool.name,
    description: tool.description,
    url: tool.website_url,
    applicationCategory: categories[0]?.name ?? 'AIApplication',
    operatingSystem: (tool.platforms ?? []).join(', ') || 'Web',
    offers: {
      '@type': 'Offer',
      price: tool.pricing_type === 'free' ? '0' : undefined,
      priceCurrency: 'USD',
      description: pricingLabel(tool.pricing_type),
    },
    ...(tool.avg_rating > 0 && {
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
      <PageViewTracker path={`/tools/${slug}`} toolId={tool.id} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([
          jsonLd,
          breadcrumbJsonLd([
            { name: 'Home', url: 'https://rightaichoice.com' },
            { name: 'Tools', url: 'https://rightaichoice.com/tools' },
            { name: tool.name, url: `https://rightaichoice.com/tools/${slug}` },
          ]),
        ]) }}
      />

      <main className="flex-1">
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
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-zinc-800 overflow-hidden border border-zinc-700">
                {tool.logo_url ? (
                  <Image
                    src={tool.logo_url}
                    alt={tool.name}
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-zinc-500">
                    {tool.name.charAt(0)}
                  </span>
                )}
              </div>
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
            <div className="flex items-center gap-3 shrink-0">
              <AddToCompareButton
                tool={{
                  id: tool.id,
                  slug: tool.slug,
                  name: tool.name,
                  logo_url: tool.logo_url,
                }}
                size="md"
              />
              <SaveToolButton toolId={tool.id} toolName={tool.name} initialSaved={saved} />
              <ShareButton
                url={`/tools/${tool.slug}`}
                title={`${tool.name} — ${tool.tagline}`}
                text={`Check out ${tool.name} — ${tool.tagline} | Found on RightAIChoice`}
              />
              <VisitWebsiteButton slug={tool.slug} url={tool.website_url} />
            </div>
          </div>

          {/* ── Main Content Grid ────────────────────────────────── */}
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column (2/3) — Description, Features, etc. */}
            <div className="lg:col-span-2 space-y-8">
              {/* Our Take — Editorial Verdict (most prominent) */}
              {(tool.editorial_verdict || (tool.best_for && tool.best_for.length > 0)) && (
                <section className="rounded-xl border border-emerald-900/40 bg-gradient-to-b from-emerald-950/10 to-zinc-900/50 p-5">
                  <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                    Our Take on {tool.name}
                  </h2>

                  <div className="flex flex-wrap gap-x-8 gap-y-3 mb-4">
                    {tool.best_for && tool.best_for.length > 0 && (
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
                    {tool.not_for && tool.not_for.length > 0 && (
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

                  {tool.editorial_verdict && (
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      {tool.editorial_verdict}
                    </p>
                  )}

                  {/* Alternatives link */}
                  {alternatives.length > 0 && (
                    <p className="mt-3 text-xs text-zinc-500">
                      Alternatives to consider:{' '}
                      {alternatives.slice(0, 3).map((alt, i) => (
                        <span key={alt.id}>
                          {i > 0 && ', '}
                          <Link href={`/tools/${alt.slug}`} className="text-emerald-400 hover:text-emerald-300 transition-colors">
                            {alt.name}
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
              )}

              {/* Our Views — Long-form editorial */}
              {tool.our_views && (
                <section>
                  <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Eye className="h-5 w-5 text-cyan-400" />
                    Our Views
                  </h2>
                  <div className="prose prose-invert prose-zinc prose-sm max-w-none">
                    <p className="text-zinc-400 leading-relaxed whitespace-pre-line">
                      {tool.our_views}
                    </p>
                  </div>
                  {tool.our_views_generated_at && (
                    <p className="mt-2 text-xs text-zinc-600">
                      Last updated: {new Date(tool.our_views_generated_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </section>
              )}

              {/* ── Community & Market Signals (Phase 6 data inline) ─ */}
              <SectionErrorBoundary fallbackTitle="Community signals couldn't load right now.">
                <SentimentBlock
                  toolId={tool.id}
                  toolSlug={tool.slug}
                  toolName={tool.name}
                  viewCount={tool.view_count ?? 0}
                />
              </SectionErrorBoundary>

              {/* Viability Score */}
              {tool.viability_score != null && (
                <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-emerald-400" />
                      Viability Score
                    </h2>
                    <ViabilityBadge score={tool.viability_score} size="lg" showLabel />
                  </div>

                  <p className="text-sm text-zinc-400 mb-4">
                    How likely is {tool.name} to still be operational in 12 months? Based on 6 signals
                    including funding, development activity, and platform risk.
                  </p>

                  {tool.viability_signals && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(tool.viability_signals as Record<string, number>).map(([key, value]) => (
                        <div key={key} className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2">
                          <span className="text-[11px] text-zinc-500 block mb-0.5">
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
              )}

              {/* Description */}
              <section>
                <h2 className="text-lg font-semibold text-white mb-3">About {tool.name}</h2>
                <div className="prose prose-invert prose-zinc prose-sm max-w-none">
                  <p className="text-zinc-400 leading-relaxed whitespace-pre-line">
                    {tool.description}
                  </p>
                </div>
              </section>

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

              {/* Integrations */}
              {tool.integrations && tool.integrations.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Layers className="h-5 w-5 text-blue-400" />
                    Integrations
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {tool.integrations.map((integration: string, i: number) => (
                      <span
                        key={i}
                        className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-sm text-zinc-400"
                      >
                        {integration}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Tags / Use Cases */}
              {tags.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Tag className="h-5 w-5 text-purple-400" />
                    Use Cases
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag: { id: string; name: string; slug: string }) => (
                      <Link
                        key={tag.id}
                        href={`/tools?search=${encodeURIComponent(tag.name)}`}
                        className="rounded-full border border-zinc-800 bg-zinc-900/50 px-3.5 py-1.5 text-sm text-zinc-400 hover:border-zinc-600 hover:text-white transition-colors"
                      >
                        {tag.name}
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Tutorial Videos ───────────────────────────── */}
              <TutorialVideos tutorials={tool.tutorial_videos ?? []} />

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
                reviews={reviews.slice(0, 5).map((r: { pros: string; cons: string; rating: number; use_case: string }) => ({
                  pros: r.pros,
                  cons: r.cons,
                  rating: r.rating,
                  use_case: r.use_case,
                }))}
              />

              {/* ── Workflow Integration ─────────────────────── */}
              {relatedWorkflows.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <GitBranch className="h-5 w-5 text-emerald-400" />
                    {tool.name} in Workflows
                  </h2>
                  <div className="space-y-3">
                    {relatedWorkflows.map((wf) => {
                      const stepWithTool = wf.steps.find((s) => s.tool_slug === tool.slug)
                      return (
                        <a
                          key={wf.id}
                          href={`/workflows/${wf.id}`}
                          className="flex items-start justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3.5 hover:border-zinc-700 hover:bg-zinc-800/50 transition-colors group"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors truncate">
                              {wf.title}
                            </p>
                            {stepWithTool && (
                              <p className="mt-0.5 text-xs text-zinc-500 truncate">
                                Used for: {stepWithTool.name}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 text-xs text-zinc-500">
                            <TrendingUp className="h-3.5 w-3.5" />
                            {wf.upvotes}
                          </div>
                        </a>
                      )
                    })}
                  </div>
                  <div className="mt-3">
                    <a
                      href="/workflows"
                      className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      Browse all workflows →
                    </a>
                  </div>
                </section>
              )}

              {/* ── Reviews Section ──────────────────────────── */}
              <SectionErrorBoundary fallbackTitle="Reviews couldn't load right now.">
                <section id="reviews">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Star className="h-5 w-5 text-amber-400" />
                      Reviews ({reviews.length})
                    </h2>
                  </div>

                  {reviews.length > 0 ? (
                    <>
                      <ReviewList reviews={reviews} userVotes={userVotes} />
                      {!alreadyReviewed && (
                        <div className="mt-6">
                          <ReviewForm toolId={tool.id} />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3">
                      <p className="text-sm text-zinc-500">No reviews yet. Be the first to share your experience.</p>
                      <div className="mt-3">
                        <ReviewForm toolId={tool.id} />
                      </div>
                    </div>
                  )}
                </section>
              </SectionErrorBoundary>

              {/* ── Q&A Section ──────────────────────────────── */}
              <SectionErrorBoundary fallbackTitle="Questions couldn't load right now.">
                <section id="questions">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-blue-400" />
                      Questions ({questions.length})
                    </h2>
                    {questions.length > 5 && (
                      <Link
                        href={`/questions?tool=${tool.slug}`}
                        className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        View all
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>

                  {questions.length > 0 ? (
                    <>
                      <QuestionList
                        questions={questions.slice(0, 5)}
                        userVotes={questionVotes}
                      />
                      <div className="mt-6">
                        <QuestionForm toolId={tool.id} />
                      </div>
                    </>
                  ) : (
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3">
                      <p className="text-sm text-zinc-500">No questions yet. Ask something about {tool.name}.</p>
                      <div className="mt-3">
                        <QuestionForm toolId={tool.id} />
                      </div>
                    </div>
                  )}
                </section>
              </SectionErrorBoundary>

              {/* ── Discussions Section ────────────────────────── */}
              <SectionErrorBoundary fallbackTitle="Discussions couldn't load right now.">
                <section id="discussions">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                      <MessagesSquare className="h-5 w-5 text-purple-400" />
                      Discussions ({discussions.length})
                    </h2>
                  </div>

                  {discussions.length > 0 ? (
                    <>
                      <DiscussionList
                        discussions={shownDiscussions}
                        repliesMap={repliesMap}
                        discussionVotes={discussionVotes}
                        replyVotes={replyVotes}
                      />
                      <div className="mt-6">
                        <DiscussionForm toolId={tool.id} />
                      </div>
                    </>
                  ) : (
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3">
                      <p className="text-sm text-zinc-500">No discussions yet. Start a conversation about {tool.name}.</p>
                      <div className="mt-3">
                        <DiscussionForm toolId={tool.id} />
                      </div>
                    </div>
                  )}
                </section>
              </SectionErrorBoundary>

              {/* ── FAQs ──────────────────────────────────────── */}
              <FaqSection faqs={faqs} toolName={tool.name} />

              {/* Alternatives */}
              {alternatives.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">
                      Alternatives to {tool.name}
                    </h2>
                    <Link
                      href={`/tools?category=${categories[0]?.slug ?? ''}`}
                      className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      View all
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {alternatives.map((alt) => (
                      <ToolCard key={alt.id} tool={alt} />
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Right column (1/3) — Sidebar */}
            <aside className="space-y-6">
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

              {/* Community Sentiment — rating breakdown */}
              {reviews.length >= 3 && (() => {
                const dist = [5, 4, 3, 2, 1].map((star) => ({
                  star,
                  count: reviews.filter((r: { rating: number }) => r.rating === star).length,
                }))
                const topReview = reviews
                  .slice()
                  .sort((a: { upvotes: number }, b: { upvotes: number }) => (b.upvotes ?? 0) - (a.upvotes ?? 0))[0]
                return (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                    <h3 className="text-sm font-semibold text-white mb-1">Community Sentiment</h3>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-2xl font-bold text-white">
                        {Number(tool.avg_rating).toFixed(1)}
                      </span>
                      <span className="text-xs text-zinc-500">/ 5 · {reviews.length} reviews</span>
                    </div>
                    <div className="space-y-1.5">
                      {dist.map(({ star, count }) => {
                        const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0
                        return (
                          <div key={star} className="flex items-center gap-2 text-xs">
                            <span className="w-4 text-right text-zinc-500">{star}</span>
                            <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-amber-400"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-6 text-zinc-600">{pct}%</span>
                          </div>
                        )
                      })}
                    </div>
                    {topReview?.pros && (
                      <blockquote className="mt-4 border-l-2 border-emerald-600 pl-3 text-xs text-zinc-400 italic line-clamp-3">
                        &ldquo;{topReview.pros}&rdquo;
                      </blockquote>
                    )}
                  </div>
                )
              })()}

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
                </div>
              </div>

              {/* Pricing Details (if available) */}
              {tool.pricing_details &&
                Array.isArray(tool.pricing_details) &&
                tool.pricing_details.length > 0 && (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                    <h3 className="text-sm font-semibold text-white mb-3">Pricing Plans</h3>
                    <div className="space-y-3">
                      {tool.pricing_details.map(
                        (
                          plan: { name: string; price: string; features?: string[] },
                          i: number
                        ) => (
                          <div
                            key={i}
                            className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-white">
                                {plan.name}
                              </span>
                              <span className="text-sm text-emerald-400">{plan.price}</span>
                            </div>
                            {plan.features && plan.features.length > 0 && (
                              <ul className="mt-2 space-y-1">
                                {plan.features.map((f, j) => (
                                  <li
                                    key={j}
                                    className="flex items-center gap-1.5 text-xs text-zinc-500"
                                  >
                                    <Check className="h-3 w-3 text-emerald-600" />
                                    {f}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
            </aside>
          </div>
        </div>
      </main>

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
