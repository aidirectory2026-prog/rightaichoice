// Phase 13 Social — manual-posting workspace. Per platform: this week's strategy
// (what / why / how), the exact steps to post by hand, and tomorrow's ready-to-post
// posts (copy + image + reason). Service-role-only tables read via getAdminClient
// (the admin layout gates this route to is_admin).

import Link from 'next/link'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { PageHeader } from '@/components/admin/page-header'
import { SocialPostCard, type SocialPostView } from '@/components/admin/social-post-card'
import { RegenerateStrategyButton } from '@/components/admin/social-controls'
import { getCurrentStrategy, SOCIAL_GOALS, type StoredStrategy } from '@/lib/social/strategy'
import type { Platform } from '@/lib/social/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Social — Admin' }

const PLATFORMS: Platform[] = ['linkedin', 'x', 'instagram', 'reddit']
const LABEL: Record<Platform, string> = { linkedin: 'LinkedIn', x: 'X / Twitter', instagram: 'Instagram', reddit: 'Reddit' }

const HOW_TO: Record<Platform, string[]> = {
  linkedin: [
    'Open LinkedIn → "Start a post".',
    'Hit "Copy text" on a post below → paste it in.',
    'Hit "Download image" → attach the PNG.',
    'Post it.',
    'Come back here → "Mark as posted ✓".',
  ],
  x: [
    'Open X → new post.',
    '"Copy text" → paste.',
    '"Download image" → attach it.',
    'Post.',
    'Back here → "Mark as posted ✓".',
  ],
  instagram: [
    'Instagram is image-first: hit "Download image" first.',
    'New post → upload that image.',
    '"Copy text" → paste it as the caption.',
    'Share.',
    'Add the link as the FIRST COMMENT (Instagram blocks caption links).',
    'Back here → "Mark as posted ✓".',
  ],
  reddit: [
    'Open the subreddit shown on the post (e.g. r/artificial).',
    'New post → use the Title shown on the card.',
    '"Copy text" → paste as the body.',
    'Keep it conversational — a discussion, not an ad.',
    'Post, then back here → "Mark as posted ✓".',
  ],
}

export default async function SocialAdminPage({ searchParams }: { searchParams: Promise<{ platform?: string }> }) {
  const sp = await searchParams
  const view: Platform = PLATFORMS.includes(sp.platform as Platform) ? (sp.platform as Platform) : 'linkedin'
  const db = getAdminClient()

  const postsRes = await db
    .from('social_posts')
    .select('id, platform, kind, status, copy, hashtags, link_url, graphic_template, subreddit, scheduled_at, source_refs, brain_meta')
    .eq('platform', view)
    .eq('status', 'draft')
    .order('scheduled_at', { ascending: true })
    .limit(10)
  const posts = (postsRes.data ?? []) as SocialPostView[]
  const strategy = await getCurrentStrategy(view)

  return (
    <div className="text-zinc-300">
      <PageHeader />
      <div className="mb-1 text-2xl font-bold text-white">Social — posting plan</div>
      <p className="mb-5 max-w-3xl text-sm text-zinc-400">
        Your daily routine: pick a platform, read this week&rsquo;s plan, then for each post below — <strong>Copy
        text</strong>, <strong>Download image</strong>, post it by hand on that platform, and hit <strong>Mark as
        posted ✓</strong>. That&rsquo;s it.
      </p>

      {/* Platform tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {PLATFORMS.map((pl) => (
          <Link
            key={pl}
            href={`/admin/social?platform=${pl}`}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              view === pl ? 'border-emerald-700 bg-emerald-950/40 text-emerald-300' : 'border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
            }`}
          >
            {LABEL[pl]}
          </Link>
        ))}
      </div>

      {/* This week's strategy — what / why / how */}
      <StrategyCard platform={view} strategy={strategy} />

      {/* How to post on this platform */}
      <div className="mb-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
        <div className="mb-2 text-sm font-semibold text-white">How to post on {LABEL[view]}</div>
        <ol className="ml-4 list-decimal space-y-1 text-sm text-zinc-300">
          {HOW_TO[view].map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </div>

      {/* Tomorrow's posts */}
      <h2 className="mb-3 text-lg font-semibold text-white">Tomorrow&rsquo;s posts ({posts.length})</h2>
      {posts.length === 0 ? (
        <p className="text-sm text-zinc-500">Nothing queued for {LABEL[view]} yet — the daily brain refills this each morning.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {posts.map((p) => (
            <SocialPostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </div>
  )
}

function StrategyCard({ platform, strategy }: { platform: Platform; strategy: StoredStrategy | null }) {
  return (
    <div className="mb-8 rounded-lg border border-emerald-900/50 bg-emerald-950/10 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-400">This week&rsquo;s {LABEL[platform]} strategy</h2>
        <RegenerateStrategyButton platform={platform} />
      </div>
      {!strategy ? (
        <p className="text-sm text-zinc-400">No strategy yet this week — it regenerates every Monday, or click <em>Regenerate</em> to build one now.</p>
      ) : (
        <div className="space-y-4 text-sm">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">What</div>
            <div className="mt-1 text-base font-semibold text-white">{strategy.focus}</div>
            {strategy.themes.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {strategy.themes.map((t) => (
                  <span key={t} className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300">{t}</span>
                ))}
              </div>
            ) : null}
          </div>
          {strategy.rationale || strategy.goalAlignment ? (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Why</div>
              {strategy.rationale ? <p className="mt-1 text-zinc-300">{strategy.rationale}</p> : null}
              {strategy.goalAlignment ? <p className="mt-1 text-zinc-400">{strategy.goalAlignment}</p> : null}
            </div>
          ) : null}
          {strategy.cadence || strategy.postTypes.length ? (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">How</div>
              {strategy.postTypes.length ? <p className="mt-1 text-zinc-300">Formats: {strategy.postTypes.join(', ')}</p> : null}
              {strategy.cadence ? <p className="mt-1 text-zinc-400">Cadence: {strategy.cadence}</p> : null}
            </div>
          ) : null}
          <div className="border-t border-zinc-800 pt-2 text-xs text-zinc-500">Goals: {SOCIAL_GOALS.join(' · ')}</div>
        </div>
      )}
    </div>
  )
}
