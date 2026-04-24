import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, User, Eye, Calendar } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { ExportStack } from '@/components/stacks/export-stack'
import { createClient } from '@/lib/supabase/server'

type Stage = {
  name: string
  description?: string
  bestPick: { name: string; slug: string; reason: string; pricing: string; tags?: string[] }
  alternatives: { name: string; slug: string; reason: string; pricing: string }[]
  costEstimate?: string
}

type SavedStack = {
  id: string
  title: string
  goal: string
  description: string | null
  stages: Stage[]
  summary: { freePath?: string; paidPath?: string; skillLevel?: string; setupTime?: string } | null
  source: string
  source_slug: string | null
  is_public: boolean
  view_count: number
  created_at: string
  user_id: string
  profiles: { full_name: string | null; username: string | null } | null
}

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('saved_stacks')
    .select('title, goal, description')
    .eq('id', id)
    .eq('is_public', true)
    .single()

  if (!data) return { title: 'Stack Not Found' }

  const ogImage = `/api/og/stack?type=saved&id=${id}`

  return {
    title: data.title,
    description: data.description || `AI tool stack for: ${data.goal}`,
    openGraph: {
      title: data.title,
      description: data.description || `AI tool stack for: ${data.goal}`,
      type: 'article',
      url: `https://rightaichoice.com/stacks/saved/${id}`,
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: data.title,
      description: data.description || `AI tool stack for: ${data.goal}`,
      images: [ogImage],
    },
  }
}

export default async function SavedStackPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: stack } = await supabase
    .from('saved_stacks')
    .select('*, profiles:user_id(full_name, username)')
    .eq('id', id)
    .eq('is_public', true)
    .single() as { data: SavedStack | null }

  if (!stack) notFound()

  // Increment view count (fire-and-forget)
  supabase
    .from('saved_stacks')
    .update({ view_count: stack.view_count + 1 })
    .eq('id', id)
    .then(() => {})

  const stages: Stage[] = Array.isArray(stack.stages) ? stack.stages : []
  const createdDate = new Date(stack.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const authorName = stack.profiles?.full_name || stack.profiles?.username || 'Anonymous'
  const authorLink = stack.profiles?.username ? `/u/${stack.profiles.username}` : null

  // JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: stack.title,
    description: stack.description || stack.goal,
    url: `https://rightaichoice.com/stacks/saved/${id}`,
    datePublished: stack.created_at,
    author: { '@type': 'Person', name: authorName },
    publisher: { '@type': 'Organization', name: 'RightAIChoice', url: 'https://rightaichoice.com' },
  }

  return (
    <>
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/20 via-zinc-950 to-zinc-950" />
          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-16 pb-10 text-center">
            <Link
              href="/stacks"
              className="inline-flex items-center min-h-[44px] px-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              &larr; All Stacks
            </Link>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1 text-xs text-zinc-400">
              {stack.source === 'planner' && (
                <>
                  <Sparkles className="h-3 w-3 text-emerald-400" />
                  AI-Generated Stack
                </>
              )}
              {stack.source === 'curated' && (
                <>
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  Curated Stack
                </>
              )}
            </div>

            <h1 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
              {stack.title}
            </h1>
            {stack.description && (
              <p className="mt-3 text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                {stack.description}
              </p>
            )}

            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {authorLink ? (
                  <Link href={authorLink} className="hover:text-zinc-300 transition-colors">
                    {authorName}
                  </Link>
                ) : (
                  authorName
                )}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {createdDate}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {stack.view_count} views
              </span>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <ExportStack
                title={stack.title}
                goal={stack.goal}
                stages={stages.map((s) => ({
                  name: s.name,
                  bestPick: { name: s.bestPick.name, pricing: s.bestPick.pricing },
                  alternatives: s.alternatives?.map((a) => ({ name: a.name })),
                }))}
                summary={stack.summary ? { freePath: stack.summary.freePath, paidPath: stack.summary.paidPath } : undefined}
                shareUrl={`/stacks/saved/${id}`}
              />
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
            {/* Stages */}
            <div className="space-y-4">
              {stages.map((stage, i) => (
                <div
                  key={stage.name}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-950/50 border border-emerald-800/40 text-sm font-bold text-emerald-400">
                      {i + 1}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{stage.name}</h3>
                      {stage.description && (
                        <p className="text-xs text-zinc-500">{stage.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Best pick */}
                  <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-4 mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium uppercase tracking-wider text-emerald-400">
                        Best Pick
                      </span>
                      {stage.costEstimate && (
                        <span className="text-xs text-zinc-500">{stage.costEstimate}</span>
                      )}
                    </div>
                    <Link
                      href={`/tools/${stage.bestPick.slug}`}
                      className="text-sm font-semibold text-white hover:text-emerald-400 transition-colors"
                    >
                      {stage.bestPick.name}
                    </Link>
                    <span className="ml-2 text-xs text-zinc-500">({stage.bestPick.pricing})</span>
                    {stage.bestPick.reason && (
                      <p className="mt-1 text-xs text-zinc-400 leading-relaxed">{stage.bestPick.reason}</p>
                    )}
                    {stage.bestPick.tags && stage.bestPick.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {stage.bestPick.tags.map((tag) => (
                          <span key={tag} className="text-xs bg-zinc-800 text-zinc-400 rounded px-1.5 py-0.5">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Alternatives */}
                  {stage.alternatives && stage.alternatives.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Alternatives
                      </span>
                      {stage.alternatives.map((alt) => (
                        <div key={alt.slug} className="flex items-start gap-2 text-xs">
                          <Link
                            href={`/tools/${alt.slug}`}
                            className="font-medium text-zinc-300 hover:text-emerald-400 transition-colors shrink-0"
                          >
                            {alt.name}
                          </Link>
                          <span className="text-zinc-600">({alt.pricing})</span>
                          {alt.reason && (
                            <span className="text-zinc-500">— {alt.reason}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Sidebar */}
            {stack.summary && (
              <div className="lg:sticky lg:top-20 h-fit">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
                  <h3 className="text-base font-semibold text-white mb-4">Stack Summary</h3>
                  <div className="space-y-3">
                    {stack.summary.freePath && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Free Path</p>
                        <p className="text-sm font-medium text-white">{stack.summary.freePath}</p>
                      </div>
                    )}
                    {stack.summary.paidPath && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Paid Path</p>
                        <p className="text-sm font-medium text-white">{stack.summary.paidPath}</p>
                      </div>
                    )}
                    {stack.summary.skillLevel && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Skill Level</p>
                        <p className="text-sm font-medium text-white">{stack.summary.skillLevel}</p>
                      </div>
                    )}
                    {stack.summary.setupTime && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Setup Time</p>
                        <p className="text-sm font-medium text-white">{stack.summary.setupTime}</p>
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/plan?q=${encodeURIComponent(stack.goal)}`}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
                  >
                    <Sparkles className="h-4 w-4" />
                    Customize This Stack
                  </Link>
                </div>

                {stack.source === 'curated' && stack.source_slug && (
                  <Link
                    href={`/stacks/${stack.source_slug}`}
                    className="mt-3 block text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    View original curated stack &rarr;
                  </Link>
                )}
              </div>
            )}
          </div>
        </section>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </main>

      <Footer />
    </>
  )
}
